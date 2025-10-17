const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const { startServer } = require('./app')

// 保持对窗口对象的全局引用
let mainWindow
let serverStarted = false

async function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: require('path').join(__dirname, 'electron-preload.js')
    },
    show: false, // 先不显示，等服务器启动后再显示
    titleBarStyle: 'default'
  })

  // 创建菜单
  createMenu()

  // 启动后端服务器
  if (!serverStarted) {
    try {
      startServer()
      serverStarted = true
      console.log('后端服务器启动成功')
    } catch (error) {
      console.error('后端服务器启动失败:', error)

      // 检查是否是端口占用错误
      if (error.code === 'EADDRINUSE') {
        dialog.showErrorBox(
          '端口占用错误',
          '端口 3400 已被占用，请关闭其他 Mock System 实例后重试。\n\n错误详情: ' + error.message
        )
      } else {
        dialog.showErrorBox('服务器启动失败', '无法启动后端服务器: ' + error.message)
      }
      return
    }
  }

  // 等待服务器启动后加载页面
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3400')
    mainWindow.show()

    // 开发环境下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools()
    }
  }, 3000)

  // 当窗口被关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  // 处理页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('页面加载失败:', errorDescription)
    dialog.showErrorBox('页面加载失败', `无法加载页面: ${errorDescription}`)
  })
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project')
          }
        },
        {
          label: '打开项目',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openDirectory'],
              title: '选择项目目录'
            })
            if (!result.canceled) {
              mainWindow.webContents.send('menu-open-project', result.filePaths[0])
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 Mock System',
              message: 'Mock System v1.0.0',
              detail: '一个强大的API Mock和代码生成工具'
            })
          }
        }
      ]
    }
  ]

  // macOS特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  console.log('Electron 应用准备就绪')
  createWindow()
})

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用和菜单栏通常会保持活跃状态，直到用户使用 Cmd + Q 退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，通常会在应用中重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options)
  return result
})

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

// 防止新窗口打开
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    // 可以选择在主窗口中打开链接
    mainWindow.loadURL(navigationUrl)
  })
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
  if (error.code === 'EADDRINUSE') {
    dialog.showErrorBox(
      '端口占用错误',
      '端口 3400 已被占用，请关闭其他 Mock System 实例后重试。'
    )
  } else {
    dialog.showErrorBox('应用错误', '发生未预期的错误: ' + error.message)
  }
})
