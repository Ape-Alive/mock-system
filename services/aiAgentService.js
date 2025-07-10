const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { diff_match_patch } = require('diff-match-patch')
const { getLocalDirectory } = require('./dbService')

const VECTOR_SERVER = 'http://localhost:8300'
// 获取 DeepSeek API Key，优先用环境变量
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-'

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

// 多文件批量补全/修改
async function batchCodeCompletion(prompt, files) {
  // 组装多文件上下文
  const context = files.map((f) => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n')

  // TODO: 调用 DeepSeek 或其他 LLM 服务，传入多文件上下文
  // 这里模拟返回每个文件的修改建议
  const results = files.map((file) => ({
    path: file.path,
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

// DeepSeek LLM 意图解析
async function parseIntentWithDeepSeek(userInput, fileTree) {
  const systemPrompt = `You are a multilingual intent parser. Analyze user input in ANY language and output strictly in JSON format with no additional text. Intent names MUST be in English.

### Output Format
{
  "intent": "english_intent_name",
  "parameters": { /* key-value pairs */ }
}

### Intent-Parameter Mapping (English Only)
| Intent                  | Parameters                                       | Path Handling               |
|-------------------------|--------------------------------------------------|----------------------------|
| project_creation        | directory (str , absolute path), tech_stack, project_type        | N/A                        |
| feature_modification    | feature, modify_path (array)                     | ✅ Path as array           |
| feature_addition        | feature, add_path (array)                        | ✅ Path as array           |
| bug_fixing              | error_message, fix_path (array)                  | ✅ Path as array           |
| code_refactoring        | scope, refactor_path (array)                     | ✅ Path as array           |
| test_addition           | test_target, test_path (array)                   | ✅ Path as array           |
| code_review             | review_path (array)                              | ✅ Path as array           |
| dependency_management   | operation, package, version, dep_path (array)    | ✅ Path as array           |
| configuration_change    | config_file, setting, value, config_path (array) | ✅ Path as array           |
| database_operation      | operation, object, db_path (array)               | ✅ Path as array           |
| api_development         | method, endpoint, api_path (array)               | ✅ Path as array           |
| deployment_configuration| environment, deploy_path (array)                 | ✅ Path as array           |
| documentation_generation| target, doc_path (array)                         | ✅ Path as array           |
| code_explanation        | code_snippet, code_path (array)                  | ✅ Path as array           |
| code_conversion         | source_lang, target_lang, convert_path (array)   | ✅ Path as array           |
| performance_optimization| target, optimize_path (array)                    | ✅ Path as array           |
| security_hardening      | vulnerability, secure_path (array)               | ✅ Path as array           |
| internationalization    | language, i18n_path (array)                      | ✅ Path as array           |
| debugging_assistance    | error_log, debug_path (array)                    | ✅ Path as array           |

### Core Rules
1. **English Intent Names**: Always use specified English names
2. **Path/Directory Parameters**: Always return absolute paths as shown in the file tree above (never relative or partial)
3. **Path Parameters**: Return as arrays (even for single paths)
4. **Parameter Extraction**: Preserve original input values
5. **Missing Values**:
   - Path parameters → Empty array []
   - Non-path parameters → Empty string ""
6. **Unknown Intent**: {"intent":"unknown","parameters":{}}
7. **Output Format**: Single-line compact JSON only (no comments/formatting)

### Project File Tree (for context)
${JSON.stringify(fileTree)}

### User Input
`
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
  return JSON.parse(res.data.choices[0].message.content)
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
  // 这里只返回意图解析结果，后续可根据 intentResult.intent 做自动化处理
  return { success: true, reply: intentResult, fileTree }
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

// 批量文件写入
async function batchWriteFiles(files) {
  try {
    const results = []

    for (const file of files) {
      try {
        // 确保目录存在
        const dir = path.dirname(file.path)
        await fs.mkdir(dir, { recursive: true })

        // 写入文件
        await fs.writeFile(file.path, file.content, 'utf-8')
        results.push({ path: file.path, success: true })
      } catch (error) {
        results.push({ path: file.path, success: false, error: error.message })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    return {
      success: true,
      message: `成功写入 ${successCount} 个文件${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
      results,
    }
  } catch (error) {
    return { success: false, message: error.message }
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
  batchCodeCompletion,
  batchWriteFiles,
  generateDiff,
  applyDiff,
  chatWithAI,
  semanticSearch,
  codeRefactor,
  callLLM,
}
