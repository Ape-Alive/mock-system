const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { diff_match_patch } = require('diff-match-patch')
const { getLocalDirectory } = require('./dbService')
const { handleIntent, handleIntentStream } = require('./intentAutoHandler')
const { batchWriteFiles } = require('./fileBatchWriter')
const aiService = require('./aiService')

const VECTOR_SERVER = 'http://localhost:8300'

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
  // TODO: 调用 AI 服务
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
- oldContent和newContent必须是完整的文件内容
- 如果文件不需要修改，newContent应该等于oldContent
- 操作类型可以是：create、edit、delete、rename

### 文件内容
${context}

### 对话历史
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

  try {
    // 检查是否配置了API密钥
    const hasAPIKey = await aiService.checkAPIKeyConfigured('LLM')
    if (!hasAPIKey) {
      throw new Error('未配置AI API密钥')
    }

    // 使用新的AI服务进行流式调用
    let fullResponse = ''
    await aiService.callAIStream(
      llmMessages[llmMessages.length - 1].content,
      (chunk, fullContent) => {
        fullResponse = fullContent
      },
      'LLM',
      {
        temperature: 0.1,
        maxTokens: 4000,
        messages: llmMessages,
      }
    )

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
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError)
      console.error('原始响应:', fullResponse)
      yield {
        type: 'error',
        error: '解析AI响应失败: ' + parseError.message,
        rawResponse: fullResponse,
      }
    }
  } catch (error) {
    console.error('AI调用失败:', error)
    yield {
      type: 'error',
      error: 'AI调用失败: ' + error.message,
    }
  }
}

// 全栈开发AI Agent批量补全/修改（流式版本）
async function* batchCodeAllCompletionStream(parameters, files, messages) {
  // 组装多文件上下文
  const context = files.map((f) => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n')

  // 获取最近五次对话上下文
  const recentMessages = messages.slice(-10) // 最近10条消息（5轮对话）

  // 使用新的全栈提示词
  const prompt = `你是全栈开发AI Agent，分析用户需求并输出改动方案。

==== 输出格式 ====
选择以下任一方式：
1. **穿插式**：Markdown + 内嵌JSON代码块
2. **分离式**：完整JSON + 完整Markdown
3. **混合式**：Markdown中嵌入JSON片段 + 最终完整JSON

**要求**：JSON必须符合schema，Markdown必须完整，最终能提取完整JSON结构。

==== JSON Schema ====
{
  "schema_validation": "pass|fail",
  "schema_errors": ["string"],           // 仅当validation=fail时

  "change": [
    {
      "change_id": "string",             // 唯一ID
      "file_path": "string",             // 文件路径
      "operation": "MODIFY|DELETE|CREATE|RENAME",
      "change_summary": "string",        // 改动描述
      "new_path": "string|null",         // 仅重命名时
      "newContent": "string|null",       // 修改后完整内容
      "oldContent": "string|null",       // 修改前完整内容
      "patch": "string|null",            // unified diff（可选）
      "how_to_test": ["string"],         // 测试步骤
      "rollback": ["string"],            // 回滚步骤
      "risk_level": "low|medium|high",
      "author": "string",                // 可选
      "timestamp": "ISO8601 string",
      "issue_id": "string|null"          // 可选
    }
  ]
}

==== 改动类型要求 ====
- **前端**：UI变更、API调用、交互逻辑
- **后端**：接口、服务、性能优化
- **数据库**：DDL/DML、表结构、验证SQL
- **配置**：环境变量、部署脚本、启动影响
- **安全**：无敏感信息、去敏感化处理

==== Markdown必须包含 ====
- 操作摘要
- 详细操作列表（按模块）
- 测试步骤
- 回滚指引
- 假设与注意事项
- PR标题与描述

==== 文件内容 ====
${context}

==== 对话历史 ====
${recentMessages.map((msg, index) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`).join('\n')}

==== 用户需求 ====
${JSON.stringify(parameters)}

灵活组织输出，确保JSON符合schema，Markdown完整覆盖要求。`

  const llmMessages = [
    { role: 'system', content: prompt },
    ...recentMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: `请根据上述对话历史和需求进行全栈改动分析：${JSON.stringify(parameters)}` },
  ]

  try {
    // 检查是否配置了API密钥
    const hasAPIKey = await aiService.checkAPIKeyConfigured('LLM')
    if (!hasAPIKey) {
      throw new Error('未配置AI API密钥')
    }

    // 使用新的AI服务进行流式调用
    let fullResponse = ''
    await aiService.callAIStream(
      llmMessages[llmMessages.length - 1].content,
      (chunk, fullContent) => {
        fullResponse = fullContent
      },
      'LLM',
      {
        temperature: 0.1,
        maxTokens: 6000, // 增加token限制以支持更详细的输出
        messages: llmMessages,
      }
    )

    let chunkCount = 0
    let totalContentLength = 0

    // 流式传输完成，解析完整响应
    try {
      // 提取JSON从markdown代码块中
      const cleanJson = extractJsonFromMarkdown(fullResponse)
      const result = JSON.parse(cleanJson)

      // 处理每个改动
      for (const change of result.change || []) {
        yield {
          type: 'change_analysis',
          changeId: change.change_id,
          filePath: change.file_path,
          operation: change.operation,
          changeSummary: change.change_summary,
          newPath: change.new_path,
          newContent: change.newContent,
          oldContent: change.oldContent,
          patch: change.patch,
          howToTest: change.how_to_test,
          rollback: change.rollback,
          riskLevel: change.risk_level,
          author: change.author,
          timestamp: change.timestamp,
          issueId: change.issue_id,
        }
      }
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError)
      console.error('原始响应:', fullResponse)
      yield {
        type: 'error',
        error: '解析AI响应失败: ' + parseError.message,
        rawResponse: fullResponse,
      }
    }
  } catch (error) {
    console.error('AI调用失败:', error)
    yield {
      type: 'error',
      error: 'AI调用失败: ' + error.message,
    }
  }
}

// 提取JSON从Markdown代码块中
function extractJsonFromMarkdown(text) {
  // 尝试多种方式提取JSON
  const patterns = [/```json\s*([\s\S]*?)\s*```/g, /```\s*([\s\S]*?)\s*```/g, /\{[\s\S]*\}/g]

  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        try {
          // 清理匹配的内容
          let cleanMatch = match.replace(/```json\s*/, '').replace(/```\s*/, '')
          return cleanMatch
        } catch (e) {
          continue
        }
      }
    }
  }

  // 如果都失败了，返回原始文本
  return text
}

// 文件索引服务
async function indexFiles(directory) {
  try {
    const files = await getFilesRecursively(directory)
    const indexedFiles = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8')
        const vector = await vectorizeCode(content)
        const meta = {
          path: file,
          content: content,
          size: content.length,
          mtime: fs.statSync(file).mtime.getTime(),
        }

        const id = await faissAdd(vector, meta)
        indexedFiles.push({ id, path: file, meta })
      } catch (error) {
        console.error(`索引文件失败 ${file}:`, error.message)
      }
    }

    return indexedFiles
  } catch (error) {
    console.error('文件索引失败:', error)
    throw error
  }
}

// 递归获取目录下所有文件
async function getFilesRecursively(dir) {
  const files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // 跳过node_modules和.git目录
      if (item === 'node_modules' || item === '.git') {
        continue
      }
      const subFiles = await getFilesRecursively(fullPath)
      files.push(...subFiles)
    } else {
      // 只索引代码文件
      const ext = path.extname(item)
      if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.cpp', '.c', '.h'].includes(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

// 搜索相关文件
async function searchRelatedFiles(query, topK = 5) {
  try {
    const queryVector = await vectorizeText(query)
    const results = await faissSearch(queryVector, topK)
    return results.map((result) => ({
      path: result.meta.path,
      content: result.meta.content,
      score: result.score,
    }))
  } catch (error) {
    console.error('搜索相关文件失败:', error)
    throw error
  }
}

// 更新文件索引
async function updateFileIndex(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const vector = await vectorizeCode(content)
    const meta = {
      path: filePath,
      content: content,
      size: content.length,
      mtime: fs.statSync(filePath).mtime.getTime(),
    }

    // 先搜索是否存在
    const queryVector = await vectorizeText(filePath)
    const results = await faissSearch(queryVector, 1)

    if (results.length > 0 && results[0].meta.path === filePath) {
      // 更新现有索引
      await faissUpdate(results[0].id, vector, meta)
      return results[0].id
    } else {
      // 创建新索引
      const id = await faissAdd(vector, meta)
      return id
    }
  } catch (error) {
    console.error('更新文件索引失败:', error)
    throw error
  }
}

// 删除文件索引
async function deleteFileIndex(filePath) {
  try {
    const queryVector = await vectorizeText(filePath)
    const results = await faissSearch(queryVector, 1)

    if (results.length > 0 && results[0].meta.path === filePath) {
      await faissDelete(results[0].id)
      return true
    }
    return false
  } catch (error) {
    console.error('删除文件索引失败:', error)
    throw error
  }
}

module.exports = {
  vectorizeText,
  vectorizeCode,
  faissAdd,
  faissSearch,
  faissDelete,
  faissUpdate,
  codeCompletion,
  batchCodeCompletionStream,
  batchCodeAllCompletionStream,
  indexFiles,
  searchRelatedFiles,
  updateFileIndex,
  deleteFileIndex,
  chatWithAIStream,
}

// 获取 DeepSeek API Key
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-104ec0b815584973bf91b742170782b9'

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

// 递归获取文件树，排除 ignore
function getProjectFileTree(rootDir, ignoreList) {
  function walk(dir) {
    let results = []
    const list = fs.readdirSync(dir)
    for (const file of list) {
      if (file.startsWith('.')) continue
      const filePath = path.join(dir, file)
      const relPath = path.relative(rootDir, filePath)
      if (ignoreList.some((ig) => relPath.startsWith(ig) || file === ig || filePath.endsWith(ig))) continue
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        results.push({
          type: 'directory',
          name: file,
          path: filePath,
          children: walk(filePath),
        })
      } else {
        results.push({
          type: 'file',
          name: file,
          path: filePath,
        })
      }
    }
    return results
  }
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
  const content = res.data.choices[0].message.content
  const cleanJson = extractJsonFromMarkdown(content)
  return JSON.parse(cleanJson)
}

// chatWithAI 集成意图解析（流式版本）
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

// 处理多来源路径，按权重累加和排序
async function processPathsForChatStream({
  editorFile,
  manualPaths = [],
  contextPaths = [],
  semanticPaths = [],
  vectorPaths = [],
  globalPaths = [],
  maxLength = 10,
}) {
  const WEIGHTS = {
    editor: 1.0,
    manual: 0.9,
    context: 0.8,
    semantic: 0.7,
    vector: 0.6,
    global: 0.5,
  }
  const pathMap = new Map()
  if (editorFile) {
    pathMap.set(editorFile, (pathMap.get(editorFile) || 0) + WEIGHTS.editor)
  }
  new Set(manualPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.manual)
  })
  new Set(contextPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.context)
  })
  new Set(semanticPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.semantic)
  })
  new Set(vectorPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.vector)
  })
  new Set(globalPaths).forEach((p) => {
    pathMap.set(p, (pathMap.get(p) || 0) + WEIGHTS.global)
  })

  const allPaths = Array.from(pathMap.keys())
  const localDirResult = await getLocalDirectory()
  const rootDir =
    typeof localDirResult === 'string' ? localDirResult : localDirResult.directory || localDirResult.path || ''
  const absPaths = allPaths.map((p) => {
    if (!p) return p
    if (path.isAbsolute(p)) return p
    return path.join(rootDir, p)
  })

  const result = absPaths
    .map((path, i) => ({ path, weight: pathMap.get(allPaths[i]) }))
    .sort((a, b) => (b.weight === a.weight ? a.path.localeCompare(b.path) : b.weight - a.weight))
    .slice(0, maxLength)
  return result
}
