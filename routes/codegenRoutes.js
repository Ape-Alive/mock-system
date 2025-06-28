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
        const result = await codegenService.generateCode({ techStack, outputType, uiLibrary, customLibrary, interfaceList, pageStructure, pageLogic })
        if (result.success) {
            res.json({ success: true, data: result })
        } else {
            res.status(500).json({ success: false, error: result.error })
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

module.exports = router