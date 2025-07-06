class AIAgentManager {
  constructor() {
    this.editor = null
    this.currentFile = null
    this.openTabs = new Map()
    this.fileTreeData = []

    this.init()
  }

  async init() {
    await this.initMonacoEditor()
    this.initFileTree()
    this.bindEvents()
    this.loadWelcomeContent()
  }

  // 初始化Monaco编辑器
  async initMonacoEditor() {
    return new Promise((resolve) => {
      require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } })
      require(['vs/editor/editor.main'], () => {
        this.editor = monaco.editor.create(document.getElementById('monaco-editor'), {
          value: '// 欢迎使用AI Agent代码管理\n// 请选择左侧文件开始编辑',
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          cursorStyle: 'line',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
          },
        })
        resolve()
      })
    })
  }

  // 初始化文件树
  initFileTree() {
    this.loadFileTree()
  }

  // 绑定事件
  bindEvents() {
    // 工具栏事件
    document.getElementById('search-btn').addEventListener('click', () => this.searchCode())
    document.getElementById('ai-complete-btn').addEventListener('click', () => this.aiComplete())
    document.getElementById('ai-refactor-btn').addEventListener('click', () => this.aiRefactor())
    document.getElementById('history-btn').addEventListener('click', () => this.showHistory())

    // 搜索框事件
    document.getElementById('code-search').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchCode()
    })

    // 侧边栏事件
    document.getElementById('refresh-tree').addEventListener('click', () => this.loadFileTree())
    document.getElementById('expand-all').addEventListener('click', () => this.expandAll())
    document.getElementById('collapse-all').addEventListener('click', () => this.collapseAll())

    // 编辑器事件
    document.getElementById('save-file').addEventListener('click', () => this.saveCurrentFile())
    document.getElementById('format-code').addEventListener('click', () => this.formatCode())

    // 面板切换事件
    document.querySelectorAll('.panel-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => this.switchPanel(e.target.dataset.panel))
    })

    // AI助手事件
    document.getElementById('send-message').addEventListener('click', () => this.sendMessage())
    document.getElementById('user-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    // 代码对比事件
    document.getElementById('accept-all').addEventListener('click', () => this.acceptAllDiffs())
    document.getElementById('reject-all').addEventListener('click', () => this.rejectAllDiffs())

    // 历史记录事件
    document.getElementById('refresh-history').addEventListener('click', () => this.loadHistory())

    // 模态框事件
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal())
    document.getElementById('modal-confirm').addEventListener('click', () => this.confirmModal())
    document.querySelector('.close-modal').addEventListener('click', () => this.closeModal())

    // 全局右键菜单事件
    document.addEventListener('click', () => this.hideContextMenu())
  }

  // 加载欢迎内容
  loadWelcomeContent() {
    const welcomeContent = `// 欢迎使用AI Agent代码管理
// 
// 功能特性：
// 1. 智能代码补全和重构
// 2. 语义化代码搜索
// 3. 多文件对比和合并
// 4. 版本历史管理
// 5. AI助手对话
//
// 开始使用：
// 1. 选择左侧文件进行编辑
// 2. 使用AI功能提升开发效率
// 3. 查看历史记录和版本对比
`
    this.editor.setValue(welcomeContent)
  }

  // 加载文件树
  async loadFileTree() {
    try {
      const response = await fetch('/api/file/tree')
      const data = await response.json()

      if (data.success && data.data) {
        this.fileTreeData = data.data
        this.renderFileTree()
      } else {
        this.showError('加载文件树失败')
      }
    } catch (error) {
      this.showError('加载文件树失败: ' + error.message)
    }
  }

  // 渲染文件树
  renderFileTree() {
    const fileTreeContainer = document.getElementById('file-tree')
    fileTreeContainer.innerHTML = ''

    if (this.fileTreeData.length === 0) {
      fileTreeContainer.innerHTML = '<div class="no-files">目录为空</div>'
      return
    }

    this.fileTreeData.forEach((item) => {
      this.renderFileTreeNode(item, fileTreeContainer, 0)
    })
  }

  // 渲染文件树节点
  renderFileTreeNode(node, container, level) {
    const nodeElement = document.createElement('div')
    nodeElement.className = `file-tree-node level-${level} ${node.type}`
    nodeElement.setAttribute('data-path', node.path)
    nodeElement.setAttribute('data-type', node.type)

    const icon = this.getFileIcon(node)

    nodeElement.innerHTML = `
      <div class="node-content">
        <i class="node-icon ${icon.class}"></i>
        <span class="node-name">${node.name}</span>
        ${node.type === 'directory' ? '<i class="expand-icon fas fa-chevron-right"></i>' : ''}
      </div>
    `

    // 绑定点击事件
    nodeElement.addEventListener('click', (e) => {
      e.stopPropagation()
      this.handleNodeClick(node, nodeElement)
    })

    // 绑定右键菜单
    nodeElement.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.showNodeContextMenu(e, node)
    })

    container.appendChild(nodeElement)

    // 递归渲染子节点
    if (node.type === 'directory' && node.children && node.children.length > 0) {
      const childrenContainer = document.createElement('div')
      childrenContainer.className = 'node-children'
      childrenContainer.style.display = 'none'

      node.children.forEach((child) => {
        this.renderFileTreeNode(child, childrenContainer, level + 1)
      })

      container.appendChild(childrenContainer)
    }
  }

  // 获取文件图标
  getFileIcon(node) {
    if (node.type === 'directory') {
      return { class: 'fas fa-folder text-warning' }
    }

    const ext = node.name.split('.').pop().toLowerCase()

    // 编程语言文件
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return { class: 'fab fa-js-square text-warning' }
    if (['py', 'pyc', 'pyo'].includes(ext)) return { class: 'fab fa-python text-primary' }
    if (['java', 'class'].includes(ext)) return { class: 'fab fa-java text-danger' }
    if (['cpp', 'cc', 'cxx', 'c++'].includes(ext)) return { class: 'fas fa-code text-info' }
    if (['c', 'h'].includes(ext)) return { class: 'fas fa-code text-info' }
    if (['go'].includes(ext)) return { class: 'fas fa-code text-cyan' }
    if (['rs'].includes(ext)) return { class: 'fas fa-code text-orange' }
    if (['php'].includes(ext)) return { class: 'fab fa-php text-purple' }
    if (['rb'].includes(ext)) return { class: 'fas fa-gem text-danger' }
    if (['swift'].includes(ext)) return { class: 'fab fa-swift text-orange' }
    if (['kt'].includes(ext)) return { class: 'fas fa-code text-purple' }
    if (['scala'].includes(ext)) return { class: 'fas fa-code text-danger' }
    if (['cs'].includes(ext)) return { class: 'fas fa-code text-purple' }
    if (['vb'].includes(ext)) return { class: 'fas fa-code text-blue' }
    if (['dart'].includes(ext)) return { class: 'fas fa-code text-blue' }

    // Web 文件
    if (['html', 'htm'].includes(ext)) return { class: 'fab fa-html5 text-danger' }
    if (['css', 'scss', 'sass', 'less'].includes(ext)) return { class: 'fab fa-css3-alt text-primary' }
    if (['vue'].includes(ext)) return { class: 'fab fa-vuejs text-success' }
    if (['jsx', 'tsx'].includes(ext)) return { class: 'fab fa-react text-info' }

    // 配置文件
    if (['json'].includes(ext)) return { class: 'fas fa-brackets-curly text-warning' }
    if (['xml'].includes(ext)) return { class: 'fas fa-code text-orange' }
    if (['yaml', 'yml'].includes(ext)) return { class: 'fas fa-file-code text-purple' }
    if (['toml'].includes(ext)) return { class: 'fas fa-file-code text-blue' }
    if (['ini', 'cfg', 'conf'].includes(ext)) return { class: 'fas fa-cog text-muted' }
    if (['env'].includes(ext)) return { class: 'fas fa-dot-circle text-success' }

    // 数据库文件
    if (['sql'].includes(ext)) return { class: 'fas fa-database text-info' }
    if (['db', 'sqlite'].includes(ext)) return { class: 'fas fa-database text-primary' }

    // 文档文件
    if (['md', 'markdown'].includes(ext)) return { class: 'fab fa-markdown text-info' }
    if (['txt'].includes(ext)) return { class: 'fas fa-file-alt text-muted' }
    if (['pdf'].includes(ext)) return { class: 'fas fa-file-pdf text-danger' }
    if (['doc', 'docx'].includes(ext)) return { class: 'fas fa-file-word text-primary' }
    if (['xls', 'xlsx'].includes(ext)) return { class: 'fas fa-file-excel text-success' }
    if (['ppt', 'pptx'].includes(ext)) return { class: 'fas fa-file-powerpoint text-warning' }

    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext))
      return { class: 'fas fa-file-image text-success' }

    // 音频文件
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return { class: 'fas fa-file-audio text-info' }

    // 视频文件
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return { class: 'fas fa-file-video text-danger' }

    // 压缩文件
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { class: 'fas fa-file-archive text-warning' }

    // 可执行文件
    if (['exe', 'app', 'dmg', 'deb', 'rpm'].includes(ext)) return { class: 'fas fa-cog text-danger' }

    // 默认文件类型
    return { class: 'fas fa-file text-muted' }
  }

  // 处理节点点击
  handleNodeClick(node, element) {
    // 移除其他选中状态
    document.querySelectorAll('.file-tree-node').forEach((el) => {
      el.classList.remove('selected')
    })

    // 添加选中状态
    element.classList.add('selected')

    if (node.type === 'file') {
      this.openFile(node)
    } else if (node.type === 'directory') {
      this.toggleDirectory(element, node)
    }
  }

  // 切换目录展开/折叠
  toggleDirectory(element, node) {
    const childrenContainer = element.nextElementSibling
    const expandIcon = element.querySelector('.expand-icon')

    if (childrenContainer && childrenContainer.classList.contains('node-children')) {
      const isExpanded = childrenContainer.style.display !== 'none'

      if (isExpanded) {
        childrenContainer.style.display = 'none'
        expandIcon.classList.remove('fa-chevron-down')
        expandIcon.classList.add('fa-chevron-right')
      } else {
        childrenContainer.style.display = 'block'
        expandIcon.classList.remove('fa-chevron-right')
        expandIcon.classList.add('fa-chevron-down')
      }
    }
  }

  // 展开所有目录
  expandAll() {
    document.querySelectorAll('.file-tree-node.directory').forEach((element) => {
      const childrenContainer = element.nextElementSibling
      const expandIcon = element.querySelector('.expand-icon')

      if (childrenContainer && childrenContainer.classList.contains('node-children')) {
        childrenContainer.style.display = 'block'
        expandIcon.classList.remove('fa-chevron-right')
        expandIcon.classList.add('fa-chevron-down')
      }
    })
  }

  // 折叠所有目录
  collapseAll() {
    document.querySelectorAll('.file-tree-node.directory').forEach((element) => {
      const childrenContainer = element.nextElementSibling
      const expandIcon = element.querySelector('.expand-icon')

      if (childrenContainer && childrenContainer.classList.contains('node-children')) {
        childrenContainer.style.display = 'none'
        expandIcon.classList.remove('fa-chevron-down')
        expandIcon.classList.add('fa-chevron-right')
      }
    })
  }

  // 显示节点右键菜单
  showNodeContextMenu(e, node) {
    e.preventDefault()

    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.style.left = e.pageX + 'px'
    menu.style.top = e.pageY + 'px'

    const isFile = node.type === 'file'
    const isFolder = node.type === 'directory'

    let menuItems = []

    if (isFolder) {
      menuItems.push(
        { label: '新建文件', icon: 'fas fa-file', action: () => this.createNewFile(node) },
        { label: '新建文件夹', icon: 'fas fa-folder', action: () => this.createNewFolder(node) },
        { separator: true }
      )
    }

    menuItems.push(
      { label: '重命名', icon: 'fas fa-edit', action: () => this.renameItem(node) },
      { label: '删除', icon: 'fas fa-trash', action: () => this.deleteItem(node) },
      { separator: true },
      { label: '复制路径', icon: 'fas fa-copy', action: () => this.copyPath(node) }
    )

    menuItems.forEach((item) => {
      if (item.separator) {
        const separator = document.createElement('div')
        separator.className = 'menu-separator'
        menu.appendChild(separator)
      } else {
        const menuItem = document.createElement('div')
        menuItem.className = 'menu-item'
        menuItem.innerHTML = `<i class="${item.icon}"></i> ${item.label}`
        menuItem.addEventListener('click', () => {
          item.action()
          this.hideContextMenu()
        })
        menu.appendChild(menuItem)
      }
    })

    document.body.appendChild(menu)

    // 点击其他地方关闭菜单
    setTimeout(() => {
      document.addEventListener('click', () => this.hideContextMenu(), { once: true })
    }, 0)
  }

  // 隐藏右键菜单
  hideContextMenu() {
    const menus = document.querySelectorAll('.context-menu')
    menus.forEach((menu) => menu.remove())
  }

  // 打开文件
  async openFile(node) {
    try {
      const response = await fetch(`/api/file/read?path=${encodeURIComponent(node.path)}`)
      const data = await response.json()

      if (data.success) {
        this.currentFile = node.path
        this.openTab(node.path, node.name, data.data.content)
        this.setEditorLanguage(node.path)
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('打开文件失败: ' + error.message)
    }
  }

  // 打开标签页
  openTab(filePath, fileName, content) {
    // 检查是否已经打开
    if (this.openTabs.has(filePath)) {
      this.switchTab(filePath)
      return
    }

    // 创建新标签页
    const tabsContainer = document.querySelector('.editor-tabs')
    const tab = document.createElement('div')
    tab.className = 'tab'
    tab.setAttribute('data-path', filePath)
    tab.innerHTML = `
      <span class="tab-name">${fileName}</span>
      <button class="close-tab" data-path="${filePath}">
        <i class="fas fa-times"></i>
      </button>
    `

    // 绑定关闭事件
    tab.querySelector('.close-tab').addEventListener('click', (e) => {
      e.stopPropagation()
      this.closeTab(filePath)
    })

    // 绑定切换事件
    tab.addEventListener('click', () => this.switchTab(filePath))

    tabsContainer.appendChild(tab)
    this.openTabs.set(filePath, { fileName, content })

    // 切换到新标签页
    this.switchTab(filePath)
  }

  // 切换标签页
  switchTab(filePath) {
    // 更新标签页状态
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active')
    })
    document.querySelector(`[data-path="${filePath}"]`).classList.add('active')

    // 更新编辑器内容
    const tabData = this.openTabs.get(filePath)
    if (tabData) {
      this.currentFile = filePath
      this.editor.setValue(tabData.content)
      this.setEditorLanguage(filePath)
    }
  }

  // 关闭标签页
  closeTab(filePath) {
    const tab = document.querySelector(`[data-path="${filePath}"]`)
    if (tab) {
      tab.remove()
      this.openTabs.delete(filePath)

      // 如果关闭的是当前标签页，切换到其他标签页
      if (this.currentFile === filePath) {
        const remainingTabs = document.querySelectorAll('.tab')
        if (remainingTabs.length > 0) {
          const nextTab = remainingTabs[0]
          const nextPath = nextTab.getAttribute('data-path')
          this.switchTab(nextPath)
        } else {
          this.currentFile = null
          this.loadWelcomeContent()
        }
      }
    }
  }

  // 设置编辑器语言
  setEditorLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase()
    let language = 'plaintext'

    switch (ext) {
      case 'js':
      case 'jsx':
        language = 'javascript'
        break
      case 'ts':
      case 'tsx':
        language = 'typescript'
        break
      case 'py':
        language = 'python'
        break
      case 'java':
        language = 'java'
        break
      case 'cpp':
      case 'cc':
      case 'cxx':
        language = 'cpp'
        break
      case 'c':
        language = 'c'
        break
      case 'html':
      case 'htm':
        language = 'html'
        break
      case 'css':
      case 'scss':
      case 'sass':
        language = 'css'
        break
      case 'json':
        language = 'json'
        break
      case 'xml':
        language = 'xml'
        break
      case 'md':
        language = 'markdown'
        break
      case 'sql':
        language = 'sql'
        break
      case 'php':
        language = 'php'
        break
      case 'go':
        language = 'go'
        break
      case 'rs':
        language = 'rust'
        break
      case 'vue':
        language = 'vue'
        break
      default:
        language = 'plaintext'
    }

    monaco.editor.setModelLanguage(this.editor.getModel(), language)
  }

  // 保存当前文件
  async saveCurrentFile() {
    if (!this.currentFile) {
      this.showError('没有打开的文件')
      return
    }

    const content = this.editor.getValue()

    try {
      const response = await fetch('/api/file/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: this.currentFile,
          content,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 更新标签页内容
        this.openTabs.set(this.currentFile, {
          fileName: this.currentFile.split('/').pop(),
          content,
        })
        this.showSuccess('文件保存成功')
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('保存文件失败: ' + error.message)
    }
  }

  // 格式化代码
  formatCode() {
    if (this.currentFile) {
      this.editor.getAction('editor.action.formatDocument').run()
    }
  }

  // 搜索代码
  async searchCode() {
    const query = document.getElementById('code-search').value.trim()
    if (!query) {
      this.showError('请输入搜索关键词')
      return
    }

    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          type: 'code',
          top_k: 10,
        }),
      })

      const data = await response.json()

      if (data.success) {
        this.displaySearchResults(data.results, query)
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('搜索失败: ' + error.message)
    }
  }

  // 显示搜索结果
  displaySearchResults(results, query) {
    const diffPanel = document.getElementById('diff-panel')
    diffPanel.innerHTML = `
      <div class="diff-header">
        <h4>搜索结果: "${query}"</h4>
        <div class="diff-actions">
          <button class="btn secondary" onclick="aiAgent.acceptAllDiffs()">应用全部</button>
          <button class="btn secondary" onclick="aiAgent.rejectAllDiffs()">拒绝全部</button>
        </div>
      </div>
      <div class="diff-list">
        ${results
          .map(
            (result, index) => `
          <div class="diff-item">
            <div class="diff-item-header">
              <div class="diff-item-title">${result.meta?.filePath || '未知文件'}</div>
              <div class="diff-item-actions">
                <button class="btn success" onclick="aiAgent.acceptDiff(${index})">应用</button>
                <button class="btn danger" onclick="aiAgent.rejectDiff(${index})">拒绝</button>
              </div>
            </div>
            <div class="diff-item-content">
              <pre><code>${this.escapeHtml(result.meta?.content || '')}</code></pre>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `

    this.diffSuggestions = results
    this.switchPanel('diff')
  }

  // AI代码补全
  async aiComplete() {
    if (!this.currentFile) {
      this.showError('请先打开一个文件')
      return
    }

    const content = this.editor.getValue()
    const selection = this.editor.getSelection()
    const selectedText = this.editor.getModel().getValueInRange(selection)

    try {
      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: selectedText || '请补全当前代码',
          context: content,
        }),
      })

      const data = await response.json()

      if (data.success) {
        this.showCodeSuggestion(data.completion, 'AI代码补全')
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('AI补全失败: ' + error.message)
    }
  }

  // AI代码重构
  async aiRefactor() {
    if (!this.currentFile) {
      this.showError('请先打开一个文件')
      return
    }

    const content = this.editor.getValue()
    const selection = this.editor.getSelection()
    const selectedText = this.editor.getModel().getValueInRange(selection)

    if (!selectedText) {
      this.showError('请先选择要重构的代码')
      return
    }

    try {
      const response = await fetch('/api/ai/batch-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '请重构以下代码，提高可读性和性能',
          files: [
            {
              path: this.currentFile,
              content: content,
            },
          ],
        }),
      })

      const data = await response.json()

      if (data.success) {
        this.showDiffSuggestions(data.results)
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('AI重构失败: ' + error.message)
    }
  }

  // 发送消息
  async sendMessage() {
    const input = document.getElementById('user-input')
    const message = input.value.trim()

    if (!message) return

    // 添加用户消息
    this.addChatMessage('user', message)
    input.value = ''

    // 添加AI回复
    this.addChatMessage('ai', '正在思考...')

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 更新AI回复
        const aiMessage = document.querySelector('.message.ai:last-child .message-content')
        aiMessage.innerHTML = this.formatMessage(data.reply)
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('发送消息失败: ' + error.message)
    }
  }

  // 添加聊天消息
  addChatMessage(type, content) {
    const chatMessages = document.querySelector('.chat-messages')
    const message = document.createElement('div')
    message.className = `message ${type}`
    message.innerHTML = `
      <div class="message-content">
        <i class="fas ${type === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        <div class="text">${this.formatMessage(content)}</div>
      </div>
    `
    chatMessages.appendChild(message)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  // 格式化消息
  formatMessage(content) {
    return content
      .replace(/\n/g, '<br>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
  }

  // 转义HTML
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // 显示代码建议
  showCodeSuggestion(suggestion, title) {
    const diffPanel = document.getElementById('diff-panel')
    diffPanel.innerHTML = `
      <div class="diff-header">
        <h4>${title}</h4>
        <div class="diff-actions">
          <button class="btn success" onclick="aiAgent.acceptSuggestion()">应用建议</button>
          <button class="btn danger" onclick="aiAgent.rejectSuggestion()">拒绝建议</button>
        </div>
      </div>
      <div class="diff-list">
        <div class="diff-item">
          <div class="diff-item-content">
            <pre><code>${this.escapeHtml(suggestion)}</code></pre>
          </div>
        </div>
      </div>
    `

    this.currentSuggestion = suggestion
    this.switchPanel('diff')
  }

  // 应用建议
  acceptSuggestion() {
    if (this.currentSuggestion) {
      this.editor.setValue(this.currentSuggestion)
      this.showSuccess('建议已应用')
      this.switchPanel('chat')
    }
  }

  // 拒绝建议
  rejectSuggestion() {
    this.currentSuggestion = null
    this.switchPanel('chat')
  }

  // 显示差异建议
  showDiffSuggestions(results) {
    const diffPanel = document.getElementById('diff-panel')
    diffPanel.innerHTML = `
      <div class="diff-header">
        <h4>AI重构建议</h4>
        <div class="diff-actions">
          <button class="btn secondary" onclick="aiAgent.acceptAllDiffs()">应用全部</button>
          <button class="btn secondary" onclick="aiAgent.rejectAllDiffs()">拒绝全部</button>
        </div>
      </div>
      <div class="diff-list">
        ${results
          .map(
            (result, index) => `
          <div class="diff-item">
            <div class="diff-item-header">
              <div class="diff-item-title">${result.path}</div>
              <div class="diff-item-actions">
                <button class="btn success" onclick="aiAgent.acceptDiff(${index})">应用</button>
                <button class="btn danger" onclick="aiAgent.rejectDiff(${index})">拒绝</button>
              </div>
            </div>
            <div class="diff-item-content">
              <pre><code>${this.escapeHtml(result.diff)}</code></pre>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `

    this.diffSuggestions = results
    this.switchPanel('diff')
  }

  // 接受差异
  acceptDiff(diffId) {
    const diff = this.diffSuggestions[diffId]
    if (diff) {
      this.editor.setValue(diff.newContent)
      this.showSuccess('差异已应用')
      this.diffSuggestions.splice(diffId, 1)
      this.renderDiffList()
    }
  }

  // 拒绝差异
  rejectDiff(diffId) {
    this.diffSuggestions.splice(diffId, 1)
    this.renderDiffList()
  }

  // 接受所有差异
  acceptAllDiffs() {
    if (this.diffSuggestions.length > 0) {
      const lastDiff = this.diffSuggestions[this.diffSuggestions.length - 1]
      this.editor.setValue(lastDiff.newContent)
      this.showSuccess('所有差异已应用')
      this.diffSuggestions = []
      this.renderDiffList()
    }
  }

  // 拒绝所有差异
  rejectAllDiffs() {
    this.diffSuggestions = []
    this.renderDiffList()
  }

  // 渲染差异列表
  renderDiffList() {
    const diffList = document.querySelector('.diff-list')
    if (!diffList) return

    diffList.innerHTML = this.diffSuggestions
      .map(
        (diff, index) => `
      <div class="diff-item">
        <div class="diff-item-header">
          <div class="diff-item-title">${diff.path}</div>
          <div class="diff-item-actions">
            <button class="btn success" onclick="aiAgent.acceptDiff(${index})">应用</button>
            <button class="btn danger" onclick="aiAgent.rejectDiff(${index})">拒绝</button>
          </div>
        </div>
        <div class="diff-item-content">
          <pre><code>${this.escapeHtml(diff.diff)}</code></pre>
        </div>
      </div>
    `
      )
      .join('')
  }

  // 切换面板
  switchPanel(panelName) {
    // 隐藏所有面板
    document.querySelectorAll('.panel-content').forEach((panel) => {
      panel.classList.remove('active')
    })

    // 移除所有标签页激活状态
    document.querySelectorAll('.panel-tab').forEach((tab) => {
      tab.classList.remove('active')
    })

    // 显示指定面板
    document.getElementById(`${panelName}-panel`).classList.add('active')
    document.querySelector(`[data-panel="${panelName}"]`).classList.add('active')
  }

  // 加载历史记录
  async loadHistory() {
    if (!this.currentFile) {
      this.showError('请先打开一个文件')
      return
    }

    try {
      const response = await fetch(`/api/file/history?filePath=${encodeURIComponent(this.currentFile)}`)
      const data = await response.json()

      if (data.success) {
        this.fileHistory = data.data
        this.renderHistoryList()
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('加载历史记录失败: ' + error.message)
    }
  }

  // 渲染历史记录列表
  renderHistoryList() {
    const historyList = document.getElementById('history-list')
    historyList.innerHTML = this.fileHistory
      .map(
        (history) => `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-item-title">${history.action} - ${new Date(history.createdAt).toLocaleString()}</div>
          <div class="history-item-actions">
            <button class="btn secondary" onclick="aiAgent.viewHistory(${history.id})">查看</button>
            <button class="btn success" onclick="aiAgent.rollbackToHistory(${history.id})">回滚</button>
          </div>
        </div>
        <div class="history-item-content">
          <pre><code>${this.escapeHtml(history.content.substring(0, 200))}${
          history.content.length > 200 ? '...' : ''
        }</code></pre>
        </div>
      </div>
    `
      )
      .join('')
  }

  // 查看历史记录
  async viewHistory(historyId) {
    try {
      const response = await fetch(`/api/file/history-by-id?id=${historyId}`)
      const data = await response.json()

      if (data.success) {
        this.editor.setValue(data.data.content)
        this.showSuccess('历史记录已加载')
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('查看历史记录失败: ' + error.message)
    }
  }

  // 回滚到历史版本
  async rollbackToHistory(historyId) {
    if (!this.currentFile) {
      this.showError('请先打开一个文件')
      return
    }

    try {
      const response = await fetch('/api/file/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: this.currentFile,
          historyId: historyId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        this.showSuccess('回滚成功')
        this.loadHistory()
      } else {
        this.showError(data.error)
      }
    } catch (error) {
      this.showError('回滚失败: ' + error.message)
    }
  }

  // 显示历史记录面板
  showHistory() {
    this.loadHistory()
    this.switchPanel('history')
  }

  // 创建新文件
  createNewFile(parentNode) {
    const fileName = prompt('请输入文件名:')
    if (!fileName) return

    const filePath = parentNode ? `${parentNode.path}/${fileName}` : fileName

    fetch('/api/file/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: filePath,
        content: '',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.showSuccess('文件创建成功')
          this.loadFileTree()
        } else {
          this.showError(data.error)
        }
      })
      .catch((error) => {
        this.showError('创建文件失败: ' + error.message)
      })
  }

  // 创建新文件夹
  createNewFolder(parentNode) {
    const folderName = prompt('请输入文件夹名:')
    if (!folderName) return

    const folderPath = parentNode ? `${parentNode.path}/${folderName}` : folderName

    fetch('/api/file/mkdir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dirPath: folderPath,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.showSuccess('文件夹创建成功')
          this.loadFileTree()
        } else {
          this.showError(data.error)
        }
      })
      .catch((error) => {
        this.showError('创建文件夹失败: ' + error.message)
      })
  }

  // 重命名项目
  renameItem(node) {
    const newName = prompt('请输入新名称:', node.name)
    if (!newName || newName === node.name) return

    const oldPath = node.path
    const newPath = node.path.replace(node.name, newName)

    fetch('/api/file/rename', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPath: oldPath,
        newName: newName,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.showSuccess('重命名成功')
          this.loadFileTree()
        } else {
          this.showError(data.error)
        }
      })
      .catch((error) => {
        this.showError('重命名失败: ' + error.message)
      })
  }

  // 删除项目
  deleteItem(node) {
    if (!confirm(`确定要删除 ${node.name} 吗？`)) return

    fetch('/api/file/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemPath: node.path,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          this.showSuccess('删除成功')
          this.loadFileTree()
        } else {
          this.showError(data.error)
        }
      })
      .catch((error) => {
        this.showError('删除失败: ' + error.message)
      })
  }

  // 复制路径
  copyPath(node) {
    navigator.clipboard
      .writeText(node.path)
      .then(() => {
        this.showSuccess('路径已复制到剪贴板')
      })
      .catch(() => {
        this.showError('复制失败')
      })
  }

  // 显示模态框
  showModal(title, content, onConfirm) {
    const modal = document.getElementById('modal')
    const modalTitle = document.getElementById('modal-title')
    const modalBody = document.getElementById('modal-body')

    modalTitle.textContent = title
    modalBody.innerHTML = content
    modal.style.display = 'block'

    this.modalCallback = onConfirm
  }

  // 关闭模态框
  closeModal() {
    document.getElementById('modal').style.display = 'none'
    this.modalCallback = null
  }

  // 确认模态框
  confirmModal() {
    if (this.modalCallback) {
      this.modalCallback()
    }
    this.closeModal()
  }

  // 显示加载状态
  showLoading() {
    document.getElementById('loading').style.display = 'flex'
  }

  // 隐藏加载状态
  hideLoading() {
    document.getElementById('loading').style.display = 'none'
  }

  // 显示成功消息
  showSuccess(message) {
    this.showToast(message, 'success')
  }

  // 显示错误消息
  showError(message) {
    this.showToast(message, 'error')
  }

  // 显示Toast通知
  showToast(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.textContent = message

    document.body.appendChild(toast)

    // 3秒后自动移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 3000)
  }
}

// 初始化应用
const aiAgent = new AIAgentManager()
