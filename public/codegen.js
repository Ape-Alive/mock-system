// 代码生成器功能
class CodeGenerator {
    constructor() {
        this.initElements()
        this.bindEvents()
        this.loadOptions()
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
        this.pageStructureTextarea = document.getElementById('page-structure')
        this.pageLogicTextarea = document.getElementById('page-logic')
        this.generatedCode = document.getElementById('generated-code')
        this.previewFrame = document.getElementById('code-preview-frame')
        this.downloadBtn = document.getElementById('download-code')
        this.closeButtons = this.modal.querySelectorAll('.close')
        this.previewCloseButtons = this.previewModal.querySelectorAll('.close')
    }

    bindEvents() {
        document.getElementById('code-generator-btn').addEventListener('click', () => {
            this.openModal()
        })
        this.closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal())
        })
        this.previewCloseButtons.forEach(btn => {
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
        this.previewModal.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab)
            })
        })
    }

    async loadOptions() {
        try {
            const response = await fetch('/api/codegen/options')
            const data = await response.json()
            if (data.success) {
                this.techStackSelect.innerHTML = '<option value="">请选择技术类型</option>'
                data.data.techStackOptions.forEach(option => {
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
                    data.data.uiLibraryOptions.forEach(option => {
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
        await this.loadInterfaceList()
        this.modal.classList.add('active')
    }

    closeModal() {
        this.modal.classList.remove('active')
        this.form.reset()
        this.customLibraryGroup.style.display = 'none'
    }

    closePreviewModal() {
        this.previewModal.classList.remove('active')
    }

    async loadInterfaceList() {
        try {
            const response = await fetch('/mock-list')
            const mockItems = await response.json()
            this.interfaceSelector.innerHTML = ''
            mockItems.forEach(item => {
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
        } catch (error) {
            this.interfaceSelector.innerHTML = '<p class="error">加载接口列表失败</p>'
        }
    }

    async generateCode() {
        const formData = this.collectFormData()
        if (!this.validateFormData(formData)) {
            return
        }
        this.showLoading()
        try {
            const response = await fetch('/api/codegen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const result = await response.json()
            if (result.success) {
                this.showGeneratedCode(result.data.code, formData)
            } else {
                this.showError(result.error)
            }
        } catch (error) {
            this.showError('生成代码失败: ' + error.message)
        } finally {
            this.hideLoading()
        }
    }

    collectFormData() {
        const selectedInterfaces = Array.from(
            this.interfaceSelector.querySelectorAll('input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value)
        return {
            techStack: this.techStackSelect.value,
            outputType: this.outputTypeSelect.value,
            uiLibrary: this.uiLibrarySelect.value,
            customLibrary: this.customLibraryInput.value,
            interfaceList: selectedInterfaces,
            pageStructure: this.pageStructureTextarea.value,
            pageLogic: this.pageLogicTextarea.value
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
        this.generatedCode.textContent = code
        this.tryPreview(code, formData)
        this.closeModal()
        this.previewModal.classList.add('active')
    }

    tryPreview(code, formData) {
        try {
            if (formData.techStack === 'vue') {
                this.generateVuePreview(code)
            } else if (formData.techStack === 'react') {
                this.generateReactPreview(code)
            } else if (formData.techStack === 'flutter') {
                this.generateFlutterPreview(code)
            }
        } catch (error) {
            this.previewFrame.innerHTML = '<p class="error">预览生成失败</p>'
        }
    }

    generateVuePreview(code) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Vue Preview</title>
                <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
                <style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; } .error { color: red; }</style>
            </head>
            <body>
                <div id="app">
                    <div class="error">预览功能开发中...</div>
                </div>
                <script>console.log('Vue代码预览功能待实现');</script>
            </body>
            </html>
        `
        this.previewFrame.innerHTML = html
    }

    generateReactPreview(code) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>React Preview</title>
                <style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; } .error { color: red; }</style>
            </head>
            <body>
                <div id="root">
                    <div class="error">预览功能开发中...</div>
                </div>
            </body>
            </html>
        `
        this.previewFrame.innerHTML = html
    }

    generateFlutterPreview(code) {
        this.previewFrame.innerHTML = `
            <div style="padding: 20px;">
                <h3>Flutter代码预览</h3>
                <p>Flutter代码需要在Flutter环境中运行，无法在浏览器中直接预览。</p>
                <p>请将生成的代码复制到Flutter项目中使用。</p>
            </div>
        `
    }

    switchTab(clickedTab) {
        this.previewModal.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active')
        })
        this.previewModal.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active')
        })
        clickedTab.classList.add('active')
        const tabId = clickedTab.getAttribute('data-tab')
        document.getElementById(tabId).classList.add('active')
    }

    downloadCode() {
        const code = this.generatedCode.textContent
        const techStack = this.techStackSelect.value
        const outputType = this.outputTypeSelect.value
        let filename = `generated-${techStack}-${outputType}`
        let extension = ''
        if (techStack === 'vue') {
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

    showLoading() {
        const loading = document.getElementById('loading')
        if (loading) {
            loading.classList.add('active')
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading')
        if (loading) {
            loading.classList.remove('active')
        }
    }

    showError(message) {
        alert(message)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CodeGenerator()
})