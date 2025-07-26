const express = require('express')
const router = express.Router()
const multer = require('multer')
const openApiService = require('../services/openApiService')
const fileUtils = require('../utils/fileUtils')
const config = require('../config')

const upload = multer({ dest: config.UPLOAD_DIR })

/**
 * @swagger
 * /import-openapi:
 *   post:
 *     summary: 导入OpenAPI/Swagger接口
 *     tags:
 *       - OpenAPI
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
 *               group:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功导入接口
 *       400:
 *         description: 导入失败
 */
// 导入OpenAPI/Swagger接口
router.post('/import-openapi', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('未上传文件')
    }
    // 兼容form-data和x-www-form-urlencoded
    const group = req.body.group || (req.fields && req.fields.group) || ''
    const count = await openApiService.importOpenApi(req.file.path, req.file.originalname, group)

    // 删除临时文件
    fileUtils.deleteFile(req.file.path)

    res.status(200).send(`成功导入${count}个接口`)
  } catch (err) {
    if (req.file && fileUtils.fileExists(req.file.path)) {
      fileUtils.deleteFile(req.file.path)
    }
    res.status(400).send('导入失败: ' + err.message)
  }
})

module.exports = router
