# Mock System

一个功能强大的 API Mock 服务和代码生成平台，支持 AI 智能助手，专为前端开发团队设计。

## ✨ 主要特性

### 🚀 API Mock 服务
- **RESTful API 模拟** - 支持 GET、POST、PUT、DELETE 等所有 HTTP 方法
- **动态响应** - 支持查询参数、请求体参数和响应头配置
- **分组管理** - 按项目或模块组织 API 接口
- **实时预览** - 即时查看 API 响应效果

### 🤖 AI 智能助手
- **代码生成** - 基于 API 接口自动生成前端组件和页面
- **多技术栈支持** - Vue 2/3、React、Flutter 等主流框架
- **UI 库集成** - Element UI、Ant Design、Material UI 等
- **流式响应** - 实时显示 AI 生成过程

### 📁 文件管理
- **项目文件浏览** - 树形结构展示项目文件
- **代码编辑** - 内置 Monaco Editor 代码编辑器
- **文件历史** - 自动保存文件修改历史
- **搜索功能** - 快速定位文件和代码

### ⚙️ 系统设置
- **AI 提供者配置** - 支持 OpenAI、Claude、Gemini 等
- **模型管理** - 灵活配置不同用途的 AI 模型
- **API 密钥管理** - 安全的密钥存储和管理
- **主题设置** - 深色/浅色主题切换

## 🛠️ 技术栈

- **前端**: HTML5、CSS3、JavaScript (ES6+)
- **后端**: Node.js、Express.js
- **桌面应用**: Electron
- **数据库**: SQLite + Prisma ORM
- **AI 集成**: OpenAI API、Claude API、Gemini API
- **代码编辑**: Monaco Editor
- **构建工具**: Electron Builder

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn
- macOS 10.12+ (桌面应用)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd mock-system
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **生成 Prisma 客户端**
   ```bash
   npx prisma generate
   ```

4. **启动开发服务器**
   ```bash
   npm start
   ```

5. **构建桌面应用**
   ```bash
   npm run build-mac
   ```

详细构建指南请参考 [BUILD_GUIDE.md](./BUILD_GUIDE.md)

## 📖 使用指南

### 创建 Mock API
1. 点击"新建 Mock"按钮
2. 填写接口路径、方法和响应内容
3. 配置查询参数和请求体参数
4. 保存并测试接口

### AI 代码生成
1. 选择要生成的技术栈和 UI 库
2. 选择相关的 API 接口
3. 描述页面结构和功能需求
4. AI 自动生成完整的前端代码

### 文件管理
1. 在文件树中浏览项目结构
2. 双击文件进行编辑
3. 使用搜索功能快速定位
4. 查看文件修改历史

## 🎯 应用场景

- **前端开发** - 快速搭建 API 接口进行前端开发
- **接口测试** - 模拟后端接口进行功能测试
- **原型开发** - 快速创建产品原型和演示
- **代码生成** - AI 辅助生成标准化的前端代码
- **团队协作** - 统一接口规范和代码风格

## 📁 项目结构

```
mock-system/
├── public/                 # 前端静态文件
│   ├── index.html         # 主页面
│   ├── aiAgent.js         # AI 助手功能
│   ├── settings.js        # 设置管理
│   └── ...
├── routes/                # API 路由
│   ├── mockRoutes.js      # Mock 接口路由
│   ├── aiAgentRoutes.js   # AI 助手路由
│   └── settingsRoutes.js  # 设置路由
├── services/              # 业务逻辑服务
│   ├── mockService.js     # Mock 服务
│   ├── aiService.js       # AI 服务
│   └── dbService.js       # 数据库服务
├── prisma/                # 数据库配置
│   ├── schema.prisma      # 数据库模式
│   └── dev.db            # SQLite 数据库
├── electron-main.js       # Electron 主进程
├── app.js                 # Express 应用入口
└── package.json           # 项目配置
```

## 🔧 配置说明

### AI 提供者配置
在系统设置中配置 AI 提供者：
- **OpenAI** - GPT-4o、GPT-4o Mini
- **Claude** - Claude-3.5-Sonnet
- **Gemini** - Gemini Pro
- **自定义** - 支持自定义 API 端点

### 环境变量
创建 `.env` 文件配置环境变量：
```env
# 数据库
DATABASE_URL="file:./prisma/dev.db"

# AI 配置（可选）
OPENAI_API_KEY="your-openai-key"
CLAUDE_API_KEY="your-claude-key"
GEMINI_API_KEY="your-gemini-key"
```

## �� 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## �� 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目的支持：
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [Prisma](https://prisma.io/) - 现代数据库工具包
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [Express.js](https://expressjs.com/) - Web 应用框架

## 📞 支持

如有问题或建议，请：
- 提交 [Issue](https://github.com/your-repo/issues)
- 发送邮件至 your-email@example.com
- 查看 [文档](https://your-docs-url.com)

---

**Mock System** - 让 API Mock 和代码生成变得简单高效！ 🚀
