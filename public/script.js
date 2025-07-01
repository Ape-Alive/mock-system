document.addEventListener('DOMContentLoaded', () => {
  // 全局变量
  let mockItems = []
  let currentEditFilename = null
  let deleteCallback = null
  let currentTestItem = null
  const refreshPreviewBtn = document.getElementById('refresh-preview')
  const mockjsNotice = document.getElementById('mockjs-notice')
  // DOM 元素
  const themeToggle = document.getElementById('theme-toggle')
  const addMockBtn = document.getElementById('add-mock')
  const mockList = document.getElementById('mock-list')
  const searchInput = document.getElementById('search-input')
  const mockModal = document.getElementById('mock-modal')
  const confirmModal = document.getElementById('confirm-modal')
  const mockForm = document.getElementById('mock-form')
  const modalTitle = document.getElementById('modal-title')
  const filenameInput = document.getElementById('filename')
  const pathNameInput = document.getElementById('pathName')
  const pathInput = document.getElementById('path')
  const pathTypeSelect = document.getElementById('pathType')
  const mockTypeSelect = document.getElementById('mockType')
  const queryParamsTextarea = document.getElementById('queryParams')
  const headersTextarea = document.getElementById('headers')
  const pathContentTextarea = document.getElementById('pathContent')
  const jsonPreview = document.getElementById('json-preview')
  const loadingIndicator = document.getElementById('loading')
  const closeButtons = document.querySelectorAll('.close')
  const confirmCancelBtn = document.getElementById('confirm-cancel')
  const confirmActionBtn = document.getElementById('confirm-action')
  let isTableMode = false
  const toggleTableModeBtn = document.getElementById('toggle-table-mode')
  const mockTableContainer = document.getElementById('mock-table-container')
  const mockTableBody = document.getElementById('mock-table-body')
  const importOpenapiBtn = document.getElementById('import-openapi-btn')
  const importModal = document.getElementById('import-modal')
  const importForm = document.getElementById('import-form')
  const importFileInput = document.getElementById('import-file')
  const bodyGroup = document.getElementById('body-group')
  const bodyParamsTextarea = document.getElementById('bodyParams')
  const responseHeadersTextarea = document.getElementById('responseHeaders')
  const groupInput = document.getElementById('group-input')
  let currentGroup = { id: 0, name: '全部', fileNames: null }
  const groupTreeList = document.getElementById('group-tree-list')
  const addGroupBtn = document.getElementById('add-group-btn')
  let selectedFiles = new Set()
  const batchBar = document.getElementById('batch-group-bar')
  const selectedCount = document.getElementById('selected-count')
  const batchGroupInput = document.getElementById('batch-group-input')
  const batchGroupBtn = document.getElementById('batch-group-btn')

  const selectDirBtn = document.getElementById('select-directory-btn')
  const dirPicker = document.getElementById('directory-picker')
  const dirInput = document.getElementById('local-directory-path')
  const serverDirListEmbed = document.getElementById('server-dir-list-embed')
  let serverDirEmbedVisible = false

  if (selectDirBtn && dirPicker && dirInput && serverDirListEmbed) {
    selectDirBtn.addEventListener('click', async function () {
      if (isElectron() && window.electronAPI && window.electronAPI.selectDirectory) {
        window.electronAPI.selectDirectory().then((dirPath) => {
          if (dirPath) {
            dirInput.value = dirPath
          }
        })
      } else {
        // 切换显示/隐藏嵌入式目录树
        serverDirEmbedVisible = !serverDirEmbedVisible
        serverDirListEmbed.style.display = serverDirEmbedVisible ? '' : 'none'
        if (serverDirEmbedVisible) {
          showServerDirectoryEmbed()
        }
      }
    })
    dirPicker.addEventListener('change', function (e) {
      if (e.target.files.length > 0) {
        const firstFile = e.target.files[0]
        let fullPath = firstFile.webkitRelativePath || firstFile.path || ''
        if (fullPath) {
          const dir = fullPath.split('/')[0]
          dirInput.value = dir
        }
      }
    })
  }

  // 嵌入式服务器目录树
  function showServerDirectoryEmbed(base = '', level = 0, selectedPath = '') {
    fetch('/api/file/list-directories' + (base ? '?base=' + encodeURIComponent(base) : ''))
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          renderDirectoryListEmbed(data.directories, base, level, selectedPath)
        } else {
          serverDirListEmbed.innerHTML =
            '<div style="color:red;padding:12px">获取目录失败: ' + (data.error || '未知错误') + '</div>'
        }
      })
  }

  function renderDirectoryListEmbed(dirs, base, level = 0, selectedPath = '') {
    serverDirListEmbed.innerHTML = ''
    // 始终显示上级目录按钮
    const upBtn = document.createElement('div')
    upBtn.className = 'dir-item up-dir dir-tree-level-' + Math.max(0, level - 1)
    upBtn.innerHTML = `<span class="dir-icon">⬆️</span>.. (上级目录)`
    upBtn.onclick = () => {
      if (!base) {
        // 已在根目录，再次点击回到服务器根目录（process.cwd()）
        showServerDirectoryEmbed('', 0, selectedPath)
      } else {
        const up = base.replace(/\/?[^/]+$/, '')
        showServerDirectoryEmbed(up, Math.max(0, level - 1), selectedPath)
      }
    }
    serverDirListEmbed.appendChild(upBtn)
    // 目录列表
    dirs.forEach((dir) => {
      const item = document.createElement('div')
      item.className = 'dir-item dir-tree-level-' + level + (dir.path === selectedPath ? ' selected' : '')
      item.innerHTML = `<span class="dir-icon">📁</span>${dir.name} <span style='color:#aaa;font-size:12px;margin-left:8px'>(${dir.path})</span>`
      item.onclick = () => {
        // 进入下一级目录
        showServerDirectoryEmbed(dir.path, level + 1, selectedPath)
      }
      // 支持选中当前目录
      item.oncontextmenu = (e) => {
        e.preventDefault()
        if (dirInput) dirInput.value = dir.path
        serverDirListEmbed.style.display = 'none'
        serverDirEmbedVisible = false
      }
      // 单击选中并高亮
      item.onmousedown = (e) => {
        if (e.button === 0) {
          serverDirListEmbed.querySelectorAll('.dir-item').forEach((el) => el.classList.remove('selected'))
          item.classList.add('selected')
        }
      }
      serverDirListEmbed.appendChild(item)
    })
    // 底部说明
    const tip = document.createElement('div')
    tip.style = 'color:#888;font-size:13px;margin-top:8px;'
    tip.innerHTML = `📁 单击浏览下级，<b>右键选择</b>当前目录`
    serverDirListEmbed.appendChild(tip)
  }

  // 判断是否在 Electron 环境
  function isElectron() {
    return !!(window && window.process && window.process.type)
  }

  // 初始化
  init()

  // 事件监听
  themeToggle.addEventListener('click', toggleTheme)
  addMockBtn.addEventListener('click', () => openMockModal())
  searchInput.addEventListener('input', filterMockList)
  mockForm.addEventListener('submit', handleFormSubmit)
  pathContentTextarea.addEventListener('input', updateJsonPreview)
  closeButtons.forEach((btn) => btn.addEventListener('click', closeAllModals))
  confirmCancelBtn.addEventListener('click', () => confirmModal.classList.remove('active'))
  confirmActionBtn.addEventListener('click', handleConfirmAction)
  refreshPreviewBtn.addEventListener('click', updateJsonPreview)
  toggleTableModeBtn.addEventListener('click', () => {
    isTableMode = !isTableMode
    if (isTableMode) {
      mockList.style.display = 'none'
      mockTableContainer.style.display = ''
      toggleTableModeBtn.innerHTML = '<i class="fas fa-th-large"></i>'
    } else {
      mockList.style.display = ''
      mockTableContainer.style.display = 'none'
      toggleTableModeBtn.innerHTML = '<i class="fas fa-table"></i>'
    }
    filterMockList() // 切换模式时始终用当前分组过滤
  })
  updateJsonPreview
  // 打开导入模态框
  importOpenapiBtn.addEventListener('click', () => {
    importModal.classList.add('active')
  })
  // 关闭导入模态框
  importModal.querySelectorAll('.close').forEach((btn) =>
    btn.addEventListener('click', () => {
      importModal.classList.remove('active')
    })
  )
  // 提交导入表单
  importForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const file = importFileInput.files[0]
    if (!file) {
      alert('请选择要上传的文件')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    // 新增：传递当前分组
    if (
      currentGroup &&
      currentGroup.id !== 0 &&
      currentGroup.id !== -1 &&
      currentGroup.name !== '全部' &&
      currentGroup.name !== '未分组'
    ) {
      formData.append('group', currentGroup.name)
    } else {
      formData.append('group', '')
    }
    showLoading()
    try {
      const response = await fetch('/import-openapi', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || '导入失败')
      }
      importModal.classList.remove('active')
      await loadMockList()
      await loadGroupTree()
      alert('导入成功')
    } catch (err) {
      showError('导入失败: ' + err.message)
    } finally {
      hideLoading()
    }
  })

  // 控制body参数输入框显示
  function updateBodyGroup() {
    const method = pathTypeSelect.value
    const bodyGroupDesc = document.getElementById('body-group-desc')
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      bodyGroup.style.display = ''
      if (bodyGroupDesc) bodyGroupDesc.style.display = ''
    } else {
      bodyGroup.style.display = 'none'
      bodyParamsTextarea.value = ''
      if (bodyGroupDesc) bodyGroupDesc.style.display = 'none'
    }
  }
  pathTypeSelect.addEventListener('change', updateBodyGroup)
  // 初始化时也调用
  updateBodyGroup()

  // 初始化函数
  function init() {
    // 检查主题偏好
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme')
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>'
    }
    // 先加载mock列表
    loadMockList()
    // 再初始化分组树
    loadGroupTree()
    // 初始化文件管理器
    window.fileManager = new FileManager()
  }

  // 主题切换
  function toggleTheme() {
    document.body.classList.toggle('dark-theme')

    if (document.body.classList.contains('dark-theme')) {
      localStorage.setItem('theme', 'dark')
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>'
    } else {
      localStorage.setItem('theme', 'light')
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>'
    }
  }

  // 加载mock列表
  async function loadMockList() {
    showLoading()
    try {
      const response = await fetch('/mock-list')
      if (!response.ok) throw new Error('无法加载接口列表')
      mockItems = await response.json()
    } catch (error) {
      showError('加载失败: ' + error.message)
    } finally {
      hideLoading()
    }
  }

  // 渲染mock列表
  function renderMockList(items) {
    mockList.innerHTML = ''
    mockList.style.display = ''
    mockTableContainer.style.display = 'none'
    toggleTableModeBtn.innerHTML = '<i class="fas fa-table"></i>'
    isTableMode = false
    if (items.length === 0) {
      mockList.innerHTML = '<div class="no-results">没有找到接口</div>'
      return
    }
    items.forEach((item) => {
      const card = createMockCard(item)
      // 多选复选框
      const checkboxBox = document.createElement('div')
      checkboxBox.className = 'mock-checkbox-box'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'mock-checkbox'
      checkbox.checked = selectedFiles.has(item.fileName)
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) selectedFiles.add(item.fileName)
        else selectedFiles.delete(item.fileName)
      })
      checkboxBox.appendChild(checkbox)
      card.insertBefore(checkboxBox, card.firstChild)
      mockList.appendChild(card)
    })
  }

  function renderMockTable(items) {
    mockTableBody.innerHTML = ''
    mockTableContainer.style.display = ''
    mockList.style.display = 'none'
    toggleTableModeBtn.innerHTML = '<i class="fas fa-th-large"></i>'
    isTableMode = true
    if (items.length === 0) {
      mockTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">没有找到接口</td></tr>'
      return
    }
    items.forEach((item) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
                <td class="checkbox-col"></td>
                <td>${item.pathName}</td>
                <td style="font-family:monospace;word-break:break-all;">${item.path}</td>
                <td><span class="method ${item.pathType.toLowerCase()}">${item.pathType}</span></td>
                <td>${formatDate(item.createdAt)}</td>
                <td>
                    <button class="btn test" data-filename="${item.fileName}">测试</button>
                    <button class="btn secondary edit" data-filename="${item.fileName}">编辑</button>
                    <button class="btn danger delete" data-filename="${item.fileName}">删除</button>
                </td>
            `
      // 多选复选框
      const checkboxBox = document.createElement('div')
      checkboxBox.className = 'mock-checkbox-box'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'mock-checkbox'
      checkbox.checked = selectedFiles.has(item.fileName)
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) selectedFiles.add(item.fileName)
        else selectedFiles.delete(item.fileName)
      })
      checkboxBox.appendChild(checkbox)
      tr.querySelector('td.checkbox-col').appendChild(checkboxBox)
      // 按钮事件
      tr.querySelector('.test').addEventListener('click', () => testMockInterface(item))
      tr.querySelector('.edit').addEventListener('click', () => openMockModal(item.fileName))
      tr.querySelector('.delete').addEventListener('click', () => openDeleteConfirm(item))
      mockTableBody.appendChild(tr)
    })
    // 全选checkbox逻辑
    const allCheckbox = document.getElementById('table-checkbox-all')
    if (allCheckbox) {
      allCheckbox.checked = items.length > 0 && items.every((item) => selectedFiles.has(item.fileName))
      allCheckbox.indeterminate = items.some((item) => selectedFiles.has(item.fileName)) && !allCheckbox.checked
      allCheckbox.onchange = function () {
        if (this.checked) {
          items.forEach((item) => selectedFiles.add(item.fileName))
        } else {
          items.forEach((item) => selectedFiles.delete(item.fileName))
        }
        renderMockTable(items)
      }
    }
  }

  // 创建mock卡片
  function createMockCard(item) {
    const card = document.createElement('div')
    card.className = 'mock-card'

    const methodClass = `method ${item.pathType.toLowerCase()}`

    card.innerHTML = `
            <div class="mock-header">
                <span class="${methodClass}">${item.pathType}</span>
                <h3 class="mock-title">${item.pathName}</h3>
            </div>
            <div class="mock-body">
                <p class="mock-path">${item.path}</p>
                <div class="mock-meta">
                    <small>创建: ${formatDate(item.createdAt)}</small>
                </div>
            </div>
            <div class="mock-footer">
                <button class="btn secondary edit" data-filename="${item.fileName}">编辑</button>
                <button class="btn danger delete" data-filename="${item.fileName}">删除</button>
            </div>
        `
    card.innerHTML = `
        <div class="mock-header">
            <span class="${methodClass}">${item.pathType}</span>
            <h3 class="mock-title">${item.pathName}</h3>
        </div>
        <div class="mock-body">
            <p class="mock-path">${item.path}</p>
            <div class="mock-meta">
                <small>创建: ${formatDate(item.createdAt)}</small>
            </div>
        </div>
        <div class="mock-footer">
            <button class="btn test" data-filename="${item.fileName}">测试</button>
            <button class="btn secondary edit" data-filename="${item.fileName}">编辑</button>
            <button class="btn danger delete" data-filename="${item.fileName}">删除</button>
        </div>
    `

    // 添加测试事件
    card.querySelector('.test').addEventListener('click', () => testMockInterface(item))
    // 添加编辑和删除事件
    card.querySelector('.edit').addEventListener('click', () => openMockModal(item.fileName))
    card.querySelector('.delete').addEventListener('click', () => openDeleteConfirm(item))

    return card
  }
  // 在mockTypeSelect事件监听中添加更新预览
  mockTypeSelect.addEventListener('change', function () {
    updateJsonPreview()
    // 显示/隐藏Mock.js使用提示
    let mockTip = document.getElementById('mockjs-tip')
    if (this.value === 'mockjsTemplate') {
      if (!mockTip) {
        mockTip = document.createElement('div')
        mockTip.id = 'mockjs-tip'
        mockTip.className = 'mock-template-tip'
        mockTip.innerHTML = '<i class="fas fa-lightbulb"></i> 使用Mock.js模板语法，如: "@cname", "age|18-60": 1'
        pathContentTextarea.parentElement.appendChild(mockTip)
      }
    } else if (mockTip) {
      mockTip.remove()
    }
  })

  // 打开mock模态框
  async function openMockModal(filename = null) {
    // 重置表单
    mockForm.reset()
    currentEditFilename = filename
    if (filename) {
      modalTitle.textContent = '编辑接口'
      await loadMockData(filename)
    } else {
      modalTitle.textContent = '创建新接口'
      filenameInput.value = ''
      // 新建接口时自动归组
      if (
        currentGroup &&
        currentGroup.id !== 0 &&
        currentGroup.id !== -1 &&
        currentGroup.name !== '全部' &&
        currentGroup.name !== '未分组'
      ) {
        groupInput.value = currentGroup.name
      } else {
        groupInput.value = ''
      }
    }
    // 初始化模板提示
    let mockTip = document.getElementById('mockjs-tip')
    if (mockTypeSelect.value === 'mockjsTemplate') {
      if (!mockTip) {
        mockTip = document.createElement('div')
        mockTip.id = 'mockjs-tip'
        mockTip.className = 'mock-template-tip'
        mockTip.innerHTML = '<i class="fas fa-lightbulb"></i> 使用Mock.js模板语法，如: "@cname", "age|18-60": 1'
        pathContentTextarea.parentElement.appendChild(mockTip)
      }
    } else if (mockTip) {
      mockTip.remove()
    }
    updateJsonPreview()
    updateBodyGroup()
    mockModal.classList.add('active')
    groupInput.value = groupInput.value || (window.lastLoadedMockData && window.lastLoadedMockData.group) || ''
  }

  // 加载mock数据
  async function loadMockData(filename) {
    showLoading()

    try {
      const response = await fetch(`/mock-item/${filename}`)
      if (!response.ok) throw new Error('无法加载接口数据')

      const data = await response.json()
      window.lastLoadedMockData = data

      // 填充表单
      filenameInput.value = data.fileName
      pathNameInput.value = data.pathName
      pathInput.value = data.path
      pathTypeSelect.value = data.pathType
      mockTypeSelect.value = data.mockType
      queryParamsTextarea.value = data.queryParams ? JSON.stringify(data.queryParams, null, 2) : ''
      headersTextarea.value = data.headers ? JSON.stringify(data.headers, null, 2) : ''
      pathContentTextarea.value = JSON.stringify(data.pathContent, null, 2)
      bodyParamsTextarea.value = data.bodyParams ? JSON.stringify(data.bodyParams, null, 2) : ''
      responseHeadersTextarea.value = data.responseHeaders ? JSON.stringify(data.responseHeaders, null, 2) : ''
      groupInput.value = data.group || ''
      // 新增：回填说明
      function toJSONString(val) {
        if (!val) return ''
        if (typeof val === 'string') return val
        try {
          return JSON.stringify(val, null, 2)
        } catch {
          return String(val)
        }
      }
      const queryParamsDescTextarea = document.getElementById('queryParamsDesc')
      const bodyParamsDescTextarea = document.getElementById('bodyParamsDesc')
      const responseHeadersDescTextarea = document.getElementById('responseHeadersDesc')
      const pathContentDescTextarea = document.getElementById('pathContentDesc')
      if (queryParamsDescTextarea) queryParamsDescTextarea.value = toJSONString(data.queryParamsDesc)
      if (bodyParamsDescTextarea) bodyParamsDescTextarea.value = toJSONString(data.bodyParamsDesc)
      if (responseHeadersDescTextarea) responseHeadersDescTextarea.value = toJSONString(data.responseHeadersDesc)
      if (pathContentDescTextarea) pathContentDescTextarea.value = toJSONString(data.pathContentDesc)
    } catch (error) {
      showError('加载失败: ' + error.message)
    } finally {
      hideLoading()
    }
  }

  // 处理表单提交
  async function handleFormSubmit(e) {
    e.preventDefault()

    // 验证JSON
    if (!isValidJson(pathContentTextarea.value)) {
      showError('响应内容必须是有效的JSON格式')
      return
    }

    if (queryParamsTextarea.value && !isValidJson(queryParamsTextarea.value)) {
      showError('查询参数必须是有效的JSON格式')
      return
    }

    if (headersTextarea.value && !isValidJson(headersTextarea.value)) {
      showError('请求头必须是有效的JSON格式')
      return
    }

    if (['POST', 'PUT', 'DELETE'].includes(pathTypeSelect.value)) {
      if (!isValidJson(bodyParamsTextarea.value)) {
        showError('Body参数必须是有效的JSON格式')
        return
      }
    }
    if (!isValidJson(responseHeadersTextarea.value)) {
      showError('响应头内容必须是有效的JSON格式')
      return
    }

    // 新增：收集说明字段
    const queryParamsDescTextarea = document.getElementById('queryParamsDesc')
    const bodyParamsDescTextarea = document.getElementById('bodyParamsDesc')
    const responseHeadersDescTextarea = document.getElementById('responseHeadersDesc')
    const pathContentDescTextarea = document.getElementById('pathContentDesc')

    // 新增：安全解析说明字段
    function safeParse(str) {
      if (!str) return ''
      try {
        return JSON.parse(str)
      } catch {
        return str
      }
    }

    const mockData = {
      pathName: pathNameInput.value,
      path: pathInput.value,
      pathType: pathTypeSelect.value,
      mockType: mockTypeSelect.value,
      queryParams: queryParamsTextarea.value || null,
      queryParamsDesc: queryParamsDescTextarea ? safeParse(queryParamsDescTextarea.value) : '',
      headers: headersTextarea.value || null,
      pathContent: pathContentTextarea.value,
      bodyParams: bodyParamsTextarea.value || null,
      bodyParamsDesc: bodyParamsDescTextarea ? safeParse(bodyParamsDescTextarea.value) : '',
      responseHeaders: responseHeadersTextarea.value,
      responseHeadersDesc: responseHeadersDescTextarea ? safeParse(responseHeadersDescTextarea.value) : '',
      pathContentDesc: pathContentDescTextarea ? safeParse(pathContentDescTextarea.value) : '',
      group: groupInput.value.trim(),
    }

    showLoading()

    try {
      if (currentEditFilename) {
        // 更新现有mock
        await updateMock(currentEditFilename, mockData)
      } else {
        // 创建新mock
        await createMock(mockData)
      }

      // 关闭模态框并刷新列表
      closeAllModals()
      await loadMockList()
      await loadGroupTree()
    } catch (error) {
      showError('保存失败: ' + error.message)
    } finally {
      hideLoading()
    }
  }

  // 创建新mock
  async function createMock(data) {
    const response = await fetch('/create-mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || '创建失败')
    }
  }

  // 更新mock
  async function updateMock(filename, data) {
    const response = await fetch(`/update-mock/${filename}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || '更新失败')
    }
  }

  // 打开删除确认框
  function openDeleteConfirm(item) {
    document.getElementById(
      'confirm-message'
    ).textContent = `您确定要删除接口 "${item.pathName}" (${item.path}) 吗？此操作不可撤销。`

    deleteCallback = async () => {
      showLoading()

      try {
        const response = await fetch(`/delete-mock/${item.fileName}`, {
          method: 'DELETE',
        })

        if (!response.ok) throw new Error('删除失败')

        // 刷新列表
        await loadMockList()
      } catch (error) {
        showError('删除失败: ' + error.message)
      } finally {
        hideLoading()
      }
    }

    confirmModal.classList.add('active')
  }

  // 处理确认操作
  function handleConfirmAction() {
    if (deleteCallback) {
      deleteCallback()
      deleteCallback = null
    }
    confirmModal.classList.remove('active')
  }

  // 过滤mock列表
  function filterMockList() {
    const searchTerm = searchInput.value.toLowerCase()
    let filtered = mockItems
    // 只显示当前分组下的接口
    if (currentGroup.id === 0) {
      // 全部
      filtered = mockItems
    } else if (currentGroup.id === -1) {
      // 未分组
      filtered = mockItems.filter((item) => !item.group || !item.group.trim())
    } else if (Array.isArray(currentGroup.fileNames)) {
      // 其它分组
      filtered = mockItems.filter((item) => currentGroup.fileNames.includes(item.fileName))
    }
    // 再做搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.pathName.toLowerCase().includes(searchTerm) ||
          item.path.toLowerCase().includes(searchTerm) ||
          item.pathType.toLowerCase().includes(searchTerm)
      )
    }
    // 新增：同步给AI代码生成器弹窗
    window.currentFilteredMockItems = filtered
    if (isTableMode) {
      renderMockTable(filtered)
    } else {
      renderMockList(filtered)
    }
  }

  // 更新JSON预览
  function updateJsonPreview() {
    try {
      const content = pathContentTextarea.value.trim()
      if (!content) {
        jsonPreview.textContent = '{}'
        jsonPreview.className = ''
        mockjsNotice.style.display = 'none'
        return
      }

      // 解析JSON
      const json = JSON.parse(content)

      // 检查是否是Mock.js模板
      const isMockTemplate = mockTypeSelect.value === 'mockjsTemplate'
      mockjsNotice.style.display = isMockTemplate ? 'block' : 'none'

      let previewContent
      if (isMockTemplate) {
        try {
          // 使用Mock.js生成数据
          previewContent = Mock.mock(json)
        } catch (mockError) {
          throw new Error(`Mock.js模板错误: ${mockError.message}`)
        }
      } else {
        previewContent = json
      }

      // 显示预览
      jsonPreview.textContent = JSON.stringify(previewContent, null, 2)
      jsonPreview.className = ''

      // 清除任何之前的错误
      const existingError = jsonPreview.parentElement.querySelector('.json-error')
      if (existingError) {
        existingError.remove()
      }
    } catch (error) {
      // 显示错误信息
      jsonPreview.textContent = '{}'
      jsonPreview.className = 'error'

      // 清除任何之前的错误
      const existingError = jsonPreview.parentElement.querySelector('.json-error')
      if (existingError) {
        existingError.remove()
      }

      // 创建错误元素
      const errorElement = document.createElement('div')
      errorElement.className = 'json-error'
      errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`

      jsonPreview.parentElement.appendChild(errorElement)
    }
  }

  // 关闭所有模态框
  function closeAllModals() {
    mockModal.classList.remove('active')
    confirmModal.classList.remove('active')
    document.getElementById('test-modal').classList.remove('active')
    if (importModal) importModal.classList.remove('active')
  }

  // 显示加载指示器
  function showLoading() {
    loadingIndicator.classList.add('active')
  }

  // 隐藏加载指示器
  function hideLoading() {
    loadingIndicator.classList.remove('active')
  }

  // 显示错误消息
  function showError(message) {
    alert(message) // 实际应用中应使用更友好的UI
  }

  // 验证JSON
  function isValidJson(str) {
    try {
      JSON.parse(str)
      return true
    } catch (e) {
      return false
    }
  }

  // 格式化日期
  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  // 添加测试接口函数
  async function testMockInterface(item) {
    showLoading()
    currentTestItem = item

    try {
      // 获取接口详情
      const response = await fetch(`/mock-item/${item.fileName}`)
      if (!response.ok) throw new Error('无法加载接口详情')

      const mockData = await response.json()

      // 准备测试请求
      const testUrl = new URL(mockData.path, window.location.origin)

      // 添加查询参数
      if (mockData.queryParams && Object.keys(mockData.queryParams).length > 0) {
        Object.entries(mockData.queryParams).forEach(([key, value]) => {
          testUrl.searchParams.append(key, value)
        })
      }

      // 准备请求头
      const headers = mockData.headers || {}

      // 准备请求配置
      const config = {
        method: mockData.pathType,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }

      // 如果是POST/PUT/DELETE请求，添加请求体
      let realRequestBody = null
      if (['POST', 'PUT', 'DELETE'].includes(mockData.pathType)) {
        if (mockData.bodyParams) {
          let tpl = typeof mockData.bodyParams === 'string' ? JSON.parse(mockData.bodyParams) : mockData.bodyParams
          try {
            realRequestBody = Mock.mock(tpl)
          } catch (e) {
            realRequestBody = tpl
          }
          config.body = JSON.stringify(realRequestBody)
        } else {
          config.body = JSON.stringify(mockData.pathContent)
          realRequestBody = mockData.pathContent
        }
      }

      // 记录请求详情用于展示
      const requestDetails = {
        url: testUrl.toString(),
        method: mockData.pathType,
        headers: config.headers,
        queryParams: mockData.queryParams || {},
        body: realRequestBody,
      }

      // 发送测试请求
      const startTime = Date.now()
      const testResponse = await fetch(testUrl, config)
      const responseTime = Date.now() - startTime

      // 获取响应数据
      let responseData
      try {
        responseData = await testResponse.json()
      } catch {
        responseData = await testResponse.text()
      }

      // 获取响应头
      const responseHeaders = {}
      testResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      // 显示测试结果
      showTestResults({
        status: testResponse.status,
        statusText: testResponse.statusText,
        responseTime,
        responseData,
        responseHeaders,
        request: requestDetails,
      })
    } catch (error) {
      showError('测试失败: ' + error.message)
    } finally {
      hideLoading()
    }
  }

  // 显示测试结果函数
  function showTestResults(results) {
    const testModal = document.getElementById('test-modal')
    const testMethod = testModal.querySelector('.test-method')
    const testUrl = testModal.querySelector('.test-url')
    const testStatus = testModal.querySelector('.test-status')
    const responseBody = testModal.querySelector('.response-body')
    const responseHeaders = testModal.querySelector('.response-headers')
    const requestHeaders = testModal.querySelector('.request-headers')
    const requestQuery = testModal.querySelector('.request-query')
    const requestBody = testModal.querySelector('.request-body')
    const requestBodySection = document.getElementById('request-body-section')

    // 设置基本信息
    testMethod.textContent = results.request.method
    testMethod.className = `test-method method ${results.request.method.toLowerCase()}`
    testUrl.textContent = results.request.url
    testStatus.textContent = `状态码: ${results.status} ${results.statusText} | 耗时: ${results.responseTime}ms`
    testStatus.className = `test-status ${
      results.status >= 200 && results.status < 300 ? 'status-success' : 'status-error'
    }`

    // 设置响应内容
    responseBody.textContent =
      typeof results.responseData === 'string' ? results.responseData : JSON.stringify(results.responseData, null, 2)

    // 设置响应头
    responseHeaders.textContent = Object.entries(results.responseHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    // 设置请求详情
    requestHeaders.textContent = Object.entries(results.request.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    requestQuery.textContent = Object.entries(results.request.queryParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // 设置请求体（如果有）
    if (results.request.body) {
      requestBody.textContent = JSON.stringify(results.request.body, null, 2)
      requestBodySection.style.display = 'block'
    } else {
      requestBodySection.style.display = 'none'
    }

    // 激活第一个标签页
    testModal.querySelector('.tab').classList.add('active')
    testModal.querySelector('.tab-pane').classList.add('active')

    // 显示模态框
    testModal.classList.add('active')

    // 添加标签页切换事件
    testModal.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        // 移除所有激活状态
        testModal.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
        testModal.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'))

        // 激活当前标签
        tab.classList.add('active')
        const tabId = tab.getAttribute('data-tab')
        document.getElementById(tabId).classList.add('active')
      })
    })
  }

  // 渲染分组树
  function buildGroupTree(groups) {
    const tree = {}
    groups.forEach((group) => {
      const parts = group
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)
      let node = tree
      parts.forEach((part, idx) => {
        if (!node[part]) node[part] = {}
        node = node[part]
      })
    })
    return tree
  }

  function renderGroupTree(items) {
    // 统计所有分组
    const groupSet = new Set()
    items.forEach((item) => {
      groupSet.add(item.group && item.group.trim() ? item.group.trim() : '未分组')
    })
    const groups = Array.from(groupSet).sort()
    groupTreeList.innerHTML = ''
    // 全部分组
    const allLi = document.createElement('li')
    allLi.textContent = '全部'
    allLi.className = currentGroup.name === '全部' ? 'active' : ''
    allLi.addEventListener('click', () => {
      currentGroup = { id: 0, name: '全部', fileNames: null }
      filterMockList()
    })
    groupTreeList.appendChild(allLi)
    // 构建树
    const tree = buildGroupTree(groups.filter((g) => g !== '全部'))
    function renderTreeNode(node, path) {
      Object.keys(node).forEach((key) => {
        const fullPath = path ? path + '/' + key : key
        const li = document.createElement('li')
        li.textContent = key
        li.className = currentGroup.name === fullPath ? 'active' : ''
        li.addEventListener('click', (e) => {
          e.stopPropagation()
          currentGroup = { id: Number(key), name: key, fileNames: null }
          filterMockList()
        })
        // 子节点
        if (Object.keys(node[key]).length > 0) {
          const ul = document.createElement('ul')
          renderTreeNode(node[key], fullPath)
          li.appendChild(ul)
        }
        groupTreeList.appendChild(li)
      })
    }
    renderTreeNode(tree, '')
  }

  // 渲染当前分组下的接口
  function renderCurrentGroupList() {
    let filtered
    if (currentGroup.id === 0) {
      filtered = mockItems
    } else if (currentGroup.id === -1) {
      filtered = mockItems.filter((item) => !item.group || !item.group.trim())
    } else if (Array.isArray(currentGroup.fileNames)) {
      filtered = mockItems.filter((item) => currentGroup.fileNames.includes(item.fileName))
    }
    if (isTableMode) {
      renderMockTable(filtered)
    } else {
      renderMockList(filtered)
    }
  }

  // 新增分组弹窗逻辑
  $('#add-group-btn')
    .off('click')
    .on('click', function () {
      // 获取当前选中分组id作为父分组
      let parentId = 0
      // 通过jsTree获取当前选中分组
      const selected = $('#group-tree-jstree').jstree('get_selected')
      if (selected && selected.length) {
        const selId = Number(selected[0])
        // 禁止未分组下新建子分组
        if (selId === -1) {
          showInfoModal('未分组下不能创建子分组')
          return
        }
        if (selId === 0) {
          parentId = 0
        } else {
          parentId = selId
        }
      }
      // 只有不是未分组时才弹出新增分组弹框
      $('#group-modal').addClass('active')
      $('#group-name').val('')
      // 绑定表单提交事件
      $('#group-form')
        .off('submit')
        .on('submit', function (e) {
          e.preventDefault()
          const groupName = $('#group-name').val().trim()
          if (!groupName) return alert('请输入分组名')
          fetch('/api/group-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: groupName, parentId }),
          }).then(async (res) => {
            if (res.ok) {
              $('#group-modal').removeClass('active')
              await loadGroupTree()
            } else {
              const data = await res.json()
              alert(data.error || '新增分组失败')
            }
          })
        })
    })

  // ====== jsTree分组树相关 ======
  async function loadGroupTree() {
    const res = await fetch('/api/group-info')
    const groupData = await res.json()
    const jsTreeData = groupData.map((g) => ({
      id: String(g.id),
      text: g.name,
      children: groupToJsTree(g.children || []),
      icon: 'fas fa-folder',
      data: g,
    }))
    $('#group-tree-jstree').jstree('destroy')
    $('#group-tree-jstree')
      .off('select_node.jstree')
      .jstree({
        core: { data: jsTreeData, check_callback: true },
      })
      .on('select_node.jstree', async function (e, data) {
        // 切换分组前清空已勾选的接口
        selectedFiles.clear()
        // 统一currentGroup对象
        currentGroup = {
          id: Number(data.node.id),
          name: data.node.text,
          fileNames: data.node.data && data.node.data.files ? data.node.data.files : null,
        }
        // 每次切换分组都刷新mockItems
        await loadMockList()
        filterMockList()
        updateGroupActionButtons(data.node.data)
      })
      .on('ready.jstree', function () {
        $('#group-tree-jstree').jstree(true).open_all()
        $('#group-tree-jstree').jstree(true).deselect_all()
        $('#group-tree-jstree').jstree(true).select_node('0')
      })
  }
  function groupToJsTree(groups) {
    return groups.map((g) => ({
      id: String(g.id),
      text: g.name,
      children: groupToJsTree(g.children || []),
      icon: 'fas fa-folder',
      data: g,
    }))
  }
  function updateGroupActionButtons(group) {
    if (group.id === 0 || group.id === -1 || group.name === '全部' || group.name === '未分组') {
      $('#delete-group-btn').prop('disabled', true)
      $('#clear-group-btn').prop('disabled', true)
    } else {
      $('#delete-group-btn').prop('disabled', false)
      $('#clear-group-btn').prop('disabled', false)
      $('#delete-group-btn')
        .off('click')
        .on('click', function () {
          // 使用自定义确认弹框
          $('#confirm-message').text(`确定删除分组【${group.name}】？此操作不可撤销。`)
          $('#confirm-modal').addClass('active')
          $('#confirm-action')
            .off('click')
            .on('click', async function () {
              await fetch(`/api/group-info/${group.id}`, { method: 'DELETE' })
              $('#confirm-modal').removeClass('active')
              await loadGroupTree()
            })
        })
      $('#clear-group-btn')
        .off('click')
        .on('click', function () {
          // 使用自定义确认弹框
          $('#confirm-message').text(`确定清空分组【${group.name}】下所有接口？`)
          $('#confirm-modal').addClass('active')
          $('#confirm-action')
            .off('click')
            .on('click', async function () {
              await fetch(`/api/group-info/${group.id}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: [] }),
              })
              $('#confirm-modal').removeClass('active')
              await loadGroupTree()
            })
        })
    }
  }
  function showAddGroupModal(parentId = 0) {
    const name = prompt('请输入分组名称')
    if (name) {
      fetch('/api/group-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      }).then(() => loadGroupTree())
    }
  }
  // 关闭新增分组弹框
  $('#group-modal .close').on('click', function () {
    $('#group-modal').removeClass('active')
  })
  // ====== 批量分组浮动按钮及弹框逻辑 ======
  function updateBatchMoveBtn() {
    // 按钮始终显示，但只有勾选接口时可点击
    $('#batch-move-btn').show()
    if (selectedFiles.size > 0) {
      $('#batch-move-btn').prop('disabled', false).removeClass('disabled')
    } else {
      $('#batch-move-btn').prop('disabled', true).addClass('disabled')
    }
  }
  $('#batch-move-btn').on('click', async function () {
    // 获取所有分组（扁平化）
    const res = await fetch('/api/group-info')
    const groupData = await res.json()
    const groupList = flattenGroupList(groupData)
    // 填充下拉框
    const $select = $('#batch-move-group')
    $select.empty()
    groupList.forEach((g) => {
      // 排除"全部"和"未分组"
      if (g.id !== 0 && g.id !== -1) {
        $select.append(`<option value="${g.id}">${g.name}</option>`)
      }
    })
    // 显示弹框
    $('#batch-move-modal').addClass('active')
  })
  // 关闭弹框
  $('#batch-move-modal .close, #batch-move-modal [type="button"].close').on('click', function () {
    $('#batch-move-modal').removeClass('active')
  })
  // 提交批量分组
  $('#batch-move-form').on('submit', async function (e) {
    e.preventDefault()
    const groupId = $('#batch-move-group').val()
    if (!groupId) return alert('请选择目标分组')
    const fileNames = Array.from(selectedFiles)

    // 获取分组名
    const res = await fetch(`/api/group-info/${groupId}`)
    const group = await res.json()
    const groupName = group.name

    // 先批量更新mockJson里的group字段
    await fetch('/batch-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileNames, group: groupName }),
    })

    // 再更新分组树的 files 字段（使用合并模式）
    await fetch(`/api/group-info/${groupId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: fileNames,
        mergeMode: true, // 启用合并模式
      }),
    })

    // 刷新数据
    await loadMockList()
    await loadGroupTree()

    $('#batch-move-modal').removeClass('active')
    clearSelection()
    alert('批量分组成功')
  })
  // 展平成一维分组列表
  function flattenGroupList(groups, arr = [], prefix = '') {
    for (const g of groups) {
      // 排除"全部"和"未分组"
      if (g.id !== 0 && g.id !== -1) {
        arr.push({ id: g.id, name: prefix ? prefix + '/' + g.name : g.name })
      }
      if (g.children && g.children.length) flattenGroupList(g.children, arr, prefix ? prefix + '/' + g.name : g.name)
    }
    return arr
  }
  // 通用信息提示模态框
  function showInfoModal(message) {
    const confirmModal = document.getElementById('confirm-modal')
    document.getElementById('confirm-message').textContent = message
    // 只显示"确定"按钮，隐藏"取消"
    document.getElementById('confirm-cancel').style.display = 'none'
    document.getElementById('confirm-action').textContent = '确定'
    // 解绑旧事件，绑定关闭
    document.getElementById('confirm-action').onclick = function () {
      confirmModal.classList.remove('active')
      // 恢复按钮
      document.getElementById('confirm-cancel').style.display = ''
      document.getElementById('confirm-action').textContent = '确认'
      document.getElementById('confirm-action').onclick = handleConfirmAction
    }
    confirmModal.classList.add('active')
  }

  // ====== 自动生成字段说明/类型 ======
  function inferType(val) {
    if (val === null) return 'null'
    if (Array.isArray(val)) return 'array'
    if (typeof val === 'boolean') return 'boolean'
    if (typeof val === 'number') return Number.isInteger(val) ? 'integer' : 'number'
    if (typeof val === 'string') return 'string'
    if (typeof val === 'object') return 'object'
    return typeof val
  }
  function genDescObj(obj) {
    if (Array.isArray(obj)) {
      return { type: 'array', desc: '', items: obj.length ? genDescObj(obj[0]) : {} }
    }
    if (typeof obj === 'object' && obj !== null) {
      const fields = {}
      for (const key in obj) {
        fields[key] = genDescObj(obj[key])
      }
      return { type: 'object', desc: '', fields }
    }
    return { type: inferType(obj), desc: '' }
  }
  // 支持Mock.js模板的自动说明生成
  function autoGenDesc(jsonInputId, descInputId, isMockTemplate = false) {
    const jsonInput = document.getElementById(jsonInputId)
    const descInput = document.getElementById(descInputId)
    if (!jsonInput || !descInput) return
    jsonInput.addEventListener('input', function () {
      try {
        let val = JSON.parse(this.value)
        if (isMockTemplate && window.Mock) {
          try {
            val = Mock.mock(val)
          } catch {}
        }
        const descObj = genDescObj(val)
        descInput.value = JSON.stringify(descObj, null, 2)
      } catch {}
    })
  }
  autoGenDesc('queryParams', 'queryParamsDesc', true)
  autoGenDesc('bodyParams', 'bodyParamsDesc', true)
  autoGenDesc('responseHeaders', 'responseHeadersDesc', true)
  autoGenDesc('pathContent', 'pathContentDesc', true)

  // 文件操作按钮
  document.getElementById('file-manager-btn').addEventListener('click', () => {
    if (window.fileManager) {
      window.fileManager.showFileOperationModal()
    }
  })

  // ====== 清空本地目录按钮事件绑定 ======
  const clearLocalDirBtn = document.getElementById('clear-local-directory-btn')
  if (clearLocalDirBtn) {
    clearLocalDirBtn.addEventListener('click', async () => {
      if (!(await customConfirm('确定要清空本地目录吗？此操作不可撤销！'))) return
      try {
        const res = await fetch('/api/file/clear-directory', { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          showToast('本地目录已清空！')
          // 可选：刷新文件树或相关UI
        } else {
          showToast('清空失败：' + (data.error || '未知错误'))
        }
      } catch (err) {
        showToast('请求失败：' + err.message)
      }
    })
  }

  // ====== showToast和customConfirm函数补全 ======
  function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast-message')
    if (!toast) return
    toast.textContent = msg
    toast.classList.add('show')
    setTimeout(() => {
      toast.classList.remove('show')
    }, duration)
  }

  function customConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-confirm-modal')
      const msg = document.getElementById('custom-confirm-message')
      const okBtn = document.getElementById('custom-confirm-ok')
      const cancelBtn = document.getElementById('custom-confirm-cancel')
      const closeBtn = document.getElementById('custom-confirm-close')
      msg.textContent = message
      modal.classList.add('active')
      function close(result) {
        modal.classList.remove('active')
        okBtn.removeEventListener('click', onOk)
        cancelBtn.removeEventListener('click', onCancel)
        closeBtn.removeEventListener('click', onCancel)
        resolve(result)
      }
      function onOk() {
        close(true)
      }
      function onCancel() {
        close(false)
      }
      okBtn.addEventListener('click', onOk)
      cancelBtn.addEventListener('click', onCancel)
      closeBtn.addEventListener('click', onCancel)
    })
  }
})
