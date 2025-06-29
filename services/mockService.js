const nodePath = require('path')
const config = require('../config')
const fileUtils = require('../utils/fileUtils')
const mockUtils = require('../utils/mockUtils')
const groupService = require('./groupService')

class MockService {
  constructor() {
    this.routeHandlers = new Map()
    this.ensureMockDirectory()
  }

  ensureMockDirectory() {
    fileUtils.ensureDirectoryExists(config.MOCK_DIR)
  }

  // 创建Mock项
  createMock(mockData) {
    const {
      pathName,
      path: routePath,
      pathType,
      pathContent,
      queryParams,
      headers,
      mockType,
      bodyParams,
      responseHeaders,
      group,
      queryParamsDesc,
      bodyParamsDesc,
      responseHeadersDesc,
      pathContentDesc,
    } = mockData

    // 验证JSON
    JSON.parse(pathContent)
    const parsedQueryParams = queryParams ? JSON.parse(queryParams) : {}
    const parsedHeaders = headers ? JSON.parse(headers) : {}
    const parsedBodyParams = bodyParams ? JSON.parse(bodyParams) : null
    const parsedResponseHeaders = responseHeaders ? JSON.parse(responseHeaders) : {}

    // 检查是否已存在相同的路径和请求类型
    const routeKey = `${pathType}:${routePath}`
    if (this.routeHandlers.has(routeKey)) {
      throw new Error('已存在相同请求路径和类型的配置')
    }

    // 生成文件名
    const timestamp = Date.now()
    const fileName = `${pathName.replace(/\s+/g, '_')}_${timestamp}.json`
    const filePath = nodePath.join(config.MOCK_DIR, fileName)

    // 保存文件
    const data = {
      pathName,
      path: routePath,
      pathType,
      mockType,
      queryParams: parsedQueryParams,
      queryParamsDesc: queryParamsDesc || '',
      headers: parsedHeaders,
      pathContent: JSON.parse(pathContent),
      pathContentDesc: pathContentDesc || '',
      bodyParams: parsedBodyParams,
      bodyParamsDesc: bodyParamsDesc || '',
      responseHeaders: parsedResponseHeaders,
      responseHeadersDesc: responseHeadersDesc || '',
      group: group || '',
      fileName,
      createdAt: new Date().toISOString(),
    }

    fileUtils.writeJsonFile(filePath, data)
    // 新增：同步到分组树
    if (group && group.trim()) {
      groupService.addFileToGroup(group, fileName)
    }
    return { fileName, routeKey, data }
  }

  // 更新Mock项
  updateMock(fileName, mockData) {
    const filePath = nodePath.join(config.MOCK_DIR, fileName)
    if (!fileUtils.fileExists(filePath)) {
      throw new Error('请求项不存在')
    }

    const {
      pathName,
      path: newRoutePath,
      pathType: newPathType,
      pathContent,
      queryParams,
      headers,
      mockType,
      bodyParams,
      responseHeaders,
      group,
      queryParamsDesc,
      bodyParamsDesc,
      responseHeadersDesc,
      pathContentDesc,
    } = mockData

    // 验证JSON
    JSON.parse(pathContent)
    const parsedQueryParams = queryParams ? JSON.parse(queryParams) : {}
    const parsedHeaders = headers ? JSON.parse(headers) : {}
    const parsedBodyParams = bodyParams ? JSON.parse(bodyParams) : null
    const parsedResponseHeaders = responseHeaders ? JSON.parse(responseHeaders) : {}

    // 读取旧数据
    const oldData = fileUtils.readJsonFile(filePath)
    const oldRouteKey = `${oldData.pathType}:${oldData.path}`
    const newRouteKey = `${newPathType}:${newRoutePath}`

    // 如果路径或类型改变，检查新组合是否已存在
    if (oldRouteKey !== newRouteKey && this.routeHandlers.has(newRouteKey)) {
      throw new Error('已存在相同请求路径和类型的配置')
    }

    // 更新数据
    const updatedData = {
      ...oldData,
      pathName,
      path: newRoutePath,
      pathType: newPathType,
      mockType,
      queryParams: parsedQueryParams,
      queryParamsDesc: queryParamsDesc || '',
      headers: parsedHeaders,
      pathContent: JSON.parse(pathContent),
      pathContentDesc: pathContentDesc || '',
      bodyParams: parsedBodyParams,
      bodyParamsDesc: bodyParamsDesc || '',
      responseHeaders: parsedResponseHeaders,
      responseHeadersDesc: responseHeadersDesc || '',
      group: group || oldData.group || '',
      updatedAt: new Date().toISOString(),
    }

    fileUtils.writeJsonFile(filePath, updatedData)
    return { oldRouteKey, newRouteKey, updatedData }
  }

  // 删除Mock项
  deleteMock(fileName) {
    const filePath = nodePath.join(config.MOCK_DIR, fileName)
    if (!fileUtils.fileExists(filePath)) {
      throw new Error('请求项不存在')
    }

    const data = fileUtils.readJsonFile(filePath)
    const routeKey = `${data.pathType}:${data.path}`

    fileUtils.deleteFile(filePath)
    return { routeKey, data }
  }

  // 获取Mock列表
  getMockList() {
    const files = fileUtils.getDirectoryFiles(config.MOCK_DIR)
    const mockItems = []

    files.forEach((file) => {
      const filePath = nodePath.join(config.MOCK_DIR, file)
      try {
        const data = fileUtils.readJsonFile(filePath)
        mockItems.push({
          fileName: file,
          pathName: data.pathName,
          path: data.path,
          pathType: data.pathType,
          createdAt: data.createdAt,
          bodyParams: data.bodyParams || null,
          responseHeaders: data.responseHeaders || {},
          group: data.group || '',
        })
      } catch (err) {
        console.warn(`跳过无效mock文件: ${file}，原因: ${err.message}`)
      }
    })

    return mockItems
  }

  // 获取单个Mock项
  getMockItem(fileName) {
    const filePath = nodePath.join(config.MOCK_DIR, fileName)
    return fileUtils.readJsonFile(filePath)
  }

  // 批量分组
  batchGroup(fileNames, group) {
    let updated = 0
    fileNames.forEach((fileName) => {
      const filePath = nodePath.join(config.MOCK_DIR, fileName)
      if (fileUtils.fileExists(filePath)) {
        try {
          const data = fileUtils.readJsonFile(filePath)
          data.group = group
          fileUtils.writeJsonFile(filePath, data)
          updated++
        } catch (error) {
          console.warn(`更新文件失败: ${fileName}`, error.message)
        }
      }
    })
    return updated
  }

  // 注册路由处理函数（不直接注册到Express）
  registerRouteHandler(routeKey, routePath, method, content, mockType, responseHeaders = {}) {
    const handler = (req, res) => {
      try {
        // 设置响应头
        if (responseHeaders && typeof responseHeaders === 'object') {
          Object.entries(responseHeaders).forEach(([k, v]) => res.setHeader(k, v))
        }

        // 添加延迟模拟网络请求
        setTimeout(() => {
          const jsonContent = mockUtils.generateMockData(content, mockType)
          res.json(jsonContent)
        }, 300)
      } catch (err) {
        res.status(500).json({ error: 'JSON解析错误', details: err.message })
      }
    }

    this.routeHandlers.set(routeKey, handler)
    console.log(`已注册路由: ${method} ${routePath}`)
    return handler
  }

  // 移除路由处理函数
  unregisterRouteHandler(routeKey) {
    if (this.routeHandlers.has(routeKey)) {
      this.routeHandlers.delete(routeKey)
      console.log(`已移除路由: ${routeKey}`)
      return true
    }
    return false
  }

  // 获取路由处理函数
  getRouteHandler(routeKey) {
    return this.routeHandlers.get(routeKey)
  }

  // 检查路由是否存在
  hasRoute(routeKey) {
    return this.routeHandlers.has(routeKey)
  }

  // 加载现有Mock路由
  loadExistingMocks() {
    try {
      const files = fileUtils.getDirectoryFiles(config.MOCK_DIR)
      let loaded = 0
      let skipped = 0

      files.forEach((file) => {
        const filePath = nodePath.join(config.MOCK_DIR, file)
        try {
          const mockData = fileUtils.readJsonFile(filePath)
          const routeKey = `${mockData.pathType}:${mockData.path}`

          this.registerRouteHandler(
            routeKey,
            mockData.path,
            mockData.pathType,
            JSON.stringify(mockData.pathContent),
            mockData.mockType,
            mockData.responseHeaders || {}
          )
          loaded++
        } catch (err) {
          console.warn(`跳过无效mock文件: ${file}，原因: ${err.message}`)
          skipped++
        }
      })

      console.log(`已加载 ${loaded} 个mock路由，跳过 ${skipped} 个无效文件`)
      return { loaded, skipped }
    } catch (err) {
      console.error('加载现有mock路由失败:', err)
      throw err
    }
  }
}

module.exports = new MockService()
