const express = require('express')
const router = express.Router()
const aiAgent = require('../services/aiAgentService')
const { startWatching, rebuildIndex } = require('../services/aiAgentWatcherService')

/**
 * @swagger
 * /search:
 *   post:
 *     summary: 代码/文本语义检索
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [code, text]
 *               top_k:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 检索结果
 *       500:
 *         description: 服务器错误
 */
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

/**
 * @swagger
 * /complete:
 *   post:
 *     summary: 单文件代码补全
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               context:
 *                 type: string
 *     responses:
 *       200:
 *         description: 补全结果
 *       500:
 *         description: 服务器错误
 */
// 单文件代码补全
// router.post('/complete', async (req, res) => {
//   const { prompt, context = '' } = req.body
//   try {
//     const result = await aiAgent.codeCompletion(prompt, context)
//     res.json(result)
//   } catch (e) {
//     res.status(500).json({ error: e.message })
//   }
// })

/**
 * @swagger
 * /batch-complete:
 *   post:
 *     summary: 多文件批量补全/修改
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 批量补全结果
 *       500:
 *         description: 服务器错误
 */
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

/**
 * @swagger
 * /batch-write:
 *   post:
 *     summary: 批量文件写入
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 写入成功
 *       500:
 *         description: 服务器错误
 */
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

/**
 * @swagger
 * /set-watch-dir:
 *   post:
 *     summary: 设置监听目录
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dir:
 *                 type: string
 *     responses:
 *       200:
 *         description: 设置成功
 */
// 设置监听目录
router.post('/set-watch-dir', (req, res) => {
  const { dir } = req.body
  startWatching(dir)
  res.json({ success: true })
})

/**
 * @swagger
 * /update-index:
 *   post:
 *     summary: 手动触发全量索引重建
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dir:
 *                 type: string
 *     responses:
 *       200:
 *         description: 重建成功
 *       500:
 *         description: 服务器错误
 */
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

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: AI多轮对话
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: 对话结果
 *       500:
 *         description: 服务器错误
 */
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

/**
 * @swagger
 * /chat/stream:
 *   post:
 *     summary: AI多轮对话（流式SSE）
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: 对话消息数组
 *               editorFile:
 *                 type: string
 *                 description: 编辑器当前文件路径
 *               manualPaths:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 手动添加的路径列表
 *               contextPaths:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 上下文路径列表（最近4个请求）
 *     responses:
 *       200:
 *         description: 流式对话结果，包含类型化的响应数据
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [intent_info, action_start, command_item, text_response, code_modification, general_response, action_complete, error]
 *                   description: 响应数据类型
 *                 action:
 *                   type: string
 *                   description: 操作类型
 *                 message:
 *                   type: string
 *                   description: 消息内容
 *                 content:
 *                   type: string
 *                   description: 响应内容
 *                 parameters:
 *                   type: object
 *                   description: 参数信息
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 时间戳
 *                 id:
 *                   type: string
 *                   description: 唯一标识符
 *       500:
 *         description: 服务器错误
 */
// AI多轮对话（流式SSE）
router.post('/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  try {
    const { messages, editorFile, manualPaths, contextPaths } = req.body

    for await (const chunk of aiAgent.chatWithAIStream(messages, editorFile, manualPaths, contextPaths)) {
    //   console.log('chunk:', chunk)
      // 为每个chunk添加时间戳
      const enhancedChunk = {
        ...chunk,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
      }
      res.write(`data: ${JSON.stringify(enhancedChunk)}\n\n`)
    }
    res.write('event: end\ndata: [DONE]\n\n')
    res.end()
  } catch (e) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: e.message, timestamp: new Date().toISOString() })}\n\n`)
    res.end()
  }
})

/**
 * @swagger
 * /history:
 *   get:
 *     summary: 获取历史记录
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: filePath
 *         schema:
 *           type: string
 *         required: false
 *         description: 文件路径
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         required: false
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
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

/**
 * @swagger
 * /rollback:
 *   post:
 *     summary: 回滚到历史版本
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *               historyId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 回滚成功
 *       500:
 *         description: 服务器错误
 */
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
