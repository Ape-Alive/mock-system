const express = require('express')
const router = express.Router()
const codegenService = require('../services/codegenService')

// 获取代码生成配置选项
router.get('/api/codegen/options', (req, res) => {
  try {
    const techStackOptions = codegenService.getTechStackOptions()
    res.json({ success: true, data: { techStackOptions } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

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

      // 如果没有配置API密钥，使用模拟代码生成
      if (!codegenService.deepseekConfig.apiKey) {
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
      await codegenService.callDeepSeekAPIStream(prompt, (chunk, fullContent) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      })

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

module.exports = router
