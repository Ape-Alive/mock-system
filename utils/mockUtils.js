const Mock = require('mockjs')

// 简单schema转mockjs模板
function schemaToMock(schema) {
    if (!schema) return {}

    // 优先处理enum
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
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

// 生成Mock数据
function generateMockData(content, mockType) {
    try {
        let jsonContent = JSON.parse(content)
        if (mockType === 'mockjsTemplate') {
            jsonContent = Mock.mock(jsonContent)
        }
        return jsonContent
    } catch (error) {
        throw new Error(`Mock数据生成失败: ${error.message}`)
    }
}

module.exports = {
    schemaToMock,
    generateMockData,
}