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
    this.terminalTabCreated = false // 初始化终端标签页创建标志

    this.init()
    this.initSearchDropdown()
    this.initResizeBar()
    this.initTerminalResizeBar() // 新增：初始化终端拖拽条
    this.renderPathList() // 初始化路径列表
    this.hideLoading()
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
      this.initTerminalResizeBar() // 新增：初始化终端拖拽条
      this.renderPathList() // 初始化路径列表

      // 确保终端面板初始状态为隐藏
      const terminalPanel = document.getElementById('terminal-panel')
      if (terminalPanel) {
        terminalPanel.style.display = 'none'
      }

      this.hideLoading()
    } catch (error) {
      console.error('初始化失败:', error)
      this.hideLoading()
      this.showError('初始化失败: ' + error.message)
    }
  }

  // 新增：初始化终端拖拽条
  initTerminalResizeBar() {
    const resizeBar = document.getElementById('terminal-resize-bar')
    const editor = document.getElementById('monaco-editor')
    const terminalPanel = document.getElementById('terminal-panel')
    const iframeWrapper = document.getElementById('terminal-iframe-wrapper')
    const editorContainer = document.querySelector('.editor-container')
    const dragMask = document.getElementById('iframe-drag-mask')
    if (!resizeBar || !editor || !terminalPanel || !dragMask || !editorContainer) return

    let dragging = false
    let startY = 0
    let startTerminalHeight = 0
    let startEditorHeight = 0

    // 计算编辑器容器的可用高度（减去header高度）
    const getAvailableHeight = () => {
      const headerHeight = editorContainer.querySelector('.editor-header').offsetHeight
      return editorContainer.offsetHeight - headerHeight
    }

    // 调整编辑器高度，确保总和等于可用高度
    const adjustEditorHeight = (terminalHeight) => {
      const availableHeight = getAvailableHeight()
      const newEditorHeight = availableHeight - terminalHeight

      // 直接设置编辑器高度
      editor.style.height = newEditorHeight + 'px'
      editor.style.minHeight = newEditorHeight + 'px'
      editor.style.maxHeight = newEditorHeight + 'px'

      // 重新调整Monaco编辑器大小
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors()
        for (let editorInstance of editors) {
          if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
            editorInstance.layout()
            break
          }
        }
      }

      // 强制触发重新布局
      setTimeout(() => {
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors()
          for (let editorInstance of editors) {
            if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
              editorInstance.layout()
              break
            }
          }
        }
      }, 10)
    }

    resizeBar.addEventListener('mousedown', function (e) {
      dragging = true
      startY = e.clientY
      startTerminalHeight = terminalPanel.offsetHeight
      startEditorHeight = editor.offsetHeight
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      dragMask.style.display = 'block' // 显示遮罩
      e.preventDefault()
    })

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return
      const dy = startY - e.clientY // 向上拖拽增加终端高度
      const availableHeight = getAvailableHeight()
      const minTerminalHeight = 80
      const maxTerminalHeight = availableHeight - 100 // 编辑器最小高度100px

      let newTerminalHeight = Math.max(minTerminalHeight, Math.min(maxTerminalHeight, startTerminalHeight + dy))

      // 调整终端面板高度（绝对定位）
      terminalPanel.style.height = newTerminalHeight + 'px'
      if (iframeWrapper) iframeWrapper.style.height = newTerminalHeight + 'px'

      // 调整编辑器高度，确保总和等于可用高度
      adjustEditorHeight(newTerminalHeight)

      console.log('拖拽调整:', {
        terminalHeight: newTerminalHeight + 'px',
        editorHeight: availableHeight - newTerminalHeight + 'px',
        totalHeight: availableHeight + 'px',
        editorActualHeight: editor.offsetHeight + 'px',
      })
    })

    document.addEventListener('mouseup', function () {
      if (dragging) {
        dragging = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        dragMask.style.display = 'none' // 隐藏遮罩

        // 最终调整一次编辑器布局
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors()
          for (let editorInstance of editors) {
            if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
              editorInstance.layout()
              break
            }
          }
        }
      }
    })
  }

  // 初始化Monaco编辑器
  async initMonacoEditor() {
    return new Promise((resolve) => {
      require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } })
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

    // 代码对比面板事件
    document.getElementById('accept-all').addEventListener('click', () => this.acceptAllDiffs())
    document.getElementById('reject-all').addEventListener('click', () => this.rejectAllDiffs())

    // 历史记录面板事件
    document.getElementById('refresh-history').addEventListener('click', () => this.showHistory())

    // 窗口大小变化事件 - 自动调整 AI 面板高度
    window.addEventListener('resize', () => {
      this.adjustAiPanelHeight()
    })

    // 初始化时设置 AI 面板高度
    this.adjustAiPanelHeight()

    // 初始化模式切换器
    this.initModeSwitcher()

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
    tab.setAttribute('data-file', filePath)
    tab.innerHTML = `
      <span class="tab-name">${fileName}</span>
      <button class="close-tab" data-file="${filePath}">
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
    console.log('切换到 tab:', filePath)

    // 更新标签页状态
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.remove('active')
    })

    const currentTab = document.querySelector(`[data-file="${filePath}"]`)
    if (currentTab) {
      currentTab.classList.add('active')
      // 自动滚动到当前tab
      currentTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    } else {
      console.error('找不到对应的 tab:', filePath)
      return
    }

    // 更新编辑器内容
    const tabData = this.openTabs.get(filePath)
    if (tabData) {
      this.currentFile = filePath

      // 如果是iframe tab，特殊处理（只显示/隐藏）
      if (tabData.isIframe && tabData.iframeSrc) {
        console.log('切换到iframe tab:', tabData.fileName)

        // 添加调试信息
        this.debugIframeState(filePath)

        // 直接调用iframe编辑器方法，它会处理显示/隐藏
        this.createOrUpdateIframeEditor(filePath, tabData.iframeSrc, tabData.iframeOptions, false)
      } else if (tabData.isDiff && tabData.diffData) {
        // 如果是对比 tab，重新创建 Diff Editor
        console.log('切换到diff tab:', tabData.fileName)
        this.recreateDiffEditor(tabData.diffData)
      } else {
        // 普通文件 tab - 需要确保是普通编辑器
        console.log('切换到普通文件tab:', tabData.fileName)
        this.clearEditorContainer()
        this.recreateNormalEditor(tabData.content, filePath)
      }
    } else {
      console.error('找不到 tab 数据:', filePath)
    }
  }

  // 清理编辑器容器
  clearEditorContainer() {
    console.log('清理编辑器容器')

    const editorContainer = document.getElementById('monaco-editor')
    if (!editorContainer) return

    // 清除可能存在的按钮容器
    const existingButtons = editorContainer.querySelector('div[style*="position: absolute"]')
    if (existingButtons) {
      existingButtons.remove()
    }

    // 隐藏所有iframe，保持状态（使用visibility）
    this.hideAllIframes()

    // 清理编辑器容器内的内容，但保留iframe和Monaco编辑器相关元素
    const allElements = editorContainer.children
    for (let i = allElements.length - 1; i >= 0; i--) {
      const element = allElements[i]
      // 保留iframe、iframe-loading元素，以及Monaco编辑器相关的元素
      if (
        element.tagName !== 'IFRAME' &&
        !element.classList.contains('iframe-loading') &&
        !element.classList.contains('monaco-editor') &&
        !element.classList.contains('overflow-guard')
      ) {
        element.remove()
      }
    }
  }

  // 重新创建 Diff Editor
  recreateDiffEditor(diffData) {
    if (typeof require !== 'undefined') {
      require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } })
      require(['vs/editor/editor.main'], () => {
        console.log('重新创建 Monaco Diff Editor:', diffData.path)

        // 销毁当前编辑器
        if (this.editor) {
          this.editor.dispose()
          this.editor = null
        }

        // 获取编辑器容器
        const editorContainer = document.getElementById('monaco-editor')
        if (!editorContainer) {
          console.error('找不到编辑器容器')
          return
        }

        // 根据文件扩展名设置语言
        const fileExt = diffData.path.split('.').pop().toLowerCase()
        const language = this.getMonacoLanguage(fileExt)

        const originalModel = monaco.editor.createModel(diffData.oldContent || '', language)
        const modifiedModel = monaco.editor.createModel(diffData.newContent || '', language)

        // 创建 Diff Editor
        this.editor = monaco.editor.createDiffEditor(editorContainer, {
          theme: 'vs-dark',
          readOnly: true,
          automaticLayout: true,
          renderSideBySide: true,
          enableSplitViewResizing: true,
          renderOverviewRuler: true,
          ignoreTrimWhitespace: false,
          renderIndicators: true,
          originalEditor: {
            readOnly: true,
          },
          modifiedEditor: {
            readOnly: true,
          },
        })

        this.editor.setModel({
          original: originalModel,
          modified: modifiedModel,
        })

        // 添加应用和拒绝按钮到编辑器容器
        const buttonContainer = document.createElement('div')
        buttonContainer.style.cssText = `
          position: absolute;
          transform: translateX(50%);
          bottom: 15px;
          right: 50%;
          z-index: 1000;
          display: flex;
          gap: 8px;
        `
        buttonContainer.innerHTML = `
          <button class="btn success" onclick="aiAgent.applyDiffFromTab('${diffData.newContent.replace(
            /'/g,
            "\\'"
          )}')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">应用建议</button>
          <button class="btn danger" onclick="aiAgent.rejectDiffFromTab()" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">拒绝建议</button>
        `
        editorContainer.style.position = 'relative'
        editorContainer.appendChild(buttonContainer)

        console.log('Diff Editor 重新创建成功')
      })
    }
  }

  // 设置 AI 面板高度
  setAiPanelHeight(height) {
    const aiPanel = document.querySelector('.ai-panel')
    if (aiPanel) {
      aiPanel.style.height = typeof height === 'number' ? `${height}px` : height
      console.log('AI 面板高度已设置为:', height)
    } else {
      console.error('找不到 .ai-panel 元素')
    }
  }

  // 获取 AI 面板高度
  getAiPanelHeight() {
    const aiPanel = document.querySelector('.ai-panel')
    if (aiPanel) {
      return aiPanel.style.height || 'auto'
    }
    return null
  }

  // 重置 AI 面板高度为默认值
  resetAiPanelHeight() {
    const aiPanel = document.querySelector('.ai-panel')
    if (aiPanel) {
      aiPanel.style.height = ''
      console.log('AI 面板高度已重置为默认值')
    }
  }

  // 根据窗口大小自动调整 AI 面板高度
  adjustAiPanelHeight() {
    const windowHeight = window.innerHeight
    const toolbarHeight = 60 // 工具栏高度
    const aiPanelHeight = windowHeight - toolbarHeight
    this.setAiPanelHeight(aiPanelHeight)
  }

  // 重新创建普通编辑器
  recreateNormalEditor(content, filePath) {
    console.log('开始重新创建普通编辑器，文件:', filePath)
    console.log('require可用性:', typeof require !== 'undefined')
    console.log('monaco可用性:', typeof monaco !== 'undefined')

    if (typeof require !== 'undefined') {
      require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } })
      require(['vs/editor/editor.main'], () => {
        console.log('重新创建普通 Monaco Editor:', filePath)

        // 销毁当前编辑器
        if (this.editor) {
          this.editor.dispose()
          this.editor = null
        }

        // 获取编辑器容器
        const editorContainer = document.getElementById('monaco-editor')
        if (!editorContainer) {
          console.error('找不到编辑器容器')
          return
        }

        // 清空编辑器容器，但保留iframe
        this.clearEditorContainer()

        // 根据文件扩展名设置语言
        const fileExt = filePath.split('.').pop().toLowerCase()
        const language = this.getMonacoLanguage(fileExt)

        // 创建普通编辑器
        console.log('准备创建Monaco编辑器，容器:', editorContainer)
        console.log('容器内容:', editorContainer.innerHTML)

        this.editor = monaco.editor.create(editorContainer, {
          value: content,
          language,
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
          },
        })

        console.log('普通 Editor 重新创建成功，编辑器实例:', this.editor)
      })
    }
  }

  // 关闭标签页
  closeTab(filePath) {
    console.log('关闭 tab:', filePath)

    const tab = document.querySelector(`[data-file="${filePath}"]`)
    if (tab) {
      // 如果是iframe tab，清理iframe引用
      const tabData = this.openTabs.get(filePath)
      if (tabData && tabData.isIframe) {
        console.log('清理iframe tab引用:', filePath)

        // 清理iframe和加载指示器的引用
        tabData.iframeElement = null
        tabData.loadingElement = null
      }

      tab.remove()
      this.openTabs.delete(filePath)

      // 如果关闭的是当前标签页，切换到其他标签页
      if (this.currentFile === filePath) {
        const remainingTabs = document.querySelectorAll('.tab')
        if (remainingTabs.length > 0) {
          const nextTab = remainingTabs[0]
          const nextPath = nextTab.getAttribute('data-file')
          console.log('切换到下一个 tab:', nextPath)
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
    } else {
      console.error('找不到要关闭的 tab:', filePath)
    }
  }

  // 设置编辑器语言
  setEditorLanguage(filePath) {
    const language = this.getMonacoLanguage(filePath.split('.').pop().toLowerCase())
    monaco.editor.setModelLanguage(this.editor.getModel(), language)
  }

  getMonacoLanguage(extension) {
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript'
      case 'ts':
      case 'tsx':
        return 'typescript'
      case 'py':
        return 'python'
      case 'java':
        return 'java'
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp'
      case 'c':
        return 'c'
      case 'html':
      case 'htm':
        return 'html'
      case 'css':
      case 'scss':
      case 'sass':
        return 'css'
      case 'json':
        return 'json'
      case 'xml':
        return 'xml'
      case 'md':
        return 'markdown'
      case 'sql':
        return 'sql'
      case 'php':
        return 'php'
      case 'go':
        return 'go'
      case 'rs':
        return 'rust'
      case 'vue':
        return 'vue'
      case 'yaml':
      case 'yml':
        return 'yaml'
      case 'toml':
        return 'toml'
      case 'ini':
        return 'ini'
      case 'sh':
      case 'bash':
        return 'shell'
      case 'log':
        return 'log'
      case 'txt':
        return 'plaintext'
      default:
        return 'plaintext'
    }
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
    return `<div class="shell-cmd-block" id="${blockId}" style="margin-bottom:8px;"><div>${cmdArr
      .map((cmdObj) => {
        if (typeof cmdObj === 'string') return this.renderShellCommandLine(cmdObj)
        console.log('渲染命令:', cmdObj.command, '说明:', cmdObj.explain)
        return this.renderShellCommandLine(cmdObj.command, cmdObj.explain)
      })
      .join('')}</div></div>`
  }

  // 渲染单条命令为可点击行（支持命令解释）
  renderShellCommandLine(cmd, explain) {
    console.log('渲染命令行:', { cmd, explain })

    // 参数验证
    if (!cmd || typeof cmd !== 'string') {
      console.error('无效的命令参数:', cmd)
      return '<div class="shell-cmd-line-wrap"><div class="shell-cmd-line"><code class="shell-cmd-code">无效命令</code></div></div>'
    }

    const explainHtml = explain ? `<div class="shell-cmd-explain">${this.escapeHtml(explain)}</div>` : ''
    const encodedCmd = encodeURIComponent(cmd)
    console.log('编码后的命令:', encodedCmd)

    return `<div class="shell-cmd-line-wrap">${explainHtml}<div class="shell-cmd-line"><code class="shell-cmd-code">${this.escapeHtml(
      cmd
    )}</code><button class="run-cmd-btn" data-cmd="${encodedCmd}" title="运行命令"><i class="fas fa-play"></i></button></div></div>`
  }

  // 绑定所有"运行"按钮事件和"全部运行"按钮事件
  bindShellCmdBtnEvents() {
    console.log('开始绑定运行命令按钮事件')

    // 单条命令
    document.querySelectorAll('.run-cmd-btn').forEach((btn) => {
      if (btn._bound) {
        console.log('按钮已绑定，跳过:', btn)
        return
      }
      btn._bound = true
      console.log('绑定按钮:', btn, 'data-cmd:', btn.dataset.cmd)

      btn.onclick = function () {
        try {
          console.log('按钮被点击:', this)
          console.log('按钮dataset:', this.dataset)

          if (!this.dataset.cmd) {
            console.error('按钮没有data-cmd属性')
            return
          }

          const cmd = decodeURIComponent(this.dataset.cmd)
          console.log('运行命令:', cmd)

          // 发送命令到终端iframe
          if (aiAgent && aiAgent.sendCommandToTerminal) {
            aiAgent.sendCommandToTerminal(cmd)
          } else {
            console.error('aiAgent或sendCommandToTerminal方法不存在')
          }

          // 按钮动画反馈
          this.classList.add('run-cmd-btn-active')
          setTimeout(() => this.classList.remove('run-cmd-btn-active'), 300)
        } catch (error) {
          console.error('运行命令时出错:', error)
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

    console.log('运行命令按钮事件绑定完成')
  }

  // 发送命令到终端iframe
  sendCommandToTerminal(command) {
    try {
      // 查找终端iframe
      const terminalIframe = document.querySelector('#ai-terminal-iframe')
      if (!terminalIframe) {
        console.error('找不到终端iframe')
        this.showError('找不到终端，请确保终端已打开')
        return
      }

      // 确保iframe已加载
      if (!terminalIframe.contentWindow) {
        console.error('终端iframe未加载完成')
        this.showError('终端未加载完成，请稍后重试')
        return
      }

      // 确保终端面板可见
      const terminalPanel = document.getElementById('terminal-panel')
      if (terminalPanel && terminalPanel.style.display === 'none') {
        terminalPanel.style.display = 'block'
      }

      // 检查是否已经创建了终端标签页
      if (!this.terminalTabCreated) {
        console.log('首次运行命令，创建新终端标签页')
        // 先创建新标签页，然后发送命令
        terminalIframe.contentWindow.postMessage(
          {
            type: 'create-tab',
          },
          '*'
        )
        this.terminalTabCreated = true

        // 延迟发送命令，确保标签页创建完成
        setTimeout(() => {
          this.sendCommandToTerminal(command)
        }, 500)
        return
      }

      // 直接发送命令到现有标签页
      console.log('使用现有终端标签页发送命令:', command)
      terminalIframe.contentWindow.postMessage(
        {
          type: 'send-command',
          data: { command: command },
        },
        '*'
      )
      console.log('命令已发送到终端:', command)
      this.showSuccess(`命令已发送: ${command}`)
    } catch (error) {
      console.error('发送命令到终端失败:', error)
      this.showError('发送命令失败: ' + error.message)
    }
  }

  async sendMessage() {
    const input = document.getElementById('user-input')
    const message = input.value.trim()
    if (!message) return

    // 重置终端标签页创建标志，每次新对话都创建新标签页
    this.terminalTabCreated = false

    // 清空输入框
    input.value = ''

    // 添加用户消息到聊天界面
    this.addChatMessage('user', message)

    // 获取当前编辑器文件路径
    const currentTab = document.querySelector('.tab.active')
    const editorFilePath = currentTab ? currentTab.dataset.file : null

    // 获取手动添加的路径
    const manualPaths = this.getManualPaths()
    // 获取上下文路径
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
      let isFirstChunk = true
      this.diffResults = [] // 每次发送消息前清空 diffResults
      this.modificationStatusShown = false // 重置修改状态显示标志
      let hasMarkdownSummary = false // 标记是否已有Markdown摘要

      // 创建AI消息容器
      let aiMessageContainer = null

      // 累积流式内容，用于检测完整的JSON代码块
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              if (this.diffResults && this.diffResults.length > 0) {
                // 移除"开始修改项目代码..."消息
                if (this.modificationStatusShown) {
                  this.removeLastAIMessage()
                }
                // 显示完成消息
                this.addChatMessage('ai', '✅ AI已生成修改建议，请在右侧Diff面板查看并对比。')
              }
              return
            }
            try {
              const parsed = this.safeJsonParse(data)
              console.log('收到数据:', parsed)

              if (parsed.type === 'file_read_error' || parsed.type === 'no_files' || parsed.type === 'error') {
                this.showError(parsed.message || '发生错误')
                continue
              }

              // 处理全栈AI Agent的新输出类型
              if (parsed.type === 'file_modification') {
                console.log('收到文件修改:', parsed)
                this.diffResults.push(parsed)
                this.showDiffSuggestions(this.diffResults)

                // 显示"开始修改项目代码..."消息（只显示一次）
                if (!this.modificationStatusShown) {
                  this.addChatMessage('ai', '🔧 开始修改项目代码...')
                  this.modificationStatusShown = true
                }
                continue
              }

              if (parsed.type === 'file_deletion') {
                console.log('收到文件删除:', parsed)
                this.diffResults.push(parsed)
                this.showDiffSuggestions(this.diffResults)

                if (!this.modificationStatusShown) {
                  this.addChatMessage('ai', '🗑️ 开始删除文件...')
                  this.modificationStatusShown = true
                }
                continue
              }

              if (parsed.type === 'file_rename') {
                console.log('收到文件重命名:', parsed)
                this.diffResults.push(parsed)
                this.showDiffSuggestions(this.diffResults)

                if (!this.modificationStatusShown) {
                  this.addChatMessage('ai', '📝 开始重命名文件...')
                  this.modificationStatusShown = true
                }
                continue
              }

              if (parsed.type === 'schema_validation_error') {
                console.log('收到Schema验证错误:', parsed)
                if (isFirstChunk) {
                  aiMessageContainer = this.createAIMessageContainer()
                  isFirstChunk = false
                }
                this.appendToAIMessage(
                  aiMessageContainer,
                  `<div class="schema-error">❌ Schema验证失败: ${parsed.errors.join(', ')}</div>`
                )
                continue
              }

              if (parsed.type === 'markdown_summary') {
                console.log('收到Markdown摘要:', parsed)
                if (isFirstChunk) {
                  aiMessageContainer = this.createAIMessageContainer()
                  isFirstChunk = false
                }

                // 使用marked渲染Markdown
                const markdownHtml = this.renderMarkdownWithMarked(parsed.content)
                this.appendToAIMessage(aiMessageContainer, markdownHtml)
                hasMarkdownSummary = true
                continue
              }

              // 处理项目创建相关的流式数据
              if (parsed.type === 'action_start') {
                console.log('收到动作开始:', parsed)
                if (isFirstChunk) {
                  aiMessageContainer = this.createAIMessageContainer()
                  isFirstChunk = false
                }
                this.appendToAIMessage(aiMessageContainer, `<div class="action-start">🚀 ${parsed.message}</div>`)
                continue
              }

              if (parsed.type === 'command_item') {
                console.log('收到命令项:', parsed)
                if (isFirstChunk) {
                  aiMessageContainer = this.createAIMessageContainer()
                  isFirstChunk = false
                }

                // 使用现有的 shell 命令渲染方法
                const commandBlock = this.renderShellCommandBlock([
                  {
                    command: parsed.command,
                    explain: parsed.commandExplain,
                  },
                ])
                this.appendToAIMessage(aiMessageContainer, commandBlock)

                // 绑定运行按钮事件
                setTimeout(() => this.bindShellCmdBtnEvents(), 0)
                continue
              }

              if (parsed.type === 'action_complete') {
                console.log('收到动作完成:', parsed)
                if (isFirstChunk) {
                  aiMessageContainer = this.createAIMessageContainer()
                  isFirstChunk = false
                }
                this.appendToAIMessage(aiMessageContainer, `<div class="action-complete">✅ ${parsed.message}</div>`)
                continue
              }

              if (parsed.type === 'stream_chunk' && parsed.content) {
                if (isFirstChunk) {
                  aiMessageContainer = this.createAIMessageContainer()
                  isFirstChunk = false
                }

                console.log('收到stream_chunk:', {
                  type: parsed.type,
                  content: parsed.content,
                  contentLength: parsed.content.length,
                  isFirstChunk: isFirstChunk,
                })

                // 累积内容
                accumulatedContent += parsed.content
                console.log('累积内容长度:', accumulatedContent.length)

                // 实时处理并显示内容
                this.processAndDisplayStreamContent(aiMessageContainer, accumulatedContent)
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

  // 移除最后一条AI消息
  removeLastAIMessage() {
    const messages = document.querySelectorAll('.message.ai')
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      lastMessage.remove()
    }
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
  async acceptSuggestion() {
    if (this.currentSuggestion) {
      // 将新内容应用到编辑器
      this.editor.setValue(this.currentSuggestion)

      // 获取当前文件路径
      if (!this.currentFile) {
        this.showError('没有打开的文件')
        return
      }

      try {
        // 调用文件写入接口
        const response = await fetch('/api/file/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: this.currentFile,
            content: this.currentSuggestion,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // 更新标签页内容
          this.openTabs.set(this.currentFile, {
            fileName: this.currentFile.split('/').pop(),
            content: this.currentSuggestion,
          })
          this.showSuccess('建议已应用并保存到文件')
        } else {
          this.showError(data.error || '保存文件失败')
        }
      } catch (error) {
        this.showError('保存文件失败: ' + error.message)
      }

      this.switchPanel('chat')
    }
  }

  // 拒绝建议
  rejectSuggestion() {
    this.currentSuggestion = null
    this.switchPanel('chat')
  }

  // Diff 面板渲染和 Monaco Diff Editor 弹窗
  showDiffSuggestions(results) {
    const diffPanel = document.getElementById('diff-list')
    if (!diffPanel) {
      console.error('找不到 diff-list 元素')
      return
    }

    console.log('显示 Diff 建议，结果数量:', results.length)

    // 清空现有内容
    diffPanel.innerHTML = ''

    // 创建文件列表，支持新的全栈AI Agent输出格式
    const fileList = document.createElement('div')
    fileList.className = 'diff-file-list'
    fileList.innerHTML = results
      .map((result, idx) => {
        // 根据操作类型设置不同的样式和图标
        let operationIcon = 'edit'
        let operationClass = 'edit'
        let operationText = '修改'

        if (result.operation === 'CREATE') {
          operationIcon = 'plus'
          operationClass = 'add'
          operationText = '创建'
        } else if (result.operation === 'DELETE') {
          operationIcon = 'trash'
          operationClass = 'delete'
          operationText = '删除'
        } else if (result.operation === 'RENAME') {
          operationIcon = 'edit'
          operationClass = 'rename'
          operationText = '重命名'
        }

        // 构建风险等级显示
        let riskLevelHtml = ''
        if (result.riskLevel) {
          const riskColor =
            result.riskLevel === 'high' ? 'danger' : result.riskLevel === 'medium' ? 'warning' : 'success'
          riskLevelHtml = `<span class="risk-badge ${riskColor}">${result.riskLevel}</span>`
        }

        // 构建变更ID显示
        let changeIdHtml = ''
        if (result.changeId) {
          changeIdHtml = `<span class="change-id-display">#${result.changeId}</span>`
        }

        // 构建测试步骤显示
        let testStepsHtml = ''
        if (result.howToTest && result.howToTest.length > 0) {
          testStepsHtml = `
              <div class="test-steps">
                <strong>测试步骤:</strong>
                <ul>${result.howToTest.map((step) => `<li>${step}</li>`).join('')}</ul>
              </div>
            `
        }

        // 构建回滚步骤显示
        let rollbackStepsHtml = ''
        if (result.rollback && result.rollback.length > 0) {
          rollbackStepsHtml = `
              <div class="rollback-steps">
                <strong>回滚步骤:</strong>
                <ul>${result.rollback.map((step) => `<li>${step}</li>`).join('')}</ul>
              </div>
            `
        }

        return `
      <div class="diff-item">
        <div class="diff-item-header">
                <div class="diff-item-info">
                  <span class="file-path">${result.path}</span>
                  <span class="operation-badge ${operationClass}">${operationText}</span>
                  ${riskLevelHtml}
                  ${changeIdHtml}
                </div>
                <div class="diff-item-actions">
          <button class="btn secondary" onclick="aiAgent.showFileDiff(${idx})">对比</button>
                </div>
              </div>
              <div class="diff-item-details">
                <div class="change-reason">${result.reason || '无说明'}</div>
                ${testStepsHtml}
                ${rollbackStepsHtml}
        </div>
      </div>
    `
      })
      .join('')

    // 只添加文件列表到面板
    diffPanel.appendChild(fileList)

    this.switchPanel('diff-view')
    this.diffResults = results

    console.log('Diff 面板已更新，显示全栈AI Agent输出格式')
  }

  async showFileDiff(idx) {
    const result = this.diffResults[idx]
    console.log('显示文件对比:', result)

    // 生成对比文件的路径和标题
    const fileName = result.path.split('/').pop()
    const diffFilePath = `diff_${fileName}_${Date.now()}`
    const diffTabTitle = `对比: ${fileName}`

    // 在主编辑器中打开新的 tab
    this.openDiffTab(diffFilePath, diffTabTitle, result)
  }

  // 打开对比 tab
  openDiffTab(filePath, title, diffResult) {
    // 创建新的 tab
    const tab = document.createElement('div')
    tab.className = 'tab'
    tab.setAttribute('data-file', filePath)
    tab.innerHTML = `
      <span>${title}</span>
      <button class="close-tab" data-file="${filePath}"><i class="fas fa-times"></i></button>
    `

    // 绑定关闭事件
    tab.querySelector('.close-tab').addEventListener('click', (e) => {
      e.stopPropagation()
      this.closeTab(filePath)
    })

    // 绑定切换事件
    tab.addEventListener('click', () => this.switchTab(filePath))

    // 添加到 tab 列表
    const tabsContainer = document.querySelector('.editor-tabs')
    tabsContainer.appendChild(tab)

    // 切换到新 tab
    this.switchTab(filePath)

    // 保存当前编辑器状态
    const currentEditor = this.editor

    // 创建新的 Monaco Diff Editor
    if (typeof require !== 'undefined') {
      require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } })
      require(['vs/editor/editor.main'], () => {
        console.log('创建 Monaco Diff Editor')

        // 销毁当前编辑器
        if (currentEditor) {
          currentEditor.dispose()
        }

        // 根据文件扩展名设置语言
        const fileExt = diffResult.path.split('.').pop().toLowerCase()
        const language = this.getMonacoLanguage(fileExt)
        console.log('文件类型:', fileExt, '语言:', language)

        const originalModel = monaco.editor.createModel(diffResult.oldContent || '', language)
        const modifiedModel = monaco.editor.createModel(diffResult.newContent || '', language)

        // 创建 Diff Editor
        this.editor = monaco.editor.createDiffEditor(document.getElementById('monaco-editor'), {
          theme: 'vs-dark',
          readOnly: true,
          automaticLayout: true,
          renderSideBySide: true,
          enableSplitViewResizing: true,
          renderOverviewRuler: true,
          ignoreTrimWhitespace: false,
          renderIndicators: true,
          originalEditor: {
            readOnly: true,
          },
          modifiedEditor: {
            readOnly: true,
          },
        })

        this.editor.setModel({
          original: originalModel,
          modified: modifiedModel,
        })

        // 添加应用和拒绝按钮到编辑器容器
        const editorContainer = document.getElementById('monaco-editor')
        const buttonContainer = document.createElement('div')
        buttonContainer.style.cssText = `
          position: absolute;
          transform: translateX(50%);
          bottom: 15px;
          right: 50%;
          z-index: 1000;
          display: flex;
          gap: 8px;
        `
        buttonContainer.innerHTML = `
          <button class="btn success" id="apply-diff-btn" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">应用建议</button>
          <button class="btn danger" onclick="aiAgent.rejectDiffFromTab()" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">拒绝建议</button>
        `

        // 绑定应用建议按钮事件
        const applyBtn = buttonContainer.querySelector('#apply-diff-btn')
        applyBtn.addEventListener('click', () => {
          this.applyDiffFromTab(diffResult.newContent)
        })
        editorContainer.style.position = 'relative'
        editorContainer.appendChild(buttonContainer)

        console.log('Diff Editor 创建成功')
      })
    } else {
      console.error('Monaco Editor 未加载')
      alert('Monaco Editor 未加载，请刷新页面重试')
    }

    // 保存 tab 信息
    this.openTabs.set(filePath, {
      fileName: title,
      content: '',
      isDiff: true,
      diffData: diffResult,
    })

    console.log('对比 tab 已打开:', filePath)
  }

  // 从 tab 应用更改
  async applyDiffFromTab(newContent) {
    console.log('applyDiffFromTab 被调用，newContent 长度:', newContent.length)
    // 获取原始文件路径
    let filePath = null
    const currentTab = document.querySelector('.tab.active')
    if (currentTab && currentTab.dataset.file) {
      const currentFilePath = currentTab.dataset.file
      if (currentFilePath.startsWith('diff_')) {
        if (this.diffResults && this.diffResults.length > 0) {
          const tabTitle = currentTab.querySelector('span').textContent
          const fileName = tabTitle.replace('对比: ', '')
          const diffResult = this.diffResults.find((result) => result.path.split('/').pop() === fileName)
          if (diffResult) {
            filePath = diffResult.path
          }
        }
      } else {
        filePath = currentFilePath
      }
    }
    if (!filePath) {
      this.showError('无法获取文件路径')
      return
    }
    // 获取操作类型
    let operation = 'MODIFY'
    if (this.diffResults && this.diffResults.length > 0) {
      const tabTitle = currentTab.querySelector('span').textContent
      const fileName = tabTitle.replace('对比: ', '')
      const diffResult = this.diffResults.find((result) => result.path.split('/').pop() === fileName)
      if (diffResult) {
        operation = diffResult.operation || 'MODIFY'
      }
    }

    console.log('应用更改，文件路径:', filePath, '操作类型:', operation)

    // 根据操作类型调用不同的接口
    try {
      let response
      let data

      if (operation === 'CREATE') {
        // 创建新文件
        console.log('调用创建文件接口:', '/api/file/create')
        response = await fetch('/api/file/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            content: newContent,
          }),
        })
        data = await response.json()

        if (data.success) {
          this.showSuccess('新文件创建成功')
          // 创建成功后，切换到新创建的文件
          this.openTab(filePath, filePath.split('/').pop(), newContent)
        } else {
          this.showError(data.error || '创建文件失败')
          return
        }
      } else {
        // 修改现有文件
        console.log('调用修改文件接口:', '/api/file/write')
        response = await fetch('/api/file/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath,
            content: newContent,
          }),
        })
        data = await response.json()

        if (data.success) {
          this.showSuccess('AI建议已应用并保存到文件')
          // 更新标签页内容
          this.openTabs.set(filePath, {
            fileName: filePath.split('/').pop(),
            content: newContent,
          })
        } else {
          this.showError(data.error || '保存文件失败')
          return
        }
      }

      // 1. 切换回普通编辑器
      this.recreateNormalEditor(newContent, filePath)
    } catch (error) {
      console.error('应用更改失败:', error)
      this.showError('应用更改失败: ' + error.message)
      return
    }
    // 关闭当前对比 tab
    this.closeCurrentTab()
  }

  // 拒绝更改并关闭 tab
  rejectDiffFromTab() {
    this.showSuccess('已拒绝当前建议')
    this.closeCurrentTab()
  }

  // 关闭当前 tab
  closeCurrentTab() {
    const currentTab = document.querySelector('.tab.active')
    if (currentTab) {
      this.closeTab(currentTab.dataset.file)
    }
  }

  // 接受差异
  async acceptDiff(diffId) {
    const diff = this.diffSuggestions[diffId]
    if (diff) {
      // 将新内容应用到编辑器
      this.editor.setValue(diff.newContent)

      // 获取文件路径
      let filePath = null

      // 检查当前tab是否是对比tab
      const currentTab = document.querySelector('.tab.active')
      if (currentTab && currentTab.dataset.file) {
        const currentFilePath = currentTab.dataset.file

        // 如果是对比tab（以diff_开头），需要获取原始文件路径
        if (currentFilePath.startsWith('diff_')) {
          // 从diffResults中找到对应的原始文件路径
          if (this.diffResults && this.diffResults.length > 0) {
            // 获取当前对比tab的标题，从中提取文件名
            const tabTitle = currentTab.querySelector('span').textContent
            const fileName = tabTitle.replace('对比: ', '')

            // 在diffResults中查找匹配的文件
            const diffResult = this.diffResults.find((result) => result.path.split('/').pop() === fileName)

            if (diffResult) {
              filePath = diffResult.path
            }
          }
        } else {
          // 不是对比tab，直接使用当前文件路径
          filePath = currentFilePath
        }
      }

      // 如果还是无法获取文件路径，尝试从diff对象中获取
      if (!filePath && diff.meta && diff.meta.filePath) {
        filePath = diff.meta.filePath
      }

      if (!filePath) {
        this.showError('无法获取文件路径')
        return
      }

      try {
        // 调用文件写入接口
        const response = await fetch('/api/file/write', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: filePath,
            content: diff.newContent,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // 更新标签页内容
          this.openTabs.set(filePath, {
            fileName: filePath.split('/').pop(),
            content: diff.newContent,
          })
          this.showSuccess('差异已应用并保存到文件')
        } else {
          this.showError(data.error || '保存文件失败')
        }
      } catch (error) {
        this.showError('保存文件失败: ' + error.message)
      }

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
  async acceptAllDiffs() {
    console.log('acceptAllDiffs 被调用')
    console.log('diffSuggestions 长度:', this.diffSuggestions ? this.diffSuggestions.length : 0)
    console.log('diffResults 长度:', this.diffResults ? this.diffResults.length : 0)

    // 优先使用 diffResults（AI生成的修改建议）
    if (this.diffResults && this.diffResults.length > 0) {
      console.log('找到AI修改建议，数量:', this.diffResults.length)

      // 准备批量写入的文件数据，区分CREATE和MODIFY操作
      const filesToCreate = []
      const filesToModify = []

      this.diffResults.forEach((diff) => {
        if (diff.operation === 'CREATE') {
          filesToCreate.push({
            path: diff.path,
            content: diff.newContent,
          })
        } else {
          filesToModify.push({
            path: diff.path,
            content: diff.newContent,
          })
        }
      })

      console.log(
        '准备创建文件:',
        filesToCreate.map((f) => f.path)
      )
      console.log(
        '准备修改文件:',
        filesToModify.map((f) => f.path)
      )

      try {
        // 先处理创建文件
        if (filesToCreate.length > 0) {
          console.log('调用批量创建文件接口:', '/api/file/batch-create')
          const createResponse = await fetch('/api/file/batch-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: filesToCreate }),
          })

          const createData = await createResponse.json()
          if (!createData.success) {
            this.showError('批量创建文件失败: ' + (createData.error || '未知错误'))
            return
          }
          console.log('批量创建文件成功')
        }

        // 再处理修改文件
        if (filesToModify.length > 0) {
          console.log('调用批量修改文件接口:', '/api/file/batch-write')
          const modifyResponse = await fetch('/api/file/batch-write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: filesToModify }),
          })

          const modifyData = await modifyResponse.json()
          if (!modifyData.success) {
            this.showError('批量修改文件失败: ' + (modifyData.error || '未知错误'))
            return
          }
          console.log('批量修改文件成功')
        }

        // 更新所有文件的标签页内容
        const allFiles = [...filesToCreate, ...filesToModify]
        allFiles.forEach((file) => {
          this.openTabs.set(file.path, {
            fileName: file.path.split('/').pop(),
            content: file.content,
          })
        })

        // 如果有多个文件，显示第一个文件在编辑器中
        if (allFiles.length > 0) {
          const firstFile = allFiles[0]
          this.recreateNormalEditor(firstFile.content, firstFile.path)
        }

        this.showSuccess(`成功应用并保存了 ${allFiles.length} 个文件的修改`)
      } catch (error) {
        console.error('批量操作失败:', error)
        this.showError('批量操作失败: ' + error.message)
        return
      }

      this.diffResults = []
      return
    }

    // 如果没有AI修改建议，尝试使用搜索结果
    if (this.diffSuggestions && this.diffSuggestions.length > 0) {
      console.log('找到搜索结果差异，数量:', this.diffSuggestions.length)

      // 准备批量写入的文件数据
      const filesToWrite = this.diffSuggestions
        .map((diff) => ({
          path: diff.path || (diff.meta && diff.meta.filePath),
          content: diff.newContent || (diff.meta && diff.meta.content),
        }))
        .filter((file) => file.path && file.content)

      if (filesToWrite.length === 0) {
        this.showError('无法获取文件路径或内容')
        return
      }

      console.log(
        '准备批量写入搜索结果文件:',
        filesToWrite.map((f) => f.path)
      )

      try {
        // 使用批量写入接口
        const response = await fetch('/api/file/batch-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: filesToWrite }),
        })

        const data = await response.json()

        if (data.success) {
          // 更新所有文件的标签页内容
          filesToWrite.forEach((file) => {
            this.openTabs.set(file.path, {
              fileName: file.path.split('/').pop(),
              content: file.content,
            })
          })

          // 如果有多个文件，显示第一个文件在编辑器中
          if (filesToWrite.length > 0) {
            const firstFile = filesToWrite[0]
            this.recreateNormalEditor(firstFile.content, firstFile.path)
          }

          this.showSuccess(`成功应用并保存了 ${filesToWrite.length} 个文件的修改`)
        } else {
          this.showError(data.error || '批量保存文件失败')
        }
      } catch (error) {
        this.showError('批量保存文件失败: ' + error.message)
      }

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

    // 显示指定面板（添加空值检查）
    const panelElement = document.getElementById(`${panelName}-panel`)
    const tabElement = document.querySelector(`[data-panel="${panelName}"]`)

    if (panelElement) {
      panelElement.classList.add('active')
    }

    if (tabElement) {
      tabElement.classList.add('active')
    }
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
    const terminalPanel = document.getElementById('terminal-panel')
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

      // 同时调整终端面板的右边距，使其宽度跟着变化
      if (terminalPanel) {
        terminalPanel.style.right = newWidth + 'px'
      }
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

  // 重置终端状态
  resetTerminalState() {
    this.terminalTabCreated = false
    const terminalPanel = document.getElementById('terminal-panel')
    const resizeBar = document.getElementById('terminal-resize-bar')
    const editor = document.getElementById('monaco-editor')
    const editorContainer = document.querySelector('.editor-container')

    if (terminalPanel) {
      terminalPanel.style.display = 'none'
    }
    if (resizeBar) {
      resizeBar.style.display = 'none'
    }

    // 重置终端iframe状态
    const terminalIframe = document.getElementById('ai-terminal-iframe')
    if (terminalIframe) {
      // 清空iframe内容，但不重新加载，避免不必要的网络请求
      terminalIframe.style.display = 'none'
      setTimeout(() => {
        terminalIframe.style.display = 'block'
      }, 50)
    }

    // 恢复编辑器完整高度
    if (editor && editorContainer) {
      // 重新计算可用高度
      const headerHeight = editorContainer.querySelector('.editor-header').offsetHeight
      const containerHeight = editorContainer.offsetHeight
      const availableHeight = containerHeight - headerHeight

      console.log('关闭终端时的高度计算:', {
        containerHeight: containerHeight + 'px',
        headerHeight: headerHeight + 'px',
        availableHeight: availableHeight + 'px',
      })

      // 清除所有高度限制，恢复完整高度
      editor.style.height = availableHeight + 'px'
      editor.style.minHeight = '' // 清除最小高度限制
      editor.style.maxHeight = '' // 清除最大高度限制

      // 重新调整Monaco编辑器大小
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors()
        for (let editorInstance of editors) {
          if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
            editorInstance.layout()
            break
          }
        }
      }

      // 强制触发重新布局
      setTimeout(() => {
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors()
          for (let editorInstance of editors) {
            if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
              editorInstance.layout()
              break
            }
          }
        }

        // 再次确认高度设置
        console.log('关闭终端后的编辑器高度:', {
          setHeight: availableHeight + 'px',
          actualHeight: editor.offsetHeight + 'px',
          styleHeight: editor.style.height,
        })
      }, 100)

      console.log('终端已关闭，编辑器恢复完整高度:', availableHeight + 'px')
    }
  }

  // 打开终端
  openTerminal() {
    const terminalPanel = document.getElementById('terminal-panel')
    const resizeBar = document.getElementById('terminal-resize-bar')
    const editor = document.getElementById('monaco-editor')
    const editorContainer = document.querySelector('.editor-container')
    const aiPanel = document.querySelector('.ai-panel')

    if (terminalPanel && editor && editorContainer) {
      // 显示终端面板
      terminalPanel.style.display = 'block'

      // 获取当前AI面板的宽度，动态设置终端面板的右边距
      const aiPanelWidth = aiPanel ? aiPanel.offsetWidth : 350
      terminalPanel.style.right = aiPanelWidth + 'px'

      // 计算红框框住的高度（编辑器容器的可用高度）
      const headerHeight = editorContainer.querySelector('.editor-header').offsetHeight
      const containerHeight = editorContainer.offsetHeight
      const availableHeight = containerHeight - headerHeight

      console.log('打开终端时的高度计算:', {
        containerHeight: containerHeight + 'px',
        headerHeight: headerHeight + 'px',
        availableHeight: availableHeight + 'px',
        aiPanelWidth: aiPanelWidth + 'px',
      })

      // 设置终端面板高度（默认320px，但不超过可用高度的70%）
      const defaultTerminalHeight = Math.min(320, availableHeight * 0.7)
      terminalPanel.style.height = defaultTerminalHeight + 'px'

      // 调整编辑器高度，确保总和等于红框框住的高度
      const newEditorHeight = availableHeight - defaultTerminalHeight

      // 强制设置编辑器高度
      editor.style.height = newEditorHeight + 'px'
      editor.style.minHeight = newEditorHeight + 'px'
      editor.style.maxHeight = newEditorHeight + 'px'

      // 确保终端面板有合适的高度
      const iframeWrapper = document.getElementById('terminal-iframe-wrapper')
      if (iframeWrapper) {
        iframeWrapper.style.height = defaultTerminalHeight + 'px'
      }

      // 重新初始化终端iframe
      const terminalIframe = document.getElementById('ai-terminal-iframe')
      if (terminalIframe) {
        // 重新加载iframe以确保终端正常工作
        const currentSrc = terminalIframe.src
        terminalIframe.src = ''
        setTimeout(() => {
          terminalIframe.src = currentSrc
          console.log('终端iframe已重新加载')
        }, 100)
      }

      // 确保拖拽条可见
      if (resizeBar) {
        resizeBar.style.display = 'block'
      }

      // 立即重新调整Monaco编辑器大小
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors()
        for (let editorInstance of editors) {
          if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
            editorInstance.layout()
            break
          }
        }
      }

      // 强制触发重新布局并验证高度
      setTimeout(() => {
        // 再次强制设置编辑器高度
        editor.style.height = newEditorHeight + 'px'
        editor.style.minHeight = newEditorHeight + 'px'
        editor.style.maxHeight = newEditorHeight + 'px'

        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors()
          for (let editorInstance of editors) {
            if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
              editorInstance.layout()
              break
            }
          }
        }

        // 验证高度总和
        const actualEditorHeight = editor.offsetHeight
        const actualTerminalHeight = terminalPanel.offsetHeight
        const totalHeight = actualEditorHeight + actualTerminalHeight

        console.log('打开终端后的高度验证:', {
          editorHeight: actualEditorHeight + 'px',
          terminalHeight: actualTerminalHeight + 'px',
          totalHeight: totalHeight + 'px',
          availableHeight: availableHeight + 'px',
          isEqual: totalHeight === availableHeight ? '✅ 正确' : '❌ 不匹配',
        })

        // 如果高度不匹配，强制调整
        if (totalHeight !== availableHeight) {
          console.log('高度不匹配，强制调整...')
          const adjustedEditorHeight = availableHeight - actualTerminalHeight
          editor.style.height = adjustedEditorHeight + 'px'
          editor.style.minHeight = adjustedEditorHeight + 'px'
          editor.style.maxHeight = adjustedEditorHeight + 'px'

          if (window.monaco && window.monaco.editor) {
            const editors = window.monaco.editor.getEditors()
            for (let editorInstance of editors) {
              if (editorInstance.getDomNode() === editor || editorInstance.getDomNode().contains(editor)) {
                editorInstance.layout()
                break
              }
            }
          }
        }
      }, 150)

      console.log('终端面板已打开:', {
        terminalHeight: defaultTerminalHeight + 'px',
        editorHeight: newEditorHeight + 'px',
        totalHeight: availableHeight + 'px',
      })
    } else {
      console.error('找不到终端面板或编辑器元素')
    }
  }

  // 显示设置
  showSettings() {
    console.log('显示设置面板')
    // 这里可以添加设置面板的逻辑
    this.showToast('设置功能开发中...', 'info')
  }

  // 初始化模式切换器
  initModeSwitcher() {
    console.log('初始化模式切换器')

    // 设置默认模式
    this.currentMode = localStorage.getItem('aiAgentMode') || 'mock' // 默认改为mock模式
    this.updateModeDisplay()

    // 绑定模式选项点击事件
    const modeOptions = document.querySelectorAll('.mode-option')
    modeOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const mode = option.dataset.mode
        this.switchMode(mode)
      })
    })

    // 绑定开关点击事件
    const switchTrack = document.querySelector('.switch-track')
    if (switchTrack) {
      switchTrack.addEventListener('click', () => {
        const newMode = this.currentMode === 'pure' ? 'mock' : 'pure'
        this.switchMode(newMode)
      })
    }

    // 初始化时应用当前模式
    this.applyCurrentMode()
  }

  // 应用当前模式
  applyCurrentMode() {
    console.log('应用当前模式:', this.currentMode)

    if (this.currentMode === 'mock') {
      this.enableMockCodingMode()
    } else {
      this.enablePureCodingMode()
    }
  }

  // 切换模式
  switchMode(mode) {
    console.log('切换模式:', mode)

    if (this.currentMode === mode) return

    this.currentMode = mode
    localStorage.setItem('aiAgentMode', mode)

    this.updateModeDisplay()
    this.onModeChanged(mode)
  }

  // 更新模式显示
  updateModeDisplay() {
    const modeOptions = document.querySelectorAll('.mode-option')
    const switchTrack = document.querySelector('.switch-track')

    // 更新模式选项状态
    modeOptions.forEach((option) => {
      option.classList.toggle('active', option.dataset.mode === this.currentMode)
    })

    // 更新开关状态
    if (switchTrack) {
      switchTrack.classList.toggle('active', this.currentMode === 'mock')
    }

    // 更新标题显示
    const modeTitle = document.querySelector('.mode-title')
    if (modeTitle) {
      const modeText = this.currentMode === 'pure' ? '纯编码模式' : 'Mock编码模式'
      modeTitle.textContent = `AI Agent ${modeText}`
    }
  }

  // 模式改变时的处理
  onModeChanged(mode) {
    console.log('模式已切换到:', mode)

    if (mode === 'pure') {
      // 纯编码模式：显示代码编辑相关功能
      this.showToast('已切换到纯编码模式', 'success')
      this.enablePureCodingMode()
    } else {
      // Mock编码模式：显示Mock数据相关功能
      this.showToast('已切换到Mock编码模式', 'success')
      this.enableMockCodingMode()
    }
  }

  // 启用纯编码模式
  enablePureCodingMode() {
    // 显示代码编辑相关功能
    const codeFeatures = document.querySelectorAll('.code-feature')
    codeFeatures.forEach((feature) => {
      feature.style.display = 'block'
    })

    // 隐藏Mock相关功能
    const mockFeatures = document.querySelectorAll('.mock-feature')
    mockFeatures.forEach((feature) => {
      feature.style.display = 'none'
    })

    // 关闭Mock管理tab（如果存在）
    this.closeIframeTab('mock-management')

    // 更新AI助手的提示
    this.updateAIAssistantPrompt('pure')
  }

  // 启用Mock编码模式
  enableMockCodingMode() {
    // 隐藏代码编辑相关功能
    const codeFeatures = document.querySelectorAll('.code-feature')
    codeFeatures.forEach((feature) => {
      feature.style.display = 'none'
    })

    // 显示Mock相关功能
    const mockFeatures = document.querySelectorAll('.mock-feature')
    mockFeatures.forEach((feature) => {
      feature.style.display = 'block'
    })

    // 自动创建Mock管理tab
    this.createIframeTab('mock-management', 'Mock管理', 'http://localhost:3400/')

    // 更新AI助手的提示
    this.updateAIAssistantPrompt('mock')
  }

  // 更新AI助手提示
  updateAIAssistantPrompt(mode) {
    const aiInput = document.getElementById('user-input')
    if (aiInput) {
      if (mode === 'pure') {
        aiInput.placeholder = '输入代码相关问题或需求...'
      } else {
        aiInput.placeholder = '输入Mock数据需求或API设计问题...'
      }
    }
  }

  // 渲染Markdown摘要
  renderMarkdownSummary(content) {
    // 将Markdown转换为HTML
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜体
      .replace(/`(.*?)`/g, '<code>$1</code>') // 行内代码
      .replace(/\n/g, '<br>') // 换行
      .replace(/^### (.*$)/gim, '<h3>$1</h3>') // 三级标题
      .replace(/^## (.*$)/gim, '<h2>$1</h2>') // 二级标题
      .replace(/^# (.*$)/gim, '<h1>$1</h1>') // 一级标题
      .replace(/^- (.*$)/gim, '<li>$1</li>') // 列表项
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>') // 列表包装

    return `<div class="markdown-summary">${html}</div>`
  }

  // 创建AI消息容器
  createAIMessageContainer() {
    const chatMessages = document.querySelector('.chat-messages')
    const message = document.createElement('div')
    message.className = 'message ai'
    message.innerHTML = `
      <div class="message-content">
        <i class="fas fa-robot"></i>
        <div class="text"></div>
      </div>
    `
    chatMessages.appendChild(message)
    chatMessages.scrollTop = chatMessages.scrollHeight
    return message.querySelector('.text')
  }

  // 追加内容到AI消息
  appendToAIMessage(container, content) {
    if (!container) return

    // 创建临时容器来解析HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    // 将内容追加到容器
    container.appendChild(tempDiv.firstElementChild || tempDiv)

    // 滚动到底部
    const chatMessages = document.querySelector('.chat-messages')
    chatMessages.scrollTop = chatMessages.scrollHeight

    // 对新添加的代码块应用Prism.js高亮
    this.highlightCodeBlocks(container)
  }

  // 使用marked渲染Markdown
  renderMarkdownWithMarked(content) {
    if (typeof marked === 'undefined') {
      console.warn('marked库未加载，使用备用渲染方法')
      return this.renderMarkdownSummary(content)
    }

    try {
      // 创建自定义渲染器
      const renderer = new marked.Renderer()

      // 改进代码块渲染
      renderer.code = function (code, language) {
        const lang = language || 'text'
        return `<pre><code class="language-${lang}">${code}</code></pre>`
      }

      // 改进段落渲染
      renderer.paragraph = function (text) {
        return `<p>${text}</p>`
      }

      // 改进列表渲染
      renderer.list = function (body, ordered) {
        const type = ordered ? 'ol' : 'ul'
        return `<${type}>${body}</${type}>`
      }

      // 配置marked选项
      marked.setOptions({
        breaks: true, // 支持换行
        gfm: true, // 支持GitHub风格Markdown
        sanitize: false, // 允许HTML标签
        renderer: renderer, // 使用自定义渲染器
        highlight: function (code, lang) {
          if (typeof Prism !== 'undefined' && Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang)
          }
          return code
        },
      })

      // 渲染Markdown
      const html = marked.parse(content)
      console.log('Markdown渲染成功，HTML长度:', html.length)
      return `<div class="markdown-summary">${html}</div>`
    } catch (e) {
      console.error('Markdown渲染失败:', e)
      // 如果Markdown渲染失败，使用备用渲染
      return this.renderMarkdownSummary(content)
    }
  }

  // 检查是否有未闭合的JSON代码块
  checkUnclosedJsonBlocks(content) {
    // 检查是否有开始但没有结束的代码块
    const codeBlockStart = content.match(/```(?:json)?\s*\{/g)
    const codeBlockEnd = content.match(/```\s*$/g)

    if (codeBlockStart && codeBlockEnd) {
      // 如果开始和结束的数量不匹配，说明有未闭合的
      if (codeBlockStart.length > codeBlockEnd.length) {
        // 但如果内容足够长，允许显示
        if (content.length > 500) {
          console.log('JSON代码块未闭合，但内容足够长，允许显示')
          return false
        }
        return true
      }
    }

    // 检查是否有开始但没有结束的JSON对象
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length

    // 如果大括号不匹配，说明JSON不完整
    if (openBraces !== closeBraces) {
      // 但如果内容足够长，允许显示
      if (content.length > 500) {
        console.log('JSON大括号不匹配，但内容足够长，允许显示')
        return false
      }
      return true
    }

    // 检查是否有未闭合的引号
    const quotes = content.match(/"/g) || []
    if (quotes.length % 2 !== 0) {
      // 但如果内容足够长，允许显示
      if (content.length > 500) {
        console.log('JSON引号不匹配，但内容足够长，允许显示')
        return false
      }
      return true
    }

    return false
  }

  // 检查是否有未闭合的代码块
  checkUnclosedCodeBlocks(content) {
    // 检查是否有开始但没有结束的代码块
    const codeBlockStarts = content.match(/```/g) || []
    const codeBlockEnds = content.match(/```/g) || []

    // 如果代码块标记数量是奇数，说明有未闭合的
    if (codeBlockStarts.length % 2 !== 0) {
      return true
    }

    // 检查是否有未闭合的代码块语言标记
    const languageBlocks = content.match(/```(\w+)/g) || []
    const closingBlocks = content.match(/```\s*$/gm) || []

    if (languageBlocks.length > closingBlocks.length) {
      return true
    }

    return false
  }

  // 检查是否有完整的JSON代码块
  hasCompleteJsonBlock(content) {
    // 检查是否有完整的代码块标记
    const codeBlockStarts = content.match(/```(?:json)?\s*\{/g) || []
    const codeBlockEnds = content.match(/```\s*$/gm) || []

    if (codeBlockStarts.length === 0) {
      // 没有JSON代码块开始标记，检查是否有其他内容
      if (content.length > 50) {
        // 如果有足够的内容，允许显示
        return true
      }
      return false
    }

    if (codeBlockStarts.length !== codeBlockEnds.length) {
      // 代码块标记不匹配，但如果有足够的内容，允许显示
      if (content.length > 200) {
        console.log('代码块标记不匹配，但内容足够长，允许显示')
        return true
      }
      return false
    }

    // 检查是否有完整的JSON对象
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
    let match
    let hasValidJson = false

    while ((match = jsonRegex.exec(content)) !== null) {
      try {
        const jsonContent = match[1]
        // 尝试解析JSON
        JSON.parse(jsonContent)
        hasValidJson = true
        break
      } catch (e) {
        // JSON解析失败，继续检查下一个
        continue
      }
    }

    // 如果有有效的JSON，或者内容足够长，允许显示
    if (hasValidJson || content.length > 300) {
      return true
    }

    return false
  }

  // 修复常见的JSON格式问题
  fixCommonJsonIssues(jsonContent) {
    let fixed = jsonContent

    // 1. 修复属性名缺少双引号的问题
    fixed = fixed.replace(/(\s*)(\w+)(\s*):/g, '$1"$2"$3:')

    // 2. 修复字符串值缺少双引号的问题
    fixed = fixed.replace(/:\s*([^"][^,\s{}[\]]+[^,\s{}[\]])\s*([,}\s])/g, ': "$1"$2')

    // 3. 修复未闭合的字符串
    const lines = fixed.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const quoteCount = (line.match(/"/g) || []).length

      // 如果行中有奇数个引号，尝试修复
      if (quoteCount % 2 !== 0) {
        // 查找最后一个引号的位置
        const lastQuoteIndex = line.lastIndexOf('"')
        if (lastQuoteIndex !== -1) {
          // 检查引号后面是否有逗号或其他字符
          const afterQuote = line.substring(lastQuoteIndex + 1).trim()
          if (afterQuote && !afterQuote.startsWith(',') && !afterQuote.startsWith('}') && !afterQuote.startsWith(']')) {
            // 在行末添加引号闭合
            lines[i] = line + '"'
          }
        }
      }
    }

    fixed = lines.join('\n')

    // 4. 修复未闭合的对象和数组
    let braceCount = 0
    let bracketCount = 0

    for (const char of fixed) {
      if (char === '{') braceCount++
      if (char === '}') braceCount--
      if (char === '[') bracketCount++
      if (char === ']') bracketCount--
    }

    // 添加缺失的闭合括号
    while (braceCount > 0) {
      fixed += '}'
      braceCount--
    }

    while (bracketCount > 0) {
      fixed += ']'
      bracketCount--
    }

    // 5. 修复常见的语法错误
    fixed = fixed
      .replace(/,\s*}/g, '}') // 移除对象末尾的逗号
      .replace(/,\s*]/g, ']') // 移除数组末尾的逗号
      .replace(/,\s*$/gm, '') // 移除行末的逗号
      .replace(/:\s*,\s*/g, ': ""') // 修复空值
      .replace(/:\s*}\s*}/g, ': "}"}') // 修复嵌套对象问题

    return fixed
  }

  // 创建JSON占位符
  createJsonPlaceholder(originalContent) {
    return `
      <div class="json-placeholder">
        <div class="json-placeholder-header">
          <i class="fas fa-clock"></i>
          <span>JSON内容加载中...</span>
        </div>
        <div class="json-placeholder-content">
          <code>${this.escapeHtml(originalContent.substring(0, 200))}...</code>
        </div>
      </div>
    `
  }

  // 处理流式内容，检测并处理JSON代码块
  processStreamContentWithMarked(content) {
    console.log('=== 开始处理流式内容 ===')
    console.log('原始内容长度:', content.length)
    console.log('原始内容预览:', content.substring(0, 300) + '...')

    // 分析内容结构
    const codeBlockCount = (content.match(/```/g) || []).length
    const jsonBlockCount = (content.match(/```(?:json)?\s*\{/g) || []).length
    const markdownHeaders = content.match(/^#{1,6}\s+.+$/gm) || []

    console.log('内容分析:', {
      codeBlockCount,
      jsonBlockCount,
      markdownHeaders: markdownHeaders.length,
      hasMarkdown:
        markdownHeaders.length > 0 || content.includes('**') || content.includes('*') || content.includes('`'),
    })

    // 改进JSON代码块检测 - 更准确地匹配完整的JSON代码块
    const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
    let processedContent = content
    let match
    let hasJsonBlock = false
    let jsonBlocks = []

    // 先收集所有JSON代码块
    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const jsonContent = match[1]
        console.log('检测到JSON代码块:', jsonContent)

        // 尝试清理JSON内容，移除可能的尾随字符
        let cleanJsonContent = jsonContent.trim()

        // 如果JSON以逗号结尾，尝试移除
        if (cleanJsonContent.endsWith(',')) {
          cleanJsonContent = cleanJsonContent.slice(0, -1)
        }

        // 如果JSON以...结尾，尝试移除
        if (cleanJsonContent.endsWith('...')) {
          cleanJsonContent = cleanJsonContent.slice(0, -3)
        }

        // 尝试修复常见的JSON格式问题
        cleanJsonContent = this.fixCommonJsonIssues(cleanJsonContent)

        console.log('清理后的JSON内容:', cleanJsonContent.substring(0, 200) + '...')

        const parsed = this.safeJsonParse(cleanJsonContent)
        console.log('JSON解析成功:', parsed)

        // 放宽验证条件：只要有change字段或者schema_validation字段就认为是有效的
        if (
          (parsed.change && Array.isArray(parsed.change)) ||
          (parsed.schema_validation && parsed.schema_validation === 'pass') ||
          parsed.change_id ||
          parsed.file_path ||
          parsed.operation
        ) {
          console.log('JSON验证通过，创建可折叠组件')
          hasJsonBlock = true

          // 创建可折叠的JSON显示
          const jsonId = 'json-' + Math.random().toString(36).slice(2)
          const jsonHtml = this.createCollapsibleJson(jsonId, parsed)

          // 记录JSON块信息，用于后续替换
          jsonBlocks.push({
            original: match[0],
            replacement: jsonHtml,
          })
        } else {
          console.log('JSON结构不符合预期，跳过处理')
        }
      } catch (e) {
        // 如果JSON解析失败，记录详细信息并尝试部分处理
        console.log('JSON解析失败，可能是代码块不完整:', e.message)
        console.log('原始JSON内容:', match[1])

        // 尝试检测是否是部分JSON，如果是，可以标记为待处理
        const partialContent = match[1]
        if (
          partialContent.includes('"change"') ||
          partialContent.includes('"schema_validation"') ||
          partialContent.includes('"change_id"')
        ) {
          console.log('检测到部分JSON内容，可能需要等待更多数据')

          // 尝试创建一个占位符，等待完整数据
          const placeholderHtml = this.createJsonPlaceholder(match[0])
          jsonBlocks.push({
            original: match[0],
            replacement: placeholderHtml,
          })
        }
      }
    }

    // 如果没有找到JSON代码块，尝试查找其他格式的JSON
    if (jsonBlocks.length === 0) {
      console.log('未找到标准JSON代码块，尝试查找其他格式...')

      // 尝试查找没有代码块标记的JSON内容
      const looseJsonRegex = /(\{[^{}]*"schema_validation"[^{}]*\})/g
      let looseMatch

      while ((looseMatch = looseJsonRegex.exec(content)) !== null) {
        try {
          const jsonContent = looseMatch[1]
          console.log('检测到松散格式JSON:', jsonContent)

          const parsed = this.safeJsonParse(jsonContent)
          if (parsed.schema_validation === 'pass') {
            console.log('松散格式JSON验证通过，创建可折叠组件')
            hasJsonBlock = true

            const jsonId = 'json-' + Math.random().toString(36).slice(2)
            const jsonHtml = this.createCollapsibleJson(jsonId, parsed)

            jsonBlocks.push({
              original: looseMatch[0],
              replacement: jsonHtml,
            })
          }
        } catch (e) {
          console.log('松散格式JSON解析失败:', e.message)
        }
      }
    }

    // 检查是否有Markdown内容（非JSON部分）
    let hasMarkdownContent = false
    let markdownContent = content

    if (jsonBlocks.length > 0) {
      // 移除JSON代码块，检查剩余内容
      jsonBlocks.forEach((block) => {
        markdownContent = markdownContent.replace(block.original, '')
      })

      // 清理并检查Markdown内容
      markdownContent = markdownContent.trim()
      hasMarkdownContent = markdownContent.length > 0

      console.log('检测到Markdown内容:', hasMarkdownContent)
      if (hasMarkdownContent) {
        console.log('Markdown内容预览:', markdownContent.substring(0, 200) + '...')
      }
    } else {
      // 没有JSON代码块，整个内容都是Markdown
      hasMarkdownContent = true
      console.log('整个内容作为Markdown处理')
    }

    // 替换所有JSON代码块
    jsonBlocks.forEach((block) => {
      processedContent = processedContent.replace(block.original, block.replacement)
    })

    // 使用marked渲染剩余的Markdown内容
    if (typeof marked !== 'undefined') {
      try {
        // 使用检测到的Markdown内容进行渲染
        if (hasMarkdownContent && markdownContent) {
          console.log('准备渲染Markdown内容:', markdownContent.substring(0, 200) + '...')
          const markdownHtml = marked.parse(markdownContent)
          console.log('Markdown渲染结果:', markdownHtml.substring(0, 200) + '...')

          // 将Markdown HTML插入到JSON组件之前
          if (markdownHtml.trim()) {
            processedContent = markdownHtml + processedContent
          }
        } else if (hasJsonBlock) {
          // 只有JSON，没有Markdown内容
          console.log('只有JSON内容，没有Markdown需要渲染')
        } else {
          // 没有JSON代码块，整个内容都是Markdown
          console.log('整个内容作为Markdown渲染')
          processedContent = marked.parse(processedContent)
        }
        console.log('Markdown渲染完成，最终结果长度:', processedContent.length)
        console.log('最终结果预览:', processedContent.substring(0, 300) + '...')
      } catch (e) {
        console.error('Markdown渲染失败:', e)
        // 如果Markdown渲染失败，至少确保换行符被正确处理
        processedContent = content.replace(/\n/g, '<br>')
      }
    } else {
      console.warn('marked库未加载，使用备用渲染')
      // 备用渲染：处理换行符和基本格式
      processedContent = content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
    }

    return processedContent
  }

  // 高亮代码块
  highlightCodeBlocks(container) {
    if (typeof Prism === 'undefined') return

    // 查找所有pre标签
    const preElements = container.querySelectorAll('pre')
    preElements.forEach((pre) => {
      // 查找code标签
      const codeElement = pre.querySelector('code')
      if (codeElement) {
        // 获取语言类型
        const className = codeElement.className
        const langMatch = className.match(/language-(\w+)/)
        const language = langMatch ? langMatch[1] : 'text'

        // 应用Prism.js高亮
        if (Prism.languages[language]) {
          codeElement.innerHTML = Prism.highlight(codeElement.textContent, Prism.languages[language], language)
        }
      }
    })
  }

  // 创建可折叠的JSON显示
  createCollapsibleJson(id, jsonData) {
    console.log('创建可折叠JSON组件，数据:', jsonData)

    // 处理不同类型的JSON结构
    let changes = []
    let changeCount = 0
    let riskLevels = []

    if (jsonData.change && Array.isArray(jsonData.change)) {
      // 标准格式：change数组
      changes = jsonData.change
      changeCount = changes.length
      riskLevels = [...new Set(changes.map((c) => c.risk_level || 'unknown'))]
    } else if (jsonData.change_id || jsonData.file_path) {
      // 单个改动项格式
      changes = [jsonData]
      changeCount = 1
      riskLevels = [jsonData.risk_level || 'unknown']
    } else {
      // 其他格式，尝试提取有用信息
      changes = []
      changeCount = 0
      riskLevels = []
    }

    let riskBadges = ''
    riskLevels.forEach((level) => {
      if (level && level !== 'unknown') {
        const color = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'
        riskBadges += `<span class="risk-badge ${color}">${level}</span>`
      }
    })

    // 如果没有风险等级，显示默认的
    if (!riskBadges) {
      riskBadges = '<span class="risk-badge success">low</span>'
    }

    // 检查schema验证状态
    const schemaStatus = jsonData.schema_validation === 'pass' ? 'success' : 'error'
    const schemaText = jsonData.schema_validation === 'pass' ? '✓ Schema验证通过' : '✗ Schema验证失败'

    return `
      <div class="json-collapsible" id="${id}">
        <div class="json-header" onclick="aiAgent.toggleJsonCollapse('${id}')">
          <div class="json-header-left">
            <i class="fas fa-chevron-right json-toggle-icon"></i>
            <span class="json-title">AI改动方案 (${changeCount} 项)</span>
            ${riskBadges}
          </div>
          <div class="json-header-right">
            <span class="json-status ${schemaStatus}">${schemaText}</span>
          </div>
        </div>
        <div class="json-content" style="display: none;">
          <div class="json-summary">
            <div class="json-summary-item">
              <strong>验证状态:</strong> 
              <span class="status-badge ${schemaStatus}">${jsonData.schema_validation || 'unknown'}</span>
            </div>
            <div class="json-summary-item">
              <strong>改动数量:</strong> ${changeCount}
            </div>
            <div class="json-summary-item">
              <strong>风险等级:</strong> ${riskLevels.filter((l) => l && l !== 'unknown').join(', ') || 'low'}
            </div>
          </div>
          <div class="json-changes">
            ${this.renderJsonChanges(changes)}
          </div>
        </div>
      </div>
    `
  }

  // 渲染JSON改动项
  renderJsonChanges(changes) {
    if (!Array.isArray(changes) || changes.length === 0) {
      return '<div class="no-changes">暂无改动详情</div>'
    }

    return changes
      .map((change, index) => {
        // 安全地获取字段值，提供默认值
        const changeId = change.change_id || change.id || `change-${index + 1}`
        const operation = change.operation || 'UNKNOWN'
        const filePath = change.file_path || change.path || '未知文件'
        const riskLevel = change.risk_level || 'low'
        const changeSummary = change.change_summary || change.summary || '无说明'
        const howToTest = change.how_to_test || change.test_steps || []
        const rollback = change.rollback || change.rollback_steps || []

        const operationColor =
          {
            CREATE: 'success',
            MODIFY: 'primary',
            DELETE: 'danger',
            RENAME: 'warning',
            UPDATE: 'info',
            ADD: 'success',
          }[operation.toUpperCase()] || 'secondary'

        return `
        <div class="json-change-item">
          <div class="change-header">
            <span class="change-id">#${changeId}</span>
            <span class="operation-badge ${operationColor}">${operation}</span>
            <span class="file-path" title="${filePath}">${filePath}</span>
            <span class="risk-level ${riskLevel}">${riskLevel}</span>
          </div>
          <div class="change-content">
            <div class="change-summary">${changeSummary}</div>
            ${
              Array.isArray(howToTest) && howToTest.length > 0
                ? `
              <div class="change-test">
                <strong>测试步骤:</strong>
                <ul>${howToTest.map((step) => `<li>${step}</li>`).join('')}</ul>
              </div>
            `
                : ''
            }
            ${
              Array.isArray(rollback) && rollback.length > 0
                ? `
              <div class="change-rollback">
                <strong>回滚步骤:</strong>
                <ul>${rollback.map((step) => `<li>${step}</li>`).join('')}</ul>
              </div>
            `
                : ''
            }
            ${
              change.author
                ? `
              <div class="change-author">
                <strong>作者:</strong> ${change.author}
              </div>
            `
                : ''
            }
            ${
              change.timestamp
                ? `
              <div class="change-timestamp">
                <strong>时间:</strong> ${new Date(change.timestamp).toLocaleString()}
              </div>
            `
                : ''
            }
          </div>
        </div>
      `
      })
      .join('')
  }

  // 切换JSON折叠状态
  toggleJsonCollapse(id) {
    const container = document.getElementById(id)
    if (!container) return

    const content = container.querySelector('.json-content')
    const icon = container.querySelector('.json-toggle-icon')

    if (content.style.display === 'none') {
      content.style.display = 'block'
      icon.classList.remove('fa-chevron-right')
      icon.classList.add('fa-chevron-down')
    } else {
      content.style.display = 'none'
      icon.classList.remove('fa-chevron-down')
      icon.classList.add('fa-chevron-right')
    }
  }

  // 实时处理并显示流式内容
  processAndDisplayStreamContent(container, content) {
    console.log('开始处理流式内容，长度:', content.length)

    // 分析内容结构
    const analysis = this.analyzeContent(content)
    console.log('内容分析结果:', analysis)

    // 智能更新内容，保持Markdown内容不变
    this.smartUpdateContent(container, analysis)
  }

  // 智能更新内容，保持Markdown内容不变
  smartUpdateContent(container, analysis) {
    console.log('智能更新内容，分析结果:', analysis)

    // 如果容器为空，直接渲染所有内容
    if (!container.innerHTML.trim()) {
      this.renderFullContent(container, analysis)
      return
    }

    // 智能累积更新：保持现有内容，添加新的Markdown，更新JSON状态
    this.smartAccumulateContent(container, analysis)
  }

  // 智能累积内容更新
  smartAccumulateContent(container, analysis) {
    console.log('智能累积内容更新')

    // 1. 智能处理Markdown内容（避免重复追加）
    if (analysis.markdownContent) {
      const existingMarkdown = container.querySelector('.markdown-summary')
      if (existingMarkdown) {
        // 检查是否已有相同内容，避免重复
        const existingText = existingMarkdown.textContent || ''
        const newText = analysis.markdownContent

        // 如果新内容是现有内容的扩展，则更新；否则替换
        if (newText.length > existingText.length && newText.startsWith(existingText)) {
          // 内容扩展，只添加新增部分
          const additionalContent = newText.substring(existingText.length)
          if (additionalContent.trim()) {
            const additionalHtml = this.renderMarkdownWithMarked(additionalContent)
            existingMarkdown.insertAdjacentHTML('beforeend', additionalHtml)
          }
        } else if (newText !== existingText) {
          // 内容不同，完全替换
          const newMarkdownHtml = this.renderMarkdownWithMarked(analysis.markdownContent)
          existingMarkdown.outerHTML = newMarkdownHtml
        }
      } else {
        // 如果没有Markdown内容，创建新的
        const markdownHtml = this.renderMarkdownWithMarked(analysis.markdownContent)
        container.insertAdjacentHTML('beforeend', markdownHtml)
      }
    }

    // 清理重复的Markdown内容
    this.cleanupDuplicateMarkdown(container)

    // 清理重复的JSON组件
    this.cleanupDuplicateJsonComponents(container)

    // 2. 处理JSON代码块
    if (analysis.jsonBlocks.length > 0) {
      analysis.jsonBlocks.forEach((block, index) => {
        if (block.isComplete) {
          // 完整的JSON代码块，转换为可折叠组件
          console.log('JSON代码块完整，创建可折叠组件')
          try {
            const parsed = this.safeJsonParse(block.content)

            // 检查是否已存在相同的JSON组件，避免重复
            const existingJson = this.findExistingJsonComponent(container, parsed)
            if (existingJson) {
              console.log('发现重复的JSON组件，跳过创建')
              return
            }

            const jsonId = 'json-' + Math.random().toString(36).slice(2)
            const jsonHtml = this.createCollapsibleJson(jsonId, parsed)

            // 查找对应的处理提示元素并替换
            const processingElement = container.querySelector(`[data-block-index="${index}"]`)
            if (processingElement) {
              processingElement.outerHTML = jsonHtml
            } else {
              // 如果没有找到对应的处理提示，直接添加到末尾
              container.insertAdjacentHTML('beforeend', jsonHtml)
            }
          } catch (e) {
            console.error('JSON解析失败:', e)
          }
        } else {
          // 不完整的JSON代码块，检查是否已有处理提示
          const existingProcessing = container.querySelector(`[data-block-index="${index}"]`)
          if (!existingProcessing) {
            // 如果没有处理提示，添加新的
            const processingHtml = `
              <div class="json-processing" data-block-index="${index}">
                <div class="json-processing-header">
                  <i class="fas fa-cog fa-spin"></i>
                  <span>正在处理代码...</span>
                </div>
                <div class="json-content">
                  <code>代码内容正在加载中...</code>
                </div>
              </div>
            `
            container.insertAdjacentHTML('beforeend', processingHtml)
          }
        }
      })
    }

    // 3. 处理未完成的JSON状态
    if (analysis.hasIncompleteJson) {
      const existingProcessing = container.querySelector('.json-processing:not([data-block-index])')
      if (!existingProcessing) {
        // 添加通用的处理提示
        const processingHtml = `
          <div class="json-processing">
            <div class="json-processing-header">
              <i class="fas fa-cog fa-spin"></i>
              <span>正在处理代码...</span>
            </div>
            <div class="json-processing-content">
              <code>检测到代码内容，正在等待完整数据...</code>
            </div>
          </div>
        `
        container.insertAdjacentHTML('beforeend', processingHtml)
      }
    } else {
      // 如果没有未完成的JSON，移除通用处理提示
      const generalProcessing = container.querySelector('.json-processing:not([data-block-index])')
      if (generalProcessing) {
        generalProcessing.remove()
      }
    }

    // 应用代码高亮
    this.highlightCodeBlocks(container)

    // 滚动到底部
    const chatMessages = document.querySelector('.chat-messages')
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  // 渲染完整内容
  renderFullContent(container, analysis) {
    let displayContent = ''

    // 处理Markdown内容（非JSON部分）
    if (analysis.markdownContent) {
      console.log('渲染Markdown内容:', analysis.markdownContent.substring(0, 100) + '...')
      const markdownHtml = this.renderMarkdownWithMarked(analysis.markdownContent)
      displayContent += markdownHtml
    }

    // 处理JSON代码块
    if (analysis.jsonBlocks.length > 0) {
      console.log('渲染JSON代码块，数量:', analysis.jsonBlocks.length)

      analysis.jsonBlocks.forEach((block, index) => {
        if (block.isComplete) {
          // 完整的JSON代码块，转换为可折叠组件
          console.log('JSON代码块完整，创建可折叠组件')
          try {
            const parsed = this.safeJsonParse(block.content)
            const jsonId = 'json-' + Math.random().toString(36).slice(2)
            const jsonHtml = this.createCollapsibleJson(jsonId, parsed)
            displayContent += jsonHtml
          } catch (e) {
            console.error('JSON解析失败:', e)
            // 如果解析失败，显示原始内容
            displayContent += `<pre><code class="language-json">${this.escapeHtml(block.content)}</code></pre>`
          }
        } else {
          // 不完整的JSON代码块，显示处理中提示
          console.log('JSON代码块不完整，显示处理中提示')
          const processingHtml = `
            <div class="json-processing" data-block-index="${index}">
              <div class="json-processing-header">
                <i class="fas fa-cog fa-spin"></i>
                <span>正在处理代码...</span>
              </div>
              <div class="json-processing-content">
                <code>代码内容正在加载中...</code>
              </div>
            </div>
          `
          displayContent += processingHtml
        }
      })
    }

    // 如果有未完成的JSON代码块，显示处理中提示
    if (analysis.hasIncompleteJson) {
      if (!container.querySelector('.json-processing')) {
        const processingHtml = `
          <div class="json-processing">
            <div class="json-processing-header">
              <i class="fas fa-cog fa-spin"></i>
              <span>正在处理代码...</span>
            </div>
            <div class="json-processing-content">
              <code>检测到代码内容，正在等待完整数据...</code>
            </div>
          </div>
        `
        displayContent += processingHtml
      }
    }

    // 更新容器内容
    if (displayContent) {
      container.innerHTML = displayContent

      // 应用代码高亮
      this.highlightCodeBlocks(container)

      // 滚动到底部
      const chatMessages = document.querySelector('.chat-messages')
      chatMessages.scrollTop = chatMessages.scrollHeight
    }
  }

  // 分析内容结构
  analyzeContent(content) {
    const result = {
      markdownContent: '',
      jsonBlocks: [],
      hasIncompleteJson: false,
    }

    // 查找所有代码块
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g
    let match
    let lastIndex = 0

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const blockStart = match.index
      const blockEnd = match.index + match[0].length

      // 提取代码块之前的Markdown内容
      if (blockStart > lastIndex) {
        const markdownPart = content.substring(lastIndex, blockStart).trim()
        if (markdownPart) {
          result.markdownContent += markdownPart + '\n\n'
        }
      }

      // 处理代码块
      const blockContent = match[1].trim()
      const isJsonBlock = match[0].includes('```json') || blockContent.startsWith('{')

      if (isJsonBlock) {
        // 检查JSON代码块是否完整
        const isComplete = this.isJsonBlockComplete(blockContent)
        result.jsonBlocks.push({
          content: blockContent,
          isComplete: isComplete,
          fullMatch: match[0],
          startIndex: blockStart,
          endIndex: blockEnd,
        })

        if (!isComplete) {
          result.hasIncompleteJson = true
        }
      } else {
        // 非JSON代码块，添加到Markdown内容
        result.markdownContent += match[0] + '\n\n'
      }

      lastIndex = blockEnd
    }

    // 添加剩余的Markdown内容（JSON代码块后面的内容）
    if (lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex).trim()
      if (remainingContent) {
        // 检查剩余内容是否包含未闭合的JSON代码块
        if (this.hasUnclosedJsonInContent(remainingContent)) {
          result.hasIncompleteJson = true
          // 不添加到Markdown内容，等待JSON完整
        } else {
          result.markdownContent += remainingContent
        }
      }
    }

    // 检查是否有未闭合的JSON代码块
    if (content.includes('```json') || content.includes('```{')) {
      const openBlocks = (content.match(/```(?:json)?\s*\{/g) || []).length
      const closeBlocks = (content.match(/```\s*$/gm) || []).length

      if (openBlocks > closeBlocks) {
        result.hasIncompleteJson = true
      }
    }

    return result
  }

  // 检查JSON代码块是否完整
  isJsonBlockComplete(content) {
    try {
      // 尝试解析JSON
      JSON.parse(content)
      return true
    } catch (e) {
      // 尝试修复后再次解析
      try {
        const fixedContent = this.fixCommonJsonIssues(content)
        JSON.parse(fixedContent)
        return true
      } catch (e2) {
        // 检查是否有明显的未闭合标记
        const openBraces = (content.match(/\{/g) || []).length
        const closeBraces = (content.match(/\}/g) || []).length
        const openBrackets = (content.match(/\[/g) || []).length
        const closeBrackets = (content.match(/\]/g) || []).length
        const quotes = (content.match(/"/g) || []).length

        // 如果括号和引号都匹配，可能是有效的JSON
        if (openBraces === closeBraces && openBrackets === closeBrackets && quotes % 2 === 0) {
          return true
        }

        return false
      }
    }
  }

  // 安全的JSON解析方法
  safeJsonParse(content) {
    try {
      // 首先尝试直接解析
      return JSON.parse(content)
    } catch (e) {
      console.log('JSON解析失败，尝试修复格式:', e.message)

      try {
        // 尝试修复常见问题后再次解析
        const fixedContent = this.fixCommonJsonIssues(content)
        return JSON.parse(fixedContent)
      } catch (e2) {
        console.log('修复后JSON解析仍然失败:', e2.message)

        // 最后尝试更激进的修复
        try {
          const aggressiveFixed = this.aggressiveJsonFix(content)
          return JSON.parse(aggressiveFixed)
        } catch (e3) {
          console.error('所有JSON修复尝试都失败了:', e3.message)
          throw new Error(`JSON解析失败: ${e.message}`)
        }
      }
    }
  }

  // 激进的JSON修复方法
  aggressiveJsonFix(content) {
    let fixed = content

    // 1. 修复所有属性名缺少双引号的问题
    fixed = fixed.replace(/(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):/g, '$1"$2"$3:')

    // 2. 修复所有字符串值缺少双引号的问题
    fixed = fixed.replace(/:\s*([^"][^,\s{}[\]]+[^,\s{}[\]]*)\s*([,}\s])/g, ': "$1"$2')

    // 3. 修复布尔值和数字
    fixed = fixed.replace(/:\s*(true|false|null)\s*([,}\s])/g, ': $1$2')
    fixed = fixed.replace(/:\s*(\d+\.?\d*)\s*([,}\s])/g, ': $1$2')

    // 4. 修复数组中的值
    fixed = fixed.replace(/\[\s*([^"][^,\s[\]]+[^,\s[\]]*)\s*([,]\s*|$)/g, '["$1"$2')

    // 5. 修复嵌套对象
    fixed = fixed.replace(/:\s*{\s*([^}]*)\s*}/g, (match, inner) => {
      const fixedInner = inner.replace(/(\w+):/g, '"$1":')
      return `: {${fixedInner}}`
    })

    return fixed
  }

  // 清理重复的Markdown内容
  cleanupDuplicateMarkdown(container) {
    const markdownElements = container.querySelectorAll('.markdown-summary')
    if (markdownElements.length <= 1) return

    console.log('检测到重复的Markdown元素，开始清理...')

    // 保留第一个，移除其他的
    for (let i = 1; i < markdownElements.length; i++) {
      markdownElements[i].remove()
    }

    console.log('重复Markdown元素清理完成')
  }

  // 查找已存在的JSON组件，避免重复
  findExistingJsonComponent(container, parsedJson) {
    const existingComponents = container.querySelectorAll('.json-collapsible')

    for (const component of existingComponents) {
      try {
        // 提取组件中的关键信息进行比较
        const titleElement = component.querySelector('.json-title')
        if (titleElement) {
          const title = titleElement.textContent

          // 比较关键字段
          if (this.isSameJsonContent(parsedJson, title)) {
            return component
          }
        }
      } catch (e) {
        console.error('检查JSON组件时出错:', e)
      }
    }

    return null
  }

  // 比较JSON内容是否相同
  isSameJsonContent(newJson, existingTitle) {
    try {
      // 从标题中提取改动数量
      const titleMatch = existingTitle.match(/AI改动方案\s*\((\d+)\s*项\)/)
      if (titleMatch) {
        const existingCount = parseInt(titleMatch[1])
        const newCount = newJson.change ? newJson.change.length : 1

        // 如果改动数量相同，进一步比较内容
        if (existingCount === newCount) {
          // 比较关键字段
          if (newJson.change && Array.isArray(newJson.change)) {
            const newSummary = newJson.change[0]?.change_summary || ''
            const newFilePath = newJson.change[0]?.file_path || ''

            // 更精确的比较：检查文件路径和摘要
            const hasSameFile = existingTitle.includes(newFilePath.split('/').pop() || '')
            const hasSameSummary = existingTitle.includes(newSummary.substring(0, 30))

            return hasSameFile && hasSameSummary
          }
        }
      }

      return false
    } catch (e) {
      console.error('比较JSON内容时出错:', e)
      return false
    }
  }

  // 清理重复的JSON组件
  cleanupDuplicateJsonComponents(container) {
    const jsonComponents = container.querySelectorAll('.json-collapsible')
    if (jsonComponents.length <= 1) return

    console.log('检测到重复的JSON组件，开始清理...')

    // 使用更精确的内容比较来检测重复
    const toRemove = []

    for (let i = 0; i < jsonComponents.length; i++) {
      for (let j = i + 1; j < jsonComponents.length; j++) {
        const component1 = jsonComponents[i]
        const component2 = jsonComponents[j]

        if (this.areJsonComponentsIdentical(component1, component2)) {
          console.log(`发现重复组件: 组件 ${i} 和组件 ${j} 内容相同`)
          toRemove.push(component2)
        }
      }
    }

    // 移除重复的组件
    toRemove.forEach((component) => {
      component.remove()
      console.log('移除重复的JSON组件')
    })

    console.log(`重复JSON组件清理完成，移除了 ${toRemove.length} 个重复组件`)
  }

  // 检查两个JSON组件是否完全相同
  areJsonComponentsIdentical(component1, component2) {
    try {
      const title1 = component1.querySelector('.json-title')?.textContent || ''
      const title2 = component2.querySelector('.json-title')?.textContent || ''

      // 比较标题
      if (title1 !== title2) return false

      // 比较风险等级
      const risk1 = component1.querySelector('.risk-badge')?.textContent || ''
      const risk2 = component2.querySelector('.risk-badge')?.textContent || ''
      if (risk1 !== risk2) return false

      // 比较验证状态
      const status1 = component1.querySelector('.json-status')?.textContent || ''
      const status2 = component2.querySelector('.json-status')?.textContent || ''
      if (status1 !== status2) return false

      // 如果所有关键信息都相同，认为是重复组件
      return true
    } catch (e) {
      console.error('比较JSON组件时出错:', e)
      return false
    }
  }

  // 生成JSON内容的关键标识
  generateJsonContentKey(title) {
    // 提取标题中的关键信息作为标识
    const match = title.match(/AI改动方案\s*\((\d+)\s*项\)/)
    if (match) {
      return `changes_${match[1]}`
    }
    return title
  }

  // 生成更精确的JSON内容标识
  generateDetailedJsonKey(jsonData) {
    try {
      if (jsonData.change && Array.isArray(jsonData.change)) {
        const firstChange = jsonData.change[0]
        const filePath = firstChange.file_path || ''
        const summary = firstChange.change_summary || ''
        const operation = firstChange.operation || ''

        // 基于文件路径、操作类型和摘要生成唯一标识
        const fileName = filePath.split('/').pop() || ''
        const summaryHash = summary.substring(0, 50).replace(/\s+/g, '_')

        return `${operation}_${fileName}_${summaryHash}`
      }

      // 如果没有change数组，使用其他字段
      if (jsonData.file_path) {
        const fileName = jsonData.file_path.split('/').pop() || ''
        const operation = jsonData.operation || 'UNKNOWN'
        return `${operation}_${fileName}`
      }

      return `json_${Date.now()}`
    } catch (e) {
      console.error('生成详细JSON标识时出错:', e)
      return `json_${Date.now()}`
    }
  }

  // 检查内容中是否有未闭合的JSON
  hasUnclosedJsonInContent(content) {
    // 检查是否有开始但没有结束的JSON代码块
    const hasJsonStart = content.includes('```json') || content.includes('```{')
    const hasJsonEnd = content.includes('```')

    if (hasJsonStart && !hasJsonEnd) {
      return true
    }

    // 检查是否有未闭合的大括号或引号
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    const openBrackets = (content.match(/\[/g) || []).length
    const closeBrackets = (content.match(/\]/g) || []).length
    const quotes = (content.match(/"/g) || []).length

    return openBraces !== closeBraces || openBrackets !== closeBrackets || quotes % 2 !== 0
  }

  // ==================== IFRAME TAB 管理方法 ====================

  /**
   * 创建iframe类型的tab
   * @param {string} tabId - tab的唯一标识
   * @param {string} tabName - tab显示名称
   * @param {string} iframeSrc - iframe的源地址
   * @param {Object} options - 可选配置项
   */
  createIframeTab(tabId, tabName, iframeSrc, options = {}) {
    console.log(`创建iframe tab: ${tabName} (${tabId})`)

    // 检查是否已经存在该tab
    if (this.openTabs.has(tabId)) {
      this.switchTab(tabId)
      return
    }

    // 默认配置
    const defaultOptions = {
      width: '100%',
      height: '100%',
      allowFullscreen: true,
      sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals',
      ...options,
    }

    // 创建新标签页
    const tabsContainer = document.querySelector('.editor-tabs')
    const tab = document.createElement('div')
    tab.className = 'tab'
    tab.setAttribute('data-file', tabId)
    tab.innerHTML = `
      <span class="tab-name">${tabName}</span>
      <button class="close-tab" data-file="${tabId}">
        <i class="fas fa-times"></i>
      </button>
    `

    // 绑定关闭事件
    tab.querySelector('.close-tab').addEventListener('click', (e) => {
      e.stopPropagation()
      this.closeIframeTab(tabId)
    })

    // 绑定切换事件
    tab.addEventListener('click', () => this.switchTab(tabId))

    // 绑定双击事件 - 刷新iframe内容
    tab.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      console.log(`双击刷新iframe tab: ${tabName}`)
      this.refreshIframeTab(tabId)
    })

    tabsContainer.appendChild(tab)

    // 保存tab信息
    this.openTabs.set(tabId, {
      fileName: tabName,
      content: '',
      isIframe: true,
      iframeSrc: iframeSrc,
      iframeOptions: defaultOptions,
      iframeElement: null, // 保存iframe元素引用
      loadingElement: null, // 保存加载指示器引用
    })

    // 切换到新标签页
    this.switchTab(tabId)
  }

  /**
   * 关闭iframe类型的tab
   * @param {string} tabId - tab的唯一标识
   */
  closeIframeTab(tabId) {
    console.log(`关闭iframe tab: ${tabId}`)
    this.closeTab(tabId)
  }

  /**
   * 刷新iframe tab内容（双击时调用）
   * @param {string} tabId - tab的唯一标识
   */
  refreshIframeTab(tabId) {
    console.log(`刷新iframe tab: ${tabId}`)

    const tabData = this.openTabs.get(tabId)
    if (!tabData || !tabData.isIframe) {
      console.error('找不到iframe tab数据:', tabId)
      return
    }

    // 强制重新加载iframe
    this.createOrUpdateIframeEditor(tabId, tabData.iframeSrc, tabData.iframeOptions, true)

    // 显示刷新提示
    this.showToast('Mock管理页面已刷新', 'success')
  }

  /**
   * 隐藏所有iframe
   */
  hideAllIframes() {
    const editorContainer = document.getElementById('monaco-editor')
    if (!editorContainer) return

    // 在编辑器容器中查找iframe
    const iframes = editorContainer.querySelectorAll('iframe')
    iframes.forEach((iframe) => {
      iframe.style.visibility = 'hidden'
    })

    // 隐藏所有加载指示器
    const loadingElements = editorContainer.querySelectorAll('.iframe-loading')
    loadingElements.forEach((loading) => {
      loading.style.visibility = 'hidden'
    })

    console.log('所有iframe已隐藏，数量:', iframes.length)
  }

  /**
   * 调试iframe状态
   * @param {string} tabId - tab的唯一标识
   */
  debugIframeState(tabId) {
    const tabData = this.openTabs.get(tabId)
    if (!tabData) {
      console.log('找不到tab数据:', tabId)
      return
    }

    console.log('=== iframe状态调试信息 ===')
    console.log('Tab ID:', tabId)
    console.log('Tab数据:', tabData)
    console.log('iframe元素:', tabData.iframeElement)
    console.log('加载指示器:', tabData.loadingElement)

    if (tabData.iframeElement) {
      console.log('iframe src:', tabData.iframeElement.src)
      console.log('iframe visibility:', tabData.iframeElement.style.visibility)
      console.log('iframe contentWindow:', tabData.iframeElement.contentWindow)
      console.log('iframe contentDocument:', tabData.iframeElement.contentDocument)
      console.log('iframe在容器中:', document.getElementById('monaco-editor').contains(tabData.iframeElement))
    }

    const editorContainer = document.getElementById('monaco-editor')
    if (editorContainer) {
      const iframes = editorContainer.querySelectorAll('iframe')
      console.log('容器中的iframe数量:', iframes.length)
      iframes.forEach((iframe, index) => {
        console.log(`iframe ${index}:`, iframe)
        console.log(`iframe ${index} visibility:`, iframe.style.visibility)
        console.log(`iframe ${index} src:`, iframe.src)
        console.log(`iframe ${index} 是否匹配当前tab:`, iframe === tabData.iframeElement)
      })
    }

    console.log('=== 调试信息结束 ===')
  }

  /**
   * 创建或更新iframe编辑器（支持缓存，避免重复加载）
   * @param {string} tabId - tab的唯一标识
   * @param {string} iframeSrc - iframe的源地址
   * @param {Object} options - iframe配置选项
   * @param {boolean} forceReload - 是否强制重新加载
   */
  createOrUpdateIframeEditor(tabId, iframeSrc, options = {}, forceReload = false) {
    console.log(`创建或更新iframe编辑器: ${tabId}, 强制重载: ${forceReload}`)

    // 销毁当前编辑器
    if (this.editor) {
      this.editor.dispose()
      this.editor = null
    }

    // 获取编辑器容器
    const editorContainer = document.getElementById('monaco-editor')
    if (!editorContainer) {
      console.error('找不到编辑器容器')
      return
    }

    // 获取tab数据
    const tabData = this.openTabs.get(tabId)
    if (!tabData) {
      console.error('找不到tab数据:', tabId)
      return
    }

    // 如果已有iframe且不需要强制重载，直接显示
    if (!forceReload && tabData.iframeElement) {
      console.log('使用现有iframe，直接显示')

      // 检查iframe是否在编辑器容器中
      if (!editorContainer.contains(tabData.iframeElement)) {
        console.log('iframe不在编辑器容器中，重新添加')
        editorContainer.appendChild(tabData.iframeElement)
        if (tabData.loadingElement) {
          editorContainer.appendChild(tabData.loadingElement)
        }
      }

      // 隐藏所有其他iframe
      this.hideAllIframes()

      // 显示当前iframe
      tabData.iframeElement.style.visibility = 'visible'

      if (tabData.loadingElement) {
        tabData.loadingElement.style.visibility = 'hidden'
      }

      console.log('iframe已显示:', tabData.iframeElement.style.visibility)
      return
    }

    // 需要创建新iframe或强制重载
    if (forceReload && tabData.iframeElement) {
      console.log('强制重载，移除旧iframe')
      tabData.iframeElement.remove()
      tabData.iframeElement = null
      if (tabData.loadingElement) {
        tabData.loadingElement.remove()
        tabData.loadingElement = null
      }
    }

    // 隐藏所有现有iframe
    this.hideAllIframes()

    // 创建新iframe
    const iframe = document.createElement('iframe')
    iframe.src = iframeSrc
    iframe.style.width = options.width || '100%'
    iframe.style.height = options.height || '100%'
    iframe.style.border = 'none'
    iframe.style.borderRadius = '4px'
    iframe.style.position = 'absolute'
    iframe.style.top = '0'
    iframe.style.left = '0'
    iframe.style.zIndex = '10'
    iframe.allowFullscreen = options.allowFullscreen !== false
    iframe.sandbox = options.sandbox || 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals'

    // 确保iframe相对于编辑器容器定位
    if (editorContainer) {
      editorContainer.style.position = 'relative'
    }

    // 创建加载指示器
    const loadingDiv = document.createElement('div')
    loadingDiv.className = 'iframe-loading'
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <div>正在加载 ${iframeSrc}...</div>
    `
    loadingDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--text-secondary);
      z-index: 20;
    `

    // 将iframe添加到编辑器容器内，使用绝对定位覆盖编辑器
    editorContainer.appendChild(loadingDiv)
    editorContainer.appendChild(iframe)

    // 保存引用
    tabData.iframeElement = iframe
    tabData.loadingElement = loadingDiv

    // 确保iframe可见
    iframe.style.visibility = 'visible'

    // iframe加载完成
    iframe.onload = () => {
      loadingDiv.style.visibility = 'hidden'
      console.log('iframe加载完成:', iframeSrc)
    }

    // 设置编辑器引用为null
    this.editor = null
    console.log('iframe编辑器创建成功')
  }
}

// 初始化应用
const aiAgent = new AIAgentManager()

// 添加到全局对象，供HTML事件处理使用
window.aiAgent = aiAgent

// 全局函数，用于其他地方调用
window.sendTerminalCommand = function (command) {
  if (aiAgent && aiAgent.sendCommandToTerminal) {
    aiAgent.sendCommandToTerminal(command)
  } else {
    console.error('aiAgent未初始化或sendCommandToTerminal方法不存在')
  }
}
