class EnhancedCodeGenerator {
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
  }

  initPreviewFeatures() {
    this.initPreviewSizeControls()
    this.initCodeToolbar()
    this.initDependencies()
    this.initSearchFeature()
  }

  initPreviewSizeControls() {
    const sizeButtons = document.querySelectorAll('.preview-size-btn')
    sizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = btn.getAttribute('data-size')
        this.setPreviewSize(size)

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
    document.getElementById('copy-all-code').addEventListener('click', () => {
      this.copyAllCode()
    })

    document.getElementById('format-code').addEventListener('click', () => {
      this.formatCode()
    })

    document.getElementById('toggle-line-numbers').addEventListener('click', () => {
      this.toggleLineNumbers()
    })

    document.getElementById('toggle-theme').addEventListener('click', () => {
      this.toggleCodeTheme()
    })

    document.getElementById('search-code').addEventListener('click', () => {
      this.showSearchDialog()
    })
  }

  initDependencies() {
    document.getElementById('copy-dependencies').addEventListener('click', () => {
      this.copyDependencies()
    })

    document.getElementById('install-dependencies').addEventListener('click', () => {
      this.showInstallGuide()
    })
  }

  initSearchFeature() {
    // 搜索功能实现
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
    return code
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/\s*}\s*/g, '\n}\n')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*\n/g, '\n')
  }

  formatHTML(code) {
    return code.replace(/>\s*</g, '>\n<').replace(/\n\s*\n/g, '\n')
  }

  formatCSS(code) {
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
    const codeBlocks = this.generatedCode.querySelectorAll('.code-block')
    this.codeCount.textContent = codeBlocks.length
    this.depsCount.textContent = this.currentDependencies.length
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

  // 继承原有的所有方法
  bindEvents() {
    // 原有的绑定事件逻辑
  }

  loadOptions() {
    // 原有的加载选项逻辑
  }

  // 其他原有方法...
}

// 全局函数
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // 可以添加复制成功的提示
  })
}

// 初始化增强版代码生成器
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedCodeGenerator = new EnhancedCodeGenerator()
})
