const express = require('express')
const router = express.Router()
const aiAgent = require('../services/aiAgentService')
const { startWatching, rebuildIndex } = require('../services/aiAgentWatcherService')

// 代码/文本语义检索
router.post('/search', async (req, res) => {
  const { query, type = 'code', top_k = 5 } = req.body
  try {
    let vector
    if (type === 'code') {
      vector = await aiAgent.vectorizeCode(query)
    } else {
      vector = await aiAgent.vectorizeText(query)
    }
    let results = await aiAgent.faissSearch(vector, top_k)
    // 自动补全content字段，便于前端预览
    for (const item of results) {
      if (item.meta && item.meta.filePath) {
        // 自动补全content字段
        if (!item.meta.content) {
          try {
            const fileService = require('../services/fileService')
            const file = await fileService.readFile(item.meta.filePath)
            item.meta.content = file.content
          } catch (e) {
            item.meta.content = '// 读取文件失败: ' + e.message
          }
        }
        // 代码摘要（前20行或200字）
        if (item.meta.content) {
          const lines = item.meta.content.split('\n').slice(0, 20).join('\n')
          item.meta.summary = lines.length > 200 ? lines.slice(0, 200) + '...' : lines
        } else {
          item.meta.summary = ''
        }
        // 文件类型高亮（后缀）
        const ext = item.meta.filePath.split('.').pop().toLowerCase()
        item.meta.fileType = ext
      }
    }
    res.json({ results })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 单文件代码补全
router.post('/complete', async (req, res) => {
  const { prompt, context = '' } = req.body
  try {
    const result = await aiAgent.codeCompletion(prompt, context)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 多文件批量补全/修改
router.post('/batch-complete', async (req, res) => {
  const { prompt, files } = req.body
  try {
    const result = await aiAgent.batchCodeCompletion(prompt, files)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 批量文件写入
router.post('/batch-write', async (req, res) => {
  const { files } = req.body
  try {
    const result = await aiAgent.batchWriteFiles(files)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 设置监听目录
router.post('/set-watch-dir', (req, res) => {
  const { dir } = req.body
  startWatching(dir)
  res.json({ success: true })
})

// 手动触发全量索引重建
router.post('/update-index', async (req, res) => {
  const { dir } = req.body
  try {
    await rebuildIndex(dir)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// AI多轮对话
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    const result = await aiAgent.chatWithAI(messages)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 获取历史记录
router.get('/history', async (req, res) => {
  try {
    const { filePath, page = 1, pageSize = 10 } = req.query
    const history = await aiAgent.getFileHistory(filePath, Number(page), Number(pageSize))
    res.json({ success: true, data: history })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 回滚到历史版本
router.post('/rollback', async (req, res) => {
  try {
    const { filePath, historyId } = req.body
    await aiAgent.rollbackFile(filePath, historyId)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 批量写入文件
router.post('/batch-write', async (req, res) => {
  try {
    const { files } = req.body
    const result = await aiAgent.batchWriteFiles(files)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
