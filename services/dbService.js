const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = {
  prisma,

  // 本地目录相关
  async getLocalDirectory() {
    return await prisma.localDirectory.findUnique({ where: { id: 1 } })
  },

  async setLocalDirectory(directory, projectName) {
    return await prisma.localDirectory.upsert({
      where: { id: 1 },
      update: { directory, projectName },
      create: { id: 1, directory, projectName },
    })
  },
  async getSettings() {
    try {
      const settings = await prisma.settings.findFirst({
        orderBy: { id: 'desc' },
      })

      if (!settings) {
        // 返回默认设置
        return {
          provider: 'openai',
          apiKeys: {
            openai: '',
            claude: '',
            deepseek: '',
            gemini: '',
            custom: '',
          },
          customApi: {
            host: '',
            endpoint: '',
          },
          defaultModel: '',
          modelParams: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 1,
          },
          general: {
            initialDirectory: '',
            language: 'zh-CN',
            theme: 'dark',
            autoSave: true,
            saveInterval: 30,
          },
        }
      }

      return {
        provider: settings.provider || 'openai',
        apiKeys: settings.apiKeys || {
          openai: '',
          claude: '',
          deepseek: '',
          gemini: '',
          custom: '',
        },
        customApi: settings.customApi || {
          host: '',
          endpoint: '',
        },
        defaultModel: settings.defaultModel || '',
        modelParams: settings.modelParams || {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1,
        },
        general: settings.general || {
          initialDirectory: '',
          language: 'zh-CN',
          theme: 'dark',
          autoSave: true,
          saveInterval: 30,
        },
      }
    } catch (error) {
      console.error('获取设置失败:', error)
      throw error
    }
  },

  async saveSettings(settings) {
    try {
      // 保存设置
      const result = await prisma.settings.upsert({
        where: { id: 1 },
        update: {
          provider: settings.provider,
          apiKeys: settings.apiKeys,
          customApi: settings.customApi,
          defaultModel: settings.defaultModel,
          modelParams: settings.modelParams,
          general: settings.general,
          updatedAt: new Date(),
        },
        create: {
          id: 1,
          provider: settings.provider,
          apiKeys: settings.apiKeys,
          customApi: settings.customApi,
          defaultModel: settings.defaultModel,
          modelParams: settings.modelParams,
          general: settings.general,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // 如果设置了初始目录，同时更新 LocalDirectory 表
      if (settings.general) {
        await prisma.localDirectory.upsert({
          where: { id: 1 },
          update: {
            directory: settings.general.initialDirectory,
            projectName: settings.general.projectName || null
          },
          create: {
            id: 1,
            directory: settings.general.initialDirectory,
            projectName: settings.general.projectName || null
          },
        })
        console.log('已更新 LocalDirectory 表:', settings.general.initialDirectory)
      }

      return result
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  },

  // 模型相关操作
  async getModels() {
    try {
      return await prisma.model.findMany({
        orderBy: { name: 'asc' },
      })
    } catch (error) {
      console.error('获取模型列表失败:', error)
      throw error
    }
  },

  async addModel(modelData) {
    try {
      return await prisma.model.create({
        data: {
          name: modelData.name,
          isBeta: modelData.isBeta || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('添加模型失败:', error)
      throw error
    }
  },

  async updateModel(id, updateData) {
    try {
      return await prisma.model.update({
        where: { id: parseInt(id) },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('更新模型失败:', error)
      throw error
    }
  },

  async deleteModel(id) {
    try {
      return await prisma.model.delete({
        where: { id: parseInt(id) },
      })
    } catch (error) {
      console.error('删除模型失败:', error)
      throw error
    }
  },

  async resetModels() {
    try {
      // 删除所有模型
      await prisma.model.deleteMany()

      // 添加默认模型
      const defaultModels = [
        { name: 'gpt-4', isBeta: false },
        { name: 'gpt-4-turbo', isBeta: false },
        { name: 'gpt-4o', isBeta: false },
        { name: 'gpt-4o-mini', isBeta: false },
        { name: 'gpt-3.5-turbo', isBeta: false },
        { name: 'gpt-3.5-turbo-16k', isBeta: false },
      ]

      return await prisma.model.createMany({
        data: defaultModels.map((model) => ({
          ...model,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })
    } catch (error) {
      console.error('重置模型失败:', error)
      throw error
    }
  },

  async saveModels(models) {
    try {
      // 先删除所有现有模型
      await prisma.model.deleteMany()

      // 批量插入新模型
      return await prisma.model.createMany({
        data: models.map((model) => ({
          name: model.name,
          isBeta: model.isBeta || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })
    } catch (error) {
      console.error('保存模型列表失败:', error)
      throw error
    }
  },

  // AI提供来源相关操作
  async getAIProviders() {
    try {
      return await prisma.aIProvider.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      })
    } catch (error) {
      console.error('获取AI提供来源失败:', error)
      throw error
    }
  },

  async getAIProviderByName(name) {
    try {
      return await prisma.aIProvider.findFirst({
        where: { name },
      })
    } catch (error) {
      console.error('获取AI提供来源失败:', error)
      throw error
    }
  },

  async addAIProvider(providerData) {
    try {
      return await prisma.aIProvider.create({
        data: {
          name: providerData.name,
          displayName: providerData.displayName,
          icon: providerData.icon,
          host: providerData.host,
          endpoint: providerData.endpoint,
          link: providerData.link,
          isActive: providerData.isActive !== false,
          isCustom: providerData.isCustom || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('添加AI提供来源失败:', error)
      throw error
    }
  },

  async updateAIProvider(id, updateData) {
    try {
      return await prisma.aIProvider.update({
        where: { id: parseInt(id) },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('更新AI提供来源失败:', error)
      throw error
    }
  },

  async deleteAIProvider(id) {
    try {
      return await prisma.aIProvider.delete({
        where: { id: parseInt(id) },
      })
    } catch (error) {
      console.error('删除AI提供来源失败:', error)
      throw error
    }
  },

  // AI模型相关操作
  async getAIModels() {
    try {
      return await prisma.aIModel.findMany({
        include: {
          provider: true,
        },
        orderBy: { name: 'asc' },
      })
    } catch (error) {
      console.error('获取AI模型失败:', error)
      throw error
    }
  },

  async getAIModelsByProvider(providerId) {
    try {
      return await prisma.aIModel.findMany({
        where: { providerId: parseInt(providerId) },
        include: {
          provider: true,
        },
        orderBy: { name: 'asc' },
      })
    } catch (error) {
      console.error('获取AI模型失败:', error)
      throw error
    }
  },

  async addAIModel(modelData) {
    try {
      return await prisma.aIModel.create({
        data: {
          name: modelData.name,
          displayName: modelData.displayName,
          providerId: parseInt(modelData.providerId),
          isBeta: modelData.isBeta || false,
          isActive: modelData.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('添加AI模型失败:', error)
      throw error
    }
  },

  async updateAIModel(id, updateData) {
    try {
      return await prisma.aIModel.update({
        where: { id: parseInt(id) },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('更新AI模型失败:', error)
      throw error
    }
  },

  async deleteAIModel(id) {
    try {
      return await prisma.aIModel.delete({
        where: { id: parseInt(id) },
      })
    } catch (error) {
      console.error('删除AI模型失败:', error)
      throw error
    }
  },

  // 初始化默认数据
  async initializeDefaultData() {
    try {
      // 检查是否已经有数据
      const existingProviders = await prisma.aIProvider.findMany()
      const existingModels = await prisma.aIModel.findMany()

      if (existingProviders.length > 0 && existingModels.length > 0) {
        return { success: true, message: '数据已存在，无需重新初始化' }
      }

      // 创建默认AI提供来源
      const defaultProviders = [
        {
          name: 'openai',
          displayName: 'OpenAI',
          icon: 'fas fa-brain',
          host: 'https://api.openai.com',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          link: 'https://openai.com',
          isActive: true,
          isCustom: false,
        },
        {
          name: 'claude',
          displayName: 'Claude',
          icon: 'fas fa-robot',
          host: 'https://api.anthropic.com',
          endpoint: 'https://api.anthropic.com/v1/messages',
          link: 'https://anthropic.com',
          isActive: true,
          isCustom: false,
        },
        {
          name: 'deepseek',
          displayName: 'DeepSeek',
          icon: 'fas fa-dolphin',
          host: 'https://api.deepseek.com',
          endpoint: 'https://api.deepseek.com/v1/chat/completions',
          link: 'https://deepseek.com',
          isActive: true,
          isCustom: false,
        },
        {
          name: 'gemini',
          displayName: 'Gemini',
          icon: 'fas fa-gem',
          host: 'https://generativelanguage.googleapis.com',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
          link: 'https://ai.google.dev',
          isActive: true,
          isCustom: false,
        },
        {
          name: 'custom',
          displayName: '自定义API',
          icon: 'fas fa-code',
          host: '',
          endpoint: '',
          link: '#',
          isActive: true,
          isCustom: true,
        },
      ]

      // 批量创建提供来源（如果不存在）
      if (existingProviders.length === 0) {
        await prisma.aIProvider.createMany({
          data: defaultProviders.map((provider) => ({
            ...provider,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        })
      }

      // 获取提供来源ID
      const providers = await prisma.aIProvider.findMany()

      // 创建默认模型
      const defaultModels = [
        // OpenAI模型
        { name: 'gpt-4', displayName: 'GPT-4', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-4o', displayName: 'GPT-4o', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', providerName: 'openai', modelType: 'LLM', isBeta: false },
        {
          name: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          providerName: 'openai',
          modelType: 'LLM',
          isBeta: false,
        },
        {
          name: 'gpt-3.5-turbo-16k',
          displayName: 'GPT-3.5 Turbo 16K',
          providerName: 'openai',
          modelType: 'LLM',
          isBeta: false,
        },

        // Claude模型
        {
          name: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
          providerName: 'claude',
          modelType: 'LLM',
          isBeta: false,
        },
        {
          name: 'claude-3-sonnet',
          displayName: 'Claude 3 Sonnet',
          providerName: 'claude',
          modelType: 'LLM',
          isBeta: false,
        },
        {
          name: 'claude-3-haiku',
          displayName: 'Claude 3 Haiku',
          providerName: 'claude',
          modelType: 'LLM',
          isBeta: false,
        },
        { name: 'claude-2.1', displayName: 'Claude 2.1', providerName: 'claude', modelType: 'LLM', isBeta: false },
        { name: 'claude-2.0', displayName: 'Claude 2.0', providerName: 'claude', modelType: 'LLM', isBeta: false },

        // DeepSeek模型
        {
          name: 'deepseek-chat',
          displayName: 'DeepSeek Chat',
          providerName: 'deepseek',
          modelType: 'LLM',
          isBeta: false,
        },
        {
          name: 'deepseek-coder',
          displayName: 'DeepSeek Coder',
          providerName: 'deepseek',
          modelType: 'CODE',
          isBeta: false,
        },
        {
          name: 'deepseek-reasoner',
          displayName: 'DeepSeek Reasoner',
          providerName: 'deepseek',
          modelType: 'SWOT',
          isBeta: false,
        },

        // Gemini模型
        { name: 'gemini-pro', displayName: 'Gemini Pro', providerName: 'gemini', modelType: 'LLM', isBeta: false },
        {
          name: 'gemini-pro-vision',
          displayName: 'Gemini Pro Vision',
          providerName: 'gemini',
          modelType: 'LLM',
          isBeta: false,
        },
        { name: 'gemini-ultra', displayName: 'Gemini Ultra', providerName: 'gemini', modelType: 'LLM', isBeta: true },
      ]

      // 批量创建模型（如果不存在）
      if (existingModels.length === 0) {
        const modelData = defaultModels
          .map((model) => {
            const provider = providers.find((p) => p.name === model.providerName)
            return {
              name: model.name,
              displayName: model.displayName,
              providerId: provider?.id,
              modelType: model.modelType || 'LLM',
              isBeta: model.isBeta,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          })
          .filter((model) => model.providerId) // 过滤掉没有找到提供来源的模型

        await prisma.aIModel.createMany({
          data: modelData,
        })
      }

      return { success: true, message: '默认数据初始化成功' }
    } catch (error) {
      console.error('初始化默认数据失败:', error)
      throw error
    }
  },
}
