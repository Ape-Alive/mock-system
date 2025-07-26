const express = require('express')
const router = express.Router()
const mockService = require('../services/mockService')

/**
 * @swagger
 * /create-mock:
 *   post:
 *     summary: 创建请求项端点
 *     tags: [Mock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 请求项创建成功
 *       400:
 *         description: 错误
 */
// 创建请求项端点
router.post('/create-mock', (req, res) => {
    try {
        const result = mockService.createMock(req.body)
        // 注册路由处理函数
        mockService.registerRouteHandler(
            result.routeKey,
            result.data.path,
            result.data.pathType,
            JSON.stringify(result.data.pathContent),
            result.data.mockType,
            result.data.responseHeaders
        )
        res.status(201).send('请求项创建成功')
    } catch (err) {
        res.status(400).send(`错误: ${err.message}`)
    }
})

// 更新请求项端点
router.put('/update-mock/:filename', (req, res) => {
    try {
        const fileName = req.params.filename
        const result = mockService.updateMock(fileName, req.body)

        // 移除旧路由处理函数
        mockService.unregisterRouteHandler(result.oldRouteKey)

        // 注册新路由处理函数
        mockService.registerRouteHandler(
            result.newRouteKey,
            result.updatedData.path,
            result.updatedData.pathType,
            JSON.stringify(result.updatedData.pathContent),
            result.updatedData.mockType,
            result.updatedData.responseHeaders
        )

        res.status(200).send('请求项更新成功')
    } catch (err) {
        res.status(400).send(`错误: ${err.message}`)
    }
})

// 删除请求项端点
router.delete('/delete-mock/:filename', (req, res) => {
    try {
        const fileName = req.params.filename
        const result = mockService.deleteMock(fileName)

        // 移除路由处理函数
        mockService.unregisterRouteHandler(result.routeKey)

        res.status(200).send('请求项删除成功')
    } catch (err) {
        res.status(400).send(`错误: ${err.message}`)
    }
})

// 获取请求项列表
router.get('/mock-list', (req, res) => {
    try {
        const mockItems = mockService.getMockList()
        res.json(mockItems)
    } catch (err) {
        res.status(500).send('无法读取请求项列表')
    }
})

// 获取单个请求项
router.get('/mock-item/:filename', (req, res) => {
    try {
        const data = mockService.getMockItem(req.params.filename)
        res.json(data)
    } catch (err) {
        res.status(404).send('请求项不存在')
    }
})

// 批量分组接口
router.post('/batch-group', (req, res) => {
    try {
        const { fileNames, group } = req.body
        if (!Array.isArray(fileNames) || typeof group !== 'string') {
            return res.status(400).send('参数错误')
        }

        const updated = mockService.batchGroup(fileNames, group)
        res.json({ updated })
    } catch (err) {
        res.status(500).send('批量分组失败')
    }
})

module.exports = router