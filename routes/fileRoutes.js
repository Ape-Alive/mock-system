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

// 设置本地目录
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

// 获取本地目录信息
router.get('/api/file/directory', async (req, res) => {
  try {
    const directoryInfo = await fileService.getLocalDirectory()
    res.json({ success: true, data: directoryInfo })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取目录树
router.get('/api/file/tree', async (req, res) => {
  try {
    const tree = await fileService.getDirectoryTree()
    res.json({ success: true, data: tree })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

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
