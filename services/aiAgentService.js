const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { diff_match_patch } = require('diff-match-patch')
const { getLocalDirectory } = require('./dbService')
const { handleIntent, handleIntentStream } = require('./intentAutoHandler')
const { batchWriteFiles } = require('./fileBatchWriter')

const VECTOR_SERVER = 'http://localhost:8300'
// 获取 DeepSeek API Key，优先用环境变量
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk- '

// 文本向量化
async function vectorizeText(text) {
  const res = await axios.post(`${VECTOR_SERVER}/vectorize/text`, { text })
  return res.data.vector
}

// 代码向量化
async function vectorizeCode(code) {
  const res = await axios.post(`${VECTOR_SERVER}/vectorize/code`, { code })
  console.log('vectorizeCode', code, res.data.vector.slice(0, 10))
  return res.data.vector
}

// Faiss 新增向量
async function faissAdd(vector, meta, id) {
  const body = { vector, meta }
  console.log('faissadd', vector, meta, id)

  if (id !== undefined && id !== null) {
    body.id = id
  }
  const res = await axios.post(`${VECTOR_SERVER}/faiss/add`, body)
  return res.data.id
}

// Faiss 检索
async function faissSearch(vector, top_k = 5) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/search`, { vector, top_k })
  return res.data.results
}

// Faiss 删除
async function faissDelete(id) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/delete`, { id })
  return res.data.success
}

// Faiss 更新
async function faissUpdate(id, vector, meta = null) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/update`, { id, vector, meta })
  return res.data.success
}

// 单文件补全（LLM）
async function codeCompletion(prompt, context = '') {
  // TODO: 调用 DeepSeek 或其他 LLM 服务
  return { completion: '// 补全内容示例' }
}

// 多文件批量补全/修改（流式版本）
async function* batchCodeCompletionStream(parameters, files, messages) {
  console.log('hhhhh', parameters, files, messages)

  // 组装多文件上下文
  const context = files.map((f) => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n')

  // 获取最近五次对话上下文
  const recentMessages = messages.slice(-10) // 最近10条消息（5轮对话）

  // 构建 prompt
  const systemPrompt = `你是一个专业的代码助手。请根据用户需求对提供的文件进行智能修改。

### 任务要求
- 仔细分析用户需求和文件内容
- 只修改必要的部分，保持代码风格一致
- 如果不需要修改,无需返回任何内容
- 返回格式必须是纯JSON对象，不要包含任何markdown标记
- **重要：每个文件只能在一个对象内，不能分段处理**
- **重要：oldContent必须包含完整的原始文件内容**
- **重要：newContent必须包含完整的修改后文件内容**
- **重要：不能将一个文件分成多个对象处理**

### 输出格式
{
  "files": [
    {
      "path": "文件路径",
      "operation": "操作类型",
      "oldContent": "完整的原始文件内容",
      "newContent": "完整的修改后文件内容", 
      "diff": "diff格式的修改",
      "reason": "修改原因"
    }
  ]
}

### 重要规则
- 每个文件只能有一个对象，不能重复
- oldContent和newContent必须包含文件的完整内容
- 不能将一个文件的内容分成多个对象
- 如果修改多个文件，每个文件对应一个独立的对象

### 操作类型说明
- "edit": 修改现有文件
- "add": 新增文件
- "delete": 删除文件
- "rename": 重命名文件

### 文件内容
${context}

### 对话历史（最近5轮）
${recentMessages.map((msg, index) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`).join('\n')}

### 当前用户需求
${JSON.stringify(messages[messages.length - 1].content)}`

  const llmMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    {
      role: 'user',
      content: `请根据上述对话历史和需求修改文件。注意：每个文件只能在一个对象中，包含完整的文件内容：${JSON.stringify(
        messages[messages.length - 1].content
      )}`,
    },
  ]
  console.log('lllll', llmMessages)

  try {
    // 流式调用 DeepSeek
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: llmMessages,
        stream: true,
        temperature: 0.1,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    )

    let fullResponse = ''

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            // 流式传输完成，解析完整响应
            try {
              // 提取JSON从markdown代码块中
              const cleanJson = extractJsonFromMarkdown(fullResponse)
              const result = JSON.parse(cleanJson)

              // 去重处理：如果有重复的文件路径，只保留最后一个
              const uniqueFiles = new Map()
              for (const fileResult of result.files || []) {
                uniqueFiles.set(fileResult.path, fileResult)
              }

              // 处理每个文件的修改结果
              for (const fileResult of uniqueFiles.values()) {
                const originalFile = files.find((f) => f.path === fileResult.path)
                if (originalFile) {
                  if (fileResult.oldContent !== fileResult.newContent) {
                    // 有修改
                    yield {
                      type: 'file_modification',
                      path: fileResult.path,
                      operation: fileResult.operation || 'edit',
                      oldContent: fileResult.oldContent,
                      newContent: fileResult.newContent,
                      diff: fileResult.diff,
                      reason: fileResult.reason,
                    }
                  } else {
                    // 无修改
                    yield {
                      type: 'file_no_change',
                      path: fileResult.path,
                      operation: fileResult.operation || 'edit',
                      reason: fileResult.reason || '无需修改',
                    }
                  }
                }
              }

              // 如果没有文件被修改
              const hasModifications = Array.from(uniqueFiles.values()).some((f) => f.oldContent !== f.newContent)
              if (!hasModifications) {
                yield {
                  type: 'no_modifications',
                  message: '未检测到需要修改的内容',
                }
              }
            } catch (parseError) {
              yield {
                type: 'error',
                message: `解析响应失败: ${parseError.message}`,
                rawResponse: fullResponse,
              }
            }
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              fullResponse += parsed.choices[0].delta.content

              // 流式返回部分内容给前端
              yield {
                type: 'stream_chunk',
                content: parsed.choices[0].delta.content,
              }
            }
          } catch (e) {
            // 忽略解析错误，继续处理
          }
        }
      }
    }
  } catch (error) {
    yield {
      type: 'error',
      message: `调用 DeepSeek API 失败: ${error.message}`,
    }
  }
}

// 保持原有的同步版本作为备用
async function batchCodeCompletion(prompt, files) {
  // 组装多文件上下文
  const context = files.map((f) => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n')

  // TODO: 调用 DeepSeek 或其他 LLM 服务，传入多文件上下文
  // 这里模拟返回每个文件的修改建议
  const results = files.map((file) => ({
    path: file.path,
    operation: 'edit',
    oldContent: file.content,
    newContent: `// AI 修改后的内容\n${file.content}\n// 添加的注释`,
    diff: `+ // AI 修改后的内容\n${file.content}\n+ // 添加的注释`,
  }))

  return { results }
}

// 生成diff
function generateDiff(oldText, newText) {
  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  // 转换为unified diff格式
  let patch = ''
  let lineNum = 1

  diffs.forEach(([type, text]) => {
    const lines = text.split('\n')
    lines.forEach((line, index) => {
      if (index === lines.length - 1 && line === '') return

      switch (type) {
        case 1: // 插入
          patch += `+${line}\n`
          break
        case -1: // 删除
          patch += `-${line}\n`
          break
        case 0: // 相等
          patch += ` ${line}\n`
          lineNum++
          break
      }
    })
  })

  return patch
}

// 应用diff
function applyDiff(oldText, patch) {
  const dmp = new diff_match_patch()
  const patches = dmp.patch_fromText(patch)
  const [newText] = dmp.patch_apply(patches, oldText)
  return newText
}

// 忽略列表
const ignoreList = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.vite',
  '.next',
  '.turbo',
  'android',
  'ios',
  'macos',
  'Pods',
  'bin',
  'pkg',
  'target',
  'CMakeFiles',
  'Makefile',
  '.git',
  '.DS_Store',
  '.idea',
  '.vscode',
  '.env',
  '.gradle',
  '*.apk',
  '*.jar',
  '*.war',
  '*.class',
  '*.o',
  '*.obj',
  '*.exe',
  '*.out',
  '*.xcodeproj',
  '*.xcworkspace',
  'go.mod',
  'go.sum',
]

// 提取JSON从markdown代码块中
function extractJsonFromMarkdown(text) {
  // 移除markdown代码块标记
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  // 如果没有代码块标记，尝试直接解析
  return text.trim()
}

// 递归获取文件树，排除 ignore
function getProjectFileTree(rootDir, ignoreList) {
  function walk(dir) {
    let results = []
    const list = fs.readdirSync(dir)
    for (const file of list) {
      if (file.startsWith('.')) continue // 隐藏文件夹
      const filePath = path.join(dir, file)
      const relPath = path.relative(rootDir, filePath)
      if (ignoreList.some((ig) => relPath.startsWith(ig) || file === ig || filePath.endsWith(ig))) continue
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        results.push({
          type: 'directory',
          name: file,
          path: filePath, // 绝对路径
          children: walk(filePath),
        })
      } else {
        results.push({
          type: 'file',
          name: file,
          path: filePath, // 绝对路径
        })
      }
    }
    return results
  }
  // 第一层就是 rootDir
  return [
    {
      type: 'directory',
      name: path.basename(rootDir),
      path: rootDir,
      children: walk(rootDir),
    },
  ]
}

// 加载业务prompt
function loadPrompts() {
  const promptPath = path.join(__dirname, '../prompts/businessPrompts.json')
  return JSON.parse(fs.readFileSync(promptPath, 'utf-8'))
}

// DeepSeek LLM 意图解析
async function parseIntentWithDeepSeek(userInput, fileTree) {
  const prompts = loadPrompts()
  let systemPrompt = prompts.intent_parse.system
  // 支持 ${fileTree} 占位符
  systemPrompt = systemPrompt.replace('${fileTree}', JSON.stringify(fileTree))
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ]
  const res = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )
  // 返回 JSON 字符串，需 parse
  const content = res.data.choices[0].message.content
  const cleanJson = extractJsonFromMarkdown(content)
  return JSON.parse(cleanJson)
}

// chatWithAI 集成意图解析
async function chatWithAI(messages) {
  const lastMessage = messages[messages.length - 1]
  const localDirResult = await getLocalDirectory()
  // 兼容返回对象或字符串
  const rootDir =
    typeof localDirResult === 'string' ? localDirResult : localDirResult.directory || localDirResult.path || ''
  if (!rootDir) throw new Error('未获取到有效的本地目录')
  const fileTree = getProjectFileTree(rootDir, ignoreList)
  const intentResult = await parseIntentWithDeepSeek(lastMessage.content, fileTree)
  const handledResult = await handleIntent(intentResult, fileTree)
  return handledResult
}

// chatWithAI 集成意图解析（流式 async generator 版本）
async function* chatWithAIStream(messages, editorFile, manualPaths, contextPaths) {
  const lastMessage = messages[messages.length - 1]
  const localDirResult = await getLocalDirectory()
  const rootDir =
    typeof localDirResult === 'string' ? localDirResult : localDirResult.directory || localDirResult.path || ''
  if (!rootDir) throw new Error('未获取到有效的本地目录')
  const fileTree = getProjectFileTree(rootDir, ignoreList)
  const intentResult = await parseIntentWithDeepSeek(lastMessage.content, fileTree)

  const afterHandlePaths = await processPathsForChatStream({
    editorFile,
    manualPaths,
    contextPaths,
    semanticPaths: intentResult.paths,
  })
  console.log('intentResult', afterHandlePaths, intentResult, editorFile, manualPaths, contextPaths)
  for await (const chunk of handleIntentStream(intentResult, fileTree, afterHandlePaths, messages)) {
    yield chunk
  }
}

/**
 * 处理多来源路径，按权重累加和排序
 * @param {Object} params
 * @param {string} params.editorFile 编辑器当前文件路径
 * @param {string[]} params.manualPaths 手动添加路径
 * @param {string[]} params.contextPaths 上下文路径
 * @param {string[]} params.semanticPaths 语义解析路径
 * @param {string[]} params.vectorPaths 向量搜索路径
 * @param {string[]} params.globalPaths 全局搜索路径
 * @param {number} params.maxLength 返回数组最大长度，默认10
 * @returns {Array<{path: string, weight: number}>} 排序后的路径及权重
 */
async function processPathsForChatStream({
  editorFile,
  manualPaths = [],
  contextPaths = [],
  semanticPaths = [],
  vectorPaths = [],
  globalPaths = [],
  maxLength = 10,
}) {
  // 权重定义
  const WEIGHTS = {
    editor: 1.0,
    manual: 0.9,
    context: 0.8,
    semantic: 0.7,
    vector: 0.6,
    global: 0.5,
  }
  // 路径权重累加
  const pathMap = new Map()
  // 编辑器当前文件
  if (editorFile) {
    pathMap.set(editorFile, (pathMap.get(editorFile) || 0) + WEIGHTS.editor)
  }
  // 手动添加路径
  new Set(manualPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.manual)
  })
  // 上下文路径
  new Set(contextPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.context)
  })
  // 语义解析路径
  new Set(semanticPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.semantic)
  })
  // 向量搜索路径
  new Set(vectorPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.vector)
  })
  // 全局搜索路径
  new Set(globalPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.global)
  })

  // 新增：路径绝对化处理
  const allPaths = Array.from(pathMap.keys())
  const localDirResult = await getLocalDirectory()
  const rootDir =
    typeof localDirResult === 'string' ? localDirResult : localDirResult.directory || localDirResult.path || ''
  const absPaths = allPaths.map((p) => {
    if (!p) return p
    // 判断是否为绝对路径
    if (path.isAbsolute(p)) return p
    // 拼接为绝对路径
    return path.join(rootDir, p)
  })

  // 排序并限制长度
  const result = absPaths
    .map((path, i) => ({ path, weight: pathMap.get(allPaths[i]) }))
    .sort((a, b) => (b.weight === a.weight ? a.path.localeCompare(b.path) : b.weight - a.weight))
    .slice(0, maxLength)
  return result
}

// 语义搜索
async function semanticSearch(query) {
  const vector = await vectorizeText(query)
  const results = await faissSearch(vector, 5)
  return results
}

// 代码补全（带上下文）
async function codeCompletion(prompt, messages) {
  // 提取最近的代码上下文
  const codeContext = messages
    .filter((m) => m.role === 'user' && m.content.includes('```'))
    .map((m) => m.content)
    .join('\n')

  // 调用LLM进行补全
  return await callLLM(`基于以下上下文补全代码：\n${codeContext}\n\n需求：${prompt}`)
}

// 代码重构（带上下文）
async function codeRefactor(prompt, messages) {
  const codeContext = messages
    .filter((m) => m.role === 'user' && m.content.includes('```'))
    .map((m) => m.content)
    .join('\n')

  return await callLLM(`重构以下代码：\n${codeContext}\n\n重构要求：${prompt}`)
}

// 调用LLM（示例）
async function callLLM(prompt) {
  // 这里集成真实的LLM服务
  // 例如：OpenAI API、DeepSeek API等
  return `// AI生成的代码示例\nfunction example() {\n  console.log('Hello AI');\n}`
}

module.exports = {
  vectorizeText,
  vectorizeCode,
  faissAdd,
  faissSearch,
  faissDelete,
  faissUpdate,
  codeCompletion,
  batchCodeCompletion,
  batchCodeCompletionStream,
  batchWriteFiles,
  generateDiff,
  applyDiff,
  chatWithAI,
  chatWithAIStream,
  semanticSearch,
  codeRefactor,
  callLLM,
  processPathsForChatStream,
}
