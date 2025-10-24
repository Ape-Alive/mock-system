const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

// 动态获取数据库路径
function getDatabasePath() {
  // 在开发环境中使用相对路径
  if (process.env.NODE_ENV === 'development') {
    return "file:./dev.db"
  }

  // 在生产环境中使用绝对路径
  const appPath = process.resourcesPath || __dirname
  const dbPath = path.join(appPath, 'prisma', 'dev.db')
  const dbDir = path.dirname(dbPath)

  // 确保数据库目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log('📁 创建数据库目录:', dbDir)
  }

  // 设置数据库文件权限
  if (fs.existsSync(dbPath)) {
    try {
      // 尝试多种权限设置
      fs.chmodSync(dbPath, 0o664)
      console.log('🔧 设置数据库文件权限:', dbPath)

      // 清理可能的扩展属性
      try {
        const { execSync } = require('child_process')
        execSync(`xattr -c "${dbPath}"`, { stdio: 'ignore' })
        console.log('🧹 清理数据库文件扩展属性')
      } catch (cleanupError) {
        console.log('⚠️ 清理扩展属性失败:', cleanupError.message)
      }
    } catch (error) {
      console.warn('⚠️ 设置数据库权限失败:', error.message)
    }
  } else {
    // 如果数据库文件不存在，创建一个新的
    try {
      fs.writeFileSync(dbPath, '')
      fs.chmodSync(dbPath, 0o664)
      console.log('📄 创建新的数据库文件:', dbPath)
    } catch (createError) {
      console.error('❌ 创建数据库文件失败:', createError.message)
    }
  }

  return `file:${dbPath}`
}

// 创建 Prisma 客户端，添加重试机制
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: getDatabasePath()
    }
  }
})

// 初始化数据库连接
async function initializeDatabase() {
  try {
    console.log('🔧 初始化数据库连接...')

    // 测试数据库连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功')

    // 检查数据库表是否存在，如果不存在则创建
    await ensureDatabaseTables()
    console.log('✅ 数据库表检查/创建完成')

    return true
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message)
    return false
  }
}

// 确保数据库表存在
async function ensureDatabaseTables() {
  try {
    // 检查Settings表是否存在
    const settingsExists = await checkTableExists('Settings')
    if (!settingsExists) {
      console.log('📝 创建数据库表...')
      await createDatabaseTables()
    } else {
      console.log('✅ 数据库表已存在')
    }
  } catch (error) {
    console.error('❌ 数据库表检查失败:', error.message)
    // 尝试创建表
    try {
      await createDatabaseTables()
    } catch (createError) {
      console.error('❌ 创建数据库表失败:', createError.message)
      throw createError
    }
  }
}

// 检查表是否存在
async function checkTableExists(tableName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name=${tableName}
    `
    return result.length > 0
  } catch (error) {
    console.log('⚠️ 检查表存在性失败:', error.message)
    return false
  }
}

// 创建数据库表
async function createDatabaseTables() {
  try {
    // 创建LocalDirectory表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "LocalDirectory" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "directory" TEXT NOT NULL,
        "projectName" TEXT,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 创建FileVectorIndex表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "FileVectorIndex" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "filePath" TEXT NOT NULL UNIQUE,
        "fileHash" TEXT NOT NULL,
        "vectorId" INTEGER NOT NULL,
        "mtime" BIGINT NOT NULL
      )
    `

    // 创建FileHistory表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "FileHistory" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "filePath" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "operator" TEXT,
        "newPath" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 创建AIProvider表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AIProvider" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "displayName" TEXT NOT NULL,
        "icon" TEXT NOT NULL,
        "host" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "link" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isCustom" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // 创建AIModel表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AIModel" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "displayName" TEXT,
        "providerId" INTEGER NOT NULL,
        "modelType" TEXT NOT NULL DEFAULT 'LLM',
        "isBeta" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE("name", "providerId")
      )
    `

    // 创建Settings表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "provider" TEXT NOT NULL DEFAULT 'openai',
        "apiKeys" TEXT,
        "customApi" TEXT,
        "defaultModel" TEXT,
        "modelParams" TEXT,
        "general" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    console.log('✅ 数据库表创建完成')

    // 创建初始数据
    await createInitialData()
    console.log('✅ 初始数据创建完成')

  } catch (error) {
    console.error('❌ 创建数据库表失败:', error.message)
    throw error
  }
}

// 创建初始数据
async function createInitialData() {
  try {
    // 检查是否有AI提供者数据
    const providers = await prisma.aIProvider.findMany()
    if (providers.length === 0) {
      console.log('📝 创建初始AI提供者数据...')
      await prisma.aIProvider.createMany({
        data: [
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
          }
        ]
      })
    }

    // 检查是否有AI模型数据
    const models = await prisma.aIModel.findMany()
    if (models.length === 0) {
      console.log('📝 创建初始AI模型数据...')
      const providers = await prisma.aIProvider.findMany()
      const providerMap = {}
      providers.forEach(p => {
        providerMap[p.name] = p
      })

      const defaultModels = [
        { name: 'gpt-4', displayName: 'GPT-4', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-4o', displayName: 'GPT-4o', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'gpt-3.5-turbo-16k', displayName: 'GPT-3.5 Turbo 16K', providerName: 'openai', modelType: 'LLM', isBeta: false },
        { name: 'claude-3-opus', displayName: 'Claude 3 Opus', providerName: 'claude', modelType: 'LLM', isBeta: false },
        { name: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet', providerName: 'claude', modelType: 'LLM', isBeta: false },
        { name: 'claude-3-haiku', displayName: 'Claude 3 Haiku', providerName: 'claude', modelType: 'LLM', isBeta: false },
        { name: 'deepseek-chat', displayName: 'DeepSeek Chat', providerName: 'deepseek', modelType: 'LLM', isBeta: false },
        { name: 'deepseek-coder', displayName: 'DeepSeek Coder', providerName: 'deepseek', modelType: 'CODE', isBeta: false },
        { name: 'gemini-pro', displayName: 'Gemini Pro', providerName: 'gemini', modelType: 'LLM', isBeta: false },
      ]

      const modelData = defaultModels
        .map((model) => {
          const provider = providerMap[model.providerName]
          return {
            name: model.name,
            displayName: model.displayName,
            providerId: provider?.id,
            modelType: model.modelType || 'LLM',
            isBeta: model.isBeta,
            isActive: true,
          }
        })
        .filter((model) => model.providerId)

      await prisma.aIModel.createMany({
        data: modelData,
      })
    }

    // 检查是否有设置数据
    const settings = await prisma.settings.findFirst()
    if (!settings) {
      console.log('📝 创建初始设置数据...')
      await prisma.settings.create({
        data: {
          provider: 'deepseek',
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
            maxTokens: 4000,
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
      })
    }

    // 检查是否有本地目录数据
    const localDir = await prisma.localDirectory.findFirst()
    if (!localDir) {
      console.log('📝 创建初始本地目录数据...')
      await prisma.localDirectory.create({
        data: {
          directory: '',
          projectName: null,
        }
      })
    }

  } catch (error) {
    console.error('❌ 创建初始数据失败:', error.message)
    throw error
  }
}

module.exports = {
  prisma,
  initializeDatabase,

  // 本地目录相关
  async getLocalDirectory() {
    return await prisma.localDirectory.findFirst()
  },

  async setLocalDirectory(directory, projectName) {
    // 先检查是否存在记录
    const existing = await prisma.localDirectory.findFirst()

    if (existing) {
      // 如果存在，则更新
      return await prisma.localDirectory.update({
        where: { id: existing.id },
        data: { directory, projectName },
      })
    } else {
      // 如果不存在，则创建
      return await prisma.localDirectory.create({
        data: { directory, projectName },
      })
    }
  },
  async getSettings() {
    try {
      const settings = await prisma.settings.findFirst()

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
      // 先检查是否存在设置记录
      const existingSettings = await prisma.settings.findFirst()
      let result

      if (existingSettings) {
        // 如果存在，则更新
        result = await prisma.settings.update({
          where: { id: existingSettings.id },
          data: {
            provider: settings.provider,
            apiKeys: settings.apiKeys,
            customApi: settings.customApi,
            defaultModel: settings.defaultModel,
            modelParams: settings.modelParams,
            general: settings.general,
            updatedAt: new Date(),
          },
        })
      } else {
        // 如果不存在，则创建
        result = await prisma.settings.create({
          data: {
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
      }

      // 如果设置了初始目录，同时更新 LocalDirectory 表
      if (settings.general && settings.general.initialDirectory) {
        const existing = await prisma.localDirectory.findFirst()

        if (existing) {
          // 如果存在，则更新
          await prisma.localDirectory.update({
            where: { id: existing.id },
            data: {
              directory: settings.general.initialDirectory,
              projectName: settings.general.projectName || null
            }
          })
        } else {
          // 如果不存在，则创建
          await prisma.localDirectory.create({
            data: {
              directory: settings.general.initialDirectory,
              projectName: settings.general.projectName || null
            }
          })
        }
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
