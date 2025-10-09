const express = require('express')
const router = express.Router()
const codegenService = require('../services/codegenService')
const aiService = require('../services/aiService')

/**
 * @swagger
 * /api/codegen/options:
 *   get:
 *     summary: 获取代码生成配置选项
 *     tags: [Codegen]
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
// 获取代码生成配置选项
router.get('/api/codegen/options', (req, res) => {
  try {
    const techStackOptions = codegenService.getTechStackOptions()
    res.json({ success: true, data: { techStackOptions } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/codegen/ui-libraries/{techStack}:
 *   get:
 *     summary: 获取指定技术栈的UI库选项
 *     tags: [Codegen]
 *     parameters:
 *       - in: path
 *         name: techStack
 *         schema:
 *           type: string
 *         required: true
 *         description: 技术栈名称
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
// 获取UI库选项
router.get('/api/codegen/ui-libraries/:techStack', (req, res) => {
  try {
    const { techStack } = req.params
    const uiLibraryOptions = codegenService.getUILibraryOptions(techStack)
    res.json({ success: true, data: { uiLibraryOptions } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/codegen:
 *   post:
 *     summary: 生成代码
 *     tags: [Codegen]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               techStack:
 *                 type: string
 *               outputType:
 *                 type: string
 *               uiLibrary:
 *                 type: string
 *               customLibrary:
 *                 type: string
 *               interfaceList:
 *                 type: array
 *                 items:
 *                   type: object
 *               pageStructure:
 *                 type: object
 *               pageLogic:
 *                 type: object
 *     responses:
 *       200:
 *         description: 生成成功
 *       400:
 *         description: 缺少必填参数
 *       500:
 *         description: 服务器错误
 */
// 生成代码
router.post('/api/codegen', async (req, res) => {
  try {
    const { techStack, outputType, uiLibrary, customLibrary, interfaceList, pageStructure, pageLogic } = req.body
    if (!techStack || !outputType || !interfaceList || interfaceList.length === 0) {
      return res.status(400).json({ success: false, error: '缺少必填参数' })
    }
    const result = await codegenService.generateCode({
      techStack,
      outputType,
      uiLibrary,
      customLibrary,
      interfaceList,
      pageStructure,
      pageLogic,
    })
    if (result.success) {
      res.json({ success: true, data: result })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/codegen/preview:
 *   post:
 *     summary: 预览生成的代码
 *     tags: [Codegen]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 预览成功
 *       500:
 *         description: 服务器错误
 */
// 流式生成代码
router.post('/api/codegen/stream', async (req, res) => {
  try {
    const { techStack, outputType, uiLibrary, customLibrary, interfaceList, pageStructure, pageLogic } = req.body
    if (!techStack || !outputType || !interfaceList || interfaceList.length === 0) {
      return res.status(400).json({ success: false, error: '缺少必填参数' })
    }

    // 设置 SSE 头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })

    try {
      const interfaces = await codegenService.getInterfaceDetails(interfaceList)
      const apiDescription = codegenService.generateApiDescription(interfaces)
      const prompt = codegenService.generatePrompt({
        techStack,
        outputType,
        uiLibrary,
        customLibrary,
        pageStructure,
        pageLogic,
        apiDescription,
      })

      // 检查是否配置了API密钥
      const hasAPIKey = await aiService.checkAPIKeyConfigured('CODE')
      if (!hasAPIKey) {
        const mockCode = codegenService.generateMockCode({
          techStack,
          outputType,
          uiLibrary,
          interfaces,
          pageStructure,
          pageLogic,
        })
        res.write(`data: ${JSON.stringify({ content: mockCode })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }

      // 使用流式传输
      await aiService.callAIStream(prompt, (chunk, fullContent) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }, 'CODE')

      res.write('data: [DONE]\n\n')
      res.end()
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/codegen/download:
 *   post:
 *     summary: 下载生成的代码
 *     tags: [Codegen]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 下载成功
 *       500:
 *         description: 服务器错误
 */
// 将生成的代码写入本地目录
router.post('/api/codegen/write-to-local', async (req, res) => {
  try {
    const { code, techStack, outputType } = req.body

    if (!code || !techStack || !outputType) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }

    const result = await codegenService.writeCodeToLocalDirectory(code, techStack, outputType)

    if (result.success) {
      res.json({ success: true, data: result.data })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
