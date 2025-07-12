const fs = require('fs').promises
const path = require('path')

async function batchWriteFiles(files) {
  const results = []
  for (const file of files) {
    try {
      const dir = path.dirname(file.path)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(file.path, file.content, 'utf-8')
      results.push({ path: file.path, success: true })
    } catch (error) {
      results.push({ path: file.path, success: false, error: error.message })
    }
  }
  const successCount = results.filter((r) => r.success).length
  const failCount = results.length - successCount
  return {
    success: failCount === 0,
    message: `成功写入 ${successCount} 个文件${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
    results,
  }
}

module.exports = { batchWriteFiles }
