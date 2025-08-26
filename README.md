# AI Agent 代码管理系统

## 新功能：全栈 AI Agent 输出支持

### 特性

1. **流式 Markdown 渲染**

   - 使用 marked.js 解析 Markdown
   - 使用 Prism.js 进行代码高亮
   - 支持实时流式渲染，无闪烁

2. **智能 JSON 处理**

   - 自动检测流式内容中的 JSON 代码块
   - 当 `"schema_validation": "pass"` 时显示可折叠的改动方案
   - 支持 CREATE、MODIFY、DELETE、RENAME 操作

3. **DOM 追加渲染**
   - 采用 DOM 追加方式，避免整个内容重绘
   - 消除闪烁问题，提供流畅的用户体验

### 使用方法

#### 实际使用

1. 在 AI 对话中输入需求
2. 系统自动检测并处理全栈 AI Agent 输出
3. Markdown 内容实时渲染
4. JSON 代码块自动转换为可折叠组件
5. 在 Diff 面板查看详细的改动信息

### 技术架构

- **前端渲染**: marked.js + Prism.js
- **流式处理**: Server-Sent Events
- **DOM 操作**: 追加式渲染，避免重绘
- **样式主题**: 深色主题，与现有 UI 保持一致

### 支持的操作类型

- **CREATE**: 创建新文件/组件
- **MODIFY**: 修改现有文件
- **DELETE**: 删除文件
- **RENAME**: 重命名文件

### 风险等级

- **low**: 低风险，绿色标识
- **medium**: 中等风险，黄色标识
- **high**: 高风险，红色标识

### 文件结构

```
public/
├── aiAgent.js          # 主要逻辑文件
├── aiAgent.css         # 样式文件
├── aiAgent.html        # HTML模板
└── README.md           # 说明文档
```

### 依赖库

- marked.js: Markdown 解析
- Prism.js: 代码高亮
- Font Awesome: 图标
- Monaco Editor: 代码编辑器
