const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')
const fileUtils = require('./utils/fileUtils')
const mockService = require('./services/mockService')
const routeMiddleware = require('./middleware/routeMiddleware')

// 导入路由
const mockRoutes = require('./routes/mockRoutes')
const openApiRoutes = require('./routes/openApiRoutes')
const groupRoutes = require('./routes/groupRoutes')
const codegenRoutes = require('./routes/codegenRoutes')
const fileRoutes = require('./routes/fileRoutes')

const app = express()

// 确保必要的目录存在
fileUtils.ensureDirectoryExists(config.MOCK_DIR)
fileUtils.ensureDirectoryExists(config.UPLOAD_DIR)

// 中间件
app.use(bodyParser.json())
app.use(express.static(config.PUBLIC_DIR))

// 注册路由
app.use('/', mockRoutes)
app.use('/', openApiRoutes)
app.use('/', groupRoutes)
app.use('/', codegenRoutes)
app.use('/', fileRoutes)

// 设置动态路由中间件
routeMiddleware.setupDynamicRoutes(app)

// 启动时加载已有mock路由
function loadExistingMocks() {
  try {
    mockService.loadExistingMocks()
  } catch (err) {
    console.error('加载现有mock路由失败:', err)
  }
}

// 启动服务器
function startServer() {
  app.listen(config.PORT, () => {
    console.log(`服务器运行在 http://localhost:${config.PORT}`)
    loadExistingMocks()
  })
}

module.exports = { app, startServer }
