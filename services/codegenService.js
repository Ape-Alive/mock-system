const config = require('../config')
const mockService = require('./mockService')
const axios = require('axios')

class CodegenService {
    constructor() {
        this.deepseekConfig = {
            apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
            apiKey: process.env.DEEPSEEK_API_KEY || '',
            model: 'deepseek-coder'
        }
    }

    async generateCode(params) {
        const { techStack, outputType, uiLibrary, customLibrary, interfaceList, pageStructure, pageLogic } = params
        try {
            const interfaces = await this.getInterfaceDetails(interfaceList)
            const apiDescription = this.generateApiDescription(interfaces)
            const prompt = this.generatePrompt({ techStack, outputType, uiLibrary, customLibrary, pageStructure, pageLogic, apiDescription })
            const code = await this.callDeepSeekAPI(prompt)
            return { success: true, code, dependencies: this.getDependencies(techStack, uiLibrary, customLibrary) }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async getInterfaceDetails(interfaceList) {
        const interfaces = []
        for (const fileName of interfaceList) {
            try {
                const mockData = mockService.getMockItem(fileName)
                interfaces.push({
                    fileName,
                    pathName: mockData.pathName,
                    path: mockData.path,
                    pathType: mockData.pathType,
                    queryParams: mockData.queryParams || {},
                    queryParamsDesc: mockData.queryParamsDesc || {},
                    bodyParams: mockData.bodyParams || null,
                    bodyParamsDesc: mockData.bodyParamsDesc || {},
                    responseHeaders: mockData.responseHeaders || {},
                    pathContent: mockData.pathContent,
                    pathContentDesc: mockData.pathContentDesc || {}
                })
            } catch (error) { }
        }
        return interfaces
    }

    generateApiDescription(interfaces) {
        return interfaces.map(api => {
            let description = `接口名称: ${api.pathName}\n`
            description += `请求路径: ${api.path}\n`
            description += `请求方法: ${api.pathType}\n`
            if (Object.keys(api.queryParams).length > 0) {
                description += `查询参数:\n`
                Object.entries(api.queryParams).forEach(([key, value]) => {
                    const desc = api.queryParamsDesc[key]?.desc || ''
                    description += `  - ${key}: ${value} ${desc}\n`
                })
            }
            if (api.bodyParams) {
                description += `请求体参数:\n`
                if (typeof api.bodyParams === 'object') {
                    description += `  ${JSON.stringify(api.bodyParams, null, 2)}\n`
                } else {
                    description += `  ${api.bodyParams}\n`
                }
            }
            description += `响应结构:\n`
            description += `  ${JSON.stringify(api.pathContent, null, 2)}\n`
            return description
        }).join('\n\n')
    }

    generatePrompt(params) {
        const { techStack, outputType, uiLibrary, customLibrary, pageStructure, pageLogic, apiDescription } = params
        const techStackMap = { 'vue': 'Vue.js 3', 'react': 'React 18', 'flutter': 'Flutter' }
        const uiLibraryMap = {
            'element-ui': 'Element UI',
            'ant-design': 'Ant Design',
            'material-ui': 'Material-UI',
            'vant': 'Vant',
            'custom': customLibrary || '原生组件'
        }
        let prompt = `请使用${techStackMap[techStack]}技术栈，生成一个${outputType === 'component' ? '可复用的组件' : '完整的页面'}。\n\n`
        if (uiLibrary && uiLibrary !== 'custom') {
            prompt += `UI库要求：使用${uiLibraryMap[uiLibrary]}\n`
        }
        if (customLibrary) {
            prompt += `额外依赖：${customLibrary}\n`
        }
        prompt += `\n页面结构要求：\n${pageStructure}\n\n`
        prompt += `页面逻辑要求：\n${pageLogic}\n\n`
        prompt += `需要集成的接口信息：\n${apiDescription}\n\n`
        prompt += `请生成完整的、可直接运行的代码，包括：\n1. 完整的组件/页面代码\n2. 必要的样式代码\n3. 接口调用逻辑\n4. 错误处理\n5. 加载状态处理\n6. 数据验证\n\n`
        if (techStack === 'vue') {
            prompt += `使用Vue 3 Composition API，使用<script setup>语法。`
        } else if (techStack === 'react') {
            prompt += `使用React Hooks，函数式组件。`
        } else if (techStack === 'flutter') {
            prompt += `使用Flutter Widget，包含完整的页面结构。`
        }
        return prompt
    }

    async callDeepSeekAPI(prompt) {
        if (!this.deepseekConfig.apiKey) {
            throw new Error('DeepSeek API密钥未配置')
        }
        try {
            const response = await axios.post(this.deepseekConfig.apiUrl, {
                model: this.deepseekConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.deepseekConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            })
            if (response.data && response.data.choices && response.data.choices[0]) {
                return response.data.choices[0].message.content
            } else {
                throw new Error('API响应格式错误')
            }
        } catch (error) {
            if (error.response) {
                throw new Error(`DeepSeek API错误: ${error.response.status} - ${error.response.data?.error?.message || '未知错误'}`)
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('API请求超时')
            } else {
                throw new Error(`网络错误: ${error.message}`)
            }
        }
    }

    getDependencies(techStack, uiLibrary, customLibrary) {
        const dependencies = {
            vue: {
                core: ['vue@^3.3.0'],
                ui: { 'element-ui': ['element-plus@^2.3.0'], 'vant': ['vant@^4.0.0'], 'custom': [] },
                http: ['axios@^1.4.0']
            },
            react: {
                core: ['react@^18.2.0', 'react-dom@^18.2.0'],
                ui: { 'ant-design': ['antd@^5.0.0'], 'material-ui': ['@mui/material@^5.14.0', '@emotion/react@^11.11.0', '@emotion/styled@^11.11.0'], 'custom': [] },
                http: ['axios@^1.4.0']
            },
            flutter: {
                core: [],
                ui: { 'custom': [] },
                http: ['http@^1.1.0']
            }
        }
        const techDeps = dependencies[techStack]
        if (!techDeps) return []
        let deps = [...techDeps.core, ...techDeps.http]
        if (uiLibrary && techDeps.ui[uiLibrary]) {
            deps = [...deps, ...techDeps.ui[uiLibrary]]
        }
        if (customLibrary) {
            const customDeps = customLibrary.split(',').map(dep => dep.trim()).filter(Boolean)
            deps = [...deps, ...customDeps]
        }
        return deps
    }

    getTechStackOptions() {
        return [
            { value: 'vue', label: 'Vue.js', description: '渐进式JavaScript框架' },
            { value: 'react', label: 'React', description: '用于构建用户界面的JavaScript库' },
            { value: 'flutter', label: 'Flutter', description: 'Google的UI工具包' }
        ]
    }

    getUILibraryOptions(techStack) {
        const options = {
            vue: [
                { value: 'element-ui', label: 'Element Plus', description: 'Vue 3的组件库' },
                { value: 'vant', label: 'Vant', description: '移动端组件库' },
                { value: 'custom', label: '自定义', description: '手动输入三方库' }
            ],
            react: [
                { value: 'ant-design', label: 'Ant Design', description: '企业级UI设计语言' },
                { value: 'material-ui', label: 'Material-UI', description: 'Google Material Design' },
                { value: 'custom', label: '自定义', description: '手动输入三方库' }
            ],
            flutter: [
                { value: 'custom', label: '自定义', description: '手动输入三方库' }
            ]
        }
        return options[techStack] || []
    }
}

module.exports = new CodegenService()