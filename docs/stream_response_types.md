# 流式响应数据类型说明

## 概述

`/chat/stream` 接口现在返回带有明确类型标识的数据，方便前端根据不同的处理逻辑类型做相应的处理。

## 数据类型

### 1. intent_info - 意图信息

```json
{
  "type": "intent_info",
  "action": "project_creation",
  "parameters": { "directory": "/path/to/project", "tech_stack": "vue" },
  "message": "开始处理: project_creation",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 2. action_start - 操作开始

```json
{
  "type": "action_start",
  "action": "project_creation",
  "message": "开始生成项目创建命令...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 3. command_item - 命令项（项目创建专用）

```json
{
  "type": "command_item",
  "action": "project_creation",
  "command": "mkdir -p /path/to/project",
  "commandExplain": "创建项目目录",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 4. text_response - 文本响应

```json
{
  "type": "text_response",
  "action": "code_explanation",
  "content": "这段代码的作用是...",
  "parameters": { "file_path": "/path/to/file.js" },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 5. code_modification - 代码修改

```json
{
  "type": "code_modification",
  "action": "code_refactoring",
  "content": "重构建议：...",
  "parameters": { "file_path": "/path/to/file.js" },
  "files": [
    {
      "path": "/path/to/file.js",
      "oldContent": "原始代码",
      "newContent": "新代码",
      "diff": "diff内容"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 6. general_response - 通用响应

```json
{
  "type": "general_response",
  "action": "unknown_action",
  "content": "处理结果内容",
  "parameters": {},
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 7. action_complete - 操作完成

```json
{
  "type": "action_complete",
  "action": "project_creation",
  "message": "项目创建命令生成完成",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

### 8. error - 错误信息

```json
{
  "type": "error",
  "error": "错误描述",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "id": "abc123def"
}
```

## 前端处理建议

### 1. 根据 type 字段分发处理

```javascript
function handleStreamChunk(chunk) {
  switch (chunk.type) {
    case "intent_info":
      // 显示意图识别结果
      showIntentInfo(chunk);
      break;

    case "action_start":
      // 显示操作开始状态
      showActionStart(chunk);
      break;

    case "command_item":
      // 显示命令项（项目创建）
      showCommandItem(chunk);
      break;

    case "text_response":
      // 显示文本解释
      showTextResponse(chunk);
      break;

    case "code_modification":
      // 显示代码修改建议
      showCodeModification(chunk);
      break;

    case "action_complete":
      // 显示操作完成状态
      showActionComplete(chunk);
      break;

    case "error":
      // 显示错误信息
      showError(chunk);
      break;

    default:
      console.log("未知类型:", chunk);
  }
}
```

### 2. 特殊处理逻辑

#### 项目创建流程

1. 收到 `intent_info` → 显示"正在分析项目创建需求"
2. 收到 `action_start` → 显示"开始生成项目创建命令"
3. 收到多个 `command_item` → 逐个显示命令和解释
4. 收到 `action_complete` → 显示"项目创建命令生成完成"

#### 代码解释流程

1. 收到 `intent_info` → 显示"正在分析代码解释需求"
2. 收到 `action_start` → 显示"开始生成代码解释"
3. 收到 `text_response` → 显示解释内容
4. 收到 `action_complete` → 显示"代码解释完成"

#### 代码修改流程

1. 收到 `intent_info` → 显示"正在分析代码修改需求"
2. 收到 `action_start` → 显示"开始生成代码修改建议"
3. 收到 `code_modification` → 显示修改建议和 diff
4. 收到 `action_complete` → 显示"代码修改建议生成完成"

## 操作类型映射

| action                   | 中文名称   | 处理类型          |
| ------------------------ | ---------- | ----------------- |
| project_creation         | 项目创建   | command_item      |
| code_explanation         | 代码解释   | text_response     |
| code_review              | 代码审查   | text_response     |
| documentation_generation | 文档生成   | text_response     |
| code_refactoring         | 代码重构   | code_modification |
| bug_fixing               | 错误修复   | code_modification |
| feature_modification     | 功能修改   | code_modification |
| feature_addition         | 功能添加   | code_modification |
| test_addition            | 测试添加   | code_modification |
| dependency_management    | 依赖管理   | general_response  |
| configuration_change     | 配置变更   | general_response  |
| database_operation       | 数据库操作 | general_response  |
| api_development          | API 开发   | general_response  |
| deployment_configuration | 部署配置   | general_response  |
| performance_optimization | 性能优化   | code_modification |
| security_hardening       | 安全加固   | code_modification |
| internationalization     | 国际化     | code_modification |
| debugging_assistance     | 调试辅助   | text_response     |
| code_conversion          | 代码转换   | code_modification |
