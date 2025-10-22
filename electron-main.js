const { app, BrowserWindow, Menu, ipcMain, dialog, Tray, nativeImage } = require('electron')
const { startServer } = require('./app')
const { initializeDatabase } = require('./services/dbService')

// 保持对窗口对象的全局引用
let mainWindow
let tray = null
let serverStarted = false
let isQuitting = false
// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(async () => {
  console.log('Electron 应用准备就绪')

  // 初始化数据库
  console.log('🔧 初始化数据库...')
  const dbInitialized = await initializeDatabase()
  if (!dbInitialized) {
    console.error('❌ 数据库初始化失败，应用可能无法正常工作')
  }

  createWindow()
})

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
    show: false, // 先不显示，等启动画面加载后再显示
    titleBarStyle: 'default'
  })

  // 创建菜单
  createMenu()

  // 创建系统托盘
  createTray()

  // 使用 loadFile 加载本地文件，提高启动速度
  const path = require('path')
  const loadingPath = path.join(__dirname, 'public', 'loading.html')

  console.log('启动画面路径:', loadingPath)

  // 先显示启动画面
  try {
    await mainWindow.loadFile(loadingPath)
    mainWindow.show()
    console.log('启动画面加载成功，窗口已显示')
  } catch (error) {
    console.error('启动画面加载失败:', error)
    dialog.showErrorBox('启动失败', '无法加载启动画面: ' + error.message)
    return
  }

  // 等待启动画面显示后，再启动后端服务器
  setTimeout(async () => {
    console.log('开始启动后端服务器...')

    // 启动后端服务器
    if (!serverStarted) {
      try {
        startServer()
        serverStarted = true
        console.log('后端服务器启动成功')

        // 服务器启动成功后，加载主页面
        setTimeout(() => {
          console.log('开始加载主页面: http://localhost:3400')
          mainWindow.loadURL('http://localhost:3400')

          // 开发环境下打开开发者工具
          if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools()
          }
        }, 1000) // 增加等待时间确保服务器完全启动

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
  }, 100) // 等待100ms确保启动画面完全显示


  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      // 点击红叉按钮时隐藏窗口而不是退出
      event.preventDefault()
      mainWindow.hide()
    }
    // 如果 isQuitting 为 true，则允许关闭
  })
  // 当窗口被关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 防止无限重试的计数器
  let retryCount = 0
  const maxRetries = 3

  // 处理页面加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('页面加载失败:', errorDescription)
    console.error('错误代码:', errorCode)
    console.error('URL:', validatedURL)
    console.error('重试次数:', retryCount)

    // 防止无限重试
    if (retryCount >= maxRetries) {
      console.log('达到最大重试次数，停止重试')
      dialog.showErrorBox('页面加载失败', `无法加载页面: ${errorDescription}\n\n错误代码: ${errorCode}\n\nURL: ${validatedURL}\n\n已达到最大重试次数`)
      return
    }

    // 如果是 terminal.html 文件未找到，直接忽略（这是正常的）
    if (errorCode === -6 && validatedURL.includes('terminal.html')) {
      console.log('忽略 terminal.html 文件未找到错误')
      return
    }

    // 如果是文件未找到错误，尝试加载主页面
    if (errorCode === -6) {
      console.log('检测到文件未找到错误，尝试加载主页面...')
      retryCount++
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const indexPath = path.join(__dirname, 'public', 'index.html')
          mainWindow.loadFile(indexPath)
        }
      }, 1000)
    }
    // 如果是连接被拒绝错误，等待服务器启动
    else if (errorCode === -102) {
      console.log('检测到连接被拒绝错误，等待服务器启动...')
      retryCount++
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('重试加载主页面: http://localhost:3400')
          mainWindow.loadURL('http://localhost:3400')
        }
      }, 2000)
    }
    // 如果是网络错误，尝试重新加载
    else if (errorCode === -2 || errorCode === -3) {
      console.log('检测到网络错误，尝试重新加载...')
      retryCount++
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload()
        }
      }, 2000)
    } else {
      dialog.showErrorBox('页面加载失败', `无法加载页面: ${errorDescription}\n\n错误代码: ${errorCode}\n\nURL: ${validatedURL}`)
    }
  })

  // 处理页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成')
    // 重置重试计数器
    retryCount = 0
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
            console.log('=== 用户点击退出菜单 ===')
            console.log('当前 isQuitting:', isQuitting)
            // 直接设置退出标志并退出
            isQuitting = true
            console.log('设置 isQuitting = true')
            console.log('调用 app.quit()')
            app.quit()
            console.log('app.quit() 调用完成')
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
              title: '关于 Mock Coding',
              message: 'Mock Coding v1.0.0',
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
        {
          label: '退出',
          accelerator: 'Cmd+Q',
          click: () => {
            console.log('=== 用户通过 macOS 菜单退出 ===')
            console.log('当前 isQuitting:', isQuitting)
            // 直接设置退出标志并退出
            isQuitting = true
            console.log('设置 isQuitting = true')
            console.log('调用 app.quit()')
            app.quit()
            console.log('app.quit() 调用完成')
          }
        }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 创建系统托盘
function createTray() {
  const path = require('path')

  // 创建托盘图标
  let iconPath
  if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'assets', 'icon.png')
  } else {
    iconPath = path.join(__dirname, 'assets', 'icon.png')
  }

  const icon = nativeImage.createFromPath(iconPath)
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true) // macOS 模板图标
  }

  tray = new Tray(icon)

  // 在 macOS 上，确保托盘图标正确显示
  if (process.platform === 'darwin') {
    tray.setIgnoreDoubleClickEvents(true)
  }

  // 创建托盘菜单
  const trayMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '隐藏窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.hide()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        console.log('=== 用户通过托盘退出 ===')
        console.log('当前 isQuitting:', isQuitting)
        // 直接设置退出标志并退出
        isQuitting = true
        console.log('设置 isQuitting = true')
        console.log('调用 app.quit()')
        app.quit()
        console.log('app.quit() 调用完成')
      }
    }
  ])

  tray.setContextMenu(trayMenu)
  tray.setToolTip('Mock Coding')

  // 在 macOS 上，右键菜单需要特殊处理
  if (process.platform === 'darwin') {
    // macOS 上右键菜单 - 使用不同的方法
    tray.on('right-click', () => {
      console.log('macOS 右键点击托盘')
      tray.popUpContextMenu()
    })

    // macOS 上左键点击
    tray.on('click', () => {
      console.log('macOS 左键点击托盘')
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })

    // macOS 上双击
    tray.on('double-click', () => {
      console.log('macOS 双击托盘')
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  } else {
    // Windows/Linux 上左键点击
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  }
}

// 统一的退出函数
function quitApp() {
  console.log('执行退出操作，设置 isQuitting = true')
  isQuitting = true
  console.log('isQuitting 已设置为:', isQuitting)

  // 清理资源
  if (tray) {
    tray.destroy()
    tray = null
  }

  // 关闭所有窗口
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
    mainWindow.close()
  }

  // 直接退出应用
  console.log('调用 app.quit()')
  app.quit()
}

// 处理应用退出前的事件
app.on('before-quit', (event) => {
  // 如果 isQuitting 为 false，说明是系统托盘菜单的退出或其他系统级退出
  if (!isQuitting) {
    isQuitting = true
    // 不阻止退出，让应用正常退出
  } else {
    console.log('允许退出，isQuitting 为 true')
  }
})

// 处理系统级别的退出请求
app.on('will-quit', (event) => {
  if (!isQuitting) {
    // 如果用户没有明确要求退出，则阻止退出
    event.preventDefault()
    if (mainWindow) {
      mainWindow.hide()
    }
  } else {
    console.log('will-quit: 允许退出，isQuitting 为 true')
  }
})

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  // 只有在明确要求退出时才真正退出
  if (isQuitting) {
    console.log('所有窗口已关闭，应用退出')
    // 不再次调用 app.quit()，避免递归
  } else {
    console.log('保持应用运行（在系统托盘中）')
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

// 处理强制退出请求
ipcMain.handle('force-quit', () => {
  isQuitting = true
  app.quit()
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
      '端口 3400 已被占用，请关闭其他 Mock System 实例后重试。\n\n解决方案：\n1. 检查是否有其他 Mock System 实例在运行\n2. 重启应用\n3. 或者修改配置文件中的端口号'
    )
  } else {
    dialog.showErrorBox(
      '应用错误',
      '发生未预期的错误: ' + error.message + '\n\n请尝试重启应用，如果问题持续存在，请联系技术支持。'
    )
  }
})

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
  // 不显示错误对话框，只记录日志
})
