const chokidar = require('chokidar')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const aiAgent = require('./aiAgentService')
const fileIndex = require('./aiAgentFileIndexService')
const axios = require('axios')

let watcher = null

function calcHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function startWatching(targetDir) {
  if (watcher) watcher.close()
  watcher = chokidar.watch(targetDir, { ignoreInitial: false })

  watcher
    .on('add', (filePath) => handleFileChange(filePath, 'add'))
    .on('change', (filePath) => handleFileChange(filePath, 'modify'))
    .on('unlink', (filePath) => handleFileChange(filePath, 'delete'))
}

async function handleFileChange(filePath, action) {
  if (!/\.(js|ts|vue|py|java|go|c|cpp)$/.test(filePath)) return

  if (action === 'delete') {
    const record = await fileIndex.getFileByPath(filePath)
    if (record) {
      await aiAgent.faissDelete(record.vectorId)
      await fileIndex.deleteFileByPath(filePath)
    }
  } else {
    const content = fs.readFileSync(filePath, 'utf-8')
    const hash = calcHash(content)
    const mtime = fs.statSync(filePath).mtimeMs
    const record = await fileIndex.getFileByPath(filePath)

    if (record && record.fileHash === hash) return // 无需更新

    const vector = await aiAgent.vectorizeCode(content)
    let vectorId
    if (record) {
      await aiAgent.faissUpdate(record.vectorId, vector, { filePath })
      vectorId = record.vectorId
    } else {
      vectorId = await aiAgent.faissAdd(vector, { filePath })
    }
    await fileIndex.upsertFile(filePath, hash, vectorId, mtime)
  }
}

async function rebuildIndex(targetDir) {
  // 1. 清空 Faiss 内存
  await axios.post('http://localhost:8300/faiss/clear')

  // 2. 遍历所有文件，保证数据库和 Faiss 一致
  const exts = ['.js', '.ts', '.vue', '.py', '.java', '.go', '.c', '.cpp']
  function walk(dir) {
    let results = []
    const list = fs.readdirSync(dir)
    for (const file of list) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(filePath))
      } else if (exts.includes(path.extname(filePath))) {
        results.push(filePath)
      }
    }
    return results
  }
  const files = walk(targetDir)
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const hash = calcHash(content)
    const mtime = fs.statSync(filePath).mtimeMs
    let record = await fileIndex.getFileByPath(filePath)
    let vectorId
    const vector = await aiAgent.vectorizeCode(content)
    if (record) {
      vectorId = record.vectorId
      // 保证 Faiss 内存同步（用原 vectorId）
      await aiAgent.faissAdd(vector, { filePath }, vectorId)
    } else {
      // 新文件，先 add 到 Faiss，获得 vectorId
      vectorId = await aiAgent.faissAdd(vector, { filePath })
    }
    // upsert 数据库，保证数据库和 Faiss 一致
    await fileIndex.upsertFile(filePath, hash, vectorId, mtime)
  }
}

module.exports = { startWatching, rebuildIndex }
