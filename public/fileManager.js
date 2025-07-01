class FileManager {
    constructor() {
        this.localDirectory = null
        this.projectName = null
        this.currentFile = null
        this.fileTree = []

        this.initElements()
        this.bindEvents()
        this.loadLocalDirectory()
    }

    initElements() {
        // 本地目录设置模态框
        this.localDirectoryModal = document.getElementById('local-directory-modal')
        this.localDirectoryForm = document.getElementById('local-directory-form')
        this.localDirectoryPathInput = document.getElementById('local-directory-path')
        this.projectNameInput = document.getElementById('project-name')

        // 文件操作模态框
        this.fileOperationModal = document.getElementById('file-operation-modal')
        this.fileTree = document.getElementById('file-tree')
        this.fileContent = document.getElementById('file-content')
        this.createFileBtn = document.getElementById('create-file-btn')
        this.createFolderBtn = document.getElementById('create-folder-btn')
        this.uploadFileBtn = document.getElementById('upload-file-btn')
        this.refreshFilesBtn = document.getElementById('refresh-files-btn')
        this.fileUploadInput = document.getElementById('file-upload-input')

        // 新建文件/文件夹模态框
        this.createItemModal = document.getElementById('create-item-modal')
        this.createItemForm = document.getElementById('create-item-form')
        this.createItemTitle = document.getElementById('create-item-title')
        this.itemNameInput = document.getElementById('item-name')
        this.fileContentGroup = document.getElementById('file-content-group')
        this.fileContentInput = document.getElementById('file-content-input')

        // 确认删除模态框
        this.deleteConfirmModal = document.getElementById('delete-confirm-modal')
        this.deleteConfirmMessage = document.getElementById('delete-confirm-message')
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn')

        // 关闭按钮
        this.closeButtons = document.querySelectorAll('.close')
    }

    bindEvents() {
        // 本地目录设置表单提交
        this.localDirectoryForm.addEventListener('submit', (e) => {
            e.preventDefault()
            this.setLocalDirectory()
        })

        // 文件操作按钮
        this.createFileBtn.addEventListener('click', () => this.showCreateItemModal('file'))
        this.createFolderBtn.addEventListener('click', () => this.showCreateItemModal('folder'))
        this.uploadFileBtn.addEventListener('click', () => this.fileUploadInput.click())
        this.refreshFilesBtn.addEventListener('click', () => this.loadFileTree())

        // 文件上传
        this.fileUploadInput.addEventListener('change', (e) => this.handleFileUpload(e))

        // 新建文件/文件夹表单提交
        this.createItemForm.addEventListener('submit', (e) => {
            e.preventDefault()
            this.createItem()
        })

        // 确认删除
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteItem())

        // 关闭按钮
        this.closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals())
        })
    }

    // 加载本地目录信息
    async loadLocalDirectory() {
        try {
            const response = await fetch('/api/file/directory')
            const data = await response.json()

            if (data.success && data.data.directory) {
                this.localDirectory = data.data.directory
                this.projectName = data.data.projectName
                this.updateDirectoryStatus()
            }
        } catch (error) {
            console.error('加载本地目录失败:', error)
        }
    }

    // 设置本地目录
    async setLocalDirectory() {
        const directoryPath = this.localDirectoryPathInput.value.trim()
        const projectName = this.projectNameInput.value.trim()

        if (!directoryPath) {
            this.showError('请输入目录路径')
            return
        }

        try {
            const response = await fetch('/api/file/set-directory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    directoryPath,
                    projectName
                })
            })

            const data = await response.json()

            if (data.success) {
                this.localDirectory = directoryPath
                this.projectName = projectName
                this.updateDirectoryStatus()
                this.closeModal(this.localDirectoryModal)
                this.showSuccess('本地目录设置成功')
            } else {
                this.showError(data.error)
            }
        } catch (error) {
            this.showError('设置本地目录失败: ' + error.message)
        }
    }

    // 更新目录状态显示
    updateDirectoryStatus() {
        const statusElement = document.getElementById('directory-status')
        if (statusElement) {
            statusElement.textContent = this.localDirectory ? `已设置: ${this.localDirectory}` : '未设置'
            statusElement.className = this.localDirectory ? 'status-set' : 'status-not-set'
        }
    }

    // 检查本地目录是否已设置
    checkLocalDirectory() {
        if (!this.localDirectory) {
            this.showLocalDirectoryModal()
            return false
        }
        return true
    }

    // 显示本地目录设置模态框
    showLocalDirectoryModal() {
        this.localDirectoryModal.classList.add('active')
    }

    // 显示文件操作模态框
    async showFileOperationModal() {
        if (!this.checkLocalDirectory()) {
            return
        }

        this.fileOperationModal.classList.add('active')
        await this.loadFileTree()
    }

    // 加载文件树
    async loadFileTree() {
        try {
            const response = await fetch('/api/file/tree')
            const data = await response.json()

            if (data.success) {
                this.fileTree = data.data
                this.renderFileTree()
            } else {
                this.showError(data.error)
            }
        } catch (error) {
            this.showError('加载文件树失败: ' + error.message)
        }
    }

    // 渲染文件树
    renderFileTree() {
        this.fileTree.innerHTML = ''

        if (this.fileTree.length === 0) {
            this.fileTree.innerHTML = '<div class="no-files">目录为空</div>'
            return
        }

        this.fileTree.forEach(item => {
            this.renderFileTreeItem(item, 0)
        })
    }

    // 渲染文件树项目
    renderFileTreeItem(item, level) {
        const itemElement = document.createElement('div')
        itemElement.className = `file-tree-item level-${level} ${item.type}`
        itemElement.setAttribute('data-path', item.path)

        const icon = item.type === 'directory' ? 'fa-folder' : 'fa-file'
        const expandIcon = item.type === 'directory' ? 'fa-chevron-down' : ''

        itemElement.innerHTML = `
      <i class="fas ${icon}"></i>
      <span class="item-name">${item.name}</span>
      ${expandIcon ? `<i class="fas ${expandIcon} expand-icon"></i>` : ''}
      <div class="item-actions">
        ${item.type === 'file' ? '<button class="edit-btn" title="编辑"><i class="fas fa-edit"></i></button>' : ''}
        <button class="delete-btn" title="删除"><i class="fas fa-trash"></i></button>
      </div>
    `

        // 绑定事件
        itemElement.addEventListener('click', (e) => {
            if (!e.target.closest('.item-actions')) {
                this.handleItemClick(item, itemElement)
            }
        })

        // 编辑按钮
        const editBtn = itemElement.querySelector('.edit-btn')
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                this.editFile(item)
            })
        }

        // 删除按钮
        const deleteBtn = itemElement.querySelector('.delete-btn')
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                this.showDeleteConfirm(item)
            })
        }

        this.fileTree.appendChild(itemElement)

        // 递归渲染子项目
        if (item.type === 'directory' && item.children) {
            item.children.forEach(child => {
                this.renderFileTreeItem(child, level + 1)
            })
        }
    }

    // 处理文件树项目点击
    handleItemClick(item, element) {
        // 移除其他选中状态
        this.fileTree.querySelectorAll('.file-tree-item').forEach(el => {
            el.classList.remove('selected')
        })

        // 添加选中状态
        element.classList.add('selected')

        if (item.type === 'file') {
            this.loadFileContent(item.path)
        } else if (item.type === 'directory') {
            // 切换展开/折叠状态
            element.classList.toggle('collapsed')
        }
    }

    // 加载文件内容
    async loadFileContent(filePath) {
        try {
            const response = await fetch(`/api/file/read?path=${encodeURIComponent(filePath)}`)
            const data = await response.json()

            if (data.success) {
                this.currentFile = filePath
                this.showFileContent(data.data.content)
            } else {
                this.showError(data.error)
            }
        } catch (error) {
            this.showError('加载文件内容失败: ' + error.message)
        }
    }

    // 显示文件内容
    showFileContent(content) {
        this.fileContent.innerHTML = `
      <div class="file-content-editor">
        <div class="file-content-toolbar">
          <div class="left-tools">
            <span class="file-name">${this.currentFile}</span>
          </div>
          <div class="right-tools">
            <button class="btn secondary" id="save-file-btn"><i class="fas fa-save"></i> 保存</button>
          </div>
        </div>
        <textarea class="file-content-textarea" id="file-content-textarea">${this.escapeHtml(content)}</textarea>
      </div>
    `

        // 绑定保存按钮
        const saveBtn = document.getElementById('save-file-btn')
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveFileContent())
        }
    }

    // 保存文件内容
    async saveFileContent() {
        if (!this.currentFile) return

        const content = document.getElementById('file-content-textarea').value

        try {
            const response = await fetch('/api/file/write', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filePath: this.currentFile,
                    content
                })
            })

            const data = await response.json()

            if (data.success) {
                this.showSuccess('文件保存成功')
            } else {
                this.showError(data.error)
            }
        } catch (error) {
            this.showError('保存文件失败: ' + error.message)
        }
    }

    // 编辑文件
    editFile(item) {
        this.loadFileContent(item.path)
    }

    // 显示新建文件/文件夹模态框
    showCreateItemModal(type) {
        this.createItemType = type
        this.createItemTitle.textContent = type === 'file' ? '新建文件' : '新建文件夹'
        this.fileContentGroup.style.display = type === 'file' ? 'block' : 'none'
        this.createItemModal.classList.add('active')
    }

    // 创建文件或文件夹
    async createItem() {
        const name = this.itemNameInput.value.trim()

        if (!name) {
            this.showError('请输入名称')
            return
        }

        try {
            let response

            if (this.createItemType === 'file') {
                const content = this.fileContentInput.value
                response = await fetch('/api/file/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filePath: name,
                        content
                    })
                })
            } else {
                response = await fetch('/api/file/mkdir', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        dirPath: name
                    })
                })
            }

            const data = await response.json()

            if (data.success) {
                this.closeModal(this.createItemModal)
                this.createItemForm.reset()
                await this.loadFileTree()
                this.showSuccess(`${this.createItemType === 'file' ? '文件' : '文件夹'}创建成功`)
            } else {
                this.showError(data.error)
            }
        } catch (error) {
            this.showError(`创建${this.createItemType === 'file' ? '文件' : '文件夹'}失败: ` + error.message)
        }
    }

    // 处理文件上传
    async handleFileUpload(event) {
        const files = event.target.files

        if (files.length === 0) return

        for (const file of files) {
            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('uploadPath', file.name)

                const response = await fetch('/api/file/upload', {
                    method: 'POST',
                    body: formData
                })

                const data = await response.json()

                if (data.success) {
                    this.showSuccess(`文件 ${file.name} 上传成功`)
                } else {
                    this.showError(`文件 ${file.name} 上传失败: ${data.error}`)
                }
            } catch (error) {
                this.showError(`文件 ${file.name} 上传失败: ` + error.message)
            }
        }

        // 清空文件输入
        event.target.value = ''

        // 刷新文件树
        await this.loadFileTree()
    }

    // 显示删除确认
    showDeleteConfirm(item) {
        this.itemToDelete = item
        this.deleteConfirmMessage.textContent = `确定要删除 ${item.name} 吗？此操作不可撤销。`
        this.deleteConfirmModal.classList.add('active')
    }

    // 删除文件或文件夹
    async deleteItem() {
        if (!this.itemToDelete) return

        try {
            const response = await fetch('/api/file/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itemPath: this.itemToDelete.path
                })
            })

            const data = await response.json()

            if (data.success) {
                this.closeModal(this.deleteConfirmModal)
                await this.loadFileTree()
                this.showSuccess('删除成功')
            } else {
                this.showError(data.error)
            }
        } catch (error) {
            this.showError('删除失败: ' + error.message)
        }
    }

    // 关闭模态框
    closeModal(modal) {
        modal.classList.remove('active')
    }

    // 关闭所有模态框
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active')
        })
    }

    // 转义HTML
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }

    // 显示成功消息
    showSuccess(message) {
        this.showToast(message, 'success')
    }

    // 显示错误消息
    showError(message) {
        this.showToast('错误: ' + message, 'error')
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

// 导出FileManager类
window.FileManager = FileManager