const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const dbService = require('./dbService')

const execAsync = promisify(exec)

class FileService {
  constructor() {
    this.localDirectory = null
    this.projectName = null
    this.initFromDB()
  }

  async initFromDB() {
    const record = await dbService.getLocalDirectory()
    if (record) {
      this.localDirectory = record.directory
      this.projectName = record.projectName
    }
  }

  // 设置本地目录
  async setLocalDirectory(directoryPath, projectName = null) {
    this.localDirectory = directoryPath
    this.projectName = projectName
    await dbService.setLocalDirectory(directoryPath, projectName)
  }

  // 获取本地目录
  async getLocalDirectory() {
    const record = await dbService.getLocalDirectory()
    return record
      ? { directory: record.directory, projectName: record.projectName }
      : { directory: null, projectName: null }
  }

  // 检查目录是否存在且有权限
  async validateDirectory(directoryPath) {
    try {
      const stats = await fs.stat(directoryPath)
      if (!stats.isDirectory()) {
        throw new Error('路径不是目录')
      }

      // 检查写入权限
      await fs.access(directoryPath, fs.constants.W_OK)
      return true
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('目录不存在')
      } else if (error.code === 'EACCES') {
        throw new Error('没有目录的写入权限')
      } else {
        throw new Error(`目录验证失败: ${error.message}`)
      }
    }
  }

  // 路径归一化与安全校验（带目录参数）
  normalizeFilePathWithDirectory(filePath, localDirectory) {
    if (!localDirectory) throw new Error('本地目录未设置')
    // 绝对路径转相对
    if (path.isAbsolute(filePath)) {
      if (filePath.startsWith(localDirectory)) {
        return path.relative(localDirectory, filePath)
      } else {
        throw new Error('禁止跨目录操作')
      }
    }
    // 防止 ../ 越权
    const resolved = path.resolve(localDirectory, filePath)
    if (!resolved.startsWith(localDirectory)) {
      throw new Error('禁止越权操作')
    }
    return filePath
  }

  // 路径归一化与安全校验
  normalizeFilePath(filePath) {
    if (!this.localDirectory) throw new Error('本地目录未设置')
    // 绝对路径转相对
    if (path.isAbsolute(filePath)) {
      if (filePath.startsWith(this.localDirectory)) {
        return path.relative(this.localDirectory, filePath)
      } else {
        throw new Error('禁止跨目录操作')
      }
    }
    // 防止 ../ 越权
    const resolved = path.resolve(this.localDirectory, filePath)
    if (!resolved.startsWith(this.localDirectory)) {
      throw new Error('禁止越权操作')
    }
    return filePath
  }

  // 获取用户目录列表
  async getUserDirectories() {
    const os = require('os')
    const userHome = os.homedir()

    try {
      const entries = await fs.readdir(userHome, { withFileTypes: true })
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(userHome, entry.name),
          type: 'directory'
        }))
      return directories
    } catch (error) {
      return []
    }
  }

  // 获取目录树结构
  async getDirectoryTree(directoryPath = null) {
    // 每次都从数据库查，保证拿到最新的
    const record = await dbService.getLocalDirectory()
    const targetPath = directoryPath || (record && record.directory)
    if (!targetPath) {
      return {
        success: false,
        returnStatus: 'ERROR-A3100',
        msg: '本地目录未设置'
      }
    }
    //需要检验目录是否存在
    try {
      await fs.stat(targetPath)
    } catch (error) {
      // 目录不存在：清空本地目录与设置中的初始目录
      try {
        // 清空 LocalDirectory 表路径
        await dbService.setLocalDirectory('', null)
      } catch (e) {
        console.warn('清空 LocalDirectory 失败:', e?.message || e)
      }
      try {
        // 更新 settings.general.initialDirectory 为空
        const settings = await dbService.getSettings()
        const newSettings = {
          ...settings,
          general: {
            ...(settings.general || {}),
            initialDirectory: ''
          }
        }
        await dbService.saveSettings(newSettings)
      } catch (e) {
        console.warn('更新 settings.general.initialDirectory 失败:', e?.message || e)
      }
      const userDirectories = await this.getUserDirectories()
      return {
        success: false,
        returnStatus: 'ERROR-A3110',
        msg: '目录不存在',
        returnObject: userDirectories
      }
    }
    try {
      // 获取根目录名
      const rootName = path.basename(targetPath)
      const children = await this.scanDirectory(targetPath)
      return [
        {
          name: rootName,
          path: '', // 修复：根目录的 path 应该是空字符串，表示相对于本地目录的根路径
          type: 'directory',
          children: children,
        },
      ]
    } catch (error) {
      throw new Error(`获取目录树失败: ${error.message}`)
    }
  }

  // 扫描目录
  async scanDirectory(dirPath, relativePath = '') {
    const items = []

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const itemRelativePath = path.join(relativePath, entry.name)

        if (entry.isDirectory()) {
          const children = await this.scanDirectory(fullPath, itemRelativePath)
          items.push({
            name: entry.name,
            path: itemRelativePath,
            type: 'directory',
            children: children,
          })
        } else {
          const stats = await fs.stat(fullPath)
          items.push({
            name: entry.name,
            path: itemRelativePath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime,
          })
        }
      }
    } catch (error) {
      console.error(`扫描目录失败 ${dirPath}:`, error)
    }

    return items.sort((a, b) => {
      // 目录在前，文件在后
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      // 按名称排序
      return a.name.localeCompare(b.name)
    })
  }

  // 读取文件内容
  async readFile(filePath) {
    // 每次都从数据库获取最新的本地目录设置
    const record = await dbService.getLocalDirectory()
    const localDirectory = record ? record.directory : this.localDirectory

    if (!localDirectory) {
      throw new Error('本地目录未设置')
    }

    const safePath = this.normalizeFilePathWithDirectory(filePath, localDirectory)
    const fullPath = path.join(localDirectory, safePath)
    try {
      const content = await fs.readFile(fullPath, 'utf8')
      return {
        success: true,
        content: content,
        path: filePath,
      }
    } catch (error) {
      throw new Error(`读取文件失败: ${error.message}`)
    }
  }

  // 写入文件内容
  async writeFile(filePath, content) {
    if (!this.localDirectory) {
      throw new Error('本地目录未设置')
    }
    const safePath = this.normalizeFilePath(filePath)
    const fullPath = path.join(this.localDirectory, safePath)
    try {
      // 确保目录存在
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(fullPath, content, 'utf8')

      // 保存历史记录
      await this.saveFileHistory(filePath, content, 'edit')

      return {
        success: true,
        path: filePath,
      }
    } catch (error) {
      throw new Error(`写入文件失败: ${error.message}`)
    }
  }

  // 创建文件
  async createFile(filePath, content = '') {
    const safePath = this.normalizeFilePath(filePath)
    return await this.writeFile(safePath, content)
  }

  // 创建目录
  async createDirectory(dirPath) {
    if (!this.localDirectory) {
      throw new Error('本地目录未设置')
    }
    const safePath = this.normalizeFilePath(dirPath)
    const fullPath = path.join(this.localDirectory, safePath)
    try {
      await fs.mkdir(fullPath, { recursive: true })
      return {
        success: true,
        path: dirPath,
      }
    } catch (error) {
      throw new Error(`创建目录失败: ${error.message}`)
    }
  }

  // 删除文件或目录
  async deleteItem(itemPath) {
    if (!this.localDirectory) {
      throw new Error('本地目录未设置')
    }
    const safePath = this.normalizeFilePath(itemPath)
    const fullPath = path.join(this.localDirectory, safePath)
    try {
      const stats = await fs.stat(fullPath)

      // 如果是文件，保存删除前的历史记录
      if (!stats.isDirectory()) {
        try {
          const content = await fs.readFile(fullPath, 'utf8')
          await this.saveFileHistory(itemPath, content, 'delete')
        } catch (readError) {
          console.warn('读取文件内容失败，跳过历史记录保存:', readError.message)
        }
      }

      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true })
      } else {
        await fs.unlink(fullPath)
      }
      return {
        success: true,
        path: itemPath,
      }
    } catch (error) {
      throw new Error(`删除失败: ${error.message}`)
    }
  }

  // 重命名文件或目录
  async renameItem(oldPath, newName) {
    if (!this.localDirectory) {
      throw new Error('本地目录未设置')
    }
    const safeOldPath = this.normalizeFilePath(oldPath)
    const oldFullPath = path.join(this.localDirectory, safeOldPath)
    const newFullPath = path.join(this.localDirectory, path.dirname(safeOldPath), newName)
    // 新路径也要校验
    if (!newFullPath.startsWith(this.localDirectory)) {
      throw new Error('禁止越权重命名')
    }
    try {
      await fs.rename(oldFullPath, newFullPath)
      const newPath = path.join(path.dirname(safeOldPath), newName)

      // 保存重命名历史记录
      await this.saveFileHistory(oldPath, '', 'rename', null, newPath)

      return {
        success: true,
        oldPath: oldPath,
        newPath: newPath,
      }
    } catch (error) {
      throw new Error(`重命名失败: ${error.message}`)
    }
  }

  // 上传文件
  async uploadFile(uploadPath, fileBuffer) {
    if (!this.localDirectory) {
      throw new Error('本地目录未设置')
    }
    const safePath = this.normalizeFilePath(uploadPath)
    const fullPath = path.join(this.localDirectory, safePath)
    try {
      // 确保目录存在
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(fullPath, fileBuffer)
      return {
        success: true,
        path: uploadPath,
      }
    } catch (error) {
      throw new Error(`上传文件失败: ${error.message}`)
    }
  }

  // 将生成的代码写入本地目录
  async writeGeneratedCode(codeData, techStack, outputType) {
    if (!this.localDirectory) {
      throw new Error('本地目录未设置')
    }

    try {
      const results = []

      // 根据技术栈和输出类型确定文件结构
      const fileStructure = this.getFileStructure(techStack, outputType)

      for (const [filePath, content] of Object.entries(codeData)) {
        const fullPath = path.join(this.localDirectory, filePath)

        // 确保目录存在
        const dir = path.dirname(fullPath)
        await fs.mkdir(dir, { recursive: true })

        // 写入文件
        await fs.writeFile(fullPath, content, 'utf8')

        results.push({
          path: filePath,
          success: true,
        })
      }

      return {
        success: true,
        results: results,
        directory: this.localDirectory,
      }
    } catch (error) {
      throw new Error(`写入生成代码失败: ${error.message}`)
    }
  }

  // 获取文件结构
  getFileStructure(techStack, outputType) {
    const structures = {
      vue2: {
        component: {
          'src/components/GeneratedComponent.vue': '{{componentCode}}',
          'src/components/GeneratedComponent.css': '{{cssCode}}',
        },
        page: {
          'src/views/GeneratedPage.vue': '{{pageCode}}',
          'src/views/GeneratedPage.css': '{{cssCode}}',
          'public/index.html': '{{htmlCode}}',
        },
      },
      vue3: {
        component: {
          'src/components/GeneratedComponent.vue': '{{componentCode}}',
          'src/components/GeneratedComponent.css': '{{cssCode}}',
        },
        page: {
          'src/views/GeneratedPage.vue': '{{pageCode}}',
          'src/views/GeneratedPage.css': '{{cssCode}}',
          'public/index.html': '{{htmlCode}}',
        },
      },
      react: {
        component: {
          'src/components/GeneratedComponent.jsx': '{{componentCode}}',
          'src/components/GeneratedComponent.css': '{{cssCode}}',
        },
        page: {
          'src/pages/GeneratedPage.jsx': '{{pageCode}}',
          'src/pages/GeneratedPage.css': '{{cssCode}}',
          'public/index.html': '{{htmlCode}}',
        },
      },
      flutter: {
        component: {
          'lib/widgets/generated_widget.dart': '{{componentCode}}',
        },
        page: {
          'lib/pages/generated_page.dart': '{{pageCode}}',
          'lib/main.dart': '{{mainCode}}',
        },
      },
    }

    return (
      structures[techStack]?.[outputType] || {
        'generated_code.txt': '{{code}}',
      }
    )
  }

  // 执行命令（如npm install等）
  async executeCommand(command, cwd = null) {
    const workingDir = cwd || this.localDirectory

    if (!workingDir) {
      throw new Error('工作目录未设置')
    }

    try {
      const { stdout, stderr } = await execAsync(command, { cwd: workingDir })
      return {
        success: true,
        stdout,
        stderr,
      }
    } catch (error) {
      throw new Error(`命令执行失败: ${error.message}`)
    }
  }

  // 清空本地目录（测试用）
  async clearLocalDirectory() {
    this.localDirectory = null
    this.projectName = null
    // 清空数据库LocalDirectory表
    if (require('./dbService').prisma?.localDirectory) {
      await require('./dbService').prisma.localDirectory.deleteMany({})
    }
  }

  // 列举指定目录下的所有子目录（不递归）
  async listSubdirectories(basePath = null) {

    let targetPath = basePath
    if (!targetPath) {
      const record = this.getLocalDirectory()

      if (record.directory) {
        targetPath = record.directory
      } else {
        const os = require('os')
        const userHome = os.homedir()
        // targetPath = process.cwd() // 默认用当前工作目录
        targetPath = userHome
      }
    }
    // 安全限制：禁止访问根目录、/etc、/root 等敏感目录
    const forbidden = [
      '/',
      '/etc',
      '/root',
      '/bin',
      '/sbin',
      '/usr',
      '/boot',
      '/lib',
      '/lib64',
      '/proc',
      '/sys',
      '/dev',
      '/run',
      '/var',
    ]
    const resolved = path.resolve(targetPath)
    if (forbidden.includes(resolved)) {
      throw new Error('禁止访问该目录')
    }

    try {
      const entries = await fs.readdir(resolved, { withFileTypes: true })
      const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(resolved, entry.name),
        }))

      // 检查每个目录的读取权限，过滤掉没有权限的目录
      const accessibleDirectories = []
      for (const directory of directories) {
        try {
          await fs.access(directory.path, fs.constants.R_OK)
          accessibleDirectories.push(directory)
        } catch (accessError) {
          // 没有权限读取的目录将被跳过
          console.warn(`跳过无权限访问的目录: ${directory.path}`)
        }
      }

      return accessibleDirectories
    } catch (error) {
      throw new Error(`列举子目录失败: ${error.message}`)
    }
  }

  // 保存历史记录
  async saveFileHistory(filePath, content, action, operator = null, newPath = null) {
    if (!dbService.prisma?.fileHistory) {
      console.warn('FileHistory表不存在，跳过历史记录保存')
      return
    }

    try {
      await dbService.prisma.fileHistory.create({
        data: {
          filePath,
          content: content || '',
          action,
          operator,
          newPath,
        },
      })
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }

  // 获取历史记录
  async getFileHistory(filePath, page = 1, pageSize = 10) {
    if (!dbService.prisma?.fileHistory) {
      return []
    }

    try {
      return await dbService.prisma.fileHistory.findMany({
        where: { filePath },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    } catch (error) {
      console.error('获取历史记录失败:', error)
      return []
    }
  }

  // 根据ID获取历史记录
  async getHistoryById(historyId) {
    if (!dbService.prisma?.fileHistory) {
      return null
    }

    try {
      return await dbService.prisma.fileHistory.findUnique({
        where: { id: Number(historyId) },
      })
    } catch (error) {
      console.error('获取历史记录失败:', error)
      return null
    }
  }

  // 回滚到历史版本
  async rollbackFile(filePath, historyId) {
    const history = await this.getHistoryById(historyId)
    if (!history) {
      throw new Error('历史记录不存在')
    }

    // 写入文件
    await this.writeFile(filePath, history.content)
    // 保存回滚操作的历史记录
    await this.saveFileHistory(filePath, history.content, 'rollback')
  }

  // 批量写入文件
  async batchWriteFiles(files) {
    const results = []

    for (const file of files) {
      try {
        await this.writeFile(file.path, file.content)
        await this.saveFileHistory(file.path, file.content, 'batch-edit')
        results.push({ path: file.path, success: true })
      } catch (error) {
        results.push({ path: file.path, success: false, error: error.message })
      }
    }

    return results
  }

  // 批量删除文件
  async batchDeleteFiles(filePaths) {
    const results = []

    for (const filePath of filePaths) {
      try {
        // 保存删除前的历史
        const content = await this.readFile(filePath)
        await this.saveFileHistory(filePath, content.content, 'delete')

        await this.deleteItem(filePath)
        results.push({ path: filePath, success: true })
      } catch (error) {
        results.push({ path: filePath, success: false, error: error.message })
      }
    }

    return results
  }
}

module.exports = new FileService()
