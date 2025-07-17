const pty = require('node-pty')
const WebSocket = require('ws')
const dbService = require('./dbService')
const path = require('path')
const fs = require('fs')

// 通用黑名单
const COMMON_BLACKLIST = [
  'shutdown',
  'reboot',
  'nc',
  'python',
  'node',
  'docker',
  'chmod',
  'chown',
  'su',
  'sudo',
  'scp',
  'ftp',
  'dd',
  'mkfs',
  'mount',
  'umount',
]
// Windows 特有黑名单
const WIN_BLACKLIST = ['del', 'format', 'shutdown', 'copy', 'move', 'rmdir']
// Unix/Linux 特有黑名单
const UNIX_BLACKLIST = ['rm', 'curl', 'wget']

const BLACKLISTED_COMMANDS =
  process.platform === 'win32' ? COMMON_BLACKLIST.concat(WIN_BLACKLIST) : COMMON_BLACKLIST.concat(UNIX_BLACKLIST)

function isBlacklisted(cmd) {
  return BLACKLISTED_COMMANDS.some((bad) =>
    cmd
      .trim()
      .toLowerCase()
      .startsWith(bad + ' ')
  )
}

function getShellAndArgs() {
  if (process.platform === 'win32') {
    // 优先 powershell
    if (process.env.ComSpec && process.env.ComSpec.toLowerCase().includes('powershell')) {
      return { shell: process.env.ComSpec, args: [] }
    }
    // 检查 powershell 是否存在
    const psPath = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
    if (fs.existsSync(psPath)) return { shell: psPath, args: ['-NoLogo'] }
    // 退回 cmd
    return { shell: process.env.ComSpec || 'cmd.exe', args: [] }
  } else {
    if (fs.existsSync('/bin/bash')) return { shell: '/bin/bash', args: ['--login'] }
    if (fs.existsSync('/bin/sh')) return { shell: '/bin/sh', args: [] }
    return { shell: 'sh', args: [] }
  }
}

async function setupTerminalWS(server) {
  const wss = new WebSocket.Server({ server, path: '/ws/terminal' })

  wss.on('connection', async (ws) => {
    // 获取允许的本地目录
    let allowedDir = process.cwd()
    try {
      const dirObj = await dbService.getLocalDirectory()
      if (dirObj && dirObj.directory) {
        allowedDir = dirObj.directory
      }
    } catch (e) {}

    // 多终端会话管理：sessionId -> { child, inputBuffer }
    const sessions = {}

    ws.on('message', (msg) => {
      try {
        const { type, data, sessionId, cols, rows } = JSON.parse(msg)
        if (!sessionId) {
          ws.send(JSON.stringify({ type: 'error', data: '缺少 sessionId' }))
          return
        }
        if (type === 'create') {
          // 创建新终端窗口
          if (sessions[sessionId]) {
            ws.send(JSON.stringify({ type: 'error', data: '该 sessionId 已存在' }))
            return
          }
          const { shell, args } = getShellAndArgs()
          const child = pty.spawn(shell, args, {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: allowedDir,
            env: process.env,
          })
          sessions[sessionId] = { child, inputBuffer: '' }
          child.on('data', (d) => ws.send(JSON.stringify({ type: 'stdout', data: d, sessionId })))
          child.on('exit', (code) => {
            ws.send(JSON.stringify({ type: 'close', code, sessionId }))
            delete sessions[sessionId]
          })
        } else if (type === 'stdin') {
          const session = sessions[sessionId]
          if (!session || !session.child) {
            ws.send(JSON.stringify({ type: 'error', data: '终端窗口不存在', sessionId }))
            return
          }
          const child = session.child
          // 累加输入到缓冲区
          session.inputBuffer += data
          // 检查是否有换行（可能一次输入多行）
          while (session.inputBuffer.includes('\n')) {
            const idx = session.inputBuffer.indexOf('\n')
            const line = session.inputBuffer.slice(0, idx)
            // 黑名单校验
            if (isBlacklisted(line)) {
              ws.send(JSON.stringify({ type: 'error', data: '命令被禁止', sessionId }))
              session.inputBuffer = session.inputBuffer.slice(idx + 1) // 清除本行
              continue
            }
            // 目录校验（防止cd到非法目录）
            if (/^cd\s+(.+)/.test(line)) {
              const target = line.match(/^cd\s+(.+)/)[1].trim()
              const targetPath = path.resolve(allowedDir, target)
              if (!targetPath.startsWith(allowedDir)) {
                ws.send(JSON.stringify({ type: 'error', data: '禁止切换到未授权目录', sessionId }))
                session.inputBuffer = session.inputBuffer.slice(idx + 1)
                continue
              }
            }
            // 校验通过，写入子进程
            child.write(line + '\n')
            session.inputBuffer = session.inputBuffer.slice(idx + 1)
          }
          // 剩余部分（未回车的内容，直接写入，支持方向键、Tab等）
          if (session.inputBuffer.length > 0 && !session.inputBuffer.includes('\n')) {
            child.write(data)
          }
        } else if (type === 'resize') {
          const session = sessions[sessionId]
          if (session && session.child) {
            session.child.resize(cols, rows)
          }
        } else if (type === 'close') {
          // 主动关闭终端窗口
          const child = sessions[sessionId]
          if (child) {
            child.kill()
            delete sessions[sessionId]
            ws.send(JSON.stringify({ type: 'closed', sessionId }))
          }
        }
      } catch (e) {}
    })

    ws.on('close', () => {
      // 断开时关闭所有终端窗口
      Object.values(sessions).forEach((session) => session.child.kill())
    })
  })
}

module.exports = { setupTerminalWS }
