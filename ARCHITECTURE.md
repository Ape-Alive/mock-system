# Mock Coding - 技术架构文档

## 🏗️ 系统架构概览

Mock Coding 采用现代化的桌面应用架构，结合了 Electron 的跨平台能力和 Node.js 的服务器端能力，为用户提供统一的开发体验。

```
┌─────────────────────────────────────────────────────────────┐
│                    Mock Coding 应用架构                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   主进程        │  │   渲染进程      │  │   预加载脚本    │ │
│  │  (Main Process) │  │  (Renderer)    │  │  (Preload)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Express 服务器 │  │   WebSocket     │  │   AI 服务集成   │ │
│  │   (API Server)  │  │   (Real-time)   │  │   (AI Services) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Prisma ORM    │  │   SQLite 数据库 │  │   文件系统      │ │
│  │   (Database)    │  │   (Storage)     │  │   (File System) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 项目结构

```
mock-system/
├── 📁 assets/                 # 应用资源文件
│   ├── icon.svg              # 应用图标 (SVG)
│   ├── icon.png              # 应用图标 (PNG)
│   ├── icon.icns             # macOS 图标
│   └── dmg-background.png    # DMG 安装包背景
├── 📁 config/                # 配置文件
│   └── index.js              # 应用配置
├── 📁 docs/                  # 文档目录
│   └── stream_response_types.md
├── 📁 middleware/            # 中间件
│   └── routeMiddleware.js    # 路由中间件
├── 📁 prisma/                # 数据库相关
│   ├── schema.prisma         # 数据库模式
│   ├── dev.db               # SQLite 数据库
│   └── migrations/          # 数据库迁移
├── 📁 public/                # 前端资源
│   ├── index.html           # 主页面
│   ├── mock-management.html  # Mock 管理页面
│   ├── terminal.html        # 终端页面
│   ├── settings-modal.html  # 设置弹窗
│   ├── *.js                 # 前端脚本
│   ├── *.css                # 样式文件
│   └── assets/              # 静态资源
├── 📁 routes/               # 路由处理
│   ├── aiAgentRoutes.js     # AI 助手路由
│   ├── codegenRoutes.js     # 代码生成路由
│   ├── fileRoutes.js        # 文件操作路由
│   ├── groupRoutes.js       # 分组管理路由
│   ├── mockRoutes.js        # Mock 服务路由
│   ├── openApiRoutes.js     # OpenAPI 路由
│   └── settingsRoutes.js    # 设置路由
├── 📁 services/              # 业务逻辑服务
│   ├── aiAgentService.js    # AI 助手服务
│   ├── aiService.js         # AI 集成服务
│   ├── codegenService.js    # 代码生成服务
│   ├── dbService.js         # 数据库服务
│   ├── fileService.js       # 文件服务
│   ├── groupService.js       # 分组服务
│   ├── mockService.js        # Mock 服务
│   ├── openApiService.js     # OpenAPI 服务
│   └── wsServer.js          # WebSocket 服务
├── 📁 utils/                 # 工具函数
│   ├── fileUtils.js         # 文件工具
│   ├── mockUtils.js         # Mock 工具
│   └── openApiUtils.js      # OpenAPI 工具
├── 📄 electron-main.js       # Electron 主进程
├── 📄 electron-preload.js    # 预加载脚本
├── 📄 server.js             # Express 服务器
├── 📄 package.json          # 项目配置
└── 📄 README.md             # 项目说明
```

## 🔧 核心模块详解

### 1. Electron 主进程 (`electron-main.js`)

**职责**：

- 应用生命周期管理
- 窗口创建和管理
- 菜单和快捷键处理
- 系统集成（文件对话框、通知等）

**关键功能**：

```javascript
// 窗口管理
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, "electron-preload.js"),
  },
});

// 应用退出处理
app.on("before-quit", (event) => {
  if (!isQuitting) {
    event.preventDefault();
    mainWindow.hide();
  }
});
```

### 2. Express 服务器 (`server.js`)

**职责**：

- RESTful API 服务
- 静态文件服务
- WebSocket 连接管理
- 中间件处理

**关键功能**：

```javascript
// API 路由
app.use("/api/ai-agent", aiAgentRoutes);
app.use("/api/codegen", codegenRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/mock", mockRoutes);

// WebSocket 支持
const wss = new WebSocketServer({ server });
```

### 3. 数据库层 (Prisma + SQLite)

**数据模型**：

```prisma
model AIProvider {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  displayName String
  host        String
  endpoint    String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AIModel {
  id          Int      @id @default(autoincrement())
  name        String
  displayName String
  providerId  Int
  modelType   String
  isBeta      Boolean  @default(false)
  provider    AIProvider @relation(fields: [providerId], references: [id])
}

model Settings {
  id           Int      @id @default(autoincrement())
  provider     String
  apiKeys      Json
  modelParams  Json
  general      Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 4. AI 服务集成

**支持的 AI 提供商**：

- OpenAI (GPT-3.5, GPT-4, GPT-4o)
- Anthropic Claude (Claude-3 Opus, Sonnet, Haiku)
- DeepSeek (Chat, Coder, Reasoner)
- Google Gemini (Pro, Pro Vision, Ultra)

**统一接口设计**：

```javascript
class AIService {
  async generateCode(prompt, context) {
    const response = await this.callAI({
      model: this.getModel(),
      messages: this.buildMessages(prompt, context),
      temperature: this.getTemperature(),
    });
    return this.parseResponse(response);
  }
}
```

### 5. Mock 服务架构

**核心组件**：

```javascript
class MockService {
  // 创建 Mock 接口
  async createMock(mockData) {
    const mock = await this.db.mock.create({
      data: {
        name: mockData.name,
        method: mockData.method,
        path: mockData.path,
        response: mockData.response,
        groupId: mockData.groupId,
      },
    });
    return mock;
  }

  // 处理 Mock 请求
  async handleRequest(req, res) {
    const mock = await this.findMock(req.method, req.path);
    if (mock) {
      const response = this.generateResponse(mock.response);
      res.json(response);
    } else {
      res.status(404).json({ error: "Mock not found" });
    }
  }
}
```

## 🔄 数据流架构

### 1. 用户交互流程

```
用户操作 → 渲染进程 → IPC 通信 → 主进程 → Express 服务器 → 业务逻辑 → 数据库
```

### 2. AI 请求流程

```
用户输入 → AI 助手界面 → AI 服务 → 外部 API → 响应处理 → 代码生成 → 文件系统
```

### 3. Mock 服务流程

```
HTTP 请求 → Express 路由 → Mock 服务 → 数据生成 → JSON 响应
```

## 🚀 性能优化策略

### 1. 前端优化

- **代码分割**：按功能模块分割 JavaScript 代码
- **懒加载**：延迟加载非关键组件
- **缓存策略**：智能缓存 AI 响应和文件内容
- **虚拟滚动**：大文件列表的虚拟滚动

### 2. 后端优化

- **连接池**：数据库连接池管理
- **缓存层**：Redis 缓存热点数据
- **异步处理**：非阻塞 I/O 操作
- **资源管理**：自动清理临时文件

### 3. 数据库优化

- **索引优化**：为查询字段添加索引
- **查询优化**：使用 Prisma 查询优化
- **分页处理**：大数据集的分页加载
- **事务管理**：合理使用数据库事务

## 🔒 安全架构

### 1. 数据安全

- **本地存储**：敏感数据仅存储在本地
- **加密传输**：API 密钥等敏感信息加密存储
- **权限控制**：基于角色的访问控制

### 2. 网络安全

- **CORS 配置**：跨域资源共享策略
- **请求验证**：API 请求签名验证
- **速率限制**：防止 API 滥用

### 3. 应用安全

- **沙箱隔离**：渲染进程沙箱隔离
- **内容安全策略**：CSP 头部配置
- **输入验证**：用户输入的安全验证

## 📊 监控和日志

### 1. 性能监控

```javascript
// 性能指标收集
const performanceMetrics = {
  responseTime: Date.now() - startTime,
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage(),
};
```

### 2. 错误日志

```javascript
// 错误处理和日志
try {
  await riskyOperation();
} catch (error) {
  logger.error("Operation failed", {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}
```

### 3. 用户行为分析

```javascript
// 用户行为追踪
analytics.track("ai_request", {
  model: "gpt-4",
  promptLength: prompt.length,
  responseTime: responseTime,
});
```

## 🔄 部署架构

### 1. 开发环境

```
开发者 → 本地开发 → Git 提交 → 代码审查 → 合并主分支
```

### 2. 构建流程

```
源代码 → 依赖安装 → 代码编译 → 资源打包 → 应用签名 → 安装包生成
```

### 3. 分发策略

```
构建产物 → 版本管理 → 自动更新 → 用户下载 → 安装部署
```

## 🎯 扩展性设计

### 1. 插件系统

```javascript
// 插件接口设计
class Plugin {
  constructor(name, version) {
    this.name = name;
    this.version = version;
  }

  async onLoad() {}
  async onUnload() {}
  async onEvent(event, data) {}
}
```

### 2. 主题系统

```javascript
// 主题配置
const themeConfig = {
  colors: {
    primary: "#4F46E5",
    secondary: "#7C3AED",
    accent: "#06B6D4",
  },
  fonts: {
    family: "Inter, sans-serif",
    sizes: { small: "12px", medium: "14px", large: "16px" },
  },
};
```

### 3. 国际化支持

```javascript
// 多语言支持
const i18n = {
  "zh-CN": { welcome: "欢迎使用 Mock Coding" },
  "en-US": { welcome: "Welcome to Mock Coding" },
  "ja-JP": { welcome: "Mock Coding へようこそ" },
};
```

---

**Mock Coding** - 现代化桌面应用架构的最佳实践！

