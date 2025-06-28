const nodePath = require('path')
const yaml = require('js-yaml')
const SwaggerParser = require('swagger-parser')
const config = require('../config')
const fileUtils = require('../utils/fileUtils')
const mockUtils = require('../utils/mockUtils')
const openApiUtils = require('../utils/openApiUtils')

class OpenApiService {
    // 导入OpenAPI/Swagger接口
    async importOpenApi(filePath, originalName) {
        try {
            const ext = nodePath.extname(originalName).toLowerCase()
            let rawContent = fileUtils.readFile(filePath, 'utf8')
            let apiDoc

            if (ext === '.yaml' || ext === '.yml') {
                apiDoc = yaml.load(rawContent)
            } else {
                apiDoc = JSON.parse(rawContent)
            }

            // 解析OpenAPI/Swagger
            apiDoc = await SwaggerParser.dereference(apiDoc)

            // 统一处理paths
            const paths = apiDoc.paths || {}
            let count = 0

            for (const [path, methods] of Object.entries(paths)) {
                for (const [method, op] of Object.entries(methods)) {
                    if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
                        continue
                    }

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
                                    bodyParams = mockUtils.schemaToMock(param.schema)
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
                        bodyParams = mockUtils.schemaToMock(op.requestBody.content['application/json'].schema)
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
                        pathContent.data = mockUtils.schemaToMock(respSchema)
                    } else {
                        pathContent.data = {}
                    }

                    // 自动生成说明字段
                    const queryParamsDesc = openApiUtils.paramsToDesc((op.parameters || []).filter((p) => p.in === 'query'))
                    const responseHeadersDesc = openApiUtils.paramsToDesc((op.parameters || []).filter((p) => p.in === 'header'))

                    let bodyParamsDesc = ''
                    if (
                        op.requestBody &&
                        op.requestBody.content &&
                        op.requestBody.content['application/json'] &&
                        op.requestBody.content['application/json'].schema
                    ) {
                        bodyParamsDesc = openApiUtils.schemaToDesc(op.requestBody.content['application/json'].schema)
                    } else if (Array.isArray(op.parameters)) {
                        const bodyParam = op.parameters.find((p) => p.in === 'body' && p.schema)
                        if (bodyParam) bodyParamsDesc = openApiUtils.schemaToDesc(bodyParam.schema)
                    }

                    let pathContentDesc = ''
                    if (respSchema) {
                        pathContentDesc = openApiUtils.schemaToDesc(respSchema)
                    }

                    const group = op['x-group'] || ''
                    const timestamp = Date.now() + Math.floor(Math.random() * 1000)
                    const fileName = `${pathName.replace(/\s+/g, '_').replace(/[^-\uFFFF\w\u4e00-\u9fa5_]/g, '')}_${timestamp}.json`
                    const mockFilePath = nodePath.join(config.MOCK_DIR, fileName)

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

                    fileUtils.writeJsonFile(mockFilePath, mockData)
                    count++
                }
            }

            return count
        } catch (error) {
            throw new Error(`导入失败: ${error.message}`)
        }
    }
}

module.exports = new OpenApiService()