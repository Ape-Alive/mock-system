// 字段说明生成辅助函数
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

module.exports = {
    schemaToDesc,
    paramsToDesc,
}