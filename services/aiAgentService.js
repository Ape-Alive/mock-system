const axios = require('axios')
const fs = require('fs').promises
const path = require('path')
const { diff_match_patch } = require('diff-match-patch')

const VECTOR_SERVER = 'http://localhost:8300'

// 文本向量化
async function vectorizeText(text) {
  const res = await axios.post(`${VECTOR_SERVER}/vectorize/text`, { text })
  return res.data.vector
}

// 代码向量化
async function vectorizeCode(code) {
  const res = await axios.post(`${VECTOR_SERVER}/vectorize/code`, { code })
  return res.data.vector
}

// Faiss 新增向量
async function faissAdd(vector, meta, id = null) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/add`, { vector, meta, id })
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

// AI多轮对话
async function chatWithAI(messages) {
  try {
    const lastMessage = messages[messages.length - 1]
    let reply = ''

    if (lastMessage.content.includes('搜索') || lastMessage.content.includes('查找')) {
      // 调用语义搜索
      const searchResults = await semanticSearch(lastMessage.content)
      reply = `找到以下相关代码：\n${searchResults.map((r) => `- ${r.meta.filePath}`).join('\n')}`
    } else if (lastMessage.content.includes('补全') || lastMessage.content.includes('完成')) {
      // 调用代码补全
      reply = await codeCompletion(lastMessage.content, messages)
    } else if (lastMessage.content.includes('重构') || lastMessage.content.includes('优化')) {
      // 调用代码重构
      reply = await codeRefactor(lastMessage.content, messages)
    } else {
      // 通用回复
      reply = `我理解您的需求："${lastMessage.content}"。我可以帮您：
1. 搜索相关代码片段
2. 提供代码补全建议
3. 重构和优化代码
4. 解释代码逻辑

请告诉我您具体需要什么帮助？`
    }

    return { success: true, reply }
  } catch (error) {
    return { success: false, error: error.message }
  }
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
