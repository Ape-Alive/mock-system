const express = require('express')
const fs = require('fs')
const nodePath = require('path')
const bodyParser = require('body-parser')
const Mock = require('mockjs')
const multer = require('multer')
const yaml = require('js-yaml')
const SwaggerParser = require('swagger-parser')

const app = express()
const PORT = 3200
const MOCK_DIR = nodePath.join(__dirname, 'mockJson')
const upload = multer({ dest: 'uploads/' })

// 确保mock目录存在
if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR)
}

// 中间件
app.use(bodyParser.json())
app.use(express.static('public'))

// 存储路由处理函数
const routeHandlers = new Map()

// 创建请求项端点
app.post('/create-mock', (req, res) => {
  try {
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
    } = req.body
    // 验证JSON
    JSON.parse(pathContent)
    const parsedQueryParams = queryParams ? JSON.parse(queryParams) : {}
    const parsedHeaders = headers ? JSON.parse(headers) : {}
    const parsedBodyParams = bodyParams ? JSON.parse(bodyParams) : null
    const parsedResponseHeaders = responseHeaders ? JSON.parse(responseHeaders) : {}
    // 检查是否已存在相同的路径和请求类型
    const routeKey = `${pathType}:${routePath}`
    if (routeHandlers.has(routeKey)) {
      return res.status(400).send('已存在相同请求路径和类型的配置')
    }
    // 生成文件名
    const timestamp = Date.now()
    const fileName = `${pathName.replace(/\s+/g, '_')}_${timestamp}.json`
    const filePath = nodePath.join(MOCK_DIR, fileName)
    // 保存文件
    const mockData = {
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
    fs.writeFileSync(filePath, JSON.stringify(mockData, null, 2))
    // 注册路由
    registerRoute(routeKey, routePath, pathType, pathContent, mockType, parsedResponseHeaders)
    res.status(201).send('请求项创建成功')
  } catch (err) {
    res.status(400).send(`错误: ${err.message}`)
  }
})

// 更新请求项端点
app.put('/update-mock/:filename', (req, res) => {
  try {
    const fileName = req.params.filename
    const filePath = nodePath.join(MOCK_DIR, fileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('请求项不存在')
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
    } = req.body
    // 验证JSON
    JSON.parse(pathContent)
    const parsedQueryParams = queryParams ? JSON.parse(queryParams) : {}
    const parsedHeaders = headers ? JSON.parse(headers) : {}
    const parsedBodyParams = bodyParams ? JSON.parse(bodyParams) : null
    const parsedResponseHeaders = responseHeaders ? JSON.parse(responseHeaders) : {}
    // 读取旧数据
    const oldData = JSON.parse(fs.readFileSync(filePath))
    const oldRouteKey = `${oldData.pathType}:${oldData.path}`
    const newRouteKey = `${newPathType}:${newRoutePath}`
    // 如果路径或类型改变，检查新组合是否已存在
    if (oldRouteKey !== newRouteKey && routeHandlers.has(newRouteKey)) {
      return res.status(400).send('已存在相同请求路径和类型的配置')
    }
    // 移除旧路由
    unregisterRoute(oldRouteKey, oldData.path, oldData.pathType)
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
    // 保存更新
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2))
    // 注册新路由
    registerRoute(newRouteKey, newRoutePath, newPathType, pathContent, mockType, parsedResponseHeaders)
    res.status(200).send('请求项更新成功')
  } catch (err) {
    res.status(400).send(`错误: ${err.message}`)
  }
})

// 删除请求项端点
app.delete('/delete-mock/:filename', (req, res) => {
  try {
    const fileName = req.params.filename
    const filePath = nodePath.join(MOCK_DIR, fileName)

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('请求项不存在')
    }

    // 读取数据以获取路由信息
    const data = JSON.parse(fs.readFileSync(filePath))
    const routeKey = `${data.pathType}:${data.path}`

    // 移除路由
    unregisterRoute(routeKey, data.path, data.pathType)

    // 删除文件
    fs.unlinkSync(filePath)

    res.status(200).send('请求项删除成功')
  } catch (err) {
    res.status(400).send(`错误: ${err.message}`)
  }
})

// 获取请求项列表
app.get('/mock-list', (req, res) => {
  try {
    const files = fs.readdirSync(MOCK_DIR)
    const mockItems = []
    files.forEach((file) => {
      const filePath = nodePath.join(MOCK_DIR, file)
      try {
        const data = JSON.parse(fs.readFileSync(filePath))
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
    res.json(mockItems)
  } catch (err) {
    res.status(500).send('无法读取请求项列表')
  }
})

// 获取单个请求项
app.get('/mock-item/:filename', (req, res) => {
  try {
    const filePath = nodePath.join(MOCK_DIR, req.params.filename)
    const data = JSON.parse(fs.readFileSync(filePath))
    res.json(data)
  } catch (err) {
    res.status(404).send('请求项不存在')
  }
})

// 导入OpenAPI/Swagger接口
app.post('/import-openapi', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('未上传文件')
    const ext = nodePath.extname(req.file.originalname).toLowerCase()
    let rawContent = fs.readFileSync(req.file.path, 'utf8')
    let apiDoc
    if (ext === '.yaml' || ext === '.yml') {
      apiDoc = yaml.load(rawContent)
    } else {
      apiDoc = JSON.parse(rawContent)
    }
    // 解析OpenAPI/Swagger
    apiDoc = await SwaggerParser.dereference(apiDoc)
    // ====== 新增：字段说明生成辅助函数 ======
    function schemaToDesc(schema) {
      if (!schema) return {}
      // allOf 合并
      if (schema.allOf && Array.isArray(schema.allOf)) {
        return schema.allOf.reduce(
          (acc, sub) => {
            const subDesc = schemaToDesc(sub)
            // 合并fields
            if (subDesc.fields) {
              acc.fields = { ...(acc.fields || {}), ...subDesc.fields }
            }
            // 合并items
            if (subDesc.items) {
              acc.items = subDesc.items
            }
            // 合并type
            if (subDesc.type && !acc.type) acc.type = subDesc.type
            return acc
          },
          { type: 'object', desc: schema.description || '', fields: {} }
        )
      }
      // oneOf/anyOf 取第一个
      if (schema.oneOf && Array.isArray(schema.oneOf)) {
        return schemaToDesc(schema.oneOf[0])
      }
      if (schema.anyOf && Array.isArray(schema.anyOf)) {
        return schemaToDesc(schema.anyOf[0])
      }
      // 对象
      if (schema.type === 'object' && schema.properties) {
        const fields = {}
        for (const [k, v] of Object.entries(schema.properties)) {
          fields[k] = schemaToDesc(v)
          if (v.description) fields[k].desc = v.description
        }
        return { type: 'object', desc: schema.description || '', fields }
      }
      // 数组
      if (schema.type === 'array' && schema.items) {
        return { type: 'array', desc: schema.description || '', items: schemaToDesc(schema.items) }
      }
      // 基础类型
      return { type: schema.type || 'string', desc: schema.description || '' }
    }
    function paramsToDesc(params) {
      const desc = {}
      params.forEach((param) => {
        desc[param.name] = {
          desc: param.description || '',
          type: param.schema ? param.schema.type : 'string',
        }
      })
      return desc
    }
    // 统一处理paths
    const paths = apiDoc.paths || {}
    let count = 0
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) continue
        const pathName = op.summary || op.operationId || `${method.toUpperCase()} ${path}`
        const pathType = method.toUpperCase()
        const mockType = 'mockjsTemplate'
        const queryParams = {}
        const headers = {}
        let bodyParams = null
        let responseHeaders = { 'Content-Type': 'application/json' }
        // 处理参数
        if (Array.isArray(op.parameters)) {
          op.parameters.forEach((param) => {
            if (param.in === 'query') queryParams[param.name] = param.example || ''
            if (param.in === 'header') headers[param.name] = param.example || ''
            if (param.in === 'body') {
              // Swagger 2 body参数
              if (param.schema) {
                bodyParams = schemaToMock(param.schema)
              } else if (param.example) {
                bodyParams = param.example
              }
            }
          })
        }
        // OpenAPI 3 requestBody
        if (
          op.requestBody &&
          op.requestBody.content &&
          op.requestBody.content['application/json'] &&
          op.requestBody.content['application/json'].schema
        ) {
          bodyParams = schemaToMock(op.requestBody.content['application/json'].schema)
        }
        // 生成响应内容
        let pathContent = { code: 200, message: 'success' }
        let respSchema = null
        if (op.responses) {
          // OpenAPI 3: content->application/json->schema
          if (
            op.responses['200'] &&
            op.responses['200'].content &&
            op.responses['200'].content['application/json'] &&
            op.responses['200'].content['application/json'].schema
          ) {
            respSchema = op.responses['200'].content['application/json'].schema
          } else if (op.responses['200'] && op.responses['200'].schema) {
            // Swagger 2
            respSchema = op.responses['200'].schema
          }
        }
        if (respSchema) {
          pathContent.data = schemaToMock(respSchema)
        } else {
          pathContent.data = {}
        }
        // ====== 新增：自动生成说明字段 ======
        const queryParamsDesc = paramsToDesc((op.parameters || []).filter((p) => p.in === 'query'))
        const responseHeadersDesc = paramsToDesc((op.parameters || []).filter((p) => p.in === 'header'))
        let bodyParamsDesc = ''
        if (
          op.requestBody &&
          op.requestBody.content &&
          op.requestBody.content['application/json'] &&
          op.requestBody.content['application/json'].schema
        ) {
          bodyParamsDesc = schemaToDesc(op.requestBody.content['application/json'].schema)
        } else if (Array.isArray(op.parameters)) {
          const bodyParam = op.parameters.find((p) => p.in === 'body' && p.schema)
          if (bodyParam) bodyParamsDesc = schemaToDesc(bodyParam.schema)
        }
        let pathContentDesc = ''
        if (respSchema) {
          pathContentDesc = schemaToDesc(respSchema)
        }
        const group = op['x-group'] || ''
        const timestamp = Date.now() + Math.floor(Math.random() * 1000)
        const fileName = `${pathName.replace(/\s+/g, '_').replace(/[^-\uFFFF\w\u4e00-\u9fa5_]/g, '')}_${timestamp}.json`
        const filePath = nodePath.join(MOCK_DIR, fileName)
        const mockData = {
          pathName,
          path,
          pathType,
          mockType,
          queryParams,
          queryParamsDesc,
          headers,
          responseHeaders,
          responseHeadersDesc,
          pathContent,
          pathContentDesc,
          bodyParams,
          bodyParamsDesc,
          group,
          fileName,
          createdAt: new Date().toISOString(),
        }
        fs.writeFileSync(filePath, JSON.stringify(mockData, null, 2))
        count++
      }
    }
    fs.unlinkSync(req.file.path)
    res.status(200).send(`成功导入${count}个接口`)
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(400).send('导入失败: ' + err.message)
  }
})

// 简单schema转mockjs模板
function schemaToMock(schema) {
  if (!schema) return {}
  // 优先处理enum
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    // 返回mockjs的@pick语法
    return `@pick(${JSON.stringify(schema.enum)})`
  }
  // 处理 allOf/oneOf/anyOf
  if (schema.allOf && Array.isArray(schema.allOf)) {
    let result = {}
    for (const item of schema.allOf) {
      const mock = schemaToMock(item)
      if (typeof mock === 'object' && mock !== null && !Array.isArray(mock)) {
        result = Object.assign(result, mock)
      } else {
        // 如果遇到基础类型（如mockjs模板字符串），直接返回
        return mock
      }
    }
    return result
  }
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    return schemaToMock(schema.oneOf[0])
  }
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    return schemaToMock(schema.anyOf[0])
  }
  if (schema.type === 'object' && schema.properties) {
    const obj = {}
    for (const [k, v] of Object.entries(schema.properties)) {
      obj[k] = schemaToMock(v)
    }
    return obj
  }
  if (schema.type === 'array' && schema.items) {
    return [schemaToMock(schema.items)]
  }
  if (schema.example !== undefined) return schema.example
  if (schema.type === 'string') return '@string'
  if (schema.type === 'integer') return '@integer(1,100000)'
  if (schema.type === 'number') return '@float(1,10000,1,2)'
  if (schema.type === 'boolean') return '@boolean'
  return {}
}

// 注册路由函数
function registerRoute(routeKey, routePath, method, content, mockType, responseHeaders = {}) {
  const methodLower = method.toLowerCase()
  // 创建新的路由处理函数
  const handler = (req, res) => {
    try {
      // 设置响应头
      if (responseHeaders && typeof responseHeaders === 'object') {
        Object.entries(responseHeaders).forEach(([k, v]) => res.setHeader(k, v))
      }
      // 添加延迟模拟网络请求
      setTimeout(() => {
        let jsonContent = JSON.parse(content)
        if (mockType === 'mockjsTemplate') {
          jsonContent = Mock.mock(jsonContent)
        }
        res.json(jsonContent)
      }, 300)
    } catch (err) {
      res.status(500).json({ error: 'JSON解析错误', details: err.message })
    }
  }
  // 添加路由
  app[methodLower](routePath, handler)
  // 存储处理函数
  routeHandlers.set(routeKey, handler)
  console.log(`已注册路由: ${method} ${routePath}`)
}

// 移除路由函数
function unregisterRoute(routeKey, routePath, method) {
  if (routeHandlers.has(routeKey)) {
    const handler = routeHandlers.get(routeKey)

    // 从Express路由栈中移除
    const router = app._router
    if (router) {
      // 找到并移除匹配的路由
      const layerIndex = router.stack.findIndex((layer) => {
        return (
          layer.route &&
          layer.route.path === routePath &&
          layer.route.methods[method.toLowerCase()] &&
          layer.handle === handler
        )
      })

      if (layerIndex !== -1) {
        router.stack.splice(layerIndex, 1)
      }
    }

    // 从路由处理函数Map中移除
    routeHandlers.delete(routeKey)

    console.log(`已移除路由: ${method} ${routePath}`)
  }
}

// 启动时加载已有mock路由
function loadExistingMocks() {
  try {
    const files = fs.readdirSync(MOCK_DIR)
    let loaded = 0,
      skipped = 0
    files.forEach((file) => {
      const filePath = nodePath.join(MOCK_DIR, file)
      try {
        const mockData = JSON.parse(fs.readFileSync(filePath))
        const routeKey = `${mockData.pathType}:${mockData.path}`
        registerRoute(
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
  } catch (err) {
    console.error('加载现有mock路由失败:', err)
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  loadExistingMocks()
})

// 批量分组接口
app.post('/batch-group', (req, res) => {
  try {
    const { fileNames, group } = req.body
    if (!Array.isArray(fileNames) || typeof group !== 'string') {
      return res.status(400).send('参数错误')
    }
    let updated = 0
    fileNames.forEach((fileName) => {
      const filePath = nodePath.join(MOCK_DIR, fileName)
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath))
          data.group = group
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
          updated++
        } catch {}
      }
    })
    res.json({ updated })
  } catch (err) {
    res.status(500).send('批量分组失败')
  }
})

// ====== 分组树相关工具函数 ======
const GROUP_DATA_PATH = nodePath.join(__dirname, 'groupInfo/groupData.json')
function readGroupData() {
  if (!fs.existsSync(GROUP_DATA_PATH)) return []
  return JSON.parse(fs.readFileSync(GROUP_DATA_PATH, 'utf-8'))
}
function writeGroupData(data) {
  fs.writeFileSync(GROUP_DATA_PATH, JSON.stringify(data, null, 2))
}
function findGroupById(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children && node.children.length) {
      const found = findGroupById(node.children, id)
      if (found) return found
    }
  }
  return null
}
function deleteGroupById(tree, id) {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      tree.splice(i, 1)
      return true
    }
    if (tree[i].children && tree[i].children.length) {
      const deleted = deleteGroupById(tree[i].children, id)
      if (deleted) return true
    }
  }
  return false
}
// ====== 分组树相关接口 ======
// 获取全部分组
app.get('/api/group-info', (req, res) => {
  const data = readGroupData()
  // 只返回根节点（id为0）
  const root = data.find((g) => g.id === 0)
  res.json(root ? [root] : [])
})
// 获取单个分组
app.get('/api/group-info/:id', (req, res) => {
  const id = Number(req.params.id)
  const data = readGroupData()
  const group = findGroupById(data, id)
  if (!group) return res.status(404).json({ error: '分组不存在' })
  res.json(group)
})
// 新增分组
app.post('/api/group-info', (req, res) => {
  const { name, parentId } = req.body
  if (!name) return res.status(400).json({ error: '分组名不能为空' })
  if (parentId === -1 || parentId === '-1') {
    return res.status(400).json({ error: '未分组下不能创建子分组' })
  }
  const data = readGroupData()
  const newGroup = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name,
    children: [],
    files: [],
  }
  if (parentId === 0 || parentId === '0' || parentId === undefined || parentId === null) {
    // 插入到 id 为 0 的 children
    const root = data.find((g) => g.id === 0)
    if (!root) return res.status(500).json({ error: '根分组不存在' })
    root.children.push(newGroup)
  } else {
    const parent = findGroupById(data, Number(parentId))
    if (!parent) return res.status(404).json({ error: '父分组不存在' })
    parent.children.push(newGroup)
  }
  writeGroupData(data)
  res.json(newGroup)
})
// 删除分组
app.delete('/api/group-info/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!id && id !== 0) return res.status(400).json({ error: '分组ID不能为空' })
  if (id === 0 || id === -1) return res.status(400).json({ error: '不能删除全部或未分组' })
  const data = readGroupData()
  const group = findGroupById(data, id)
  if (!group) return res.status(404).json({ error: '分组不存在' })

  // 先清空该分组 files 里的 mockJson group 字段
  if (Array.isArray(group.files) && group.files.length > 0) {
    const mockDir = require('path').join(__dirname, 'mockJson')
    const fs = require('fs')
    group.files.forEach((fileName) => {
      const filePath = require('path').join(mockDir, fileName)
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          data.group = ''
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
        } catch {}
      }
    })
  }

  const deleted = deleteGroupById(data, id)
  if (!deleted) return res.status(404).json({ error: '分组不存在' })
  writeGroupData(data)
  res.json({ success: true })
})
// 修改分组下接口（增删改）
app.post('/api/group-info/:id/files', (req, res) => {
  const id = Number(req.params.id)
  const { files } = req.body
  if (!Array.isArray(files)) return res.status(400).json({ error: 'files必须为数组' })
  const data = readGroupData()
  const group = findGroupById(data, id)
  if (!group) return res.status(404).json({ error: '分组不存在' })

  // 如果是清空分组
  if (files.length === 0 && Array.isArray(group.files) && group.files.length > 0) {
    // 清空 group.files
    const oldFiles = group.files
    group.files = []
    // 同步清空 mockJson 里这些文件的 group 字段
    const mockDir = require('path').join(__dirname, 'mockJson')
    const fs = require('fs')
    oldFiles.forEach((fileName) => {
      const filePath = require('path').join(mockDir, fileName)
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          data.group = ''
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
        } catch {}
      }
    })
  } else {
    group.files = files
  }
  writeGroupData(data)
  res.json({ success: true, files: group.files })
})
