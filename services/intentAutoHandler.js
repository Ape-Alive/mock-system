const fs = require('fs')
const path = require('path')
const axios = require('axios')

// 提取JSON从markdown代码块中
function extractJsonFromMarkdown(text) {
  // 移除markdown代码块标记
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  // 如果没有代码块标记，尝试直接解析
  return text.trim()
}

// 统一加载所有业务 prompt
function loadPrompts() {
  const promptPath = path.join(__dirname, '../prompts/businessPrompts.json')
  return JSON.parse(fs.readFileSync(promptPath, 'utf-8'))
}

const prompts = loadPrompts()
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk- '

// 获取操作的中文显示名称
function getActionDisplayName(action) {
  const actionNames = {
    project_creation: '项目创建',
    code_explanation: '代码解释',
    code_review: '代码审查',
    documentation_generation: '文档生成',
    code_refactoring: '代码重构',
    bug_fixing: '错误修复',
    feature_modification: '功能修改',
    feature_addition: '功能添加',
    test_addition: '测试添加',
    dependency_management: '依赖管理',
    configuration_change: '配置变更',
    database_operation: '数据库操作',
    api_development: 'API开发',
    deployment_configuration: '部署配置',
    performance_optimization: '性能优化',
    security_hardening: '安全加固',
    internationalization: '国际化',
    debugging_assistance: '调试辅助',
    code_conversion: '代码转换',
  }
  return actionNames[action] || action
}

// 多文件批量补全/修改（流式版本）
async function* batchCodeCompletionStream(parameters, files, messages) {
  console.log('jjjj', parameters, files, messages)

  // 组装多文件上下文
  const context = files.map((f) => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n')

  // 获取最近五次对话上下文
  const recentMessages = messages.slice(-10) // 最近10条消息（5轮对话）

  // 构建 prompt
  const systemPrompt = `你是一个专业的代码助手。请根据用户需求对提供的文件进行智能修改。

### 任务要求
- 仔细分析用户需求和文件内容
- 只修改必要的部分，保持代码风格一致
- 如果不需要修改，请说明原因
- 如果需要修改，请严格按照JSON格式返回

### 输出格式
请严格按照以下JSON格式返回，不要包含任何其他文本：
{
  "files": [
    {
      "path": "文件路径",
      "oldContent": "原内容",
      "newContent": "新内容", 
      "diff": "diff格式的修改",
      "reason": "修改原因"
    }
  ]
}

### 文件内容
${context}

### 对话历史（最近5轮）
${recentMessages.map((msg, index) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`).join('\n')}

### 当前用户需求
${JSON.stringify(parameters)}

请直接返回JSON格式的修改结果，不要包含任何解释性文字。`

  const llmMessages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: `请根据上述对话历史和需求修改文件：${JSON.stringify(parameters)}` },
  ]

  try {
    const axios = require('axios')
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk- '
    // 流式调用 DeepSeek
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: llmMessages,
        stream: true,
        temperature: 0.1,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    )

    let fullResponse = ''

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            // 流式传输完成，解析完整响应
            try {
              // 提取JSON从markdown代码块中
              const cleanJson = extractJsonFromMarkdown(fullResponse)
              const result = JSON.parse(cleanJson)

              // 处理每个文件的修改结果
              for (const fileResult of result.files || []) {
                const originalFile = files.find((f) => f.path === fileResult.path)
                if (originalFile) {
                  if (fileResult.oldContent !== fileResult.newContent) {
                    // 有修改
                    yield {
                      type: 'file_modification',
                      path: fileResult.path,
                      oldContent: fileResult.oldContent,
                      newContent: fileResult.newContent,
                      diff: fileResult.diff,
                      reason: fileResult.reason,
                    }
                  } else {
                    // 无修改
                    yield {
                      type: 'file_no_change',
                      path: fileResult.path,
                      reason: fileResult.reason || '无需修改',
                    }
                  }
                }
              }

              // 如果没有文件被修改
              const hasModifications = (result.files || []).some((f) => f.oldContent !== f.newContent)
              if (!hasModifications) {
                yield {
                  type: 'no_modifications',
                  message: '未检测到需要修改的内容',
                }
              }
            } catch (parseError) {
              yield {
                type: 'error',
                message: `解析响应失败: ${parseError.message}`,
                rawResponse: fullResponse,
              }
            }
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              fullResponse += parsed.choices[0].delta.content

              // 流式返回部分内容给前端
              yield {
                type: 'stream_chunk',
                content: parsed.choices[0].delta.content,
              }
            }
          } catch (e) {
            // 忽略解析错误，继续处理
          }
        }
      }
    }
  } catch (error) {
    yield {
      type: 'error',
      message: `调用 DeepSeek API 失败: ${error.message}`,
    }
  }
}

// 全栈开发AI Agent批量补全/修改（流式版本）
async function* batchCodeAllCompletionStream(parameters, files, messages) {
  // 组装多文件上下文
  const context = files.map((f) => `文件: ${f.path}\n内容:\n${f.content}\n`).join('\n')

  // 获取最近对话上下文
  const recentMessages = messages.slice(-10)

  // 使用新的全栈提示词
  const prompt = `你是全栈开发AI Agent，分析用户需求并输出改动方案。

==== 输出格式 ====
选择以下任一方式：
1. **穿插式**：Markdown + 内嵌JSON代码块
2. **分离式**：完整JSON + 完整Markdown
3. **混合式**：Markdown中嵌入JSON片段 + 最终完整JSON

**要求**：JSON必须符合schema，Markdown必须完整，最终能提取完整JSON结构。

==== JSON Schema ====
{
  "schema_validation": "pass|fail",
  "schema_errors": ["string"],           // 仅当validation=fail时

  "change": [
    {
      "change_id": "string",             // 唯一ID
      "file_path": "string",             // 文件路径
      "operation": "MODIFY|DELETE|CREATE|RENAME",
      "change_summary": "string",        // 改动描述
      "new_path": "string|null",         // 仅重命名时
      "newContent": "string|null",       // 修改后完整内容
      "oldContent": "string|null",       // 修改前完整内容
      "patch": "string|null",            // unified diff（可选）
      "how_to_test": ["string"],         // 测试步骤
      "rollback": ["string]",            // 回滚步骤
      "risk_level": "low|medium|high",
      "author": "string",                // 可选
      "timestamp": "ISO8601 string",
      "issue_id": "string|null"          // 可选
    }
  ]
}

==== 改动类型要求 ====
- **前端**：UI变更、API调用、交互逻辑
- **后端**：接口、服务、性能优化
- **数据库**：DDL/DML、表结构、验证SQL
- **配置**：环境变量、部署脚本、启动影响
- **安全**：无敏感信息、去敏感化处理

==== Markdown必须包含 ====
- 操作摘要
- 详细操作列表（按模块）
- 测试步骤
- 回滚指引
- 假设与注意事项
- PR标题与描述

==== 文件内容 ====
${context}

==== 对话历史 ====
${recentMessages.map((msg, index) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`).join('\n')}

==== 用户需求 ====
${JSON.stringify(parameters)}

灵活组织输出，确保JSON符合schema，Markdown完整覆盖要求。`

  const llmMessages = [
    { role: 'system', content: prompt },
    ...recentMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: `请根据上述对话历史和需求进行全栈改动分析：${JSON.stringify(parameters)}` },
  ]

  try {
    const axios = require('axios')
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk- '

    // 流式调用 DeepSeek
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: llmMessages,
        stream: true,
        temperature: 0.1,
        max_tokens: 6000, // 增加token限制以支持更详细的输出
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    )

    let fullResponse = ''
    let chunkCount = 0
    let totalContentLength = 0

    for await (const chunk of response.data) {
      chunkCount++
      const str = chunk.toString('utf8')
      totalContentLength += str.length

      const lines = str.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)

          if (data === '[DONE]') {
            console.log('fullResponse', fullResponse)

            // 流式传输完成，解析完整响应
            try {
              // 提取JSON从markdown代码块中
              const cleanJson = extractJsonFromMarkdown(fullResponse)
              const result = JSON.parse(cleanJson)

              // 验证schema
              if (result.schema_validation === 'fail') {
                yield {
                  type: 'schema_validation_error',
                  errors: result.schema_errors || ['Schema验证失败'],
                  rawResponse: fullResponse,
                }
                return
              }

              // 处理每个改动项
              for (const changeItem of result.change || []) {
                if (changeItem.operation === 'CREATE' || changeItem.operation === 'MODIFY') {
                  // 有内容改动
                  yield {
                    type: 'file_modification',
                    path: changeItem.file_path,
                    oldContent: changeItem.oldContent || '',
                    newContent: changeItem.newContent || '',
                    diff: changeItem.patch || '',
                    reason: changeItem.change_summary,
                    changeId: changeItem.change_id,
                    operation: changeItem.operation,
                    howToTest: changeItem.how_to_test,
                    rollback: changeItem.rollback,
                    riskLevel: changeItem.risk_level,
                    timestamp: changeItem.timestamp,
                  }
                } else if (changeItem.operation === 'DELETE') {
                  // 删除文件
                  yield {
                    type: 'file_deletion',
                    path: changeItem.file_path,
                    reason: changeItem.change_summary,
                    changeId: changeItem.change_id,
                    howToTest: changeItem.how_to_test,
                    rollback: changeItem.rollback,
                    riskLevel: changeItem.risk_level,
                    timestamp: changeItem.timestamp,
                  }
                } else if (changeItem.operation === 'RENAME') {
                  // 重命名文件
                  yield {
                    type: 'file_rename',
                    oldPath: changeItem.file_path,
                    newPath: changeItem.new_path,
                    reason: changeItem.change_summary,
                    changeId: changeItem.change_id,
                    howToTest: changeItem.how_to_test,
                    rollback: changeItem.rollback,
                    riskLevel: changeItem.risk_level,
                    timestamp: changeItem.timestamp,
                  }
                }
              }

              // 如果没有改动项
              if (!result.change || result.change.length === 0) {
                yield {
                  type: 'no_modifications',
                  message: '未检测到需要改动的内容',
                }
              }

              // 返回Markdown摘要
              if (fullResponse.includes('**操作摘要**')) {
                const markdownMatch = fullResponse.match(/\*\*操作摘要\*\*[\s\S]*$/)
                if (markdownMatch) {
                  yield {
                    type: 'markdown_summary',
                    content: markdownMatch[0],
                  }
                }
              }
            } catch (parseError) {
              yield {
                type: 'error',
                message: `解析响应失败: ${parseError.message}`,
                rawResponse: fullResponse,
              }
            }
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const content = parsed.choices[0].delta.content
              fullResponse += content

              // 流式返回部分内容给前端
              yield {
                type: 'stream_chunk',
                content: content,
              }
            }
          } catch (e) {
            // 忽略解析错误，继续处理
          }
        }
      }
    }
  } catch (error) {
    yield {
      type: 'error',
      message: `调用 DeepSeek API 失败: ${error.message}`,
    }
  }
}

// 主入口：根据 intent 分发（流式 async generator 版本）
async function* handleIntentStream(intentResult, fileTree, afterHandlePaths, messages) {
  const { intent, parameters } = intentResult

  // project_creation 走原有逻辑
  if (intent === 'project_creation') {
    yield {
      type: 'action_start',
      action: 'project_creation',
      message: '开始生成项目创建命令...',
    }
    yield* handleProjectCreationStream(parameters, fileTree)
    yield {
      type: 'action_complete',
      action: 'project_creation',
      message: '项目创建命令生成完成',
    }
    return
  }

  // 其它类型统一处理

  // 1. 读取 afterHandlePaths 里的所有文件内容
  const fileList = (afterHandlePaths || []).map((item) => item.path).filter(Boolean)

  const files = []
  for (const filePath of fileList) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      files.push({ path: filePath, content })
    } catch (e) {
      yield {
        type: 'file_read_error',
        path: filePath,
        message: `读取文件失败: ${e.message}`,
      }
    }
  }

  if (files.length === 0) {
    yield {
      type: 'no_files',
      message: '未找到可处理的文件路径',
    }
    return
  }
  yield {
    type: 'action_start',
    action: 'code_modification',
    message: '开始修改项目代码...',
  }

  // 2. 调用 LLM 批量补全/修改（全栈AI Agent流式版本）
  //   let chunkCount = 0

  for await (const chunk of batchCodeAllCompletionStream(parameters, files, messages)) {
    // chunkCount++

    switch (chunk.type) {
      case 'stream_chunk':
        // 流式传输的文本块，直接转发给前端
        yield {
          type: 'stream_chunk',
          content: chunk.content,
        }
        break

      case 'file_modification':
        // 文件被修改
        yield {
          type: 'file_modification',
          path: chunk.path,
          oldContent: chunk.oldContent,
          newContent: chunk.newContent,
          diff: chunk.diff,
          reason: chunk.reason,
          changeId: chunk.changeId,
          operation: chunk.operation,
          howToTest: chunk.howToTest,
          rollback: chunk.rollback,
          riskLevel: chunk.riskLevel,
          timestamp: chunk.timestamp,
        }
        break

      case 'file_deletion':
        // 文件被删除
        yield {
          type: 'file_deletion',
          path: chunk.path,
          reason: chunk.reason,
          changeId: chunk.changeId,
          howToTest: chunk.howToTest,
          rollback: chunk.rollback,
          riskLevel: chunk.riskLevel,
          timestamp: chunk.timestamp,
        }
        break

      case 'file_rename':
        // 文件重命名
        yield {
          type: 'file_rename',
          oldPath: chunk.oldPath,
          newPath: chunk.newPath,
          reason: chunk.reason,
          changeId: chunk.changeId,
          howToTest: chunk.howToTest,
          rollback: chunk.rollback,
          riskLevel: chunk.riskLevel,
          timestamp: chunk.timestamp,
        }
        break

      case 'file_no_change':
        // 文件无需修改
        yield {
          type: 'file_no_change',
          path: chunk.path,
          reason: chunk.reason,
        }
        break

      case 'no_modifications':
        // 整体无需修改
        yield {
          type: 'no_modification',
          message: chunk.message,
        }
        break

      case 'schema_validation_error':
        // Schema验证失败
        yield {
          type: 'error',
          message: `Schema验证失败: ${chunk.errors.join(', ')}`,
          rawResponse: chunk.rawResponse,
        }
        break

      case 'markdown_summary':
        // Markdown摘要
        yield {
          type: 'markdown_summary',
          content: chunk.content,
        }
        break

      case 'error':
        // 发生错误
        yield {
          type: 'error',
          message: chunk.message,
          rawResponse: chunk.rawResponse,
        }
        break

      default:
        // 其他类型直接转发
        yield chunk
    }
  }
}

function interpolate(tpl, params) {
  return tpl.replace(/\$\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined && params[key] !== null
      ? Array.isArray(params[key])
        ? params[key].join(', ')
        : params[key]
      : ''
  )
}

// project_creation 自动化：1. LLM生成结构 2. 批量写入文件
async function handleProjectCreation(params, fileTree) {
  const promptTpl = prompts.project_creation?.system || '请在${directory}下创建一个${tech_stack}的${project_type}项目。'
  const prompt = interpolate(promptTpl, params)
  console.log('prompt', prompt)

  // 1. 调用 DeepSeek LLM 生成命令数组
  const messages = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content:
        '请以严格JSON数组格式输出所有初始化和依赖安装命令，每个元素为一条shell命令，格式如：["cmd1", "cmd2", ...]，不要输出多余解释。',
    },
  ]
  const res = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-coder',
      messages,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )
  let commands = []
  try {
    const content = res.data.choices[0].message.content
    const cleanJson = extractJsonFromMarkdown(content)
    const parsed = JSON.parse(cleanJson)
    console.log('uuuuu', parsed)

    if (Array.isArray(parsed)) {
      commands = parsed
    } else if (Array.isArray(parsed.commands)) {
      commands = parsed.commands
    } else if (Array.isArray(parsed.response)) {
      commands = parsed.response
    } else {
      throw new Error('LLM返回内容不是数组或不包含 commands/response 数组')
    }
  } catch (e) {
    return { success: false, message: 'LLM返回内容解析失败', raw: res.data.choices[0].message.content }
  }
  if (!Array.isArray(commands)) {
    return { success: false, message: 'commands 不是数组', commands }
  }
  // 只返回命令数组，不做后端执行
  return {
    success: true,
    action: 'project_creation',
    prompt,
    parameters: params,
    commands,
  }
}

// project_creation 自动化：适配 DeepSeek/OpenAI SSE 格式的逐条流式输出命令
async function* handleProjectCreationStream(params, fileTree) {
  const promptTpl = prompts.project_creation?.system || '请在${directory}下创建一个${tech_stack}的${project_type}项目。'
  const prompt = interpolate(promptTpl, params)
  const messages = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content: `请严格按照如下要求输出：\n\n1. 输出所有项目初始化和依赖安装命令，每条命令都单独输出一行JSON，格式为：{\"command\": \"xxx\", \"commandExplain\": \"xxx\"}\n2. 不要输出数组，不要输出多余解释，不要输出任何非JSON内容。\n3. 必须输出多个命令，至少包含6-8个命令，覆盖完整的项目创建流程。\n4. 必须覆盖：环境准备、目录创建、进入目录、项目初始化、依赖安装、启动命令等所有步骤。\n5. 不要提前结束，必须输出所有必要的命令。\n\n【重要】项目命名规则：\n- 将中文项目类型转换为英文\n- 使用小写字母和连字符(-)分隔单词\n- 避免特殊字符、空格、大写字母\n- 符合npm包命名规范\n- 名称要简洁明了，体现项目功能\n- 完整路径格式：${params.directory}/项目名称\n\n【必须输出的命令序列】\n{\"command\": \"set -e\", \"commandExplain\": \"保证命令失败立即退出\"}\n{\"command\": \"mkdir -p \"${params.directory}/vue-project\"\", \"commandExplain\": \"创建Vue2项目目录\"}\n{\"command\": \"cd \"${params.directory}/vue-project\"\", \"commandExplain\": \"进入项目目录\"}\n{\"command\": \"npx -p @vue/cli vue create . --preset default --force\", \"commandExplain\": \"初始化Vue2项目\"}\n{\"command\": \"npm install element-ui axios\", \"commandExplain\": \"安装UI组件库和HTTP客户端\"}\n{\"command\": \"npm run serve\", \"commandExplain\": \"启动开发服务器\"}\n\n【重要提醒】\n- 必须输出完整创建项目的命令，不能遗漏\n- 每条命令都要有简明中文解释（commandExplain）\n- 不要只输出一个命令就结束\n- 确保命令序列完整，能够成功创建和启动项目`,
    },
  ]
  // 调用 LLM 的流式接口
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-coder',
      messages,
      stream: true,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
    }
  )

  let buffer = ''
  let commandCount = 0
  for await (const chunk of response.data) {
    const str = chunk.toString('utf8')
    console.log('收到chunk:', str)
    // DeepSeek/OpenAI SSE格式：data: {...}\n\n
    const lines = str.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          console.log('收到[DONE]信号，已处理命令数量:', commandCount)
          continue
        }
        try {
          const obj = JSON.parse(data)
          const content = obj.choices?.[0]?.delta?.content
          if (content) {
            buffer += content
            console.log('buffer累积:', JSON.stringify(buffer))
            // 检查是否拼出一行完整JSON
            if (buffer.endsWith('}\n') || buffer.endsWith('}\r\n')) {
              const jsonLine = buffer.trim()
              buffer = ''
              try {
                const cleanJson = extractJsonFromMarkdown(jsonLine)
                const cmdObj = JSON.parse(cleanJson)
                if (cmdObj.command) {
                  commandCount++
                  console.log('yield命令 #', commandCount, ':', cmdObj)
                  yield {
                    type: 'command_item',
                    action: 'project_creation',
                    command: cmdObj.command,
                    commandExplain: cmdObj.commandExplain,
                  }
                }
              } catch (e) {
                console.log('JSON解析失败:', e.message, '原始内容:', jsonLine)
                /* 不是完整JSON，忽略 */
              }
            }
          }
        } catch (e) {
          console.log('解析chunk失败:', e.message)
          /* 不是合法JSON，忽略 */
        }
      }
    }
  }
  // 处理最后一行
  if (buffer.trim()) {
    try {
      const cleanJson = extractJsonFromMarkdown(buffer.trim())
      const cmdObj = JSON.parse(cleanJson)
      if (cmdObj.command) {
        commandCount++
        console.log('yield最后命令 #', commandCount, ':', cmdObj)
        yield {
          type: 'command_item',
          action: 'project_creation',
          command: cmdObj.command,
          commandExplain: cmdObj.commandExplain,
        }
      }
    } catch (e) {
      console.log('处理最后buffer失败:', e.message, '原始内容:', buffer.trim())
    }
  }
  console.log('流式处理完成，总共处理命令数量:', commandCount)
}

async function handleFeatureModification(params, fileTree) {
  const promptTpl = prompts.feature_modification?.system || '请在${modify_path}修改功能：${feature}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'feature_modification', prompt, parameters: params }
}

async function handleFeatureAddition(params, fileTree) {
  const promptTpl = prompts.feature_addition?.system || '请在${add_path}新增功能：${feature}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'feature_addition', prompt, parameters: params }
}

async function handleBugFixing(params, fileTree) {
  const promptTpl = prompts.bug_fixing?.system || '请修复${fix_path}中的错误：${error_message}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'bug_fixing', prompt, parameters: params }
}

async function handleCodeRefactoring(params, fileTree) {
  const promptTpl = prompts.code_refactoring?.system || '请对${refactor_path}进行代码重构，范围：${scope}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'code_refactoring', prompt, parameters: params }
}

async function handleTestAddition(params, fileTree) {
  const promptTpl = prompts.test_addition?.system || '请在${test_path}为${test_target}添加测试。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'test_addition', prompt, parameters: params }
}

async function handleCodeReview(params, fileTree) {
  const promptTpl = prompts.code_review?.system || '请对${review_path}进行代码审查。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'code_review', prompt, parameters: params }
}

async function handleDependencyManagement(params, fileTree) {
  const promptTpl =
    prompts.dependency_management?.system || '请在${dep_path}对依赖${package}@${version}执行${operation}操作。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'dependency_management', prompt, parameters: params }
}

async function handleConfigurationChange(params, fileTree) {
  const promptTpl =
    prompts.configuration_change?.system || '请在${config_path}的${config_file}中将${setting}设置为${value}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'configuration_change', prompt, parameters: params }
}

async function handleDatabaseOperation(params, fileTree) {
  const promptTpl = prompts.database_operation?.system || '请在${db_path}对${object}执行${operation}操作。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'database_operation', prompt, parameters: params }
}

async function handleApiDevelopment(params, fileTree) {
  const promptTpl = prompts.api_development?.system || '请在${api_path}开发${method}接口：${endpoint}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'api_development', prompt, parameters: params }
}

async function handleDeploymentConfiguration(params, fileTree) {
  const promptTpl = prompts.deployment_configuration?.system || '请为${environment}环境在${deploy_path}配置部署脚本。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'deployment_configuration', prompt, parameters: params }
}

async function handleDocumentationGeneration(params, fileTree) {
  const promptTpl = prompts.documentation_generation?.system || '请在${doc_path}为${target}生成文档。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'documentation_generation', prompt, parameters: params }
}

async function handleCodeExplanation(params, fileTree) {
  const promptTpl = prompts.code_explanation?.system || '请解释${code_path}中的代码片段：${code_snippet}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'code_explanation', prompt, parameters: params }
}

async function handleCodeConversion(params, fileTree) {
  const promptTpl = prompts.code_conversion?.system || '请将${convert_path}从${source_lang}转换为${target_lang}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'code_conversion', prompt, parameters: params }
}

async function handlePerformanceOptimization(params, fileTree) {
  const promptTpl = prompts.performance_optimization?.system || '请优化${optimize_path}中的${target}以提升性能。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'performance_optimization', prompt, parameters: params }
}

async function handleSecurityHardening(params, fileTree) {
  const promptTpl = prompts.security_hardening?.system || '请对${secure_path}进行安全加固，修复漏洞：${vulnerability}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'security_hardening', prompt, parameters: params }
}

async function handleInternationalization(params, fileTree) {
  const promptTpl = prompts.internationalization?.system || '请在${i18n_path}为${language}添加国际化支持。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'internationalization', prompt, parameters: params }
}

async function handleDebuggingAssistance(params, fileTree) {
  const promptTpl = prompts.debugging_assistance?.system || '请协助调试${debug_path}，错误日志：${error_log}。'
  const prompt = interpolate(promptTpl, params)
  return { success: true, action: 'debugging_assistance', prompt, parameters: params }
}

// 主入口：根据 intent 分发（同步/一次性返回）
async function handleIntent(intentResult, fileTree) {
  const { intent, parameters } = intentResult
  switch (intent) {
    case 'project_creation':
      return await handleProjectCreation(parameters, fileTree)
    case 'feature_modification':
      return await handleFeatureModification(parameters, fileTree)
    case 'feature_addition':
      return await handleFeatureAddition(parameters, fileTree)
    case 'bug_fixing':
      return await handleBugFixing(parameters, fileTree)
    case 'code_refactoring':
      return await handleCodeRefactoring(parameters, fileTree)
    case 'test_addition':
      return await handleTestAddition(parameters, fileTree)
    case 'code_review':
      return await handleCodeReview(parameters, fileTree)
    case 'dependency_management':
      return await handleDependencyManagement(parameters, fileTree)
    case 'configuration_change':
      return await handleConfigurationChange(parameters, fileTree)
    case 'database_operation':
      return await handleDatabaseOperation(parameters, fileTree)
    case 'api_development':
      return await handleApiDevelopment(parameters, fileTree)
    case 'deployment_configuration':
      return await handleDeploymentConfiguration(parameters, fileTree)
    case 'documentation_generation':
      return await handleDocumentationGeneration(parameters, fileTree)
    case 'code_explanation':
      return await handleCodeExplanation(parameters, fileTree)
    case 'code_conversion':
      return await handleCodeConversion(parameters, fileTree)
    case 'performance_optimization':
      return await handlePerformanceOptimization(parameters, fileTree)
    case 'security_hardening':
      return await handleSecurityHardening(parameters, fileTree)
    case 'internationalization':
      return await handleInternationalization(parameters, fileTree)
    case 'debugging_assistance':
      return await handleDebuggingAssistance(parameters, fileTree)
    default:
      return { success: false, message: '暂不支持该意图自动化处理', intent }
  }
}

module.exports = {
  handleIntent,
  handleIntentStream,
  handleProjectCreationStream,
  batchCodeAllCompletionStream,
}
