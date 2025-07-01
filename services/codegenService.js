const config = require('../config')
const mockService = require('./mockService')
const OpenAI = require('openai')

class CodegenService {
  constructor() {
    this.deepseekConfig = {
      baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-coder',
    }
    this.openai = new OpenAI({
      baseURL: this.deepseekConfig.baseURL,
      apiKey: this.deepseekConfig.apiKey,
    })
    console.log('codegenService.js 读取到的 DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY)
    console.log('最终 deepseekConfig.apiKey:', this.deepseekConfig.apiKey)
  }

  async generateCode(params) {
    const { techStack, outputType, uiLibrary, customLibrary, interfaceList, pageStructure, pageLogic } = params
    try {
      const interfaces = await this.getInterfaceDetails(interfaceList)
      const apiDescription = this.generateApiDescription(interfaces)
      const prompt = this.generatePrompt({
        techStack,
        outputType,
        uiLibrary,
        customLibrary,
        pageStructure,
        pageLogic,
        apiDescription,
      })

      // 如果没有配置API密钥，使用模拟代码生成
      if (!this.deepseekConfig.apiKey) {
        const mockCode = this.generateMockCode({
          techStack,
          outputType,
          uiLibrary,
          interfaces,
          pageStructure,
          pageLogic,
        })
        return {
          success: true,
          code: mockCode,
          dependencies: this.getDependencies(techStack, uiLibrary, customLibrary),
        }
      }

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
          pathContentDesc: mockData.pathContentDesc || {},
        })
      } catch (error) { }
    }
    return interfaces
  }

  generateApiDescription(interfaces) {
    return interfaces
      .map((api) => {
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
      })
      .join('\n\n')
  }

  generatePrompt(params) {
    const { techStack, outputType, uiLibrary, customLibrary, pageStructure, pageLogic, apiDescription } = params
    const techStackMap = {
      vue2: 'Vue.js 2',
      vue3: 'Vue.js 3',
      react: 'React 18',
      flutter: 'Flutter',
    }
    const uiLibraryMap = {
      'element-ui': 'Element UI',
      'element-plus': 'Element Plus',
      'ant-design-vue': 'Ant Design Vue',
      'naive-ui': 'Naive UI',
      vuetify: 'Vuetify',
      quasar: 'Quasar',
      'ant-design': 'Ant Design',
      'material-ui': 'Material UI (MUI)',
      'chakra-ui': 'Chakra UI',
      'tailwind-ui': 'Tailwind UI',
      'react-bootstrap': 'React Bootstrap',
      material: 'Flutter Material',
      cupertino: 'Cupertino',
      getwidget: 'GetWidget',
      'flutter-easyloading': 'flutter_easyloading',
      custom: customLibrary || '原生组件',
    }
    let prompt = `请使用${techStackMap[techStack]}技术栈，生成一个${outputType === 'component' ? '可复用的组件' : '完整的可预览的html页面'
      }。\n\n`
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
    if (techStack === 'vue2') {
      prompt += `使用Vue 2 Options API，包含完整的组件结构。`
    } else if (techStack === 'vue3') {
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
      const completion = await this.openai.chat.completions.create({
        model: this.deepseekConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      })
      if (completion.choices && completion.choices[0]) {
        return completion.choices[0].message.content
      } else {
        throw new Error('API响应格式错误')
      }
    } catch (error) {
      throw new Error(`DeepSeek API错误: ${error.message}`)
    }
  }

  async callDeepSeekAPIStream(prompt, onChunk) {
    if (!this.deepseekConfig.apiKey) {
      throw new Error('DeepSeek API密钥未配置')
    }
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.deepseekConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
        stream: true,
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
      throw new Error(`DeepSeek API错误: ${error.message}`)
    }
  }

  getDependencies(techStack, uiLibrary, customLibrary) {
    const dependencies = {
      vue2: {
        core: ['vue@^2.7.0'],
        ui: {
          'element-ui': ['element-ui@^2.15.0'],
          'ant-design-vue': ['ant-design-vue@^1.7.0'],
          vuetify: ['vuetify@^2.6.0'],
          quasar: ['quasar@^1.16.0'],
          custom: [],
        },
        http: ['axios@^1.4.0'],
        state: ['vuex@^3.6.0'],
      },
      vue3: {
        core: ['vue@^3.3.0'],
        ui: {
          'element-plus': ['element-plus@^2.3.0'],
          'ant-design-vue': ['ant-design-vue@^4.0.0'],
          'naive-ui': ['naive-ui@^2.34.0'],
          vuetify: ['vuetify@^3.3.0'],
          quasar: ['quasar@^2.12.0'],
          custom: [],
        },
        http: ['axios@^1.4.0'],
        state: ['pinia@^2.1.0'],
      },
      react: {
        core: ['react@^18.2.0', 'react-dom@^18.2.0'],
        ui: {
          'ant-design': ['antd@^5.0.0'],
          'material-ui': ['@mui/material@^5.14.0', '@emotion/react@^11.11.0', '@emotion/styled@^11.11.0'],
          'chakra-ui': [
            '@chakra-ui/react@^2.8.0',
            '@emotion/react@^11.11.0',
            '@emotion/styled@^11.11.0',
            'framer-motion@^10.16.0',
          ],
          'tailwind-ui': ['tailwindcss@^3.3.0'],
          'react-bootstrap': ['react-bootstrap@^2.8.0', 'bootstrap@^5.3.0'],
          custom: [],
        },
        http: ['axios@^1.4.0'],
        state: ['zustand@^4.4.0'],
      },
      flutter: {
        core: [],
        ui: {
          material: [],
          cupertino: [],
          getwidget: ['getwidget:^2.0.0'],
          'flutter-easyloading': ['flutter_easyloading:^3.0.0'],
          custom: [],
        },
        http: ['dio@^5.3.0'],
        state: ['get@^4.6.0'],
      },
    }
    const techDeps = dependencies[techStack]
    if (!techDeps) return []
    let deps = [...techDeps.core, ...techDeps.http]
    if (techDeps.state) {
      deps = [...deps, ...techDeps.state]
    }
    if (uiLibrary && techDeps.ui[uiLibrary]) {
      deps = [...deps, ...techDeps.ui[uiLibrary]]
    }
    if (customLibrary) {
      const customDeps = customLibrary
        .split(',')
        .map((dep) => dep.trim())
        .filter(Boolean)
      deps = [...deps, ...customDeps]
    }
    return deps
  }

  getTechStackOptions() {
    return [
      { value: 'vue2', label: 'Vue 2', description: '渐进式JavaScript框架 - 版本2' },
      { value: 'vue3', label: 'Vue 3', description: '渐进式JavaScript框架 - 版本3' },
      { value: 'react', label: 'React', description: '用于构建用户界面的JavaScript库' },
      { value: 'flutter', label: 'Flutter', description: 'Google的UI工具包，跨平台移动应用开发' },
    ]
  }

  getUILibraryOptions(techStack) {
    const options = {
      vue2: [
        { value: 'element-ui', label: 'Element UI', description: 'Vue 2的组件库' },
        { value: 'ant-design-vue', label: 'Ant Design Vue', description: 'Ant Design的Vue实现' },
        { value: 'vuetify', label: 'Vuetify', description: 'Material Design组件库' },
        { value: 'quasar', label: 'Quasar', description: 'Vue.js跨平台框架' },
        { value: 'custom', label: '自定义', description: '手动输入三方库' },
      ],
      vue3: [
        { value: 'element-plus', label: 'Element Plus', description: 'Vue 3的组件库' },
        { value: 'ant-design-vue', label: 'Ant Design Vue', description: 'Ant Design的Vue 3实现' },
        { value: 'naive-ui', label: 'Naive UI', description: 'Vue 3组件库' },
        { value: 'vuetify', label: 'Vuetify', description: 'Material Design组件库' },
        { value: 'quasar', label: 'Quasar', description: 'Vue.js跨平台框架' },
        { value: 'custom', label: '自定义', description: '手动输入三方库' },
      ],
      react: [
        { value: 'ant-design', label: 'Ant Design', description: '企业级UI设计语言' },
        { value: 'material-ui', label: 'Material UI (MUI)', description: 'Google Material Design' },
        { value: 'chakra-ui', label: 'Chakra UI', description: '现代React组件库' },
        { value: 'tailwind-ui', label: 'Tailwind UI', description: '基于Tailwind CSS的组件' },
        { value: 'react-bootstrap', label: 'React Bootstrap', description: 'Bootstrap的React实现' },
        { value: 'custom', label: '自定义', description: '手动输入三方库' },
      ],
      flutter: [
        { value: 'material', label: 'Flutter Material', description: 'Material Design组件' },
        { value: 'cupertino', label: 'Cupertino', description: 'iOS风格组件' },
        { value: 'getwidget', label: 'GetWidget', description: 'Flutter UI库' },
        { value: 'flutter-easyloading', label: 'flutter_easyloading', description: '加载状态组件' },
        { value: 'custom', label: '自定义', description: '手动输入三方库' },
      ],
    }
    return options[techStack] || []
  }

  generateMockCode({ techStack, outputType, uiLibrary, interfaces, pageStructure, pageLogic }) {
    // 这里只做简单示例，实际可根据参数生成更丰富的mock代码
    if (techStack === 'vue2' || techStack === 'vue3') {
      return `<template>\n  <div>\n    <h2>示例组件：${interfaces[0]?.pathName || '接口'
        } </h2>\n    <pre>{{ info }}</pre>\n  </div>\n</template>\n\n<script${techStack === 'vue3' ? ' setup' : ''
        }>\nimport { onMounted, ref } from '${techStack === 'vue2' ? 'vue' : 'vue'
        }'\nimport axios from 'axios'\nconst info = ref(null)\nonMounted(() => {\n  axios.get('${interfaces[0]?.path || '/api/example'
        }').then(res => {\n    info.value = res.data\n  })\n})\n</script>\n`
    } else if (techStack === 'react') {
      return `import React, { useEffect, useState } from 'react'\nimport axios from 'axios'\nexport default function Example() {\n  const [info, setInfo] = useState(null)\n  useEffect(() => {\n    axios.get('${interfaces[0]?.path || '/api/example'
        }').then(res => setInfo(res.data))\n  }, [])\n  return (\n    <div>\n      <h2>示例组件：${interfaces[0]?.pathName || '接口'
        }</h2>\n      <pre>{JSON.stringify(info, null, 2)}</pre>\n    </div>\n  )\n}`
    } else if (techStack === 'flutter') {
      return `import 'package:flutter/material.dart';\nimport 'package:dio/dio.dart';\nclass ExamplePage extends StatefulWidget {\n  @override\n  _ExamplePageState createState() => _ExamplePageState();\n}\nclass _ExamplePageState extends State<ExamplePage> {\n  dynamic info;\n  @override\n  void initState() {\n    super.initState();\n    fetchInfo();\n  }\n  void fetchInfo() async {\n    final response = await Dio().get('${interfaces[0]?.path || '/api/example'
        }');\n    setState(() { info = response.data; });\n  }\n  @override\n  Widget build(BuildContext context) {\n    return Scaffold(\n      appBar: AppBar(title: Text('示例页面')),\n      body: info == null ? Center(child: CircularProgressIndicator()) : Padding(\n        padding: EdgeInsets.all(16),\n        child: Text(info.toString()),\n      ),\n    );\n  }\n}`
    }
    return '// 暂不支持该技术栈的mock代码生成'
  }

  // 将生成的代码写入本地目录
  async writeCodeToLocalDirectory(code, techStack, outputType) {
    const fileService = require('./fileService')

    try {
      // 解析生成的代码，提取不同文件的内容
      const codeData = this.parseGeneratedCode(code, techStack, outputType)

      // 写入本地目录
      const result = await fileService.writeGeneratedCode(codeData, techStack, outputType)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 解析生成的代码，提取不同文件的内容
  parseGeneratedCode(code, techStack, outputType) {
    const codeData = {}

    // 根据技术栈和输出类型解析代码
    if (techStack === 'vue2' || techStack === 'vue3') {
      if (outputType === 'component') {
        codeData['src/components/GeneratedComponent.vue'] = code
      } else {
        codeData['src/views/GeneratedPage.vue'] = code
      }
    } else if (techStack === 'react') {
      if (outputType === 'component') {
        codeData['src/components/GeneratedComponent.jsx'] = code
      } else {
        codeData['src/pages/GeneratedPage.jsx'] = code
      }
    } else if (techStack === 'flutter') {
      if (outputType === 'component') {
        codeData['lib/widgets/generated_widget.dart'] = code
      } else {
        codeData['lib/pages/generated_page.dart'] = code
      }
    } else {
      // 默认保存为文本文件
      codeData['generated_code.txt'] = code
    }

    return codeData
  }
}

module.exports = new CodegenService()
