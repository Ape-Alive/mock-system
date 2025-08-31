// 程序坞交互逻辑
document.addEventListener('DOMContentLoaded', function () {
  // 获取所有程序坞项目
  const dockItems = document.querySelectorAll('.dock-item')

  // 为每个程序坞项目添加点击事件
  dockItems.forEach((item) => {
    item.addEventListener('click', function (e) {
      e.preventDefault()

      // 添加点击动画效果
      this.style.transform = 'translateY(-2px) scale(1.05)'
      setTimeout(() => {
        this.style.transform = ''
      }, 150)

      // 获取动作类型
      const action = this.getAttribute('data-action')

      // 根据动作类型执行相应操作
      switch (action) {
        case 'add-mock':
          handleAddMock()
          break
        case 'code-generator':
          handleCodeGenerator()
          break
        case 'import-openapi':
          handleImportOpenAPI()
          break
        default:
          console.log('未知动作:', action)
      }
    })

    // 添加鼠标悬停效果
    item.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-4px) scale(1.1)'
    })

    item.addEventListener('mouseleave', function () {
      this.style.transform = ''
    })
  })

  // 处理新建接口
  function handleAddMock() {
    console.log('点击新建接口')
    // 触发原有的新建接口按钮事件
    const addMockBtn = document.getElementById('add-mock')
    if (addMockBtn) {
      addMockBtn.click()
    } else {
      // 如果找不到原有按钮，直接显示模态框
      showMockModal()
    }
  }

  // 处理代码生成器
  function handleCodeGenerator() {
    // 触发原有的代码生成器按钮事件
    const codeGeneratorBtn = document.getElementById('code-generator-btn')
    if (codeGeneratorBtn) {
      codeGeneratorBtn.click()
    } else {
      // 如果找不到原有按钮，直接显示模态框
      showCodeGeneratorModal()
    }
  }

  // 处理导入OpenAPI/Swagger
  function handleImportOpenAPI() {
    console.log('点击导入OpenAPI/Swagger')
    // 触发原有的导入按钮事件
    const importBtn = document.getElementById('import-openapi-btn')
    if (importBtn) {
      importBtn.click()
    } else {
      // 如果找不到原有按钮，直接显示模态框
      showImportModal()
    }
  }

  // 显示新建接口模态框
  function showMockModal() {
    const modal = document.getElementById('mock-modal')
    if (modal) {
      // 确保弹窗居中显示
      modal.style.display = 'flex'
      modal.style.alignItems = 'center'
      modal.style.justifyContent = 'center'

      // 重置表单
      const form = document.getElementById('mock-form')
      if (form) form.reset()
      // 设置标题
      const title = document.getElementById('modal-title')
      if (title) title.textContent = '创建新接口'

      // 绑定关闭事件
      bindMockModalEvents()

      console.log('新建接口弹窗已显示，位置：居中')
    }
  }

  // 绑定新建接口弹窗的关闭事件
  function bindMockModalEvents() {
    const modal = document.getElementById('mock-modal')
    const closeBtn = modal.querySelector('.mock-btn-icon.close')
    const cancelBtn = modal.querySelector('.mock-btn.secondary.close')

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('新建接口弹窗关闭按钮被点击')
        modal.style.display = 'none'
      })
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        console.log('新建接口弹窗取消按钮被点击')
        modal.style.display = 'none'
      })
    }
  }

  // 显示代码生成器模态框
  function showCodeGeneratorModal() {
    // 检查CodeGenerator是否已初始化
    if (window.codeGenerator) {
      // 调用CodeGenerator的openModal方法，这会加载接口列表
      window.codeGenerator.openModal()
    } else {
      // 如果找不到原有按钮，直接显示模态框
      const modal = document.getElementById('code-generator-modal')
      if (modal) {
        // 确保弹窗居中显示
        modal.style.display = 'flex'
        modal.style.alignItems = 'center'
        modal.style.justifyContent = 'center'

        // 手动触发接口列表加载
        setTimeout(() => {
          if (window.codeGenerator) {
            window.codeGenerator.loadInterfaceList()
            window.codeGenerator.showCurrentGroupInfo()
          }
        }, 100)
      }
    }
  }

  // 显示导入模态框
  function showImportModal() {
    const modal = document.getElementById('import-modal')
    if (modal) {
      // 确保弹窗居中显示
      modal.style.display = 'flex'
      modal.style.alignItems = 'center'
      modal.style.justifyContent = 'center'

      // 重置表单
      const form = document.getElementById('import-form')
      if (form) form.reset()

      // 绑定关闭事件
      bindImportModalEvents()

      console.log('导入OpenAPI弹窗已显示，位置：居中')
    }
  }

  // 绑定导入弹窗的关闭事件
  function bindImportModalEvents() {
    const modal = document.getElementById('import-modal')
    const closeBtn = document.getElementById('import-modal-close')
    const cancelBtn = document.getElementById('import-modal-cancel')

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('导入弹窗关闭按钮被点击')
        modal.style.display = 'none'
      })
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        console.log('导入弹窗取消按钮被点击')
        modal.style.display = 'none'
      })
    }
  }

  // 程序坞悬停效果增强
  const dock = document.querySelector('.dock')
  if (dock) {
    dock.addEventListener('mouseenter', function () {
      this.style.transform = 'scale(1.02)'
      this.style.background = 'rgba(48, 48, 48, 0.95)'
      this.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.12)'
    })

    dock.addEventListener('mouseleave', function () {
      this.style.transform = 'scale(1)'
      this.style.background = 'rgba(48, 48, 48, 0.9)'
      this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08)'
    })
  }

  // 添加键盘快捷键支持
  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + 1: 新建接口
    if ((e.ctrlKey || e.metaKey) && e.key === '1') {
      e.preventDefault()
      handleAddMock()
    }
    // Ctrl/Cmd + 2: 代码生成器
    if ((e.ctrlKey || e.metaKey) && e.key === '2') {
      e.preventDefault()
      handleCodeGenerator()
    }
    // Ctrl/Cmd + 3: 导入OpenAPI
    if ((e.ctrlKey || e.metaKey) && e.key === '3') {
      e.preventDefault()
      handleImportOpenAPI()
    }
  })

  // 程序坞项目进入动画
  function animateDockItems() {
    const items = document.querySelectorAll('.dock-item')
    items.forEach((item, index) => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(20px) scale(0.8)'

      setTimeout(() => {
        item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        item.style.opacity = '1'
        item.style.transform = 'translateY(0) scale(1)'
      }, index * 100)
    })
  }

  // 页面加载完成后执行动画
  setTimeout(animateDockItems, 500)

  // 确保导入弹窗初始状态为隐藏
  setTimeout(() => {
    const importModal = document.getElementById('import-modal')
    if (importModal) {
      importModal.style.display = 'none'
      console.log('导入OpenAPI弹窗初始化完成，状态：隐藏')
    }

    // 确保新建接口弹窗初始状态为隐藏
    const mockModal = document.getElementById('mock-modal')
    if (mockModal) {
      mockModal.style.display = 'none'
      console.log('新建接口弹窗初始化完成，状态：隐藏')
    }
  }, 100)
})

// 导出函数供其他脚本使用
window.dockHandler = {
  handleAddMock: function () {
    const addMockBtn = document.getElementById('add-mock')
    if (addMockBtn) addMockBtn.click()
  },
  handleCodeGenerator: function () {
    const codeGeneratorBtn = document.getElementById('code-generator-btn')
    if (codeGeneratorBtn) codeGeneratorBtn.click()
  },
  handleImportOpenAPI: function () {
    const importBtn = document.getElementById('import-openapi-btn')
    if (importBtn) importBtn.click()
  },
}
