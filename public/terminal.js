// 依赖 xterm.js 和 xterm-addon-fit.js
// <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.js"></script>

class TerminalManager {
  constructor(wsUrl) {
    this.wsUrl = wsUrl || this._getDefaultWsUrl()
    this.ws = null
    this.terminals = {} // sessionId -> { term, fitAddon, container }
    this.activeSessionId = null
    this._connect()
  }

  _getDefaultWsUrl() {
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return wsProtocol + '//' + location.host + '/ws/terminal'
  }

  _connect() {
    console.log(';;;;;lll', this.wsUrl)

    this.ws = new WebSocket(this.wsUrl)
    this.ws.onopen = () => {
      console.log('WebSocket 连接已建立')
    }
    this.ws.onerror = (e) => {
      console.error('WebSocket 连接错误', e)
    }
    this.ws.onclose = () => {
      Object.values(this.terminals).forEach((obj) => {
        obj.term.writeln('\r\n[WebSocket 连接已断开]')
        obj.term.setOption('disableStdin', true)
      })
    }
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const { type, data, sessionId } = msg
      const termObj = this.terminals[sessionId]
      if (!termObj) return
      if (type === 'stdout' || type === 'stderr') {
        termObj.term.write(data)
        termObj.term.scrollToBottom()
      } else if (type === 'close' || type === 'closed') {
        termObj.term.writeln('\r\n[终端已关闭]')
        termObj.term.setOption('disableStdin', true)
        termObj.term.scrollToBottom()
      } else if (type === 'error') {
        termObj.term.writeln(`\r\n[错误] ${data}`)
        termObj.term.scrollToBottom()
      }
    }
  }

  // 新建终端窗口，container 为 DOM 元素或 id
  createTerminal(sessionId, container) {
    if (this.terminals[sessionId]) {
      const termObj = this.terminals[sessionId]
      if (!termObj.container.contains(termObj.term.element)) {
        termObj.term.open(this.container)
      }
      termObj.fitAddon.fit()
      return termObj
    }
    const term = new Terminal({
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 13,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    })
    const fitAddon = new FitAddon.FitAddon()
    term.loadAddon(fitAddon)
    if (typeof container === 'string') container = document.getElementById(container)

    // 关键：确保容器可见再 open/fit/write
    const safeInit = () => {
      if (isElementVisible(container)) {
        term.open(container)
        requestAnimationFrame(() => {
          fitAddon.fit()
          term.writeln('欢迎使用 xterm.js')
          term.scrollToBottom()
        })
        window.addEventListener('resize', () => fitAddon.fit())
        // 监听终端尺寸变化并通知后端
        term.onResize(({ cols, rows }) => {
          if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'resize', cols, rows, sessionId }))
          }
        })
        // 绑定输入
        term.onData((data) => {
          if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'stdin', data, sessionId }))
          }
        })
        // 通知后端新建终端
        const sendCreate = () => this.ws.send(JSON.stringify({ type: 'create', sessionId }))
        if (this.ws.readyState === 1) {
          sendCreate()
        } else {
          this.ws.addEventListener('open', sendCreate, { once: true })
        }
        this.terminals[sessionId] = { term, fitAddon, container }
        this.activeSessionId = sessionId
        return this.terminals[sessionId]
      } else {
        setTimeout(safeInit, 50)
      }
    }
    safeInit()
  }

  // 终止终端窗口
  closeTerminal(sessionId) {
    if (!this.terminals[sessionId]) return
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type: 'close', sessionId }))
    }
    this.terminals[sessionId].term.dispose()
    delete this.terminals[sessionId]
    if (this.activeSessionId === sessionId) this.activeSessionId = null
  }

  // 切换激活终端
  setActive(sessionId) {
    this.activeSessionId = sessionId
  }

  // 向当前激活终端发送命令
  sendCommand(cmd) {
    if (!this.activeSessionId) return
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type: 'stdin', data: cmd + '\n', sessionId: this.activeSessionId }))
    }
  }
}

// 导出全局实例
window.TerminalManager = TerminalManager

// ========== 多终端UI管理 ========== //
class TerminalUI {
  constructor(tm) {
    this.tm = tm
    this.currentSessionId = null
    this.termCount = 0
    this.tabs = document.getElementById('terminal-tabs')
    this.container = document.getElementById('terminal-container')
    this.panel = document.getElementById('terminal-panel')
    this.resizeBar = document.getElementById('terminal-resize-bar')
    this._bindUI()
    this.createTerminalTab() // 默认新建一个终端
    window.sendTerminalCommand = (cmd) => this.sendCommand(cmd)
    window._tm = tm
  }

  _bindUI() {
    document.getElementById('new-terminal-btn').onclick = () => this.createTerminalTab()
    // 拖拽调整高度
    let dragging = false,
      startY = 0,
      startH = 0
    this.resizeBar.addEventListener('mousedown', (e) => {
      dragging = true
      startY = e.clientY
      startH = this.container.offsetHeight
      document.body.style.cursor = 'row-resize'
    })
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return
      let delta = e.clientY - startY
      let newH = Math.max(100, startH + delta)
      this.container.style.height = newH + 'px'
      if (this.currentSessionId && this.tm.terminals[this.currentSessionId]) {
        this.tm.terminals[this.currentSessionId].fitAddon.fit()
      }
    })
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false
        document.body.style.cursor = ''
      }
    })
  }

  createTerminalTab() {
    const sessionId = 'term_' + Date.now() + '_' + ++this.termCount
    // 创建Tab
    const tab = document.createElement('div')
    tab.className = 'terminal-tab'
    tab.innerHTML = `<span>${sessionId}</span><button class="close-term"><i class="fas fa-times"></i></button>`
    tab.dataset.sessionId = sessionId
    tab.onclick = (e) => {
      if (e.target.closest('.close-term')) return
      this.switchTab(sessionId)
    }
    tab.querySelector('.close-term').onclick = (e) => {
      e.stopPropagation()
      this.closeTerminalTab(sessionId)
    }
    this.tabs.appendChild(tab)
    this.tm.createTerminal(sessionId, this.container)
    this.switchTab(sessionId)
    console.log('新建终端', sessionId)
  }

  switchTab(sessionId) {
    this.currentSessionId = sessionId
    this.tm.setActive(sessionId)
    Array.from(this.tabs.children).forEach((tab) => {
      if (tab.dataset && tab.dataset.sessionId) {
        tab.classList.toggle('active', tab.dataset.sessionId === sessionId)
      }
    })
    this.container.innerHTML = ''
    if (this.tm.terminals[sessionId]) {
      this.tm.terminals[sessionId].term.open(this.container)
      this.tm.terminals[sessionId].fitAddon.fit()
    }
    console.log('切换终端', sessionId)
  }

  closeTerminalTab(sessionId) {
    this.tm.closeTerminal(sessionId)
    Array.from(this.tabs.children).forEach((tab) => {
      if (tab.dataset && tab.dataset.sessionId === sessionId) tab.remove()
    })
    const remain = Array.from(this.tabs.children).filter((tab) => tab.dataset && tab.dataset.sessionId)
    if (remain.length) this.switchTab(remain[remain.length - 1].dataset.sessionId)
    else this.container.innerHTML = ''
    console.log('关闭终端', sessionId)
  }

  sendCommand(cmd) {
    this.tm.sendCommand(cmd)
    console.log('发送命令到终端', cmd)
  }
}

// ========== 全局初始化入口 ========== //
function initTerminal() {
  const tm = new TerminalManager()
  new TerminalUI(tm)
}
window.initTerminal = initTerminal

function isElementVisible(el) {
  return el && el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0
}
