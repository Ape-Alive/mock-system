# Mock Coding - 智能 API Mock 和代码生成工具

## 📖 项目简介

Mock Coding 是一个基于 Electron 的桌面应用程序，集成了 AI 智能助手、API Mock 服务、代码生成和文件管理等功能。该工具旨在为开发者提供一站式的 API 开发和测试解决方案。

## ✨ 核心功能

### 🤖 AI 智能助手

- **多模型支持**：集成 OpenAI、Claude、DeepSeek、Gemini 等主流 AI 模型
- **智能代码生成**：基于自然语言描述生成 API 接口代码
- **上下文理解**：结合项目文件结构，提供精准的代码建议
- **实时对话**：支持与 AI 进行实时交互，解答开发问题

### 🔧 API Mock 服务

- **RESTful API Mock**：快速创建和管理 REST API 接口
- **动态数据生成**：使用 Mock.js 生成真实感测试数据
- **请求拦截**：支持请求/响应拦截和修改
- **分组管理**：按项目或功能模块组织 API 接口

### 📝 代码生成

- **接口代码生成**：根据 API 规范自动生成前端/后端代码
- **TypeScript 支持**：生成类型安全的 TypeScript 接口定义
- **多语言支持**：支持 JavaScript、Python、Java 等多种编程语言
- **模板定制**：可自定义代码生成模板

### 📁 文件管理

- **项目文件浏览**：直观的文件树形结构展示
- **代码编辑器**：集成 Monaco Editor，支持语法高亮和智能提示
- **文件操作**：支持文件创建、编辑、删除等基本操作
- **搜索功能**：快速定位项目中的文件和代码

### 🗄️ 数据管理

- **SQLite 数据库**：轻量级本地数据存储
- **Prisma ORM**：类型安全的数据库操作
- **数据迁移**：支持数据库结构版本管理
- **备份恢复**：自动备份重要数据

## 🚀 技术架构

### 前端技术栈

- **Electron**：跨平台桌面应用框架
- **HTML5 + CSS3**：现代化用户界面
- **JavaScript ES6+**：现代 JavaScript 特性
- **Monaco Editor**：VS Code 同款代码编辑器
- **Font Awesome**：丰富的图标库

### 后端技术栈

- **Node.js**：JavaScript 运行时环境
- **Express.js**：轻量级 Web 框架
- **Prisma**：现代化数据库 ORM
- **SQLite**：嵌入式数据库
- **WebSocket**：实时通信支持

### AI 集成

- **OpenAI API**：GPT 系列模型
- **Anthropic Claude**：Claude 系列模型
- **DeepSeek API**：国产 AI 模型
- **Google Gemini**：Google AI 模型
- **自定义 API**：支持私有化部署的 AI 服务

## 📦 安装与部署

### 系统要求

- **操作系统**：macOS 10.12+, Windows 10+, Linux
- **内存**：至少 4GB RAM
- **存储**：至少 500MB 可用空间
- **网络**：需要互联网连接（用于 AI 服务）

### 开发环境安装

```bash
# 克隆项目
git clone <repository-url>
cd mock-system

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev

# 启动 Electron 应用
npm run electron
```

### 生产环境构建

```bash
# 构建 macOS 应用
npm run build-mac

# 构建 Windows 应用
npm run build-win

# 构建 Linux 应用
npm run build-linux

# 使用生产环境构建脚本
npm run build-production
```

## 🎯 使用指南

### 首次启动

1. **启动应用**：双击应用图标或运行 `npm run electron`
2. **选择项目目录**：在文件管理器中打开你的项目文件夹
3. **配置 AI 服务**：在设置中添加你的 AI API 密钥
4. **开始使用**：创建第一个 API Mock 接口

### 创建 API Mock

1. **进入 Mock 管理页面**
2. **点击"新建接口"按钮**
3. **填写接口信息**：
   - 接口名称
   - 请求方法（GET/POST/PUT/DELETE）
   - 接口路径
   - 响应数据
4. **保存并测试**：接口将自动在本地服务器上运行

### 使用 AI 助手

1. **打开 AI 助手面板**
2. **描述你的需求**：例如"生成一个用户登录的 API 接口"
3. **AI 将自动生成**：
   - 接口代码
   - 数据库模型
   - 前端调用示例
4. **一键应用**：将生成的代码应用到项目中

### 代码生成

1. **选择目标文件**：在文件管理器中右键点击文件
2. **选择生成类型**：API 接口、数据模型、前端组件等
3. **配置生成参数**：语言、框架、风格等
4. **生成并应用**：代码将自动生成并插入到文件中

## ⚙️ 配置说明

### AI 服务配置

```javascript
// 在设置页面配置 AI 服务
{
  "provider": "openai",  // 或 "claude", "deepseek", "gemini"
  "apiKey": "your-api-key",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 4000
}
```

### 项目设置

```javascript
// 项目配置文件
{
  "name": "My Project",
  "language": "typescript",
  "framework": "react",
  "apiBaseUrl": "http://localhost:3000/api"
}
```

## 🔧 高级功能

### 自定义模板

- **代码模板**：创建自定义的代码生成模板
- **API 模板**：定义标准的 API 接口模板
- **数据模板**：配置 Mock 数据的生成规则

### 团队协作

- **项目共享**：将项目配置导出为 JSON 文件
- **模板共享**：团队成员可以共享自定义模板
- **配置同步**：支持团队配置的统一管理

### 性能优化

- **缓存机制**：智能缓存 AI 响应和文件内容
- **增量更新**：只更新发生变化的文件
- **资源管理**：自动清理临时文件和缓存

## 🐛 故障排除

### 常见问题

#### 1. AI 服务连接失败

**问题**：AI 助手无法正常工作
**解决方案**：

- 检查网络连接
- 验证 API 密钥是否正确
- 确认 API 服务是否可用
- 检查防火墙设置

#### 2. 数据库初始化失败

**问题**：应用启动时数据库错误
**解决方案**：

```bash
# 重新初始化数据库
npx prisma db push
npx prisma generate
```

#### 3. 端口占用

**问题**：服务器启动失败，端口被占用
**解决方案**：

```bash
# 查找占用端口的进程
lsof -i :3400
# 终止进程
kill -9 <PID>
```

#### 4. 应用无法退出

**问题**：点击退出按钮无响应
**解决方案**：

- 使用 Cmd+Q (macOS) 或 Ctrl+Q (Windows/Linux)
- 通过菜单栏选择退出
- 强制退出：活动监视器中结束进程

### 日志查看

```bash
# 查看应用日志
npm run electron 2>&1 | tee app.log

# 查看服务器日志
npm run dev 2>&1 | tee server.log
```

## 📊 性能指标

### 系统性能

- **启动时间**：< 3 秒
- **内存占用**：< 200MB
- **CPU 使用率**：< 5%（空闲时）
- **响应时间**：< 100ms（本地操作）

### AI 服务性能

- **响应时间**：2-10 秒（取决于模型和网络）
- **并发处理**：支持多用户同时使用
- **缓存命中率**：> 80%

## 🔒 安全考虑

### 数据安全

- **本地存储**：所有数据存储在本地，不上传到云端
- **API 密钥**：加密存储在本地数据库中
- **文件权限**：遵循系统文件权限设置

### 网络安全

- **HTTPS 支持**：支持安全的 API 通信
- **CORS 配置**：可配置跨域资源共享策略
- **请求验证**：支持请求签名和验证

## 🚀 未来规划

### 短期目标

- [ ] 支持更多 AI 模型
- [ ] 增加代码质量检查
- [ ] 优化用户界面
- [ ] 添加更多代码模板

### 长期目标

- [ ] 云端同步功能
- [ ] 团队协作平台
- [ ] 插件系统
- [ ] 移动端支持

## 🤝 贡献指南

### 开发环境设置

```bash
# Fork 项目到你的 GitHub 账户
# 克隆你的 Fork
git clone https://github.com/your-username/mock-system.git
cd mock-system

# 创建开发分支
git checkout -b feature/your-feature-name

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

### 提交规范

```bash
# 提交信息格式
git commit -m "feat: 添加新功能"
git commit -m "fix: 修复问题"
git commit -m "docs: 更新文档"
git commit -m "style: 代码格式调整"
```

## 📄 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](LICENSE) 文件。

## 📞 联系我们

- **项目主页**：[GitHub Repository](https://github.com/your-username/mock-system)
- **问题反馈**：[Issues](https://github.com/your-username/mock-system/issues)
- **功能建议**：[Discussions](https://github.com/your-username/mock-system/discussions)

## 🙏 致谢

感谢以下开源项目的支持：

- [Electron](https://electronjs.org/)
- [Prisma](https://prisma.io/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Express.js](https://expressjs.com/)
- [Mock.js](https://github.com/nuysoft/Mock)

---

**Mock Coding** - 让 API 开发更智能、更高效！
