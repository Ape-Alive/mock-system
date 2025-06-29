const config = require('../config')
const fileUtils = require('../utils/fileUtils')
const mockService = require('./mockService')

class GroupService {
  constructor() {
    this.ensureGroupDataFile()
  }

  ensureGroupDataFile() {
    const groupDataDir = require('path').dirname(config.GROUP_DATA_PATH)
    fileUtils.ensureDirectoryExists(groupDataDir)

    if (!fileUtils.fileExists(config.GROUP_DATA_PATH)) {
      const initialData = [
        {
          id: 0,
          name: '全部',
          children: [
            {
              id: -1,
              name: '未分组',
              children: [],
              files: [],
            },
          ],
          files: [],
        },
      ]
      fileUtils.writeJsonFile(config.GROUP_DATA_PATH, initialData)
    }
  }

  readGroupData() {
    return fileUtils.readJsonFile(config.GROUP_DATA_PATH)
  }

  writeGroupData(data) {
    fileUtils.writeJsonFile(config.GROUP_DATA_PATH, data)
  }

  findGroupById(tree, id) {
    for (const node of tree) {
      if (node.id === id) return node
      if (node.children && node.children.length) {
        const found = this.findGroupById(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  deleteGroupById(tree, id) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].id === id) {
        tree.splice(i, 1)
        return true
      }
      if (tree[i].children && tree[i].children.length) {
        const deleted = this.deleteGroupById(tree[i].children, id)
        if (deleted) return true
      }
    }
    return false
  }

  // 获取全部分组
  getAllGroups() {
    const data = this.readGroupData()
    // 只返回根节点（id为0）
    const root = data.find((g) => g.id === 0)
    return root ? [root] : []
  }

  // 获取单个分组
  getGroupById(id) {
    const data = this.readGroupData()
    const group = this.findGroupById(data, id)
    if (!group) {
      throw new Error('分组不存在')
    }
    return group
  }

  // 新增分组
  createGroup(name, parentId) {
    if (!name) {
      throw new Error('分组名不能为空')
    }
    if (parentId === -1 || parentId === '-1') {
      throw new Error('未分组下不能创建子分组')
    }

    const data = this.readGroupData()
    const newGroup = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name,
      children: [],
      files: [],
    }

    if (parentId === 0 || parentId === '0' || parentId === undefined || parentId === null) {
      // 插入到 id 为 0 的 children
      const root = data.find((g) => g.id === 0)
      if (!root) {
        throw new Error('根分组不存在')
      }
      root.children.push(newGroup)
    } else {
      const parent = this.findGroupById(data, Number(parentId))
      if (!parent) {
        throw new Error('父分组不存在')
      }
      parent.children.push(newGroup)
    }

    this.writeGroupData(data)
    return newGroup
  }

  // 删除分组
  deleteGroup(id) {
    if (!id && id !== 0) {
      throw new Error('分组ID不能为空')
    }
    if (id === 0 || id === -1) {
      throw new Error('不能删除全部或未分组')
    }

    const data = this.readGroupData()
    const group = this.findGroupById(data, id)
    if (!group) {
      throw new Error('分组不存在')
    }

    // 先清空该分组 files 里的 mockJson group 字段
    if (Array.isArray(group.files) && group.files.length > 0) {
      group.files.forEach((fileName) => {
        const filePath = require('path').join(config.MOCK_DIR, fileName)
        if (fileUtils.fileExists(filePath)) {
          try {
            const data = fileUtils.readJsonFile(filePath)
            data.group = ''
            fileUtils.writeJsonFile(filePath, data)
          } catch (error) {
            console.warn(`清空分组字段失败: ${fileName}`, error.message)
          }
        }
      })
    }

    const deleted = this.deleteGroupById(data, id)
    if (!deleted) {
      throw new Error('分组不存在')
    }

    this.writeGroupData(data)
    return true
  }

  // 修改分组下接口（增删改）
  updateGroupFiles(id, files, mergeMode = false) {
    if (!Array.isArray(files)) {
      throw new Error('files必须为数组')
    }

    const data = this.readGroupData()
    const group = this.findGroupById(data, id)
    if (!group) {
      throw new Error('分组不存在')
    }

    // 如果是清空分组
    if (files.length === 0 && Array.isArray(group.files) && group.files.length > 0) {
      // 清空 group.files
      const oldFiles = group.files
      group.files = []
      // 同步清空 mockJson 里这些文件的 group 字段
      oldFiles.forEach((fileName) => {
        const filePath = require('path').join(config.MOCK_DIR, fileName)
        if (fileUtils.fileExists(filePath)) {
          try {
            const data = fileUtils.readJsonFile(filePath)
            data.group = ''
            fileUtils.writeJsonFile(filePath, data)
          } catch (error) {
            console.warn(`清空分组字段失败: ${fileName}`, error.message)
          }
        }
      })
    } else if (mergeMode) {
      // 合并模式：合并新旧接口列表，避免重复
      const oldFiles = group.files || []
      const newFiles = files

      // 使用Set来去重
      const mergedFiles = [...new Set([...oldFiles, ...newFiles])]
      group.files = mergedFiles

      console.log(
        `分组 ${group.name} 接口合并: 原有 ${oldFiles.length} 个，新增 ${newFiles.length} 个，合并后 ${mergedFiles.length} 个`
      )
    } else {
      // 替换模式：直接替换
      group.files = files
    }

    this.writeGroupData(data)
    return group.files
  }

  addFileToGroup(groupName, fileName) {
    if (!groupName) return
    const data = this.readGroupData()
    // 支持多级分组
    function findGroupByName(groups, name) {
      for (const g of groups) {
        if (g.name === name) return g
        if (g.children && g.children.length) {
          const found = findGroupByName(g.children, name)
          if (found) return found
        }
      }
      return null
    }
    const group = findGroupByName(data, groupName)
    if (group) {
      if (!Array.isArray(group.files)) group.files = []
      if (!group.files.includes(fileName)) {
        group.files.push(fileName)
        this.writeGroupData(data)
      }
    }
  }
}

module.exports = new GroupService()
