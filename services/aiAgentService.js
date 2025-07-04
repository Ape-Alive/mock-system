const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const VECTOR_SERVER = 'http://localhost:8300';

// 文本向量化
async function vectorizeText(text) {
  const res = await axios.post(`${VECTOR_SERVER}/vectorize/text`, { text });
  return res.data.vector;
}

// 代码向量化
async function vectorizeCode(code) {
  const res = await axios.post(`${VECTOR_SERVER}/vectorize/code`, { code });
  return res.data.vector;
}

// Faiss 新增向量
async function faissAdd(vector, meta, id = null) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/add`, { vector, meta, id });
  return res.data.id;
}

// Faiss 检索
async function faissSearch(vector, top_k = 5) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/search`, { vector, top_k });
  return res.data.results;
}

// Faiss 删除
async function faissDelete(id) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/delete`, { id });
  return res.data.success;
}

// Faiss 更新
async function faissUpdate(id, vector, meta = null) {
  const res = await axios.post(`${VECTOR_SERVER}/faiss/update`, { id, vector, meta });
  return res.data.success;
}

// 单文件补全（LLM）
async function codeCompletion(prompt, context = '') {
  // TODO: 调用 DeepSeek 或其他 LLM 服务
  return { completion: '// 补全内容示例' };
}

// 多文件批量补全/修改
async function batchCodeCompletion(prompt, files) {
  // 组装多文件上下文
  const context = files.map(f => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n');

  // TODO: 调用 DeepSeek 或其他 LLM 服务，传入多文件上下文
  // 这里模拟返回每个文件的修改建议
  const results = files.map(file => ({
    path: file.path,
    oldContent: file.content,
    newContent: `// AI 修改后的内容\n${file.content}\n// 添加的注释`,
    diff: `+ // AI 修改后的内容\n${file.content}\n+ // 添加的注释`
  }));

  return { results };
}

// 批量文件写入
async function batchWriteFiles(files) {
  try {
    const results = [];

    for (const file of files) {
      try {
        // 确保目录存在
        const dir = path.dirname(file.path);
        await fs.mkdir(dir, { recursive: true });

        // 写入文件
        await fs.writeFile(file.path, file.content, 'utf-8');
        results.push({ path: file.path, success: true });
      } catch (error) {
        results.push({ path: file.path, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return {
      success: true,
      message: `成功写入 ${successCount} 个文件${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
      results
    };
  } catch (error) {
    return { success: false, message: error.message };
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
};