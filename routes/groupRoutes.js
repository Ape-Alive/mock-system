const express = require('express')
const router = express.Router()
const groupService = require('../services/groupService')

/**
 * @swagger
 * /api/group-info:
 *   get:
 *     summary: 获取全部分组信息
 *     tags: [Group]
 *     responses:
 *       200:
 *         description: 获取成功，返回分组列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: 服务器错误
 */
// 获取全部分组
router.get('/api/group-info', (req, res) => {
    try {
        const groups = groupService.getAllGroups()
        res.json(groups)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

/**
 * @swagger
 * /api/group-info/{groupId}:
 *   get:
 *     summary: 获取指定分组信息
 *     tags: [Group]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: 分组ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 未找到
 *       500:
 *         description: 服务器错误
 */
// 获取单个分组
router.get('/api/group-info/:id', (req, res) => {
    try {
        const id = Number(req.params.id)
        const group = groupService.getGroupById(id)
        res.json(group)
    } catch (err) {
        res.status(404).json({ error: err.message })
    }
})

// 新增分组
router.post('/api/group-info', (req, res) => {
    try {
        const { name, parentId } = req.body
        const newGroup = groupService.createGroup(name, parentId)
        res.json(newGroup)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
})

// 删除分组
router.delete('/api/group-info/:id', (req, res) => {
    try {
        const id = Number(req.params.id)
        groupService.deleteGroup(id)
        res.json({ success: true })
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
})

// 修改分组下接口（增删改）
router.post('/api/group-info/:id/files', (req, res) => {
    try {
        const id = Number(req.params.id)
        const { files, mergeMode = false } = req.body
        const result = groupService.updateGroupFiles(id, files, mergeMode)
        res.json({ success: true, files: result })
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
})

module.exports = router