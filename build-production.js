#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 开始生产环境打包流程...');

// 初始化数据库
async function initDatabase() {
    try {
        console.log('🔧 初始化生产环境数据库...');

        // 获取应用资源路径
        const resourcePath = process.resourcesPath || path.join(__dirname, 'dist');
        const dbPath = path.join(resourcePath, 'prisma', 'dev.db');
        const dbDir = path.dirname(dbPath);

        // 确保数据库目录存在
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log('📁 创建数据库目录:', dbDir);
        }

        // 设置数据库 URL
        process.env.DATABASE_URL = `file:${dbPath}`;

        // 创建 Prisma 客户端
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: `file:${dbPath}`
                }
            }
        });

        // 测试数据库连接
        await prisma.$connect();
        console.log('✅ 数据库连接成功');

        // 检查表是否存在
        const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;

        console.log('📊 现有表:', tables.map(t => t.name));

        // 如果表不存在，运行迁移
        if (tables.length === 0) {
            console.log('🔄 运行数据库迁移...');
            execSync('npx prisma db push', { stdio: 'inherit' });
            console.log('✅ 数据库迁移完成');
        }

        // 检查并创建必要的初始数据
        await createInitialData(prisma);

        console.log('✅ 生产环境数据库初始化完成');

        await prisma.$disconnect();

    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        throw error;
    }
}

// 创建初始数据
async function createInitialData(prisma) {
    try {
        console.log('🔍 开始检查初始数据...');
        console.log('📊 Prisma 实例状态:', prisma ? '正常' : '未定义');

        // 检查是否有 AI 提供者数据
        console.log('🔍 查询 AI 提供者数据...');
        const providers = await prisma.aIProvider.findMany();
        console.log('📊 找到 AI 提供者数量:', providers.length);
        if (providers.length > 0) {
            console.log('📋 现有 AI 提供者:', providers.map(p => p.name).join(', '));
        }
        if (providers.length === 0) {
            console.log('📝 创建初始 AI 提供者数据...');

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
                        createdAt: new Date(),
                        updatedAt: new Date(),
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
                        createdAt: new Date(),
                        updatedAt: new Date(),
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
                        createdAt: new Date(),
                        updatedAt: new Date(),
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
                        createdAt: new Date(),
                        updatedAt: new Date(),
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
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                ]
            });
            console.log('✅ AI 提供者数据创建完成');

            // 验证创建结果
            const newProviders = await prisma.aIProvider.findMany();
            console.log('📊 创建后 AI 提供者总数:', newProviders.length);
            console.log('📋 创建后的 AI 提供者:', newProviders.map(p => p.name).join(', '));
        }

        // 检查是否有 AI 模型数据
        const models = await prisma.aIModel.findMany();
        if (models.length === 0) {
            console.log('📝 创建初始 AI 模型数据...');

            // 获取提供者
            const providers = await prisma.aIProvider.findMany();
            const providerMap = {};
            providers.forEach(p => {
                providerMap[p.name] = p;
            });

            // 创建默认模型
            const defaultModels = [
                // OpenAI模型
                { name: 'gpt-4', displayName: 'GPT-4', providerName: 'openai', modelType: 'LLM', isBeta: false },
                { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', providerName: 'openai', modelType: 'LLM', isBeta: false },
                { name: 'gpt-4o', displayName: 'GPT-4o', providerName: 'openai', modelType: 'LLM', isBeta: false },
                { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', providerName: 'openai', modelType: 'LLM', isBeta: false },
                { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', providerName: 'openai', modelType: 'LLM', isBeta: false },
                { name: 'gpt-3.5-turbo-16k', displayName: 'GPT-3.5 Turbo 16K', providerName: 'openai', modelType: 'LLM', isBeta: false },

                // Claude模型
                { name: 'claude-3-opus', displayName: 'Claude 3 Opus', providerName: 'claude', modelType: 'LLM', isBeta: false },
                { name: 'claude-3-sonnet', displayName: 'Claude 3 Sonnet', providerName: 'claude', modelType: 'LLM', isBeta: false },
                { name: 'claude-3-haiku', displayName: 'Claude 3 Haiku', providerName: 'claude', modelType: 'LLM', isBeta: false },
                { name: 'claude-2.1', displayName: 'Claude 2.1', providerName: 'claude', modelType: 'LLM', isBeta: false },
                { name: 'claude-2.0', displayName: 'Claude 2.0', providerName: 'claude', modelType: 'LLM', isBeta: false },

                // DeepSeek模型
                { name: 'deepseek-chat', displayName: 'DeepSeek Chat', providerName: 'deepseek', modelType: 'LLM', isBeta: false },
                { name: 'deepseek-coder', displayName: 'DeepSeek Coder', providerName: 'deepseek', modelType: 'CODE', isBeta: false },
                { name: 'deepseek-reasoner', displayName: 'DeepSeek Reasoner', providerName: 'deepseek', modelType: 'SWOT', isBeta: false },

                // Gemini模型
                { name: 'gemini-pro', displayName: 'Gemini Pro', providerName: 'gemini', modelType: 'LLM', isBeta: false },
                { name: 'gemini-pro-vision', displayName: 'Gemini Pro Vision', providerName: 'gemini', modelType: 'LLM', isBeta: false },
                { name: 'gemini-ultra', displayName: 'Gemini Ultra', providerName: 'gemini', modelType: 'LLM', isBeta: true },
            ];

            const modelData = defaultModels
                .map((model) => {
                    const provider = providerMap[model.providerName];
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
                .filter((model) => model.providerId); // 过滤掉没有找到提供者的模型

            await prisma.aIModel.createMany({
                data: modelData,
            });
            console.log('✅ AI 模型数据创建完成');

            // 验证创建结果
            const newModels = await prisma.aIModel.findMany();
            console.log('📊 创建后 AI 模型总数:', newModels.length);
            console.log('📋 创建后的 AI 模型:', newModels.map(m => m.name).join(', '));
        }

        // 检查是否有设置数据
        const settings = await prisma.settings.findFirst();
        if (!settings) {
            console.log('📝 创建初始设置数据...');

            await prisma.settings.create({
                data: {
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
            console.log('✅ 设置数据创建完成');

            // 验证创建结果
            const newSettings = await prisma.settings.findFirst();
            console.log('📊 创建后设置数据:', newSettings ? '存在' : '不存在');
            if (newSettings) {
                console.log('📋 默认提供者:', newSettings.provider);
            }
        }

        console.log('✅ 初始数据检查完成');

        // 最终验证所有数据
        const finalProviders = await prisma.aIProvider.findMany();
        const finalModels = await prisma.aIModel.findMany();
        const finalSettings = await prisma.settings.findFirst();

        console.log('📊 最终数据统计:');
        console.log('   - AI 提供者:', finalProviders.length, '个');
        console.log('   - AI 模型:', finalModels.length, '个');
        console.log('   - 设置数据:', finalSettings ? '存在' : '不存在');

        if (finalProviders.length > 0) {
            console.log('📋 最终 AI 提供者列表:');
            finalProviders.forEach(p => {
                console.log('   - ' + p.name + ' (' + p.displayName + '): ' + p.host);
            });
        }

        if (finalModels.length > 0) {
            console.log('📋 最终 AI 模型列表:');
            finalModels.forEach(m => {
                console.log('   - ' + m.name + ' (' + m.displayName + '): ' + m.modelType);
            });
        }

    } catch (error) {
        console.error('❌ 创建初始数据失败:', error);
        console.error('❌ 错误详情:', error.stack);
        throw error;
    }
}

// 主打包流程
async function buildProduction() {
    try {
        console.log('📦 开始生产环境打包...');

        // 1. 清理旧的构建文件
        console.log('🧹 清理旧的构建文件...');
        if (fs.existsSync('dist')) {
            fs.rmSync('dist', { recursive: true, force: true });
        }

        // 2. 生成 Prisma 客户端
        console.log('🔧 生成 Prisma 客户端...');
        execSync('npx prisma generate', { stdio: 'inherit' });

        // 3. 构建 Electron 应用
        console.log('⚡ 构建 Electron 应用...');
        execSync('npm run build-mac', { stdio: 'inherit' });

        // 4. 初始化数据库（在打包后的环境中）
        console.log('🗄️ 初始化生产环境数据库...');
        await initDatabase();

        console.log('✅ 生产环境打包完成！');
        console.log('📁 输出目录: dist/');
        console.log('🎉 应用已准备就绪！');

    } catch (error) {
        console.error('❌ 打包失败:', error);
        process.exit(1);
    }
}

// 运行打包流程
if (require.main === module) {
    buildProduction();
}

module.exports = {
    initDatabase,
    createInitialData,
    buildProduction
};
