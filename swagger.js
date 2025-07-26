const swaggerJSDoc = require('swagger-jsdoc')

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Mock System API',
            version: '1.0.0',
            description: 'API 文档',
        },
    },
    apis: ['./routes/*.js'], // 扫描 routes 目录下所有 js 文件
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = swaggerSpec