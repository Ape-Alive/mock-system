const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { batchWriteFiles } = require('./fileBatchWriter')
const { batchCodeCompletion, batchCodeCompletionStream } = require('./aiAgentService')

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

  // 2. 调用 LLM 批量补全/修改（流式版本）
  for await (const chunk of batchCodeCompletionStream(parameters, files, messages)) {
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
          type: 'code_modification',
          path: chunk.path,
          diff: chunk.diff,
          newContent: chunk.newContent,
          reason: chunk.reason,
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
    const parsed = JSON.parse(res.data.choices[0].message.content)
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
      content: `请严格按照如下要求输出：\n\n1. 输出所有项目初始化和依赖安装命令，每条命令都单独输出一行JSON，格式为：{\"command\": \"xxx\", \"commandExplain\": \"xxx\"}\n2. 不要输出数组，不要输出多余解释，不要输出任何非JSON内容。\n3. 直到所有命令全部输出完毕为止。\n4. 必须覆盖：环境准备、目录创建、进入目录、项目初始化、依赖安装、启动命令等所有步骤。\n5. 例如：\n{\"command\": \"set -e\", \"commandExplain\": \"保证命令失败立即退出\"}\n{\"command\": \"mkdir -p \"/your/path\"\", \"commandExplain\": \"创建项目目录\"}\n{\"command\": \"cd \"/your/path\"\", \"commandExplain\": \"进入项目目录\"}\n{\"command\": \"npm init -y\", \"commandExplain\": \"初始化npm项目\"}\n{\"command\": \"npm install vue element-ui axios\", \"commandExplain\": \"安装核心依赖\"}\n{\"command\": \"npm run serve\", \"commandExplain\": \"启动开发服务器\"}\n6. 每条命令都要有简明中文解释（commandExplain），不要省略。\n7. 直到所有初始化和依赖安装命令全部输出完毕为止，最后一条一般是启动命令。`,
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
  for await (const chunk of response.data) {
    const str = chunk.toString('utf8')
    // DeepSeek/OpenAI SSE格式：data: {...}\n\n
    const lines = str.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const obj = JSON.parse(data)
          const content = obj.choices?.[0]?.delta?.content
          if (content) {
            buffer += content
            // console.log('buffer:', JSON.stringify(buffer))
            // 检查是否拼出一行完整JSON
            if (buffer.endsWith('}\n') || buffer.endsWith('}\r\n')) {
              const jsonLine = buffer.trim()
              buffer = ''
              try {
                const cmdObj = JSON.parse(jsonLine)
                if (cmdObj.command) {
                  console.log('yield:', cmdObj)
                  yield {
                    type: 'command_item',
                    action: 'project_creation',
                    command: cmdObj.command,
                    commandExplain: cmdObj.commandExplain,
                  }
                }
              } catch (e) {
                /* 不是完整JSON，忽略 */
              }
            }
          }
        } catch (e) {
          /* 不是合法JSON，忽略 */
        }
      }
    }
  }
  // 处理最后一行
  if (buffer.trim()) {
    try {
      const cmdObj = JSON.parse(buffer.trim())
      if (cmdObj.command) {
        console.log('yield:', cmdObj)
        yield {
          type: 'command_item',
          action: 'project_creation',
          command: cmdObj.command,
          commandExplain: cmdObj.commandExplain,
        }
      }
    } catch (e) {}
  }
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
}
