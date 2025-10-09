const dbService = require('./dbService')
const OpenAI = require('openai')

class AIService {
  constructor() {
    this.openai = null
    this.currentConfig = null
  }

  // 根据modelType获取AI配置
  async getAIConfig(modelType = 'LLM') {
    try {
      const settings = await dbService.getSettings()
      const providers = await dbService.getAIProviders()
      const models = await dbService.getAIModels()

      // 获取当前激活的提供者
      const currentProvider = providers.find(p => p.name === settings.provider)
      if (!currentProvider) {
        throw new Error(`未找到提供者: ${settings.provider}`)
      }

      // 根据modelType获取对应的模型
      const currentModel = models.find(m => 
        m.providerId === currentProvider.id && 
        m.modelType === modelType && 
        m.isActive
      )

      if (!currentModel) {
        throw new Error(`未找到${modelType}类型的模型`)
      }

      // 获取API密钥
      const apiKey = settings.apiKeys?.[settings.provider]
      if (!apiKey) {
        throw new Error(`未配置${settings.provider}的API密钥`)
      }

      return {
        provider: currentProvider,
        model: currentModel,
        apiKey,
        settings
      }
    } catch (error) {
      console.error('获取AI配置失败:', error)
      throw error
    }
  }

  // 初始化OpenAI客户端
  async initializeClient(modelType = 'LLM') {
    try {
      const config = await this.getAIConfig(modelType)
      
      this.currentConfig = config
      this.openai = new OpenAI({
        baseURL: config.provider.host,
        apiKey: config.apiKey,
      })

      return config
    } catch (error) {
      console.error('初始化AI客户端失败:', error)
      throw error
    }
  }

  // 调用AI API（非流式）
  async callAI(prompt, modelType = 'LLM', options = {}) {
    try {
      if (!this.openai || this.currentConfig?.model.modelType !== modelType) {
        await this.initializeClient(modelType)
      }

      const completion = await this.openai.chat.completions.create({
        model: this.currentConfig.model.name,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || this.currentConfig.settings.modelParams?.temperature || 0.7,
        max_tokens: options.maxTokens || this.currentConfig.settings.modelParams?.maxTokens || 4000,
        ...options
      })

      if (completion.choices && completion.choices[0]) {
        return completion.choices[0].message.content
      } else {
        throw new Error('API响应格式错误')
      }
    } catch (error) {
      throw new Error(`${this.currentConfig?.provider.displayName || 'AI'} API错误: ${error.message}`)
    }
  }

  // 调用AI API（流式）
  async callAIStream(prompt, onChunk, modelType = 'LLM', options = {}) {
    try {
      if (!this.openai || this.currentConfig?.model.modelType !== modelType) {
        await this.initializeClient(modelType)
      }

      const stream = await this.openai.chat.completions.create({
        model: this.currentConfig.model.name,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || this.currentConfig.settings.modelParams?.temperature || 0.7,
        max_tokens: options.maxTokens || this.currentConfig.settings.modelParams?.maxTokens || 4000,
        stream: true,
        ...options
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          onChunk(content, fullContent)
        }
      }
      return fullContent
    } catch (error) {
      throw new Error(`${this.currentConfig?.provider.displayName || 'AI'} API错误: ${error.message}`)
    }
  }

  // 获取可用的模型类型
  async getAvailableModelTypes() {
    try {
      const models = await dbService.getAIModels()
      const modelTypes = [...new Set(models.filter(m => m.isActive).map(m => m.modelType))]
      return modelTypes
    } catch (error) {
      console.error('获取模型类型失败:', error)
      throw error
    }
  }

  // 根据模型类型获取可用模型
  async getModelsByType(modelType) {
    try {
      const models = await dbService.getAIModels()
      return models.filter(m => m.modelType === modelType && m.isActive)
    } catch (error) {
      console.error('获取模型失败:', error)
      throw error
    }
  }

  // 检查API密钥是否配置
  async checkAPIKeyConfigured(modelType = 'LLM') {
    try {
      const config = await this.getAIConfig(modelType)
      return !!config.apiKey
    } catch (error) {
      return false
    }
  }
}

module.exports = new AIService()
