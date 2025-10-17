const express = require('express')
const router = express.Router()
const fileService = require('../services/fileService')
const multer = require('multer')

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
})

/**
 * @swagger
 * /api/file/set-directory:
 *   post:
 *     summary: 设置本地目录
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               directoryPath:
 *                 type: string
 *               projectName:
 *                 type: string
 *     responses:
 *       200:
 *         description: 设置成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/api/file/set-directory', async (req, res) => {
  try {
    const { directoryPath, projectName } = req.body

    if (!directoryPath) {
      return res.status(400).json({ success: false, error: '目录路径不能为空' })
    }

    // 验证目录
    await fileService.validateDirectory(directoryPath)

    // 设置目录
    await fileService.setLocalDirectory(directoryPath, projectName)

    res.json({
      success: true,
      data: {
        directory: directoryPath,
        projectName: projectName,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/directory:
 *   get:
 *     summary: 获取本地目录信息
 *     tags: [File]
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
// 获取本地目录信息
router.get('/api/file/directory', async (req, res) => {
  try {
    const directoryInfo = await fileService.getLocalDirectory()
    res.json({ success: true, data: directoryInfo })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/tree:
 *   get:
 *     summary: 获取目录树
 *     tags: [File]
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
// 获取目录树
router.get('/api/file/tree', async (req, res) => {
  try {
    const result = await fileService.getDirectoryTree()

    // 检查是否返回错误格式
    if (result.returnStatus) {
      res.status(400).json(result)
    } else {
      res.json({ success: true, data: result })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/read:
 *   get:
 *     summary: 读取文件内容
 *     tags: [File]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         required: true
 *         description: 文件路径
 *     responses:
 *       200:
 *         description: 读取成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 读取文件内容
router.get('/api/file/read', async (req, res) => {
  try {
    const filePath = req.query.path

    if (!filePath) {
      return res.status(400).json({ success: false, error: '文件路径不能为空' })
    }

    const result = await fileService.readFile(filePath)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/write:
 *   post:
 *     summary: 写入文件内容
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: 写入成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 写入文件内容
router.post('/api/file/write', async (req, res) => {
  try {
    const { filePath, content } = req.body

    if (!filePath || content === undefined) {
      return res.status(400).json({ success: false, error: '文件路径和内容不能为空' })
    }

    const result = await fileService.writeFile(filePath, content)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/create:
 *   post:
 *     summary: 创建文件
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 创建文件
router.post('/api/file/create', async (req, res) => {
  try {
    const { filePath, content = '' } = req.body

    if (!filePath) {
      return res.status(400).json({ success: false, error: '文件路径不能为空' })
    }

    const result = await fileService.createFile(filePath, content)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/mkdir:
 *   post:
 *     summary: 创建目录
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dirPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 创建目录
router.post('/api/file/mkdir', async (req, res) => {
  try {
    const { dirPath } = req.body

    if (!dirPath) {
      return res.status(400).json({ success: false, error: '目录路径不能为空' })
    }

    const result = await fileService.createDirectory(dirPath)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/delete:
 *   delete:
 *     summary: 删除文件或目录
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 删除文件或目录
router.delete('/api/file/delete', async (req, res) => {
  try {
    const { itemPath } = req.body

    if (!itemPath) {
      return res.status(400).json({ success: false, error: '项目路径不能为空' })
    }

    const result = await fileService.deleteItem(itemPath)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/rename:
 *   put:
 *     summary: 重命名文件或目录
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPath:
 *                 type: string
 *               newName:
 *                 type: string
 *     responses:
 *       200:
 *         description: 重命名成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 重命名文件或目录
router.put('/api/file/rename', async (req, res) => {
  try {
    const { oldPath, newName } = req.body

    if (!oldPath || !newName) {
      return res.status(400).json({ success: false, error: '旧路径和新名称不能为空' })
    }

    const result = await fileService.renameItem(oldPath, newName)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/upload:
 *   post:
 *     summary: 上传文件
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               uploadPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 上传文件
router.post('/api/file/upload', upload.single('file'), async (req, res) => {
  try {
    const { uploadPath } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, error: '没有上传文件' })
    }

    const targetPath = uploadPath || file.originalname
    const result = await fileService.uploadFile(targetPath, file.buffer)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/write-generated-code:
 *   post:
 *     summary: 将生成的代码写入本地目录
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codeData:
 *                 type: object
 *               techStack:
 *                 type: string
 *               outputType:
 *                 type: string
 *     responses:
 *       200:
 *         description: 写入成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 将生成的代码写入本地目录
router.post('/api/file/write-generated-code', async (req, res) => {
  try {
    const { codeData, techStack, outputType } = req.body

    if (!codeData || !techStack || !outputType) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }

    const result = await fileService.writeGeneratedCode(codeData, techStack, outputType)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/execute-command:
 *   post:
 *     summary: 执行命令
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *               cwd:
 *                 type: string
 *     responses:
 *       200:
 *         description: 执行成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
// 执行命令
router.post('/api/file/execute-command', async (req, res) => {
  try {
    const { command, cwd } = req.body

    if (!command) {
      return res.status(400).json({ success: false, error: '命令不能为空' })
    }

    const result = await fileService.executeCommand(command, cwd)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/clear-directory:
 *   post:
 *     summary: 清空本地目录（测试用）
 *     tags: [File]
 *     responses:
 *       200:
 *         description: 清空成功
 *       500:
 *         description: 服务器错误
 */
// 清空本地目录（测试用）
router.post('/api/file/clear-directory', async (req, res) => {
  console.log('收到清空本地目录请求')
  try {
    await fileService.clearLocalDirectory()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/list-directories:
 *   get:
 *     summary: 列举指定目录下的所有子目录（不递归）
 *     tags: [File]
 *     parameters:
 *       - in: query
 *         name: base
 *         schema:
 *           type: string
 *         required: false
 *         description: 基础目录
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
// 列举指定目录下的所有子目录（不递归）
router.get('/api/file/list-directories', async (req, res) => {
  try {
    const base = req.query.base || null
    const dirs = await fileService.listSubdirectories(base)
    res.json({ success: true, directories: dirs })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/history:
 *   get:
 *     summary: 获取文件历史记录
 *     tags: [File]
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
// 获取文件历史记录
router.get('/api/file/history', async (req, res) => {
  try {
    const { filePath, page = 1, pageSize = 10 } = req.query
    const history = await fileService.getFileHistory(filePath, Number(page), Number(pageSize))
    res.json({ success: true, data: history })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/history-by-id:
 *   get:
 *     summary: 根据ID获取历史记录
 *     tags: [File]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: 历史记录ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
// 根据ID获取历史记录
router.get('/api/file/history-by-id', async (req, res) => {
  try {
    const { id } = req.query
    const history = await fileService.getHistoryById(id)
    res.json({ success: true, data: history })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/rollback:
 *   post:
 *     summary: 回滚到历史版本
 *     tags: [File]
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
router.post('/api/file/rollback', async (req, res) => {
  try {
    const { filePath, historyId } = req.body
    await fileService.rollbackFile(filePath, historyId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/batch-write:
 *   post:
 *     summary: 批量写入文件
 *     tags: [File]
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
// 批量写入文件
router.post('/api/file/batch-write', async (req, res) => {
  try {
    const { files } = req.body
    const results = await fileService.batchWriteFiles(files)
    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * @swagger
 * /api/file/batch-delete:
 *   post:
 *     summary: 批量删除文件
 *     tags: [File]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePaths:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       500:
 *         description: 服务器错误
 */
// 批量删除文件
router.post('/api/file/batch-delete', async (req, res) => {
  try {
    const { filePaths } = req.body
    const results = await fileService.batchDeleteFiles(filePaths)
    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
