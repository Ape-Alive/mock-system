// 设置管理类
class SettingsManager {
  constructor() {
    this.currentSettings = null
    this.currentProvider = 'openai'
    this.providers = [] // 从后端加载的AI提供来源
    this.models = [] // 从后端加载的AI模型
    this.init()
  }

  // 初始化
  async init() {
    await this.loadProvidersAndModels()
    this.bindEvents()
    await this.loadSettings()
  }

  // 从后端加载AI提供来源和模型
  async loadProvidersAndModels() {
    try {
      // 加载AI提供来源
      const providersResponse = await fetch('/api/settings/providers')
      if (providersResponse.ok) {
        const providersData = await providersResponse.json()
        this.providers = providersData.data || []
      }

      // 加载AI模型
      const modelsResponse = await fetch('/api/settings/ai-models')
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        this.models = modelsData.data || []
      }

      // 更新提供来源选择器
      this.updateProviderSelect()
    } catch (error) {
      console.error('加载AI提供来源和模型失败:', error)
      this.showToast('加载AI提供来源和模型失败', 'error')
    }
  }

  // 更新提供来源选择器
  updateProviderSelect() {
    const providerSelect = document.getElementById('ai-provider-select')
    if (providerSelect) {
      providerSelect.innerHTML = '<option value="">请选择AI提供来源</option>'
      this.providers.forEach((provider) => {
        const option = document.createElement('option')
        option.value = provider.name
        option.textContent = provider.displayName
        providerSelect.appendChild(option)
      })
    }
  }

  // 根据提供来源名称获取模型列表
  getModelsByProvider(providerName) {
    const provider = this.providers.find((p) => p.name === providerName)
    if (!provider) return []

    return this.models.filter((model) => model.providerId === provider.id)
  }

  // 从后端加载AI提供来源和模型
  async loadProvidersAndModels() {
    try {
      // 加载AI提供来源
      const providersResponse = await fetch('/api/settings/providers')
      if (providersResponse.ok) {
        const providersData = await providersResponse.json()
        this.providers = providersData.data || []
      }

      // 加载AI模型
      const modelsResponse = await fetch('/api/settings/ai-models')
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        this.models = modelsData.data || []
      }

      // 更新提供来源选择器
      this.updateProviderSelect()
    } catch (error) {
      console.error('加载AI提供来源和模型失败:', error)
      this.showToast('加载AI提供来源和模型失败', 'error')
    }
  }

  // 更新提供来源选择器
  updateProviderSelect() {
    const providerSelect = document.getElementById('ai-provider-select')
    if (providerSelect) {
      providerSelect.innerHTML = '<option value="">请选择AI提供来源</option>'
      this.providers.forEach((provider) => {
        const option = document.createElement('option')
        option.value = provider.name
        option.textContent = provider.displayName
        providerSelect.appendChild(option)
      })
    }
  }

  // 根据提供来源名称获取模型列表
  getModelsByProvider(providerName) {
    const provider = this.providers.find((p) => p.name === providerName)
    if (!provider) return []

    return this.models.filter((model) => model.providerId === provider.id)
  }

  // 绑定事件
  bindEvents() {
    // 设置按钮点击事件
    const settingsBtn = document.getElementById('settings-btn')
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings())
    }

    // 关闭设置弹窗
    const closeBtn = document.getElementById('close-settings')
    const cancelBtn = document.getElementById('cancel-settings')
    const saveBtn = document.getElementById('save-settings')

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        this.closeSettings()
      })
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        this.closeSettings()
      })
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        this.saveSettings()
      })
    }

    // AI提供来源切换
    const providerSelect = document.getElementById('ai-provider-select')
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        this.switchProvider(e.target.value)
      })
    }

    // 菜单切换
    const menuItems = document.querySelectorAll('.settings-menu .menu-item')
    menuItems.forEach((item) => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab')
        this.switchTab(tab)
      })
    })

    // API密钥显示/隐藏 - 为所有提供来源绑定事件
    this.bindApiKeyToggleEvents()

    // 检查API密钥 - 为所有提供来源绑定事件
    this.bindApiKeyCheckEvents()

    // 模型管理按钮
    const addModelBtn = document.getElementById('add-model')
    const resetModelsBtn = document.getElementById('reset-models')
    const fetchModelsBtn = document.getElementById('fetch-models')

    if (addModelBtn) {
      addModelBtn.addEventListener('click', () => this.showAddModelDialog())
    }
    if (resetModelsBtn) {
      resetModelsBtn.addEventListener('click', () => this.resetModels())
    }
    if (fetchModelsBtn) {
      fetchModelsBtn.addEventListener('click', () => this.fetchModels())
    }

    // 范围滑块值显示
    const rangeInputs = document.querySelectorAll('input[type="range"]')
    rangeInputs.forEach((input) => {
      const valueSpan = input.nextElementSibling
      if (valueSpan && valueSpan.classList.contains('range-value')) {
        input.addEventListener('input', () => {
          valueSpan.textContent = input.value
        })
      }
    })

    // 浏览目录按钮
    const browseDirBtn = document.getElementById('browse-directory')
    if (browseDirBtn) {
      browseDirBtn.addEventListener('click', () => this.browseDirectory())
    }
  }

  // 绑定API密钥显示/隐藏事件
  bindApiKeyToggleEvents() {
    const providers = ['openai', 'claude', 'deepseek', 'gemini', 'custom']
    providers.forEach((provider) => {
      const toggleBtn = document.getElementById(`toggle-${provider}-api-key`)
      const apiKeyInput = document.getElementById(`${provider}-api-key`)
      if (toggleBtn && apiKeyInput) {
        toggleBtn.addEventListener('click', () => {
          const isPassword = apiKeyInput.type === 'password'
          apiKeyInput.type = isPassword ? 'text' : 'password'
          toggleBtn.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'
        })
      }
    })
  }

  // 绑定API密钥检查事件
  bindApiKeyCheckEvents() {
    const providers = ['openai', 'claude', 'deepseek', 'gemini', 'custom']
    providers.forEach((provider) => {
      const checkBtn = document.getElementById(`check-${provider}-api-key`)
      if (checkBtn) {
        checkBtn.addEventListener('click', () => this.checkApiKey(provider))
      }
    })
  }

  // 切换AI提供来源
  switchProvider(provider) {
    this.currentProvider = provider
    const providerData = this.providers.find((p) => p.name === provider)

    if (!providerData) {
      console.error('未找到提供来源:', provider)
      return
    }

    // 更新标题和链接
    const tabHeader = document.querySelector('#models-tab .tab-header h4')
    const providerLink = document.getElementById('provider-link')

    if (tabHeader) {
      tabHeader.textContent = providerData.displayName
    }

    if (providerLink) {
      providerLink.href = providerData.link
    }

    // 隐藏所有配置
    const configs = document.querySelectorAll('.provider-config')
    configs.forEach((config) => config.classList.remove('active'))

    // 显示当前配置
    const currentConfig = document.getElementById(`${provider}-config`)
    if (currentConfig) {
      currentConfig.classList.add('active')
    }

    // 更新模型列表
    this.updateModelList(provider)

    // 更新默认模型选择器
    this.updateDefaultModelSelect(provider)
  }

  // 更新模型列表
  updateModelList(provider) {
    const models = this.getModelsByProvider(provider)
    const modelList = document.getElementById('model-list')

    if (modelList && models.length > 0) {
      modelList.innerHTML = ''
      models.forEach((model) => {
        const modelTypeText = this.getModelTypeText(model.modelType)
        const modelItem = document.createElement('div')
        modelItem.className = 'model-item'
        modelItem.innerHTML = `
          <div class="model-info">
            <div class="model-name">${model.displayName || model.name}</div>
            <div class="model-type">${modelTypeText}</div>
          </div>
          <div class="model-actions-icons">
            <button class="btn-icon view" title="查看详情"><i class="fas fa-eye"></i></button>
            <button class="btn-icon edit" title="编辑"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete" title="删除"><i class="fas fa-minus"></i></button>
          </div>
        `
        modelList.appendChild(modelItem)
      })
    } else if (modelList) {
      modelList.innerHTML = '<div class="no-models">暂无模型</div>'
    }
  }

  // 获取模型类型文本
  getModelTypeText(modelType) {
    const typeMap = {
      CODE: '编码',
      LLM: '通用',
      SWOT: '深度思考',
    }
    return typeMap[modelType] || modelType
  }

  // 更新默认模型选择器
  updateDefaultModelSelect(provider) {
    const models = this.getModelsByProvider(provider)
    const select = document.getElementById('default-model-select')

    if (select) {
      select.innerHTML = '<option value="">请选择默认模型</option>'
      models.forEach((model) => {
        const option = document.createElement('option')
        option.value = model.name
        option.textContent = model.displayName || model.name
        select.appendChild(option)
      })

      // 重新设置默认值
      if (this.currentSettings && this.currentSettings.defaultModel) {
        select.value = this.currentSettings.defaultModel
      }
    }
  }

  // 检查API密钥
  async checkApiKey(provider = 'openai') {
    const apiKeyInput = document.getElementById(`${provider}-api-key`)
    const apiKey = apiKeyInput?.value

    if (!apiKey) {
      this.showToast('请输入API密钥', 'warning')
      return
    }

    try {
      const response = await fetch('/api/settings/check-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          provider,
        }),
      })

      if (response.ok) {
        const providerData = this.providers.find((p) => p.name === provider)
        this.showToast(`${providerData?.displayName || provider} API密钥验证成功`, 'success')
      } else {
        const error = await response.json()
        const providerData = this.providers.find((p) => p.name === provider)
        this.showToast(`${providerData?.displayName || provider} API密钥验证失败: ${error.message}`, 'error')
      }
    } catch (error) {
      const providerData = this.providers.find((p) => p.name === provider)
      this.showToast(`${providerData?.displayName || provider} API密钥验证失败: ${error.message}`, 'error')
    }
  }

  // 显示设置弹窗
  async showSettings() {
    console.log('SettingsManager.showSettings() 被调用')
    console.log('查找设置弹窗元素:', document.getElementById('settings-modal'))
    const modal = document.getElementById('settings-modal')
    const overlay = document.getElementById('settings-modal-overlay')

    if (modal) {
      // 显示遮罩层
      if (overlay) {
        overlay.style.display = 'block'
      }

      modal.style.display = 'flex'
      // 先加载设置，然后初始化提供来源
      await this.loadSettings()
      // 初始化提供来源
      this.switchProvider(this.currentProvider)

      // 阻止双击事件冒泡，防止触发窗口最大化（只阻止冒泡，不阻止默认行为）
      const preventDblClick = (e) => {
        e.stopPropagation()
      }

      // 使用 once 选项，每次显示时只绑定一次
      modal.addEventListener('dblclick', preventDblClick, { capture: true, once: false })
      const modalContent = modal.querySelector('.modal-content')
      if (modalContent) {
        modalContent.addEventListener('dblclick', preventDblClick, { capture: true, once: false })
      }

      // 点击遮罩层关闭弹窗
      if (overlay) {
        const overlayClickHandler = (e) => {
          // 确保点击的是遮罩层本身，而不是子元素
          if (e.target === overlay) {
            this.closeSettings()
          }
        }
        overlay.addEventListener('click', overlayClickHandler)
      }
    }
  }

  // 关闭设置弹窗
  closeSettings() {
    const modal = document.getElementById('settings-modal')
    const overlay = document.getElementById('settings-modal-overlay')

    if (modal) {
      modal.style.display = 'none'
    }
    if (overlay) {
      overlay.style.display = 'none'
    }
  }

  // 切换标签页
  switchTab(tabName) {
    // 更新菜单状态
    const menuItems = document.querySelectorAll('.settings-menu .menu-item')
    menuItems.forEach((item) => {
      item.classList.remove('active')
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active')
      }
    })

    // 更新内容显示
    const tabs = document.querySelectorAll('.settings-tab')
    tabs.forEach((tab) => {
      tab.classList.remove('active')
    })

    const activeTab = document.getElementById(`${tabName}-tab`)
    if (activeTab) {
      activeTab.classList.add('active')
    }

    // 根据标签页加载相应数据
    if (tabName === 'models') {
      this.switchProvider(this.currentProvider)
    } else if (tabName === 'default-model') {
      this.loadDefaultModelSettings()
    } else if (tabName === 'general') {
      this.loadGeneralSettings()
    }
  }

  // 加载设置
  async loadSettings() {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const result = await response.json()
        console.log('加载设置API响应:', result) // 添加调试日志

        if (result.success && result.data) {
          // 修复：只保存和使用 data 部分
          this.currentSettings = result.data
          this.currentProvider = result.data.provider || 'openai'
          this.applySettings(result.data)
        } else {
          console.error('API响应格式错误:', result)
          this.showToast('加载设置失败: 响应格式错误', 'error')
        }
      } else {
        console.error('HTTP请求失败:', response.status, response.statusText)
        this.showToast('加载设置失败: HTTP请求失败', 'error')
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      this.showToast('加载设置失败', 'error')
    }
  }

  // 应用设置到界面
  applySettings(settings) {
    // 设置当前提供来源
    const providerSelect = document.getElementById('ai-provider-select')
    if (providerSelect && settings.provider) {
      providerSelect.value = settings.provider
      this.currentProvider = settings.provider
    }

    // API设置
    if (settings.apiKeys) {
      Object.keys(settings.apiKeys).forEach((provider) => {
        const apiKeyInput = document.getElementById(`${provider}-api-key`)
        if (apiKeyInput) {
          apiKeyInput.value = settings.apiKeys[provider] || ''
        }
      })
    }

    // 默认模型设置 - 延迟设置，确保选项已加载
    if (settings.defaultModel) {
      setTimeout(() => {
        const defaultModelSelect = document.getElementById('default-model-select')
        if (defaultModelSelect) {
          defaultModelSelect.value = settings.defaultModel
        }
      }, 100)
    }

    // 模型参数
    if (settings.modelParams) {
      const temperatureInput = document.getElementById('model-temperature')
      const maxTokensInput = document.getElementById('model-max-tokens')
      const topPInput = document.getElementById('model-top-p')

      if (temperatureInput) {
        temperatureInput.value = settings.modelParams.temperature || 0.7
        temperatureInput.nextElementSibling.textContent = temperatureInput.value
      }
      if (maxTokensInput) {
        maxTokensInput.value = settings.modelParams.maxTokens || 2048
      }
      if (topPInput) {
        topPInput.value = settings.modelParams.topP || 1
        topPInput.nextElementSibling.textContent = topPInput.value
      }
    }

    // 常规设置
    if (settings.general) {
      const initialDirInput = document.getElementById('initial-directory')
      const projectNameInput = document.getElementById('project-name')
      const languageSelect = document.getElementById('language-select')
      const themeSelect = document.getElementById('theme-select')
      const autoSaveCheckbox = document.getElementById('auto-save')
      const saveIntervalInput = document.getElementById('save-interval')

      if (initialDirInput) {
        initialDirInput.value = settings.general.initialDirectory || ''
      }
      if (projectNameInput) {
        projectNameInput.value = settings.general.projectName || ''
      }
      if (languageSelect) {
        languageSelect.value = settings.general.language || 'zh-CN'
      }
      if (themeSelect) {
        themeSelect.value = settings.general.theme || 'dark'
      }
      if (autoSaveCheckbox) {
        autoSaveCheckbox.checked = settings.general.autoSave !== false
      }
      if (saveIntervalInput) {
        saveIntervalInput.value = settings.general.saveInterval || 30
      }
    }
  }

  // 保存设置
  async saveSettings() {
    try {
      const settings = this.collectSettings()

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        this.showToast('设置保存成功', 'success')

        // 刷新文件树（如果初始目录发生变化）
        if (settings.general && settings.general.initialDirectory) {
          console.log('设置保存成功，刷新文件树...')
          if (window.aiAgent && window.aiAgent.loadFileTree) {
            await window.aiAgent.loadFileTree()
            console.log('文件树刷新完成')
          }
        }

        this.closeSettings()
      } else {
        const error = await response.json()
        this.showToast(`保存失败: ${error.message}`, 'error')
      }
    } catch (error) {
      this.showToast(`保存失败: ${error.message}`, 'error')
    }
  }

  // 收集设置数据
  collectSettings() {
    const settings = {
      provider: this.currentProvider,
      apiKeys: {
        openai: document.getElementById('openai-api-key')?.value || '',
        claude: document.getElementById('claude-api-key')?.value || '',
        deepseek: document.getElementById('deepseek-api-key')?.value || '',
        gemini: document.getElementById('gemini-api-key')?.value || '',
        custom: document.getElementById('custom-api-key')?.value || '',
      },
      customApi: {
        host: document.getElementById('custom-api-host')?.value || '',
        endpoint: document.getElementById('custom-api-endpoint')?.value || '',
      },
      defaultModel: document.getElementById('default-model-select')?.value || '',
      modelParams: {
        temperature: parseFloat(document.getElementById('model-temperature')?.value || 0.7),
        maxTokens: parseInt(document.getElementById('model-max-tokens')?.value || 2048),
        topP: parseFloat(document.getElementById('model-top-p')?.value || 1),
      },
      general: {
        initialDirectory: document.getElementById('initial-directory')?.value || '',
        projectName: document.getElementById('project-name')?.value || '',
        language: document.getElementById('language-select')?.value || 'zh-CN',
        theme: document.getElementById('theme-select')?.value || 'dark',
        autoSave: document.getElementById('auto-save')?.checked !== false,
        saveInterval: parseInt(document.getElementById('save-interval')?.value || 30),
      },
    }

    return settings
  }

  // 加载默认模型设置
  async loadDefaultModelSettings() {
    // 更新默认模型选择器为当前提供来源的模型
    this.updateDefaultModelSelect(this.currentProvider)
  }

  // 加载常规设置
  loadGeneralSettings() {
    // 常规设置通常从本地存储或服务器加载
    // 这里可以添加特定的加载逻辑
  }

  // 显示添加模型对话框
  showAddModelDialog() {
    const modelName = prompt('请输入模型名称:')
    if (modelName) {
      this.addModel(modelName)
    }
  }

  // 添加模型
  async addModel(modelName) {
    try {
      const provider = this.providers.find((p) => p.name === this.currentProvider)
      if (!provider) {
        this.showToast('请先选择AI提供来源', 'error')
        return
      }

      const response = await fetch('/api/settings/ai-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          displayName: modelName,
          providerId: provider.id,
        }),
      })

      if (response.ok) {
        this.showToast('模型添加成功', 'success')
        await this.loadProvidersAndModels()
        this.switchProvider(this.currentProvider)
      } else {
        const error = await response.json()
        this.showToast(`添加失败: ${error.message}`, 'error')
      }
    } catch (error) {
      this.showToast(`添加失败: ${error.message}`, 'error')
    }
  }

  // 重置模型
  async resetModels() {
    if (confirm('确定要重置所有模型吗？此操作不可撤销。')) {
      try {
        const response = await fetch('/api/settings/init', {
          method: 'POST',
        })

        if (response.ok) {
          this.showToast('模型重置成功', 'success')
          await this.loadProvidersAndModels()
          this.switchProvider(this.currentProvider)
        } else {
          const error = await response.json()
          this.showToast(`重置失败: ${error.message}`, 'error')
        }
      } catch (error) {
        this.showToast(`重置失败: ${error.message}`, 'error')
      }
    }
  }

  // 获取模型
  async fetchModels() {
    try {
      const response = await fetch('/api/settings/init', {
        method: 'POST',
      })

      if (response.ok) {
        this.showToast('模型获取成功', 'success')
        await this.loadProvidersAndModels()
        this.switchProvider(this.currentProvider)
      } else {
        const error = await response.json()
        this.showToast(`获取失败: ${error.message}`, 'error')
      }
    } catch (error) {
      this.showToast(`获取失败: ${error.message}`, 'error')
    }
  }

  // 浏览目录
  browseDirectory() {
    // 在设置页面中直接显示目录列表，不打开弹窗
    const serverDirListEmbed = document.getElementById('server-dir-list-embed-settings')
    const initialDirInput = document.getElementById('initial-directory')

    if (serverDirListEmbed && initialDirInput) {
      // 切换显示/隐藏嵌入式目录树
      const isVisible = serverDirListEmbed.style.display !== 'none'
      serverDirListEmbed.style.display = isVisible ? 'none' : 'block'

      if (!isVisible) {
        // 显示目录列表，从当前输入框的值开始
        const currentPath = initialDirInput.value.trim() || null
        this.showServerDirectoryEmbed(serverDirListEmbed, currentPath)

        // 添加点击外部区域关闭目录列表的功能
        setTimeout(() => {
          const closeOnOutsideClick = (e) => {
            if (!serverDirListEmbed.contains(e.target) && e.target !== document.getElementById('browse-directory')) {
              serverDirListEmbed.style.display = 'none'
              document.removeEventListener('click', closeOnOutsideClick)
            }
          }
          document.addEventListener('click', closeOnOutsideClick)
        }, 100)
      }
    } else {
      this.showToast('目录选择功能暂不可用', 'warning')
    }
  }

  // 处理目录表单提交
  async handleDirectoryFormSubmit(modal) {
    const directoryPath = modal.querySelector('#local-directory-path').value.trim()
    const projectName = modal.querySelector('#project-name').value.trim()

    if (!directoryPath) {
      this.showToast('请输入目录路径', 'warning')
      return
    }

    try {
      const response = await fetch('/api/file/set-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          directoryPath,
          projectName,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 更新设置
        const initialDirInput = document.getElementById('initial-directory')
        if (initialDirInput) {
          initialDirInput.value = directoryPath
        }

        // 关闭模态框
        modal.style.display = 'none'

        this.showToast('本地目录设置成功', 'success')
      } else {
        this.showToast(data.error || '设置失败', 'error')
      }
    } catch (error) {
      this.showToast('设置本地目录失败: ' + error.message, 'error')
    }
  }

  // 显示服务器目录嵌入
  async showServerDirectoryEmbed(container, base = '', level = 0) {
    try {
      const response = await fetch('/api/file/list-directories' + (base ? '?base=' + encodeURIComponent(base) : ''))
      const data = await response.json()

      if (data.success) {
        this.renderDirectoryListEmbed(container, data.directories, base, level)
      } else {
        container.innerHTML =
          '<div style="color:red;padding:12px">获取目录失败: ' + (data.error || '未知错误') + '</div>'
      }
    } catch (error) {
      container.innerHTML = '<div style="color:red;padding:12px">获取目录失败: ' + error.message + '</div>'
    }
  }

  // 渲染目录列表嵌入
  renderDirectoryListEmbed(container, dirs, base, level = 0) {
    container.innerHTML = ''

    // 始终显示上级目录按钮
    const upBtn = document.createElement('div')
    upBtn.className = 'server-dir-item parent-dir'
    upBtn.style.paddingLeft = '12px'
    upBtn.innerHTML = `<i class="fas fa-level-up-alt"></i><span>.. (上级目录)</span>`

    upBtn.onclick = () => {
      // 根据容器ID确定要更新的输入框
      const isSettings = container.id === 'server-dir-list-embed-settings'
      const pathInput = isSettings
        ? document.querySelector('#initial-directory')
        : document.querySelector('#local-directory-path')

      if (pathInput) {
        if (!base) {
          // 已在根目录，再次点击回到服务器根目录（process.cwd()）
          this.showServerDirectoryEmbed(container, '', 0)
        } else {
          const up = base.replace(/\/?[^/]+$/, '')
          pathInput.value = up
          this.showServerDirectoryEmbed(container, up, Math.max(0, level - 1))
        }
      }
    }
    container.appendChild(upBtn)

    // 目录列表
    dirs.forEach((dir) => {
      const item = document.createElement('div')
      item.className = 'server-dir-item'
      item.style.paddingLeft = level * 20 + 12 + 'px'

      item.innerHTML = `
        <i class="fas fa-folder"></i>
        <span>${dir.name}</span>
      `

      item.onclick = () => {
        // 根据容器ID确定要更新的输入框
        const isSettings = container.id === 'server-dir-list-embed-settings'
        const pathInput = isSettings
          ? document.querySelector('#initial-directory')
          : document.querySelector('#local-directory-path')

        if (pathInput) {
          // 普通目录，进入下一级目录
          this.showServerDirectoryEmbed(container, dir.path, level + 1)
        }
      }

      // 添加右键选择功能
      item.oncontextmenu = (e) => {
        e.preventDefault()
        // 根据容器ID确定要更新的输入框
        const isSettings = container.id === 'server-dir-list-embed-settings'
        const pathInput = isSettings
          ? document.querySelector('#initial-directory')
          : document.querySelector('#local-directory-path')

        if (pathInput) {
          pathInput.value = dir.path
          container.style.display = 'none'
        }
      }

      container.appendChild(item)
    })

    // 添加底部说明
    const tip = document.createElement('div')
    tip.style.cssText = 'color:#888;font-size:13px;margin-top:8px;padding:8px 12px;'
    tip.innerHTML = `📁 单击浏览下级，<b>右键选择</b>当前目录`
    container.appendChild(tip)
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    // 这里可以集成现有的toast系统
    console.log(`[${type.toUpperCase()}] ${message}`)
    // 如果有全局的toast系统，可以调用它
    if (window.aiAgent && window.aiAgent.showToast) {
      window.aiAgent.showToast(message, type)
    }
  }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
  console.log('SettingsManager初始化开始')
  window.settingsManager = new SettingsManager()
  console.log('SettingsManager初始化完成', window.settingsManager)
})
