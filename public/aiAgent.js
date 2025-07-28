class AIAgentManager {
  constructor() {
    this.editor = null
    this.currentFile = null
    this.openTabs = new Map()
    this.fileTreeData = []
    this.selectedNode = null
    this.selectedNodePath = null
    this.selectedPaths = [] // 初始化选中路径数组
    this.pathListData = [] // 初始化路径列表数据

    this.init()
    this.initSearchDropdown()
    this.initResizeBar()
  }

  async init() {
    try {
      this.showLoading()
      await this.initMonacoEditor()
      this.initFileTree()
      this.bindEvents()
      this.loadWelcomeContent()
      this.initSearchDropdown()
      this.initResizeBar()
      this.renderPathList() // 初始化路径列表
      this.hideLoading()
    } catch (error) {
      console.error('初始化失败:', error)
      this.hideLoading()
      this.showError('初始化失败: ' + error.message)
    }
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
    // 文件树事件
    document.getElementById('file-tree').addEventListener('click', (e) => {
      const nodeElement = e.target.closest('.file-tree-node')
      if (nodeElement) {
        const node = JSON.parse(nodeElement.dataset.node)
        this.handleNodeClick(node, nodeElement)
      }
    })

    // 右键菜单事件
    document.addEventListener('click', () => this.hideContextMenu())
    document.getElementById('file-tree').addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const nodeElement = e.target.closest('.file-tree-node')
      if (nodeElement) {
        const node = JSON.parse(nodeElement.dataset.node)
        this.showNodeContextMenu(e, node)
      }
    })

    // 标签页事件
    document.addEventListener('click', (e) => {
      if (e.target.closest('.tab')) {
        const tab = e.target.closest('.tab')
        const filePath = tab.dataset.file
        if (filePath) {
          this.switchTab(filePath)
        }
      }
      if (e.target.closest('.close-tab')) {
        e.stopPropagation()
        const tab = e.target.closest('.tab')
        const filePath = tab.dataset.file
        if (filePath) {
          this.closeTab(filePath)
        }
      }
    })

    // 工具栏事件
    document.getElementById('refresh-tree').addEventListener('click', () => this.loadFileTree())
    document.getElementById('new-file-btn').addEventListener('click', () => this.handleCreateFile())
    document.getElementById('new-folder-btn').addEventListener('click', () => this.handleCreateFolder())
    document.getElementById('save-file').addEventListener('click', () => this.saveCurrentFile())
    document.getElementById('format-code').addEventListener('click', () => this.formatCode())

    // 搜索事件
    document.getElementById('search-btn').addEventListener('click', () => this.searchCode())
    document.getElementById('code-search').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchCode()
      }
    })

    // AI助手事件
    document.getElementById('send-message').addEventListener('click', () => this.sendMessage())
    document.getElementById('user-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    // 面板切换事件
    document.querySelectorAll('.panel-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const panelName = tab.dataset.panel
        this.switchPanel(panelName)
      })
    })

    // 路径管理事件
    document.getElementById('add-path-btn').addEventListener('click', () => this.showPathPopover())

    // 路径选择Popover事件
    document.getElementById('path-manager-title').addEventListener('click', () => this.toggleSelectedPathsPopover())
    document.getElementById('close-path-popover').addEventListener('click', () => this.hidePathPopover())
    document.getElementById('cancel-path-selection').addEventListener('click', () => this.hidePathPopover())
    document.getElementById('confirm-selected-paths').addEventListener('click', () => this.confirmPathSelection())

    // 路径搜索事件
    document.getElementById('path-search-input').addEventListener('input', (e) => this.filterPathList(e.target.value))

    // 路径列表事件委托
    document.getElementById('path-list').addEventListener('click', (e) => {
      if (e.target.closest('.remove-path')) {
        e.preventDefault()
        const pathItem = e.target.closest('.path-item')
        const path = pathItem.dataset.path
        this.removePath(path)
      }
    })

    // 路径选择Popover内容事件委托
    document.getElementById('path-popover-content').addEventListener('click', (e) => {
      const pathItem = e.target.closest('.path-popover-item')
      if (pathItem) {
        this.togglePathSelection(pathItem)
      }
    })

    // 其他事件
    document.getElementById('open-terminal-btn').addEventListener('click', () => this.openTerminal())
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings())
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
    nodeElement.setAttribute('data-node', JSON.stringify(node)) // 添加 data-node 属性

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

    this.selectedNode = node
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
        { label: '新建文件', icon: 'fas fa-file', action: () => this.handleCreateFile() },
        { label: '新建文件夹', icon: 'fas fa-folder', action: () => this.handleCreateFolder() },
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
    tab.setAttribute('data-file', filePath) // 添加 data-file 属性
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
    // const currentTab = document.querySelector(`[data-path="${filePath}"]`)
    const currentTab = document.querySelector(`[data-file="${filePath}"]`)
    if (currentTab) {
      currentTab.classList.add('active')
      // 自动滚动到当前tab
      currentTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
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
          // 自动滚动到新激活tab
          if (nextTab) {
            nextTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
          }
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
      const response = await fetch('/api/ai-agent/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          type: 'code',
          top_k: 2,
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

  // 渲染多条命令为可点击行
  renderShellCommandBlock(cmdArr) {
    console.log('sjsshhsh', cmdArr)

    if (!Array.isArray(cmdArr)) cmdArr = [cmdArr]
    const blockId = 'cmd-block-' + Math.random().toString(36).slice(2)
    return `
      <div class="shell-cmd-block" id="${blockId}" style="margin-bottom:8px;">
        <div>
          ${cmdArr
            .map((cmdObj) => {
              if (typeof cmdObj === 'string') return this.renderShellCommandLine(cmdObj)
              return this.renderShellCommandLine(cmdObj.command, cmdObj.commandExplain)
            })
            .join('')}
        </div>
      </div>
    `
  }

  // 渲染单条命令为可点击行（支持命令解释）
  renderShellCommandLine(cmd, explain) {
    return `
      <div class="shell-cmd-line-wrap">
        ${explain ? `<div class="shell-cmd-explain">${this.escapeHtml(explain)}</div>` : ''}
        <div class="shell-cmd-line">
          <code class="shell-cmd-code">${this.escapeHtml(cmd)}</code>
          <button class="run-cmd-btn" data-cmd="${encodeURIComponent(cmd)}" title="运行命令">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `
  }

  // 绑定所有“运行”按钮事件和“全部运行”按钮事件
  bindShellCmdBtnEvents() {
    // 单条命令
    document.querySelectorAll('.run-cmd-btn').forEach((btn) => {
      if (btn._bound) return
      btn._bound = true
      btn.onclick = function () {
        const cmd = decodeURIComponent(this.dataset.cmd)
        if (window.sendTerminalCommand) {
          window.sendTerminalCommand(cmd)
          // 按钮动画反馈
          this.classList.add('run-cmd-btn-active')
          setTimeout(() => this.classList.remove('run-cmd-btn-active'), 300)
        }
      }
    })
    // 全部运行
    document.querySelectorAll('.run-all-cmd-btn').forEach((btn) => {
      if (btn._bound) return
      btn._bound = true
      btn.onclick = function () {
        const block = this.closest('.shell-cmd-block')
        if (!block) return
        const cmdBtns = block.querySelectorAll('.run-cmd-btn')
        for (const btn of cmdBtns) {
          btn.click()
        }
        this.disabled = true
        this.textContent = '已全部发送'
      }
    })
  }

  async sendMessage() {
    const input = document.getElementById('user-input')
    const message = input.value.trim()
    if (!message) return

    // 清空输入框
    input.value = ''

    // 添加用户消息到聊天界面
    this.addChatMessage('user', message)

    // 获取当前编辑器文件路径
    const currentTab = document.querySelector('.tab.active')
    const editorFilePath = currentTab ? currentTab.dataset.file : null

    // 获取手动添加的路径（这里可以从某个全局变量或DOM元素获取）
    const manualPaths = this.getManualPaths()

    // 获取上下文路径（最近四个请求的上下文）
    const contextPaths = this.getContextPaths()

    // 构建请求参数
    const requestData = {
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      editorFile: editorFilePath,
      manualPaths: manualPaths,
      contextPaths: contextPaths,
    }

    try {
      // 发送流式请求
      const response = await fetch('/api/ai-agent/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiMessage = ''
      let isFirstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // 流式传输结束
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                if (isFirstChunk) {
                  // 第一次收到内容时创建AI消息
                  this.addChatMessage('ai', '')
                  isFirstChunk = false
                }
                aiMessage += parsed.content
                // 更新最后一条AI消息的内容
                this.updateLastAIMessage(aiMessage)
              }
            } catch (e) {
              console.error('解析流式数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      this.addChatMessage('ai', `发送消息失败: ${error.message}`)
    }
  }

  // 获取手动添加的路径
  getManualPaths() {
    // 这里可以从DOM元素、localStorage或其他地方获取手动添加的路径
    // 示例：从某个隐藏的input或全局变量获取
    const manualPathsInput = document.getElementById('manual-paths')
    if (manualPathsInput && manualPathsInput.value) {
      return JSON.parse(manualPathsInput.value)
    }
    return []
  }

  // 获取上下文路径（最近四个请求的上下文）
  getContextPaths() {
    // 从localStorage或内存中获取最近四个请求的上下文
    const contextHistory = JSON.parse(localStorage.getItem('aiChatContext') || '[]')
    return contextHistory.slice(-4) // 返回最近4个
  }

  // 更新最后一条AI消息的内容
  updateLastAIMessage(content) {
    const messages = document.querySelectorAll('.message.ai')
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const textElement = lastMessage.querySelector('.text')
      if (textElement) {
        textElement.innerHTML = this.formatMessage(content)
      }
    }
  }

  // 保存上下文到localStorage
  saveContext(message, paths) {
    const contextHistory = JSON.parse(localStorage.getItem('aiChatContext') || '[]')
    contextHistory.push({
      message: message,
      paths: paths,
      timestamp: Date.now(),
    })
    // 只保留最近10个上下文
    if (contextHistory.length > 10) {
      contextHistory.splice(0, contextHistory.length - 10)
    }
    localStorage.setItem('aiChatContext', JSON.stringify(contextHistory))
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

  // 新建文件/文件夹弹窗复用
  showInputModal(title, placeholder, onConfirm) {
    const modal = document.getElementById('modal-overlay')
    const modalTitle = document.getElementById('modal-title')
    const modalBody = document.getElementById('modal-body')
    const modalFooter = document.querySelector('.modal-footer')
    modalTitle.textContent = title
    modalBody.innerHTML = `<input id="modal-input" type="text" placeholder="${placeholder}" style="width:100%;padding:8px;font-size:14px;">`
    modal.style.display = 'flex'
    // 绑定确认事件
    const confirmBtn = document.getElementById('modal-confirm')
    const cancelBtn = document.getElementById('modal-cancel')
    const closeBtn = document.querySelector('.close-modal')
    const cleanup = () => {
      modal.style.display = 'none'
      confirmBtn.onclick = null
      cancelBtn.onclick = null
      closeBtn.onclick = null
    }
    confirmBtn.onclick = () => {
      const value = document.getElementById('modal-input').value.trim()
      if (!value) {
        this.showError('请输入名称')
        return
      }
      onConfirm(value, cleanup)
    }
    cancelBtn.onclick = cleanup
    closeBtn.onclick = cleanup
    setTimeout(() => {
      document.getElementById('modal-input').focus()
    }, 100)
  }

  // 新建文件时校验同名
  createNewFile(parentNode) {
    this.showInputModal('新建文件', '请输入文件名', (fileName, cleanup) => {
      const inputName = fileName.trim().toLowerCase()
      if (!inputName) {
        this.showError('请输入有效名称')
        return
      }
      let siblings = []
      if (parentNode && parentNode.path) {
        const parent = this.findNodeByPath(this.fileTreeData, parentNode.path)
        siblings = parent && Array.isArray(parent.children) ? parent.children : []
      } else {
        siblings =
          this.fileTreeData && this.fileTreeData.length > 0 && Array.isArray(this.fileTreeData[0].children)
            ? this.fileTreeData[0].children
            : []
      }
      console.log('同级children:', siblings, '新建名:', fileName)
      if (siblings.some((item) => item.name.trim().toLowerCase() === inputName)) {
        this.showError('同级目录下已存在同名文件或文件夹')
        return
      }
      const filePath =
        parentNode && parentNode.path ? `${parentNode.path.replace(/\/$/, '')}/${fileName.trim()}` : fileName.trim()
      fetch('/api/file/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: '' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            this.selectedNodePath = filePath
            this.showSuccess('文件创建成功')
            this.loadFileTree()
            cleanup()
            setTimeout(() => this.highlightAndExpandTo(filePath), 500)
          } else {
            this.showError(data.error)
          }
        })
        .catch((error) => {
          this.showError('创建文件失败: ' + error.message)
        })
    })
  }

  // 新建文件夹时校验同名
  createNewFolder(parentNode) {
    this.showInputModal('新建文件夹', '请输入文件夹名', (folderName, cleanup) => {
      const inputName = folderName.trim().toLowerCase()
      if (!inputName) {
        this.showError('请输入有效名称')
        return
      }
      let siblings = []
      if (parentNode && parentNode.path) {
        const parent = this.findNodeByPath(this.fileTreeData, parentNode.path)
        siblings = parent && Array.isArray(parent.children) ? parent.children : []
      } else {
        siblings =
          this.fileTreeData && this.fileTreeData.length > 0 && Array.isArray(this.fileTreeData[0].children)
            ? this.fileTreeData[0].children
            : []
      }
      console.log('同级children:', siblings, '新建名:', folderName)
      if (siblings.some((item) => item.name.trim().toLowerCase() === inputName)) {
        this.showError('同级目录下已存在同名文件或文件夹')
        return
      }
      const folderPath =
        parentNode && parentNode.path ? `${parentNode.path.replace(/\/$/, '')}/${folderName.trim()}` : folderName.trim()
      fetch('/api/file/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: folderPath }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            this.selectedNodePath = folderPath
            this.showSuccess('文件夹创建成功')
            this.loadFileTree()
            cleanup()
            setTimeout(() => this.highlightAndExpandTo(folderPath), 500)
          } else {
            this.showError(data.error)
          }
        })
        .catch((error) => {
          this.showError('创建文件夹失败: ' + error.message)
        })
    })
  }

  // 重命名项目
  renameItem(node) {
    this.showInputModal('重命名', '请输入新名称', (newName, cleanup) => {
      if (!newName || newName === node.name) return
      // 校验同级同名
      let siblings = []
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
      if (parentPath) {
        const parent = this.findNodeByPath(this.fileTreeData, parentPath)
        siblings = parent && parent.children ? parent.children : []
      } else {
        siblings = this.fileTreeData
      }
      if (siblings.some((item) => item.name === newName)) {
        this.showError('同级目录下已存在同名文件或文件夹')
        return
      }
      const oldPath = node.path
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
            cleanup()
          } else {
            this.showError(data.error)
          }
        })
        .catch((error) => {
          this.showError('重命名失败: ' + error.message)
        })
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
    const modal = document.getElementById('modal-overlay')
    const modalTitle = document.getElementById('modal-title')
    const modalBody = document.getElementById('modal-body')
    modalTitle.textContent = title
    modalBody.innerHTML = content
    modal.style.display = 'flex'
    this.modalCallback = onConfirm
  }

  // 关闭模态框
  closeModal() {
    document.getElementById('modal-overlay').style.display = 'none'
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
    }, 1000)
  }

  handleCreateFile() {
    let parent = null
    if (this.selectedNode) {
      if (this.selectedNode.type === 'directory') {
        parent = this.selectedNode
      } else if (this.selectedNode.type === 'file') {
        const parentPath = this.selectedNode.path.substring(0, this.selectedNode.path.lastIndexOf('/'))
        parent = { ...this.selectedNode, path: parentPath, type: 'directory' }
      }
    }
    this.createNewFile(parent)
  }

  handleCreateFolder() {
    let parent = null
    if (this.selectedNode) {
      if (this.selectedNode.type === 'directory') {
        parent = this.selectedNode
      } else if (this.selectedNode.type === 'file') {
        const parentPath = this.selectedNode.path.substring(0, this.selectedNode.path.lastIndexOf('/'))
        parent = { ...this.selectedNode, path: parentPath, type: 'directory' }
      }
    }
    this.createNewFolder(parent)
  }

  // 递归查找节点
  findNodeByPath(tree, path) {
    for (const node of tree) {
      if (node.path === path) return node
      if (node.type === 'directory' && node.children) {
        const found = this.findNodeByPath(node.children, path)
        if (found) return found
      }
    }
    return null
  }

  // 新建/重命名后高亮并展开到指定路径
  highlightAndExpandTo(path) {
    // 展开所有父目录并高亮目标节点
    const segments = path.split('/')
    let currentPath = ''
    for (let i = 0; i < segments.length; i++) {
      currentPath = i === 0 ? segments[0] : currentPath + '/' + segments[i]
      const node = document.querySelector(`.file-tree-node[data-path="${currentPath}"]`)
      if (node) {
        // 展开父目录
        if (node.classList.contains('directory')) {
          const childrenContainer = node.nextElementSibling
          const expandIcon = node.querySelector('.expand-icon')
          if (childrenContainer && childrenContainer.classList.contains('node-children')) {
            childrenContainer.style.display = 'block'
            if (expandIcon) {
              expandIcon.classList.remove('fa-chevron-right')
              expandIcon.classList.add('fa-chevron-down')
            }
          }
        }
        // 最后一个节点高亮
        if (i === segments.length - 1) {
          document.querySelectorAll('.file-tree-node').forEach((el) => el.classList.remove('selected'))
          node.classList.add('selected')
        }
      }
    }
  }

  initSearchDropdown() {
    const searchInput = document.getElementById('code-search')
    const searchBtn = document.getElementById('search-btn')
    let searchDropdown = null
    let searchResults = []
    let searchActiveIndex = -1

    searchInput.addEventListener('input', onSearchInput)
    searchBtn.addEventListener('click', doSemanticSearch)
    searchInput.addEventListener('keydown', onSearchKeyDown)

    function onSearchInput(e) {
      const value = e.target.value.trim()
      if (value.length === 0) {
        removeSearchDropdown()
        return
      }
      doSemanticSearch()
    }

    function doSemanticSearch() {
      const query = searchInput.value.trim()
      if (!query) return
      fetch('/api/ai-agent/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: 'code', top_k: 10 }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.results && data.results.length > 0) {
            searchResults = data.results
            showSearchDropdown(data.results)
          } else {
            removeSearchDropdown()
          }
        })
    }

    function showSearchDropdown(results) {
      removeSearchDropdown()
      searchDropdown = document.createElement('div')
      searchDropdown.className = 'search-dropdown'
      results.forEach((item, idx) => {
        const div = document.createElement('div')
        div.className = 'search-dropdown-item'
        // 文件类型高亮
        const typeDiv = document.createElement('span')
        typeDiv.className = 'search-dropdown-filetype'
        typeDiv.textContent = item.meta.fileType || ''
        // 主体内容
        const mainDiv = document.createElement('div')
        mainDiv.className = 'search-dropdown-main'
        // 路径
        const pathDiv = document.createElement('div')
        pathDiv.className = 'search-dropdown-path'
        pathDiv.textContent = item.meta.filePath
        // 摘要
        const summaryDiv = document.createElement('div')
        summaryDiv.className = 'search-dropdown-summary'
        summaryDiv.textContent = item.meta.summary || ''
        mainDiv.appendChild(pathDiv)
        mainDiv.appendChild(summaryDiv)
        div.appendChild(typeDiv)
        div.appendChild(mainDiv)
        div.title = item.meta.filePath
        div.addEventListener('click', () => {
          openSearchResult(idx)
          removeSearchDropdown()
        })
        searchDropdown.appendChild(div)
      })
      searchInput.parentNode.appendChild(searchDropdown)
      searchActiveIndex = -1
    }

    function removeSearchDropdown() {
      if (searchDropdown) {
        searchDropdown.remove()
        searchDropdown = null
      }
    }

    function openSearchResult(idx) {
      const item = searchResults[idx]
      if (item && item.meta) {
        const filePath = item.meta.filePath
        const fileName = filePath.split('/').pop()
        const content = item.meta.content || ''
        window.aiAgent.openTab(filePath, fileName, content)
      }
    }

    function onSearchKeyDown(e) {
      if (!searchDropdown) return
      const items = searchDropdown.querySelectorAll('.search-dropdown-item')
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        searchActiveIndex = (searchActiveIndex + 1) % items.length
        updateActiveDropdownItem(items)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        searchActiveIndex = (searchActiveIndex - 1 + items.length) % items.length
        updateActiveDropdownItem(items)
      } else if (e.key === 'Enter') {
        if (searchActiveIndex >= 0 && searchActiveIndex < items.length) {
          openSearchResult(searchActiveIndex)
          removeSearchDropdown()
        }
      }
    }
    function updateActiveDropdownItem(items) {
      items.forEach((item, idx) => {
        item.classList.toggle('active', idx === searchActiveIndex)
      })
      if (searchActiveIndex >= 0 && searchActiveIndex < items.length) {
        items[searchActiveIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }
  initResizeBar() {
    // 保险起见，延迟初始化，确保 DOM 渲染完成
    setTimeout(() => {
      this.enableAiPanelResize()
    }, 500)
  }

  enableAiPanelResize() {
    // 获取拖拽条和 ai-panel
    const resizeBar = document.getElementById('ai-panel-resize-bar')
    const aiPanel = document.querySelector('.ai-panel')
    if (!resizeBar || !aiPanel) return

    // 拖拽逻辑
    let dragging = false
    let startX = 0
    let startWidth = 0

    resizeBar.addEventListener('mousedown', function (e) {
      dragging = true
      startX = e.clientX
      // 读取当前 ai-panel 宽度（去掉 px）
      startWidth = aiPanel.offsetWidth
      document.body.style.cursor = 'ew-resize'
      e.preventDefault()
    })
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return
      let delta = e.clientX - startX
      let newWidth = Math.max(200, Math.min(600, startWidth - delta))
      aiPanel.style.width = newWidth + 'px'
    })
    document.addEventListener('mouseup', function () {
      if (dragging) {
        dragging = false
        document.body.style.cursor = ''
      }
    })
  }

  // 显示添加路径模态框
  showAddPathModal() {
    this.showInputModal('添加相关文件路径', '请输入文件或目录路径（支持相对路径和绝对路径）', (path) => {
      this.addPath(path)
    })
  }

  // 添加路径
  addPath(path) {
    const manualPathsInput = document.getElementById('manual-paths')
    const currentPaths = JSON.parse(manualPathsInput.value || '[]')

    // 检查路径是否已存在
    if (!currentPaths.includes(path)) {
      currentPaths.push(path)
      manualPathsInput.value = JSON.stringify(currentPaths)
      this.renderPathList()
      this.showSuccess('路径添加成功')
    } else {
      this.showError('路径已存在')
    }
  }

  // 删除路径
  removePath(path) {
    const manualPathsInput = document.getElementById('manual-paths')
    const currentPaths = JSON.parse(manualPathsInput.value || '[]')
    const index = currentPaths.indexOf(path)

    if (index > -1) {
      currentPaths.splice(index, 1)
      manualPathsInput.value = JSON.stringify(currentPaths)
      this.renderPathList()
      this.showSuccess('路径删除成功')
    }
  }

  // 渲染路径列表
  renderPathList() {
    const pathList = document.getElementById('path-list')
    const manualPathsInput = document.getElementById('manual-paths')
    const paths = JSON.parse(manualPathsInput.value || '[]')

    if (paths.length === 0) {
      pathList.innerHTML = `
        <div class="no-paths">
          <i class="fas fa-info-circle"></i>
          <p>暂无相关文件路径</p>
        </div>
      `
    } else {
      pathList.innerHTML = paths
        .map(
          (path) => `
        <div class="path-item" data-path="${path}">
          <div class="path-item-content">${path}</div>
          <div class="path-item-actions">
            <button class="remove-path" title="删除路径">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `
        )
        .join('')
    }
  }

  // 显示路径选择Popover
  showPathPopover() {
    const popover = document.getElementById('path-popover')
    popover.classList.add('show')
    this.loadPathList()
  }

  // 隐藏路径选择Popover
  hidePathPopover() {
    const popover = document.getElementById('path-popover')
    popover.classList.remove('show')
  }

  // 加载路径列表
  async loadPathList() {
    try {
      // 显示加载状态
      const popoverContent = document.getElementById('path-popover-content')
      popoverContent.innerHTML = `
        <div class="path-popover-loading">
          <div class="loading-spinner"></div>
          <div>加载中...</div>
        </div>
      `

      const response = await fetch('/api/file/tree')
      const data = await response.json()

      if (data.success && data.data) {
        this.pathListData = this.flattenFileTree(data.data)
        this.renderPathPopoverList()
      } else {
        popoverContent.innerHTML = `
          <div class="path-popover-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <div>加载路径列表失败</div>
          </div>
        `
      }
    } catch (error) {
      const popoverContent = document.getElementById('path-popover-content')
      popoverContent.innerHTML = `
        <div class="path-popover-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <div>加载失败: ${error.message}</div>
        </div>
      `
    }
  }

  // 扁平化文件树为路径列表（带前端过滤）
  flattenFileTree(tree, result = []) {
    // 前端过滤规则，与后端 ignoreList 保持一致
    const ignoreList = [
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.vite',
      '.next',
      '.turbo',
      'android',
      'ios',
      'macos',
      'Pods',
      'bin',
      'pkg',
      'target',
      'CMakeFiles',
      'Makefile',
      '.git',
      '.DS_Store',
      '.idea',
      '.vscode',
      '.env',
      '.gradle',
      'go.mod',
      'go.sum',
    ]
    tree.forEach((node) => {
      // 过滤规则：只要路径中包含 ignoreList 里的任意一项就跳过
      if (ignoreList.some((ig) => node.path.includes(ig))) return
      if (node.type === 'file') {
        result.push({
          path: node.path,
          name: node.name,
          type: 'file',
        })
      } else if (node.type === 'directory' && node.children) {
        result.push({
          path: node.path,
          name: node.name,
          type: 'directory',
        })
        this.flattenFileTree(node.children, result)
      }
    })
    return result
  }

  // 渲染路径选择Popover列表
  renderPathPopoverList() {
    const popoverContent = document.getElementById('path-popover-content')
    popoverContent.innerHTML = ''

    if (this.pathListData.length === 0) {
      popoverContent.innerHTML = `
        <div class="path-popover-empty">
          <i class="fas fa-folder-open"></i>
          <div>暂无文件路径</div>
        </div>
      `
      return
    }

    // 重置选中路径数组
    this.selectedPaths = []

    this.pathListData.forEach((item) => {
      const pathItem = document.createElement('div')
      pathItem.className = 'path-popover-item'
      pathItem.setAttribute('data-path', item.path)
      pathItem.setAttribute('data-type', item.type)
      pathItem.setAttribute('data-name', item.name)

      // 获取文件图标
      const icon = this.getFileIcon({ type: item.type, name: item.name })

      pathItem.innerHTML = `
        <div class="path-popover-item-content">
          <div class="path-popover-item-icon">
            <i class="${icon}"></i>
          </div>
          <div class="path-popover-item-info">
            <div class="path-popover-item-name">${item.name}</div>
            <div class="path-popover-item-path">${item.path}</div>
          </div>
        </div>
        <div class="path-popover-item-check">
          <i class="fas fa-check"></i>
        </div>
      `

      // 添加选中状态
      const manualPathsInput = document.getElementById('manual-paths')
      const currentPaths = JSON.parse(manualPathsInput.value || '[]')
      if (currentPaths.includes(item.path)) {
        pathItem.classList.add('selected')
        this.selectedPaths.push(item.path)
      }

      popoverContent.appendChild(pathItem)
    })
  }

  // 过滤路径列表
  filterPathList(query) {
    const popoverContent = document.getElementById('path-popover-content')
    const items = popoverContent.querySelectorAll('.path-popover-item')
    items.forEach((item) => {
      const textContent = item.textContent.toLowerCase()
      const queryLower = query.toLowerCase()
      if (textContent.includes(queryLower)) {
        item.style.display = 'block'
      } else {
        item.style.display = 'none'
      }
    })
  }

  // 切换路径选择状态
  togglePathSelection(item) {
    const path = item.dataset.path
    const isSelected = this.selectedPaths.includes(path)
    if (isSelected) {
      this.selectedPaths = this.selectedPaths.filter((p) => p !== path)
      item.classList.remove('selected')
    } else {
      this.selectedPaths.push(path)
      item.classList.add('selected')
    }
  }

  // 确认路径选择
  confirmPathSelection() {
    if (this.selectedPaths.length === 0) {
      this.showError('请至少选择一个路径')
      return
    }
    this.addPathsToManualList(this.selectedPaths)
    this.hidePathPopover()
    this.showSuccess('路径已添加')
  }

  // 将选中的路径添加到手动路径列表
  addPathsToManualList(paths) {
    const manualPathsInput = document.getElementById('manual-paths')
    const currentPaths = JSON.parse(manualPathsInput.value || '[]')
    paths.forEach((path) => {
      if (!currentPaths.includes(path)) {
        currentPaths.push(path)
      }
    })
    manualPathsInput.value = JSON.stringify(currentPaths)
    this.renderPathList()
  }

  // 切换只读Popover显示/隐藏
  toggleSelectedPathsPopover() {
    const popover = document.getElementById('selected-paths-popover')
    if (popover.classList.contains('show')) {
      popover.classList.remove('show')
      if (this._popoverTimer) clearTimeout(this._popoverTimer)
      return
    }
    this.showSelectedPathsPopover()
  }

  // 显示只读Popover
  showSelectedPathsPopover() {
    const popover = document.getElementById('selected-paths-popover')
    const titleElement = document.getElementById('path-manager-title')
    const manualPathsInput = document.getElementById('manual-paths')
    const paths = JSON.parse(manualPathsInput.value || '[]')

    // 动态定位Popover到标题下方
    const titleRect = titleElement.getBoundingClientRect()
    const containerRect = titleElement.closest('.path-manager').getBoundingClientRect()

    // 计算相对于容器的位置
    const relativeLeft = titleRect.left - containerRect.left
    const relativeTop = titleRect.bottom - containerRect.top + 5 // 标题下方5px

    // 设置Popover位置
    popover.style.left = relativeLeft + 'px'
    popover.style.top = relativeTop + 'px'
    popover.style.minWidth = Math.max(titleElement.offsetWidth, 200) + 'px'

    let html = ''
    if (paths.length === 0) {
      html = `<div class="selected-paths-popover-empty">暂无相关文件路径</div>`
    } else {
      html =
        `<div class="selected-paths-popover-list">` +
        paths
          .map(
            (path) => `
          <div class="selected-paths-popover-item">
            <span title="${path}">${path.split('/').pop()}</span>
            <button class="remove-path" data-path="${path}" title="移除">×</button>
          </div>
        `
          )
          .join('') +
        `</div>`
    }
    popover.innerHTML = html
    popover.classList.add('show')
    // 绑定删除事件
    popover.querySelectorAll('.remove-path').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation()
        this.removePath(btn.dataset.path)
        this.showSelectedPathsPopover() // 重新渲染
      }
    })
    // 自动消失
    if (this._popoverTimer) clearTimeout(this._popoverTimer)
    this._popoverTimer = setTimeout(() => {
      popover.classList.remove('show')
    }, 3000)
    // 点击标题再次点击立即消失（已在 toggleSelectedPathsPopover 处理）
    // 点击Popover外部关闭
    setTimeout(() => {
      const hide = (e) => {
        if (!popover.contains(e.target) && e.target.id !== 'path-manager-title') {
          popover.classList.remove('show')
          document.removeEventListener('mousedown', hide)
        }
      }
      document.addEventListener('mousedown', hide)
    }, 0)
  }
}

// 初始化应用
const aiAgent = new AIAgentManager()
