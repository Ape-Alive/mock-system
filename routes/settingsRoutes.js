const express = require('express')
const router = express.Router()
const dbService = require('../services/dbService')
const aiService = require('../services/aiService')

// 获取设置
router.get('/', async (req, res) => {
  try {
    const settings = await dbService.getSettings()
    res.json({ success: true, data: settings })
  } catch (error) {
    console.error('获取设置失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 保存设置
router.post('/', async (req, res) => {
  try {
    const settings = req.body
    const result = await dbService.saveSettings(settings)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('保存设置失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 验证API密钥
router.post('/validate-api-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body

    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      })
    }

    const isValid = await validateAPIKey(provider, apiKey)
    res.json({ success: true, valid: isValid })
  } catch (error) {
    console.error('验证API密钥失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 验证API密钥的通用函数
async function validateAPIKey(provider, apiKey) {
  try {
    const providers = await dbService.getAIProviders()
    const models = await dbService.getAIModels()
    
    const providerInfo = providers.find(p => p.name === provider)
    if (!providerInfo) {
      throw new Error(`未找到提供者: ${provider}`)
    }

    // 获取一个测试模型
    const testModel = models.find(m => 
      m.providerId === providerInfo.id && 
      m.isActive
    )

    if (!testModel) {
      throw new Error(`未找到可用的测试模型`)
    }

    // 根据提供者类型进行验证
    switch (provider) {
      case 'openai':
        return await validateOpenAIKey(apiKey, testModel.name, providerInfo.endpoint)
      case 'claude':
        return await validateClaudeKey(apiKey, testModel.name, providerInfo.endpoint)
      case 'deepseek':
        return await validateDeepSeekKey(apiKey, testModel.name, providerInfo.endpoint)
      case 'gemini':
        return await validateGeminiKey(apiKey, testModel.name, providerInfo.endpoint)
      case 'custom':
        return await validateCustomKey(apiKey, providerInfo.endpoint)
      default:
        throw new Error(`不支持的提供者类型: ${provider}`)
    }
  } catch (error) {
    console.error('验证API密钥失败:', error)
    return false
  }
}

// 验证OpenAI API密钥
async function validateOpenAIKey(apiKey, model, endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    })
    return response.ok
  } catch (error) {
    console.error('OpenAI API密钥验证失败:', error)
    return false
  }
}

// 验证Claude API密钥
async function validateClaudeKey(apiKey, model, endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    })
    return response.ok
  } catch (error) {
    console.error('Claude API密钥验证失败:', error)
    return false
  }
}

// 验证DeepSeek API密钥
async function validateDeepSeekKey(apiKey, model, endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    })
    return response.ok
  } catch (error) {
    console.error('DeepSeek API密钥验证失败:', error)
    return false
  }
}

// 验证Gemini API密钥
async function validateGeminiKey(apiKey, model, endpoint) {
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`)
    return response.ok
  } catch (error) {
    console.error('Gemini API密钥验证失败:', error)
    return false
  }
}

// 验证自定义API密钥
async function validateCustomKey(apiKey, endpoint) {
  // 自定义API的验证逻辑可以根据具体需求实现
  // 这里简单返回true，表示验证通过
  return true
}

// 获取AI提供者列表
router.get('/providers', async (req, res) => {
  try {
    const providers = await dbService.getAIProviders()
    res.json({ success: true, data: providers })
  } catch (error) {
    console.error('获取AI提供者失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取AI模型列表
router.get('/ai-models', async (req, res) => {
  try {
    const models = await dbService.getAIModels()
    res.json({ success: true, data: models })
  } catch (error) {
    console.error('获取AI模型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 根据提供者获取模型列表
router.get('/ai-models/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params
    const models = await dbService.getAIModelsByProvider(providerId)
    res.json({ success: true, data: models })
  } catch (error) {
    console.error('获取AI模型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 添加AI提供者
router.post('/providers', async (req, res) => {
  try {
    const providerData = req.body
    const result = await dbService.addAIProvider(providerData)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('添加AI提供者失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 更新AI提供者
router.put('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body
    const result = await dbService.updateAIProvider(id, updateData)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('更新AI提供者失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 删除AI提供者
router.delete('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await dbService.deleteAIProvider(id)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('删除AI提供者失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 添加AI模型
router.post('/ai-models', async (req, res) => {
  try {
    const modelData = req.body
    const result = await dbService.addAIModel(modelData)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('添加AI模型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 更新AI模型
router.put('/ai-models/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body
    const result = await dbService.updateAIModel(id, updateData)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('更新AI模型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 删除AI模型
router.delete('/ai-models/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await dbService.deleteAIModel(id)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('删除AI模型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 初始化默认数据
router.post('/initialize-default-data', async (req, res) => {
  try {
    const result = await dbService.initializeDefaultData()
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('初始化默认数据失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取可用的模型类型
router.get('/model-types', async (req, res) => {
  try {
    const modelTypes = await aiService.getAvailableModelTypes()
    res.json({ success: true, data: modelTypes })
  } catch (error) {
    console.error('获取模型类型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 根据模型类型获取模型
router.get('/models-by-type/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params
    const models = await aiService.getModelsByType(modelType)
    res.json({ success: true, data: models })
  } catch (error) {
    console.error('获取模型失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

module.exports = router
