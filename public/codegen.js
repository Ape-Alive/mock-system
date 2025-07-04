// 代码生成器功能
class CodeGenerator {
  constructor() {
    this.initElements()
    this.bindEvents()
    this.loadOptions()
    this.currentFormData = null
    this.currentDependencies = []
    this.previewSize = 'desktop'
    this.codeTheme = 'light'
    this.showLineNumbers = false
    this.initPreviewFeatures()
    this.allMockItems = []
    this.filteredMockItems = []
    this.currentGroup = window.currentGroup || { id: 0, name: '全部', fileNames: null }
    // 绑定代码预览模态框关闭按钮事件
    setTimeout(() => {
      const previewCloseButtons = document.querySelectorAll('#code-preview-modal .close')
      previewCloseButtons.forEach(btn => {
        btn.onclick = () => this.closePreviewModal()
      })
    }, 0)
  }

  initElements() {
    this.modal = document.getElementById('code-generator-modal')
    this.previewModal = document.getElementById('code-preview-modal')
    this.form = document.getElementById('code-generator-form')
    this.techStackSelect = document.getElementById('tech-stack')
    this.outputTypeSelect = document.getElementById('output-type')
    this.uiLibrarySelect = document.getElementById('ui-library')
    this.customLibraryGroup = document.getElementById('custom-library-group')
    this.customLibraryInput = document.getElementById('custom-library')
    this.interfaceSelector = document.getElementById('interface-selector')
    this.pageStructureInput = document.getElementById('page-structure')
    this.pageLogicInput = document.getElementById('page-logic')
    this.generatedCode = document.getElementById('generated-code')
    this.previewFrame = document.getElementById('code-preview-frame')
    this.downloadBtn = document.getElementById('download-code')
    this.closeButtons = document.querySelectorAll('#code-generator-modal .close')
    this.previewCloseButtons = document.querySelectorAll('#code-preview-modal .close')

    // 新增元素
    this.statusIndicator = document.querySelector('.status-indicator')
    this.statusText = document.querySelector('.status-text')
    this.previewLoading = document.getElementById('preview-loading')
    this.previewError = document.getElementById('preview-error')
    this.retryPreviewBtn = document.getElementById('retry-preview')
    this.dependenciesContent = document.getElementById('dependencies-content')
    this.codeCount = document.getElementById('code-count')
    this.depsCount = document.getElementById('deps-count')
    this.fullscreenToggleBtn = document.querySelector('#code-preview-modal .fullscreen-toggle')
  }

  initPreviewFeatures() {
    // 初始化预览尺寸控制
    this.initPreviewSizeControls()

    // 初始化代码工具栏
    this.initCodeToolbar()

    // 初始化依赖管理
    this.initDependencies()

    // 初始化搜索功能
    this.initSearchFeature()
  }

  initPreviewSizeControls() {
    const sizeButtons = document.querySelectorAll('.preview-size-btn')
    sizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = btn.getAttribute('data-size')
        this.setPreviewSize(size)

        // 更新按钮状态
        sizeButtons.forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })
  }

  setPreviewSize(size) {
    this.previewSize = size
    const frame = this.previewFrame

    switch (size) {
      case 'mobile':
        frame.style.width = '375px'
        frame.style.margin = '0 auto'
        frame.style.border = '2px solid #ddd'
        frame.style.borderRadius = '20px'
        break
      case 'tablet':
        frame.style.width = '768px'
        frame.style.margin = '0 auto'
        frame.style.border = '2px solid #ddd'
        frame.style.borderRadius = '10px'
        break
      case 'desktop':
      default:
        frame.style.width = '100%'
        frame.style.margin = '0'
        frame.style.border = 'none'
        frame.style.borderRadius = '0'
        break
    }
  }

  initCodeToolbar() {
    // 复制全部代码
    document.getElementById('copy-all-code').addEventListener('click', () => {
      this.copyAllCode()
    })

    // 格式化代码
    document.getElementById('format-code').addEventListener('click', () => {
      this.formatCode()
    })

    // 切换行号
    document.getElementById('toggle-line-numbers').addEventListener('click', () => {
      this.toggleLineNumbers()
    })

    // 切换主题
    document.getElementById('toggle-theme').addEventListener('click', () => {
      this.toggleCodeTheme()
    })

    // 搜索代码
    document.getElementById('search-code').addEventListener('click', () => {
      this.showSearchDialog()
    })
  }

  initDependencies() {
    // 复制依赖
    document.getElementById('copy-dependencies').addEventListener('click', () => {
      this.copyDependencies()
    })

    // 安装指南
    document.getElementById('install-dependencies').addEventListener('click', () => {
      this.showInstallGuide()
    })
  }

  initSearchFeature() {
    // 搜索功能将在showSearchDialog中实现
  }

  copyAllCode() {
    const codeBlocks = this.generatedCode.querySelectorAll('code')
    let allCode = ''

    codeBlocks.forEach((block, index) => {
      const fileName = block.getAttribute('data-filename') || `file${index + 1}`
      allCode += `// ${fileName}\n${block.textContent}\n\n`
    })

    navigator.clipboard
      .writeText(allCode)
      .then(() => {
        this.showToast('所有代码已复制到剪贴板', 'success')
      })
      .catch(() => {
        this.showToast('复制失败，请手动复制', 'error')
      })
  }

  formatCode() {
    const codeBlocks = this.generatedCode.querySelectorAll('code')
    codeBlocks.forEach((block) => {
      const code = block.textContent
      const language = block.getAttribute('data-language')

      try {
        let formattedCode = code
        if (language === 'javascript' || language === 'js') {
          formattedCode = this.formatJavaScript(code)
        } else if (language === 'html') {
          formattedCode = this.formatHTML(code)
        } else if (language === 'css') {
          formattedCode = this.formatCSS(code)
        }

        block.textContent = formattedCode
        this.showToast('代码格式化完成', 'success')
      } catch (error) {
        this.showToast('格式化失败', 'error')
      }
    })
  }

  formatJavaScript(code) {
    // 简单的JavaScript格式化
    return code
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/\s*}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*\n/g, '\n')
  }

  formatHTML(code) {
    // 简单的HTML格式化
    return code.replace(/>\s*</g, '>\n<').replace(/\n\s*\n/g, '\n')
  }

  formatCSS(code) {
    // 简单的CSS格式化
    return code
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/\s*}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
  }

  toggleLineNumbers() {
    this.showLineNumbers = !this.showLineNumbers
    const btn = document.getElementById('toggle-line-numbers')

    if (this.showLineNumbers) {
      btn.classList.add('active')
      this.addLineNumbers()
    } else {
      btn.classList.remove('active')
      this.removeLineNumbers()
    }
  }

  addLineNumbers() {
    const codeBlocks = this.generatedCode.querySelectorAll('code')
    codeBlocks.forEach((block) => {
      if (!block.classList.contains('with-line-numbers')) {
        const lines = block.textContent.split('\n')
        const numberedLines = lines
          .map((line, index) => `<span class="line-number">${index + 1}</span>${line}`)
          .join('\n')

        block.innerHTML = numberedLines
        block.classList.add('with-line-numbers')
      }
    })
  }

  removeLineNumbers() {
    const codeBlocks = this.generatedCode.querySelectorAll('code.with-line-numbers')
    codeBlocks.forEach((block) => {
      const lines = block.textContent.split('\n')
      const cleanLines = lines.map((line) => line.replace(/^\d+\s*/, '')).join('\n')

      block.textContent = cleanLines
      block.classList.remove('with-line-numbers')
    })
  }

  toggleCodeTheme() {
    this.codeTheme = this.codeTheme === 'light' ? 'dark' : 'light'
    const btn = document.getElementById('toggle-theme')

    if (this.codeTheme === 'dark') {
      btn.classList.add('active')
      this.generatedCode.classList.add('dark-theme')
    } else {
      btn.classList.remove('active')
      this.generatedCode.classList.remove('dark-theme')
    }
  }

  showSearchDialog() {
    const searchTerm = prompt('请输入搜索关键词：')
    if (searchTerm) {
      this.searchInCode(searchTerm)
    }
  }

  searchInCode(searchTerm) {
    const codeBlocks = this.generatedCode.querySelectorAll('code')
    let found = false

    codeBlocks.forEach((block) => {
      const code = block.textContent
      const regex = new RegExp(searchTerm, 'gi')

      if (regex.test(code)) {
        found = true
        block.style.backgroundColor = '#fff3cd'
        block.style.border = '2px solid #ffc107'

        // 3秒后恢复原样
        setTimeout(() => {
          block.style.backgroundColor = ''
          block.style.border = ''
        }, 3000)
      }
    })

    if (found) {
      this.showToast(`找到包含"${searchTerm}"的代码块`, 'success')
    } else {
      this.showToast(`未找到包含"${searchTerm}"的代码`, 'warning')
    }
  }

  copyDependencies() {
    if (this.currentDependencies.length === 0) {
      this.showToast('没有依赖项可复制', 'warning')
      return
    }

    const depsText = this.currentDependencies.join('\n')
    navigator.clipboard
      .writeText(depsText)
      .then(() => {
        this.showToast('依赖列表已复制到剪贴板', 'success')
      })
      .catch(() => {
        this.showToast('复制失败，请手动复制', 'error')
      })
  }

  showInstallGuide() {
    if (!this.currentFormData) {
      this.showToast('没有项目信息', 'warning')
      return
    }

    const techStack = this.currentFormData.techStack
    let guide = ''

    switch (techStack) {
      case 'vue2':
      case 'vue3':
        guide = `# Vue项目安装指南\n\n1. 创建项目：\nvue create my-project\n\n2. 安装依赖：\nnpm install ${this.currentDependencies.join(
          ' '
        )}\n\n3. 运行项目：\nnpm run serve`
        break
      case 'react':
        guide = `# React项目安装指南\n\n1. 创建项目：\nnpx create-react-app my-project\n\n2. 安装依赖：\nnpm install ${this.currentDependencies.join(
          ' '
        )}\n\n3. 运行项目：\nnpm start`
        break
      case 'flutter':
        guide = `# Flutter项目安装指南\n\n1. 创建项目：\nflutter create my_project\n\n2. 在pubspec.yaml中添加依赖：\n${this.currentDependencies
          .map((dep) => `  ${dep}`)
          .join('\n')}\n\n3. 运行项目：\nflutter run`
        break
      default:
        guide = `# 项目安装指南\n\n请根据您的技术栈安装以下依赖：\n${this.currentDependencies.join('\n')}`
    }

    this.showInstallGuideModal(guide)
  }

  showInstallGuideModal(guide) {
    const modal = document.createElement('div')
    modal.className = 'modal active'
    modal.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h3>安装指南</h3>
          <button class="btn-icon close">&times;</button>
        </div>
        <div class="modal-body">
          <pre style="background: #f8f9fa; padding: 16px; border-radius: 4px; white-space: pre-wrap;">${guide}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn secondary close">关闭</button>
          <button class="btn primary" id="copy-guide">复制指南</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // 绑定事件
    modal.querySelectorAll('.close').forEach((btn) => {
      btn.addEventListener('click', () => modal.remove())
    })

    modal.querySelector('#copy-guide').addEventListener('click', () => {
      navigator.clipboard.writeText(guide).then(() => {
        this.showToast('安装指南已复制', 'success')
      })
    })
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `

    // 根据类型设置颜色
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#28a745'
        break
      case 'error':
        toast.style.backgroundColor = '#dc3545'
        break
      case 'warning':
        toast.style.backgroundColor = '#ffc107'
        toast.style.color = '#212529'
        break
      default:
        toast.style.backgroundColor = '#17a2b8'
    }

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  updateStatus(status, type = 'ready') {
    this.statusText.textContent = status

    this.statusIndicator.className = 'status-indicator'
    if (type === 'loading') {
      this.statusIndicator.classList.add('loading')
    } else if (type === 'error') {
      this.statusIndicator.classList.add('error')
    }
  }

  updateCounts() {
    // 计算代码块数量 - 修复选择器
    const codeBlocks = this.generatedCode.querySelectorAll('.code-block')
    if (this.codeCount) {
      this.codeCount.textContent = codeBlocks.length
    }

    // 更新依赖数量
    if (this.depsCount) {
      this.depsCount.textContent = this.currentDependencies ? this.currentDependencies.length : 0
    }

    console.log('代码块数量:', codeBlocks.length)
    console.log('依赖数量:', this.currentDependencies ? this.currentDependencies.length : 0)
  }

  renderDependencies() {
    if (!this.currentDependencies.length) {
      this.dependenciesContent.innerHTML = '<p>暂无依赖项</p>'
      return
    }

    const depsList = this.currentDependencies
      .map((dep) => {
        const [name, version] = dep.split('@')
        return `
        <div class="dependency-item">
          <div class="dependency-info">
            <span class="dependency-name">${name}</span>
            <span class="dependency-version">${version || 'latest'}</span>
          </div>
          <button class="tool-btn" onclick="copyToClipboard('${dep}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      `
      })
      .join('')

    this.dependenciesContent.innerHTML = `
      <div class="dependencies-list">
        ${depsList}
      </div>
    `
  }

  bindEvents() {
    document.getElementById('code-generator-btn').addEventListener('click', async () => {
      // 1. 检查是否有初始工作目录
      const res = await fetch('/api/file/directory')
      const data = await res.json()
      if (!data.success || !data.data.directory) {
        // 没有设置目录，弹出选择目录弹窗
        this.showSelectDirectoryModal()
        return
      }
      // 有目录，正常打开生成器弹窗
      this.openModal()
    })

    // 绑定代码生成模态框的关闭按钮
    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.closeModal())
    })

    // 绑定代码预览模态框的关闭按钮
    this.previewCloseButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.closePreviewModal())
    })

    this.techStackSelect.addEventListener('change', () => {
      this.onTechStackChange()
    })
    this.uiLibrarySelect.addEventListener('change', () => {
      this.onUILibraryChange()
    })
    this.form.addEventListener('submit', (e) => {
      e.preventDefault()
      this.generateCode()
    })
    this.downloadBtn.addEventListener('click', () => {
      this.downloadCode()
    })

    // 绑定新的预览功能事件
    this.bindPreviewEvents()
  }

  bindPreviewEvents() {
    // 预览尺寸控制
    const sizeButtons = document.querySelectorAll('.preview-size-btn')
    sizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = btn.getAttribute('data-size')
        this.setPreviewSize(size)

        // 更新按钮状态
        sizeButtons.forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })

    // 代码工具栏
    const copyAllBtn = document.getElementById('copy-all-code')
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => this.copyAllCode())
    }

    const formatBtn = document.getElementById('format-code')
    if (formatBtn) {
      formatBtn.addEventListener('click', () => this.formatCode())
    }

    const lineNumbersBtn = document.getElementById('toggle-line-numbers')
    if (lineNumbersBtn) {
      lineNumbersBtn.addEventListener('click', () => this.toggleLineNumbers())
    }

    const themeBtn = document.getElementById('toggle-theme')
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleCodeTheme())
    }

    const searchBtn = document.getElementById('search-code')
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.showSearchDialog())
    }

    // 预览工具栏
    const refreshBtn = document.getElementById('refresh-preview')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshPreview())
    }

    const newTabBtn = document.getElementById('open-preview-new-tab')
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => this.openPreviewInNewTab())
    }

    // 依赖管理
    const copyDepsBtn = document.getElementById('copy-dependencies')
    if (copyDepsBtn) {
      copyDepsBtn.addEventListener('click', () => this.copyDependencies())
    }

    const installBtn = document.getElementById('install-dependencies')
    if (installBtn) {
      installBtn.addEventListener('click', () => this.showInstallGuide())
    }

    // 重试预览
    const retryBtn = document.getElementById('retry-preview')
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryPreview())
    }
  }

  async loadOptions() {
    try {
      const response = await fetch('/api/codegen/options')
      const data = await response.json()
      if (data.success) {
        this.techStackSelect.innerHTML = '<option value="">请选择技术类型</option>'
        data.data.techStackOptions.forEach((option) => {
          const optionElement = document.createElement('option')
          optionElement.value = option.value
          optionElement.textContent = option.label
          this.techStackSelect.appendChild(optionElement)
        })
      }
    } catch (error) {
      console.error('加载选项失败:', error)
    }
  }

  async onTechStackChange() {
    const techStack = this.techStackSelect.value
    this.uiLibrarySelect.innerHTML = '<option value="">无</option>'
    if (techStack) {
      try {
        const response = await fetch(`/api/codegen/ui-libraries/${techStack}`)
        const data = await response.json()
        if (data.success) {
          data.data.uiLibraryOptions.forEach((option) => {
            const optionElement = document.createElement('option')
            optionElement.value = option.value
            optionElement.textContent = option.label
            this.uiLibrarySelect.appendChild(optionElement)
          })
        }
      } catch (error) {
        console.error('加载UI库选项失败:', error)
      }
    }
  }

  onUILibraryChange() {
    const uiLibrary = this.uiLibrarySelect.value
    if (uiLibrary === 'custom') {
      this.customLibraryGroup.style.display = 'block'
    } else {
      this.customLibraryGroup.style.display = 'none'
      this.customLibraryInput.value = ''
    }
  }

  async openModal() {
    // 检查本地目录是否已设置
    const fileManager = window.fileManager
    if (!fileManager || !fileManager.checkLocalDirectory()) {
      return // 如果本地目录未设置，fileManager会显示设置弹窗
    }

    await this.renderLocalDirectoryTree()
    await this.loadInterfaceList()
    this.bindInterfaceSearch()
    setTimeout(() => this.syncSelectAllCheckbox(), 0)
    this.modal.classList.add('active')
    this.addInsertButtonToCodeBlocks()
  }

  closeModal() {
    this.modal.classList.remove('active')
    this.form.reset()
    this.customLibraryGroup.style.display = 'none'
  }

  closePreviewModal() {
    this.previewModal.classList.remove('active')
    this.previewModal.classList.remove('fullscreen') // 修复：关闭时移除全屏状态
    // 还原全屏按钮图标
    if (this.fullscreenToggleBtn) {
      const icon = this.fullscreenToggleBtn.querySelector('i')
      icon.classList.remove('fa-compress')
      icon.classList.add('fa-expand')
      this.fullscreenToggleBtn.title = '全屏预览'
    }
  }

  openPreviewModal() {
    this.previewModal.classList.add('active')
    // 默认最大化（全屏）
    if (!this.previewModal.classList.contains('fullscreen')) {
      this.previewModal.classList.add('fullscreen')
      if (this.fullscreenToggleBtn) {
        const icon = this.fullscreenToggleBtn.querySelector('i')
        icon.classList.remove('fa-expand')
        icon.classList.add('fa-compress')
        this.fullscreenToggleBtn.title = '还原窗口'
      }
    }
    // 绑定全屏按钮事件（只绑定一次）
    if (this.fullscreenToggleBtn && !this.fullscreenToggleBtn._bound) {
      this.fullscreenToggleBtn.addEventListener('click', () => this.togglePreviewFullscreen())
      this.fullscreenToggleBtn._bound = true
    }
    // 默认显示代码标签页
    this.switchToCodeTab()
    // 重新绑定标签页切换事件
    this.bindTabEvents()
  }

  switchToCodeTab() {
    // 移除所有标签页的 active 状态
    this.previewModal.querySelectorAll('.preview-tab').forEach((tab) => {
      tab.classList.remove('active')
    })
    this.previewModal.querySelectorAll('.preview-tab-pane').forEach((pane) => {
      pane.classList.remove('active')
    })

    // 激活代码标签页
    const codeTab = this.previewModal.querySelector('.preview-tab[data-tab="code"]')
    const codePane = this.previewModal.querySelector('#code')
    if (codeTab && codePane) {
      codeTab.classList.add('active')
      codePane.classList.add('active')
    }
  }

  async loadInterfaceList() {
    // 直接用主页传递的接口列表，保证和主页一致
    const mockItems = window.currentFilteredMockItems || []
    this.allMockItems = mockItems
    this.filteredMockItems = mockItems
    this.renderInterfaceList(mockItems)
  }

  renderInterfaceList(list) {
    this.interfaceSelector.innerHTML = ''
    list.forEach((item) => {
      const div = document.createElement('div')
      div.className = 'interface-item'
      div.innerHTML = `
                    <label class="interface-checkbox">
                        <input type="checkbox" value="${item.fileName}">
                        <span class="interface-info">
                            <span class="interface-name">${item.pathName}</span>
                            <span class="interface-path">${item.path}</span>
                            <span class="interface-method ${item.pathType.toLowerCase()}">${item.pathType}</span>
                        </span>
                    </label>
                `
      this.interfaceSelector.appendChild(div)
    })
    // 渲染后自动同步全选状态
    setTimeout(() => this.syncSelectAllCheckbox(), 0)
    // 绑定全选事件
    this.bindSelectAllEvent()
  }

  bindInterfaceSearch() {
    const searchInput = document.getElementById('interface-search')
    if (!searchInput) return
    searchInput.addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toLowerCase()
      const filtered = this.filteredMockItems.filter(
        (item) =>
          item.pathName.toLowerCase().includes(keyword) ||
          item.path.toLowerCase().includes(keyword) ||
          (item.pathType && item.pathType.toLowerCase().includes(keyword))
      )
      this.renderInterfaceList(filtered)
    })
  }

  async generateCode() {
    const formData = this.collectFormData()
    if (!this.validateFormData(formData)) {
      return
    }
    this.closeModal()
    this.generatedCode.innerHTML = ''
    this.openPreviewModal()
    this.isStreamingPaused = false
    this.pausedContent = ''
    this.currentFormData = formData
    // 显示流式生成提示
    const floatingBar = document.getElementById('streaming-floating-bar')
    if (floatingBar) floatingBar.style.display = 'flex'
    const streamingIndicator = document.getElementById('streaming-indicator')
    if (streamingIndicator) streamingIndicator.style.display = ''
    // 初始化流式代码区
    this.streamingPre = document.createElement('pre')
    this.streamingPre.className = 'streaming-plain-code'
    this.generatedCode.appendChild(this.streamingPre)
    await this.startStreaming(formData)
  }

  async startStreaming(formData) {
    this.streamingController = new AbortController()
    const floatingBar = document.getElementById('streaming-floating-bar')
    const streamingIndicator = document.getElementById('streaming-indicator')
    try {
      const response = await fetch('/api/codegen/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: this.streamingController.signal
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = formData.previousContent || ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              this.finalizeCodeGeneration(fullContent, this.currentFormData)
              if (floatingBar) floatingBar.style.display = 'none'
              if (streamingIndicator) streamingIndicator.style.display = 'none'
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullContent += parsed.content
                this.updateStreamingContent(fullContent)
              }
            } catch (e) { }
          }
        }
      }
      this.pausedContent = fullContent
    } catch (error) {
      this.showError('生成代码失败: ' + error.message)
    } finally {
      if (floatingBar) floatingBar.style.display = 'none'
      if (streamingIndicator) streamingIndicator.style.display = 'none'
      this.streamingController = null
      this.streamingReader = null
    }
  }

  updateStreamingContent(content) {
    // 只用textContent渲染，彻底避免样式污染
    if (this.streamingPre) {
      this.streamingPre.textContent = content
    }
  }

  bindCodeBlockEvents(container) {
    container.addEventListener('click', (e) => {
      // 复制按钮
      if (e.target.closest('.copy-btn')) {
        const button = e.target.closest('.copy-btn')
        const codeId = button.getAttribute('data-code-id')
        const codeElement = container.querySelector(`code[data-code-id="${codeId}"]`)
        if (codeElement) {
          this.copyCode(button, codeElement.textContent)
        }
      }
      // 预览按钮
      if (e.target.closest('.preview-btn')) {
        const button = e.target.closest('.preview-btn')
        const codeId = button.getAttribute('data-code-id')
        const codeBlock = button.closest('.code-block')
        const codeElement = container.querySelector(`code[data-code-id="${codeId}"]`)
        if (codeElement) {
          const codeContent = codeElement.textContent
          const language = codeElement.getAttribute('data-language') || 'html'
          const fileName = codeElement.getAttribute('data-filename') || 'file.html'
          // ... existing code ...
          if (language === 'html' || language === 'vue-html') {
            this.previewHtmlCode(codeContent, fileName)
          } else if (language === 'vue') {
            this.previewVueCode(codeContent, fileName)
          } else if (language === 'jsx' || language === 'react') {
            this.previewReactCode(codeContent, fileName)
          } else if (language === 'css' || language === 'scss' || language === 'less') {
            this.previewCssCode(codeContent, fileName)
          } else {
            this.previewGenericCode(codeContent, fileName, language)
          }
          this.switchToPreviewTab()
        }
      }
      // 插入代码按钮
      if (e.target.closest('.insert-code-btn')) {
        const button = e.target.closest('.insert-code-btn')
        const codeId = button.getAttribute('data-code-id')
        const codeElement = container.querySelector(`code[data-code-id="${codeId}"]`)
        const fileName = codeElement?.getAttribute('data-filename') || 'newfile.txt'
        const code = codeElement?.textContent || ''
        if (!window.selectedInsertDir) {
          this.showToast('请先选中目录进行代码插入', 'error')
          return
        }
        this.insertCodeToLocal(window.selectedInsertDir, fileName, code)
      }
    })
  }

  showStreamingIndicator() {
    const streamingContent = this.generatedCode.querySelector('.streaming-content')
    if (streamingContent && !streamingContent.querySelector('.streaming-indicator')) {
      const indicator = document.createElement('div')
      indicator.className = 'streaming-indicator'
      indicator.innerHTML = `
        <div class="streaming-indicator-content">
          <div class="loading-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          <span class="streaming-text">正在生成代码...</span>
        </div>
      `
      streamingContent.appendChild(indicator)
    }
  }

  formatCodeContent(content) {
    // 检测是否为 Markdown 格式
    if (content.includes('```') || content.includes('#') || content.includes('**')) {
      return this.formatMarkdown(content)
    }
    return `<pre><code class="language-javascript">${this.escapeHtml(content)}</code></pre>`
  }

  formatMarkdown(content) {
    // 改进的 Markdown 转 HTML，使用新的样式结构
    let html = content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'javascript'
        const fileName = this.getFileNameByLanguage(language)
        const codeId = 'code-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)

        return `
          <div class="code-block">
            <div class="code-block-header">
              <div class="code-block-title">
                <i class="fas fa-file-code file-icon"></i>
                <span class="file-name">${fileName}</span>
                <span class="language-badge">${language.toUpperCase()}</span>
              </div>
              <div class="code-block-actions">
                <button class="code-block-action copy-btn" data-code-id="${codeId}">
                  <i class="fas fa-copy"></i> 复制
                </button>
                <button class="code-block-action preview-btn" data-code-id="${codeId}">
                  <i class="fas fa-eye"></i> 预览
                </button>
                <button class="code-block-action insert-code-btn" data-code-id="${codeId}">
                  <i class="fas fa-download"></i> 插入代码
                </button>
              </div>
            </div>
            <div class="code-block-content">
              <pre><code class="language-${language}" data-code-id="${codeId}" data-filename="${fileName}" data-language="${language}">${this.escapeHtml(
          code.trim()
        )}</code></pre>
            </div>
          </div>
        `
      })
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '<br><br>')

    return html
  }

  getFileNameByLanguage(language) {
    const fileNames = {
      javascript: 'script.js',
      js: 'script.js',
      vue: 'component.vue',
      'vue-html': 'component.vue',
      html: 'index.html',
      css: 'style.css',
      scss: 'style.scss',
      less: 'style.less',
      typescript: 'script.ts',
      ts: 'script.ts',
      tsx: 'component.tsx',
      jsx: 'component.jsx',
      react: 'component.jsx',
      dart: 'main.dart',
      python: 'main.py',
      java: 'Main.java',
      cpp: 'main.cpp',
      c: 'main.c',
      php: 'index.php',
      go: 'main.go',
      rust: 'main.rs',
      swift: 'main.swift',
      kotlin: 'Main.kt',
      scala: 'Main.scala',
      ruby: 'main.rb',
      shell: 'script.sh',
      bash: 'script.sh',
      sql: 'query.sql',
      json: 'config.json',
      yaml: 'config.yaml',
      yml: 'config.yml',
      xml: 'config.xml',
      markdown: 'README.md',
      md: 'README.md',
    }
    return fileNames[language.toLowerCase()] || 'file.txt'
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  finalizeCodeGeneration(content, formData) {
    this.currentFormData = formData
    this.originalCodeContent = content
    this.currentDependencies = this.getDependencies(formData.techStack, formData.uiLibrary, formData.customLibrary)
    // 生成完成后再高亮渲染
    this.generatedCode.innerHTML = this.formatCodeContent(content)
    this.streamingPre = null
    this.tryPreview(content, formData)
    // 重新绑定代码块按钮事件
    this.bindCodeBlockEvents(this.generatedCode)
    // 更新代码块数量和依赖项
    this.updateCounts()
    this.renderDependencies()
    // 隐藏悬浮条
    const floatingBar = document.getElementById('streaming-floating-bar')
    if (floatingBar) floatingBar.style.display = 'none'
  }

  // 将代码写入本地目录
  async writeCodeToLocalDirectory(content, formData) {
    try {
      const response = await fetch('/api/codegen/write-to-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: content,
          techStack: formData.techStack,
          outputType: formData.outputType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        this.showToast('代码已成功写入本地目录', 'success')
        console.log('代码写入结果:', data.data)
      } else {
        this.showToast('代码写入失败: ' + data.error, 'error')
      }
    } catch (error) {
      this.showToast('代码写入失败: ' + error.message, 'error')
    }
  }

  getDependencies(techStack, uiLibrary, customLibrary) {
    const dependencies = {
      vue2: {
        core: ['vue@^2.7.0'],
        ui: {
          'element-ui': ['element-ui@^2.15.0'],
          'ant-design-vue': ['ant-design-vue@^1.7.0'],
          vuetify: ['vuetify@^2.6.0'],
          quasar: ['quasar@^1.16.0'],
          custom: [],
        },
        http: ['axios@^1.4.0'],
        state: ['vuex@^3.6.0'],
      },
      vue3: {
        core: ['vue@^3.3.0'],
        ui: {
          'element-plus': ['element-plus@^2.3.0'],
          'ant-design-vue': ['ant-design-vue@^4.0.0'],
          'naive-ui': ['naive-ui@^2.34.0'],
          vuetify: ['vuetify@^3.3.0'],
          quasar: ['quasar@^2.12.0'],
          custom: [],
        },
        http: ['axios@^1.4.0'],
        state: ['pinia@^2.1.0'],
      },
      react: {
        core: ['react@^18.2.0', 'react-dom@^18.2.0'],
        ui: {
          'ant-design': ['antd@^5.0.0'],
          'material-ui': ['@mui/material@^5.14.0', '@emotion/react@^11.11.0', '@emotion/styled@^11.11.0'],
          'chakra-ui': [
            '@chakra-ui/react@^2.8.0',
            '@emotion/react@^11.11.0',
            '@emotion/styled@^11.11.0',
            'framer-motion@^10.16.0',
          ],
          'tailwind-ui': ['tailwindcss@^3.3.0'],
          'react-bootstrap': ['react-bootstrap@^2.8.0', 'bootstrap@^5.3.0'],
          custom: [],
        },
        http: ['axios@^1.4.0'],
        state: ['zustand@^4.4.0'],
      },
      flutter: {
        core: [],
        ui: {
          material: [],
          cupertino: [],
          getwidget: ['getwidget:^2.0.0'],
          'flutter-easyloading': ['flutter_easyloading:^3.0.0'],
          custom: [],
        },
        http: ['dio@^5.3.0'],
        state: ['get@^4.6.0'],
      },
    }

    const techDeps = dependencies[techStack]
    if (!techDeps) return []

    let deps = [...techDeps.core, ...techDeps.http]
    if (techDeps.state) {
      deps = [...deps, ...techDeps.state]
    }
    if (uiLibrary && techDeps.ui[uiLibrary]) {
      deps = [...deps, ...techDeps.ui[uiLibrary]]
    }
    if (customLibrary) {
      const customDeps = customLibrary
        .split(',')
        .map((dep) => dep.trim())
        .filter(Boolean)
      deps = [...deps, ...customDeps]
    }
    return deps
  }

  collectFormData() {
    const selectedInterfaces = Array.from(
      this.interfaceSelector.querySelectorAll('input[type="checkbox"]:checked')
    ).map((checkbox) => checkbox.value)
    return {
      techStack: this.techStackSelect.value,
      outputType: this.outputTypeSelect.value,
      uiLibrary: this.uiLibrarySelect.value,
      customLibrary: this.customLibraryInput.value,
      interfaceList: selectedInterfaces,
      pageStructure: this.pageStructureInput.value,
      pageLogic: this.pageLogicInput.value,
    }
  }

  validateFormData(data) {
    if (!data.techStack) {
      this.showError('请选择技术类型')
      return false
    }
    if (!data.outputType) {
      this.showError('请选择呈现类型')
      return false
    }
    if (data.interfaceList.length === 0) {
      this.showError('请至少选择一个接口')
      return false
    }
    return true
  }

  showGeneratedCode(code, formData) {
    // 这个方法现在主要用于兼容性，实际逻辑已经在 finalizeCodeGeneration 中处理
    console.log('代码生成完成')
  }

  tryPreview(code, formData) {
    try {
      console.log('开始生成预览')
      console.log('代码长度:', code.length)
      console.log('表单数据:', formData)

      // 提取HTML内容用于预览
      const htmlContent = this.extractHtmlContent(code, formData)
      console.log('提取的HTML内容长度:', htmlContent.length)
      console.log('提取的HTML内容前200字符:', htmlContent.substring(0, 200))

      // 如果是完整页面类型，直接预览HTML
      if (formData.outputType === 'page') {
        console.log('生成完整页面预览')
        this.generateHtmlPagePreview(htmlContent)
        return
      }

      // 组件类型的预览
      if (formData.techStack === 'vue2' || formData.techStack === 'vue3') {
        console.log('生成Vue组件预览')
        this.generateVuePreview(htmlContent, formData.techStack)
      } else if (formData.techStack === 'react') {
        console.log('生成React组件预览')
        this.generateReactPreview(htmlContent)
      } else if (formData.techStack === 'flutter') {
        console.log('生成Flutter预览')
        this.generateFlutterPreview(htmlContent)
      } else {
        console.log('生成通用预览')
        this.generateGenericPreview(htmlContent, formData.techStack)
      }
    } catch (error) {
      console.error('预览生成失败:', error)
      this.showPreviewError()
    }
  }

  extractHtmlContent(code, formData) {
    console.log('开始提取HTML内容')
    console.log('输出类型:', formData.outputType)
    console.log('技术栈:', formData.techStack)

    // 如果是完整页面类型，直接返回代码内容
    if (formData.outputType === 'page') {
      console.log('完整页面类型，直接返回代码内容')
      return code
    }

    // 对于组件类型，提取HTML模板部分
    const techStack = formData.techStack

    if (techStack === 'vue2' || techStack === 'vue3') {
      console.log('提取Vue模板内容')
      // 提取Vue模板部分
      const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/i)
      if (templateMatch) {
        console.log('找到template标签，提取内容')
        return templateMatch[1].trim()
      }

      // 如果没有template标签，尝试提取HTML部分
      const htmlMatch = code.match(/<([^>]*>[\s\S]*?)>/)
      if (htmlMatch) {
        console.log('找到HTML标签，提取内容')
        // 提取从第一个<开始到最后一个>结束的内容
        const startIndex = code.indexOf('<')
        const endIndex = code.lastIndexOf('>')
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          return code.substring(startIndex, endIndex + 1).trim()
        }
      }
    } else if (techStack === 'react') {
      console.log('提取React JSX内容')
      // 提取JSX的return部分
      const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/m)
      if (returnMatch) {
        console.log('找到return语句，提取JSX内容')
        return returnMatch[1].trim()
      }

      // 如果没有return，尝试提取JSX部分
      const jsxMatch = code.match(/<([^>]*>[\s\S]*?)>/)
      if (jsxMatch) {
        console.log('找到JSX标签，提取内容')
        // 提取从第一个<开始到最后一个>结束的内容
        const startIndex = code.indexOf('<')
        const endIndex = code.lastIndexOf('>')
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          return code.substring(startIndex, endIndex + 1).trim()
        }
      }

      // 如果还是没找到，返回整个代码
      console.log('未找到JSX内容，返回完整代码')
      return code
    } else if (techStack === 'flutter') {
      console.log('Flutter类型，返回完整代码')
      // Flutter没有HTML，返回代码结构
      return code
    }

    // 默认返回原始代码
    console.log('默认返回原始代码')
    return code
  }

  generateHtmlPagePreview(htmlContent) {
    console.log('生成HTML页面预览')
    console.log('HTML内容长度:', htmlContent.length)
    console.log('HTML内容前200字符:', htmlContent.substring(0, 200))

    // 检查是否已经是完整的HTML文档
    if (
      htmlContent.trim().toLowerCase().startsWith('<!doctype html>') ||
      htmlContent.trim().toLowerCase().startsWith('<html>')
    ) {
      console.log('检测到完整HTML文档，直接使用')
      // 直接使用生成的HTML内容
      this.updateIframeContent(htmlContent)
    } else {
      console.log('包装成完整HTML文档')
      // 包装成完整的HTML文档
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>生成的页面</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `
      console.log('生成的完整HTML长度:', fullHtml.length)
      this.updateIframeContent(fullHtml)
    }
  }

  generateVuePreview(htmlContent, version) {
    const vueVersion = version === 'vue2' ? '2.7.16' : '3.3.0'
    const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vue ${version === 'vue2' ? '2' : '3'} Preview</title>
        <script src="https://unpkg.com/vue@${vueVersion}/dist/vue${version === 'vue2' ? '' : '.global'}.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .vue-template {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
          }
          .vue-template h3 {
            margin-top: 0;
            color: #42b883;
          }
        </style>
            </head>
            <body>
        <div class="preview-container">
          <h3>Vue ${version === 'vue2' ? '2' : '3'} 组件预览</h3>
          <p>以下是组件的模板部分预览：</p>
          <div class="vue-template">
            ${this.escapeHtml(htmlContent)}
                </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> 这是组件的模板部分，实际运行需要完整的 Vue 项目环境。
          </p>
        </div>
            </body>
            </html>
        `
    this.updateIframeContent(html)
  }

  generateReactPreview(htmlContent) {
    const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>React Preview</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .jsx-template {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
          }
          .jsx-template h3 {
            margin-top: 0;
            color: #61dafb;
          }
        </style>
            </head>
            <body>
        <div class="preview-container">
          <h3>React 组件预览</h3>
          <p>以下是组件的JSX部分预览：</p>
          <div class="jsx-template">
            ${this.escapeHtml(htmlContent)}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> 这是组件的JSX部分，实际运行需要完整的 React 项目环境。
          </p>
                </div>
            </body>
            </html>
        `
    this.updateIframeContent(html)
  }

  generateFlutterPreview(htmlContent) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flutter Preview</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .flutter-code {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          .flutter-code h3 {
            margin-top: 0;
            color: #02569b;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3>Flutter 代码预览</h3>
          <p>以下是生成的 Flutter 代码结构：</p>
          <div class="flutter-code">
            ${this.escapeHtml(htmlContent)}
            </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> Flutter 代码需要在 Flutter 环境中运行，请将代码复制到 Flutter 项目中使用。
          </p>
        </div>
      </body>
      </html>
    `
    this.updateIframeContent(html)
  }

  generateGenericPreview(htmlContent, techStack) {
    const techName =
      {
        vue2: 'Vue 2',
        vue3: 'Vue 3',
        react: 'React',
        flutter: 'Flutter',
      }[techStack] || techStack

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${techName} Preview</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .code-preview {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          .code-preview h3 {
            margin-top: 0;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3>${techName} 代码预览</h3>
          <p>以下是生成的代码内容：</p>
          <div class="code-preview">
            <h4>代码内容：</h4>
            ${this.escapeHtml(htmlContent)}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>提示：</strong> 完整的代码可以在"代码"标签页中查看和复制。
          </p>
        </div>
      </body>
      </html>
    `
    this.updateIframeContent(html)
  }

  updateIframeContent(htmlContent) {
    console.log('更新iframe内容')
    console.log('HTML内容长度:', htmlContent.length)
    console.log('HTML内容前200字符:', htmlContent.substring(0, 200))

    const iframe = document.getElementById('code-preview-frame')
    if (iframe) {
      try {
        // 清空iframe内容
        iframe.srcdoc = ''

        // 写入新内容
        iframe.srcdoc = htmlContent

        // 显示加载状态
        this.showPreviewLoading()

        // 监听iframe加载完成
        iframe.onload = () => {
          console.log('iframe加载完成')
          this.hidePreviewLoading()
        }

        // 监听iframe加载错误
        iframe.onerror = () => {
          console.error('iframe加载错误')
          this.showPreviewError()
        }
      } catch (error) {
        console.error('更新iframe内容失败:', error)
        this.showPreviewError()
      }
    } else {
      console.error('找不到iframe元素')
    }
  }

  showPreviewLoading() {
    const loading = document.getElementById('preview-loading')
    if (loading) {
      loading.style.display = 'flex'
    }
  }

  hidePreviewLoading() {
    const loading = document.getElementById('preview-loading')
    if (loading) {
      loading.style.display = 'none'
    }
  }

  showPreviewError() {
    const error = document.getElementById('preview-error')
    if (error) {
      error.style.display = 'flex'
    }
    this.hidePreviewLoading()
  }

  switchTab(clickedTab) {
    // 移除所有标签页的 active 状态
    this.previewModal.querySelectorAll('.preview-tab').forEach((tab) => {
      tab.classList.remove('active')
    })
    this.previewModal.querySelectorAll('.preview-tab-pane').forEach((pane) => {
      pane.classList.remove('active')
    })

    // 激活点击的标签页
    clickedTab.classList.add('active')
    const tabId = clickedTab.getAttribute('data-tab')
    const targetPane = this.previewModal.querySelector(`#${tabId}`)
    if (targetPane) {
      targetPane.classList.add('active')
    }
  }

  downloadCode() {
    const code = this.generatedCode.textContent
    const techStack = this.techStackSelect.value
    const outputType = this.outputTypeSelect.value
    let filename = `generated-${techStack}-${outputType}`
    let extension = ''
    if (techStack === 'vue2' || techStack === 'vue3') {
      extension = '.vue'
    } else if (techStack === 'react') {
      extension = '.jsx'
    } else if (techStack === 'flutter') {
      extension = '.dart'
    }
    filename += extension
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  showError(message) {
    alert(message)
  }

  bindTabEvents() {
    // 移除之前的事件监听器
    this.previewModal.querySelectorAll('.preview-tab').forEach((tab) => {
      tab.removeEventListener('click', this.handleTabClick)
    })

    // 重新绑定事件监听器
    this.previewModal.querySelectorAll('.preview-tab').forEach((tab) => {
      tab.addEventListener('click', this.handleTabClick.bind(this))
    })
  }

  handleTabClick(event) {
    const clickedTab = event.currentTarget
    this.switchTab(clickedTab)
  }

  switchToPreviewTab() {
    // 切换到预览标签页
    const previewTab = this.previewModal.querySelector('.preview-tab[data-tab="preview"]')
    if (previewTab) {
      this.switchTab(previewTab)
    }
  }

  copyCode(button, code) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        const originalText = button.innerHTML
        button.innerHTML = '<i class="fas fa-check"></i> 已复制'
        button.style.background = '#4CAF50'
        setTimeout(() => {
          button.innerHTML = originalText
          button.style.background = '#2196F3'
        }, 2000)
      })
      .catch((err) => {
        console.error('复制失败:', err)
        alert('复制失败，请手动复制')
      })
  }

  refreshPreview() {
    if (this.currentFormData && this.originalCodeContent) {
      console.log('刷新预览，使用原始代码内容')
      console.log('原始代码长度:', this.originalCodeContent.length)
      console.log('当前表单数据:', this.currentFormData)

      // 使用保存的原始代码内容重新生成预览
      this.tryPreview(this.originalCodeContent, this.currentFormData)
    } else {
      console.error('没有原始代码内容或表单数据，无法刷新预览')
      this.showToast('无法刷新预览：缺少代码内容', 'error')
    }
  }

  openPreviewInNewTab() {
    const iframe = document.getElementById('code-preview-frame')
    if (iframe && iframe.srcdoc) {
      const newWindow = window.open('', '_blank')
      newWindow.document.write(iframe.srcdoc)
      newWindow.document.close()
    }
  }

  retryPreview() {
    this.hidePreviewError()
    this.refreshPreview()
  }

  hidePreviewError() {
    const error = document.getElementById('preview-error')
    if (error) {
      error.style.display = 'none'
    }
  }

  // 新增：预览HTML代码
  previewHtmlCode(codeContent, fileName) {
    console.log('预览HTML代码:', fileName)

    // 检查是否已经是完整的HTML文档
    if (
      codeContent.trim().toLowerCase().startsWith('<!doctype html>') ||
      codeContent.trim().toLowerCase().startsWith('<html>')
    ) {
      console.log('检测到完整HTML文档，直接预览')
      this.updateIframeContent(codeContent)
    } else {
      console.log('包装HTML代码为完整文档')
      // 包装成完整的HTML文档
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fileName} - 预览</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: #f5f5f5;
            }
            .preview-header {
              background: white;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .preview-header h3 {
              margin: 0;
              color: #333;
            }
            .preview-content {
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="preview-header">
            <h3><i class="fas fa-file-code"></i> ${fileName} 预览</h3>
          </div>
          <div class="preview-content">
            ${codeContent}
          </div>
        </body>
        </html>
      `
      this.updateIframeContent(fullHtml)
    }
  }

  // 新增：预览Vue代码
  previewVueCode(codeContent, fileName) {
    console.log('预览Vue代码:', fileName)

    // 提取Vue模板部分
    const templateMatch = codeContent.match(/<template>([\s\S]*?)<\/template>/i)
    let templateContent = ''

    if (templateMatch) {
      templateContent = templateMatch[1].trim()
    } else {
      // 如果没有template标签，尝试提取HTML部分
      const startIndex = codeContent.indexOf('<')
      const endIndex = codeContent.lastIndexOf('>')
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        templateContent = codeContent.substring(startIndex, endIndex + 1).trim()
      } else {
        templateContent = codeContent
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileName} - Vue预览</title>
        <script src="https://unpkg.com/vue@3.3.0/dist/vue.global.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .vue-template {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
          }
          .vue-template h3 {
            margin-top: 0;
            color: #42b883;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3><i class="fas fa-file-code"></i> ${fileName} - Vue组件预览</h3>
          <p>以下是组件的模板部分预览：</p>
          <div class="vue-template">
            ${this.escapeHtml(templateContent)}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> 这是组件的模板部分，实际运行需要完整的 Vue 项目环境。
          </p>
        </div>
      </body>
      </html>
    `
    this.updateIframeContent(html)
  }

  // 新增：预览React代码
  previewReactCode(codeContent, fileName) {
    console.log('预览React代码:', fileName)

    // 提取JSX的return部分
    const returnMatch = codeContent.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/m)
    let jsxContent = ''

    if (returnMatch) {
      jsxContent = returnMatch[1].trim()
    } else {
      // 如果没有return，尝试提取JSX部分
      const startIndex = codeContent.indexOf('<')
      const endIndex = codeContent.lastIndexOf('>')
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsxContent = codeContent.substring(startIndex, endIndex + 1).trim()
      } else {
        jsxContent = codeContent
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileName} - React预览</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .jsx-template {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
          }
          .jsx-template h3 {
            margin-top: 0;
            color: #61dafb;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3><i class="fas fa-file-code"></i> ${fileName} - React组件预览</h3>
          <p>以下是组件的JSX部分预览：</p>
          <div class="jsx-template">
            ${this.escapeHtml(jsxContent)}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> 这是组件的JSX部分，实际运行需要完整的 React 项目环境。
          </p>
        </div>
      </body>
      </html>
    `
    this.updateIframeContent(html)
  }

  // 新增：预览CSS代码
  previewCssCode(codeContent, fileName) {
    console.log('预览CSS代码:', fileName)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileName} - CSS预览</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .css-preview {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
            white-space: pre-wrap;
          }
          .css-preview h3 {
            margin-top: 0;
            color: #264de4;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3><i class="fas fa-file-code"></i> ${fileName} - CSS样式预览</h3>
          <p>以下是CSS样式代码：</p>
          <div class="css-preview">
            ${this.escapeHtml(codeContent)}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> 这是CSS样式代码，需要应用到HTML元素才能看到效果。
          </p>
        </div>
      </body>
      </html>
    `
    this.updateIframeContent(html)
  }

  // 新增：预览通用代码
  previewGenericCode(codeContent, fileName, language) {
    console.log('预览通用代码:', fileName, language)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileName} - ${language.toUpperCase()}预览</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .preview-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            min-height: 200px;
          }
          .code-preview {
            border: 2px dashed #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            background: #fafafa;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.4;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          .code-preview h3 {
            margin-top: 0;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <h3><i class="fas fa-file-code"></i> ${fileName} - ${language.toUpperCase()}代码预览</h3>
          <p>以下是${language.toUpperCase()}代码：</p>
          <div class="code-preview">
            ${this.escapeHtml(codeContent)}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">
            <strong>注意：</strong> 这是${language.toUpperCase()}代码，需要在相应的开发环境中运行。
          </p>
        </div>
      </body>
      </html>
    `
    this.updateIframeContent(html)
  }

  setCurrentGroup(groupObj) {
    this.currentGroup = groupObj
  }

  bindSelectAllEvent() {
    const selectAllCheckbox = document.getElementById('interface-select-all-checkbox')
    const getCheckboxes = () => this.interfaceSelector.querySelectorAll('input[type="checkbox"]')
    if (!selectAllCheckbox) return

    // 防止重复绑定
    selectAllCheckbox.onchange = null
    this.interfaceSelector.onchange = null

    // 全选/取消全选
    selectAllCheckbox.addEventListener('change', (e) => {
      getCheckboxes().forEach((cb) => {
        cb.checked = selectAllCheckbox.checked
      })
    })

    // 单个checkbox变化时联动全选
    this.interfaceSelector.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const all = Array.from(getCheckboxes())
        const checkedCount = all.filter((cb) => cb.checked).length
        if (checkedCount === all.length) {
          selectAllCheckbox.checked = true
          selectAllCheckbox.indeterminate = false
        } else if (checkedCount === 0) {
          selectAllCheckbox.checked = false
          selectAllCheckbox.indeterminate = false
        } else {
          selectAllCheckbox.checked = false
          selectAllCheckbox.indeterminate = true
        }
      }
    })
  }

  syncSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('interface-select-all-checkbox')
    const checkboxes = this.interfaceSelector.querySelectorAll('input[type="checkbox"]')
    if (!selectAllCheckbox) return
    const all = Array.from(checkboxes)
    const checkedCount = all.filter((cb) => cb.checked).length
    if (checkedCount === all.length && all.length > 0) {
      selectAllCheckbox.checked = true
      selectAllCheckbox.indeterminate = false
    } else if (checkedCount === 0) {
      selectAllCheckbox.checked = false
      selectAllCheckbox.indeterminate = false
    } else {
      selectAllCheckbox.checked = false
      selectAllCheckbox.indeterminate = true
    }
  }

  showSelectDirectoryModal() {
    if (window.fileManager && typeof window.fileManager.showLocalDirectoryModal === 'function') {
      window.fileManager.showLocalDirectoryModal()
    } else {
      if (typeof this.showToast === 'function') {
        this.showToast('请先设置本地目录！', 'error')
      } else if (window.showToast) {
        window.showToast('请先设置本地目录！', 2000)
      }
    }
  }

  // ====== 本地目录树相关 ======
  // 在代码生成弹窗打开时渲染本地目录树
  async renderLocalDirectoryTree() {
    const treeContainer = document.getElementById('codegen-filetree')
    if (!treeContainer) return
    treeContainer.innerHTML = '<div class="filetree-loading">加载中...</div>'
    try {
      const res = await fetch('/api/file/tree')
      const data = await res.json()
      if (data.success) {
        treeContainer.innerHTML = ''
        this.renderFileTreeNodes(data.data, treeContainer)
      } else {
        treeContainer.innerHTML = `<div class="filetree-error">${data.error}</div>`
      }
    } catch (e) {
      treeContainer.innerHTML = '<div class="filetree-error">加载失败</div>'
    }
    // 选中目录状态
    window.selectedInsertDir = null
  }

  renderFileTreeNodes(tree, container, level = 0) {
    if (!tree || tree.length === 0) {
      container.innerHTML = '<div class="filetree-empty">目录为空</div>'
      return
    }
    tree.forEach((node) => {
      const isDir = node.type === 'directory'
      const nodeEl = document.createElement('div')
      nodeEl.className = `filetree-node${isDir ? ' dir' : ' file'}`
      nodeEl.innerHTML = `<i class="fas fa-${isDir ? 'folder' : 'file'}"></i> <span>${node.name}</span>`
      nodeEl.style.paddingLeft = 18 + level * 16 + 'px'
      nodeEl.dataset.path = node.path
      if (isDir) {
        nodeEl.addEventListener('click', (e) => {
          e.stopPropagation()
          // 取消所有选中
          container.querySelectorAll('.filetree-node.selected').forEach((el) => el.classList.remove('selected'))
          nodeEl.classList.add('selected')
          window.selectedInsertDir = node.path
        })
      }
      container.appendChild(nodeEl)
      if (isDir && node.children && node.children.length > 0) {
        this.renderFileTreeNodes(node.children, container, level + 1)
      }
    })
  }

  // 在代码tab渲染后为每个代码块的 .code-block-actions 添加插入按钮
  addInsertButtonToCodeBlocks() {
    setTimeout(() => {
      document.querySelectorAll('.code-block-header').forEach((header) => {
        const actions = header.querySelector('.code-block-actions')
        if (!actions) return // 没有操作区则跳过
        if (!actions.querySelector('.insert-code-btn')) {
          const btn = document.createElement('button')
          btn.className = 'code-block-action insert-code-btn'
          btn.innerHTML = '<i class="fas fa-download"></i> 插入代码'
          btn.onclick = async () => {
            if (!window.selectedInsertDir) {
              this.showToast('请先选中目录进行代码插入', 'error')
              return
            }
            // 获取代码内容和文件名
            const codeBlock = header.nextElementSibling
            const code = codeBlock?.querySelector('code')?.textContent || ''
            const fileName = header.querySelector('.file-name')?.textContent?.trim() || 'newfile.txt'
            await this.insertCodeToLocal(window.selectedInsertDir, fileName, code)
          }
          actions.appendChild(btn)
        }
      })
    }, 0)
  }

  async insertCodeToLocal(dir, fileName, code) {
    // 修复：根目录时不要多加斜杠
    const filePath = (!dir || dir === '') ? fileName : (dir.endsWith('/') ? dir + fileName : dir + '/' + fileName)
    try {
      const res = await fetch('/api/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content: code }),
      })
      const data = await res.json()
      if (data.success) {
        this.showToast('插入成功', 'success')
        this.renderLocalDirectoryTree()
      } else {
        this.showToast('插入失败: ' + data.error, 'error')
      }
    } catch (e) {
      this.showToast('插入失败', 'error')
    }
  }

  togglePreviewFullscreen() {
    const modal = this.previewModal
    const icon = this.fullscreenToggleBtn.querySelector('i')
    if (!modal.classList.contains('fullscreen')) {
      modal.classList.add('fullscreen')
      icon.classList.remove('fa-expand')
      icon.classList.add('fa-compress')
      this.fullscreenToggleBtn.title = '还原窗口'
    } else {
      modal.classList.remove('fullscreen')
      icon.classList.remove('fa-compress')
      icon.classList.add('fa-expand')
      this.fullscreenToggleBtn.title = '全屏预览'
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.codeGenerator = new CodeGenerator()
})

// 全局函数
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // 可以添加复制成功的提示
      console.log('复制成功:', text)
    })
    .catch((err) => {
      console.error('复制失败:', err)
    })
}
