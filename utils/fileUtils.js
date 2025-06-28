const fs = require('fs')
const nodePath = require('path')
const config = require('../config')

// 确保目录存在
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

// 读取JSON文件
function readJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(content)
    } catch (error) {
        throw new Error(`读取文件失败: ${error.message}`)
    }
}

// 读取文件内容（支持非JSON文件）
function readFile(filePath, encoding = 'utf8') {
    try {
        return fs.readFileSync(filePath, encoding)
    } catch (error) {
        throw new Error(`读取文件失败: ${error.message}`)
    }
}

// 写入JSON文件
function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
        throw new Error(`写入文件失败: ${error.message}`)
    }
}

// 删除文件
function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (error) {
        throw new Error(`删除文件失败: ${error.message}`)
    }
}

// 获取目录下所有文件
function getDirectoryFiles(dirPath) {
    try {
        return fs.readdirSync(dirPath)
    } catch (error) {
        throw new Error(`读取目录失败: ${error.message}`)
    }
}

// 检查文件是否存在
function fileExists(filePath) {
    return fs.existsSync(filePath)
}

module.exports = {
    ensureDirectoryExists,
    readJsonFile,
    readFile,
    writeJsonFile,
    deleteFile,
    getDirectoryFiles,
    fileExists,
}