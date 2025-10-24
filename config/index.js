const nodePath = require('path')
const fs = require('fs')

// 获取应用数据目录
function getAppDataPath() {
    // 在开发环境中使用项目根目录
    if (process.env.NODE_ENV === 'development') {
        return __dirname
    }

    // 在生产环境中使用用户数据目录
    const { app } = require('electron')
    if (app && app.isPackaged) {
        // 在打包后的应用中，使用用户数据目录
        return app.getPath('userData')
    } else {
        // 在开发环境中，使用项目根目录
        return nodePath.join(__dirname, '..')
    }
}

// 确保目录存在
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        console.log('📁 创建目录:', dirPath)
    }
}

// 获取应用数据目录
const appDataPath = getAppDataPath()

// 定义目录路径
const mockDir = nodePath.join(appDataPath, 'mockJson')
const uploadDir = nodePath.join(appDataPath, 'uploads')
const groupInfoDir = nodePath.join(appDataPath, 'groupInfo')
const groupDataPath = nodePath.join(groupInfoDir, 'groupData.json')

// 确保所有必要的目录存在
ensureDir(mockDir)
ensureDir(uploadDir)
ensureDir(groupInfoDir)

// 如果groupData.json不存在，创建默认文件
if (!fs.existsSync(groupDataPath)) {
    fs.writeFileSync(groupDataPath, JSON.stringify([], null, 2))
    console.log('📄 创建默认groupData.json文件')
}

module.exports = {
    PORT: 3400,
    MOCK_DIR: mockDir,
    GROUP_DATA_PATH: groupDataPath,
    UPLOAD_DIR: uploadDir,
    PUBLIC_DIR: nodePath.join(__dirname, '..', 'public'),
}