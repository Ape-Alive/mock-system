const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { batchWriteFiles } = require('./fileBatchWriter')

// 统一加载所有业务 prompt
function loadPrompts() {
  const promptPath = path.join(__dirname, '../prompts/businessPrompts.json')
  return JSON.parse(fs.readFileSync(promptPath, 'utf-8'))
}

const prompts = loadPrompts()
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-'

// 主入口：根据 intent 分发
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

  // 1. 调用 DeepSeek LLM 生成项目结构
  const messages = [
    { role: 'system', content: prompt },
    {
      role: 'user',
      content:
        '请以严格JSON格式输出项目文件结构和每个文件的内容，格式：[{"path": "绝对路径", "content": "文件内容"}, ...]，不要输出多余解释。',
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
  let files = []
  try {
    const parsed = JSON.parse(res.data.choices[0].message.content)
    if (Array.isArray(parsed)) {
      files = parsed
    } else if (Array.isArray(parsed.files)) {
      files = parsed.files
    } else if (Array.isArray(parsed.response)) {
      files = parsed.response
    } else {
      throw new Error('LLM返回内容不是数组或不包含 files/response 数组')
    }
  } catch (e) {
    return { success: false, message: 'LLM返回内容解析失败', raw: res.data.choices[0].message.content }
  }
  if (!Array.isArray(files)) {
    return { success: false, message: 'files 不是数组', files }
  }
  // 2. 批量写入文件
  const writeResult = await batchWriteFiles(files)
  return {
    success: writeResult.success,
    action: 'project_creation',
    prompt,
    parameters: params,
    files,
    writeResult,
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

module.exports = {
  handleIntent,
}
