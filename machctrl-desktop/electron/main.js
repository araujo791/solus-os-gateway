const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const log = require('electron-log')
const os = require('os')
const fs = require('fs')
const net = require('net')

// Permite WebSocket para localhost quando empacotado
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests')

log.transports.file.level = 'info'
log.info('MachCtrl Desktop iniciando...')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
let mainWindow = null
let backendProcess = null

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host: '127.0.0.1' })
    s.setTimeout(400)
    s.on('connect', () => { s.destroy(); resolve(true) })
    s.on('error',   () => resolve(false))
    s.on('timeout', () => { s.destroy(); resolve(false) })
  })
}

function resolveBackendPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', 'backend', 'machctrl_server.py')
  }
  const candidates = [
    path.join(process.resourcesPath, 'backend', 'machctrl_server.py'),
    path.join(path.dirname(process.execPath), 'resources', 'backend', 'machctrl_server.py'),
    path.join(app.getAppPath(), '..', 'backend', 'machctrl_server.py'),
    '/opt/machctrl/backend/machctrl_server.py',
  ]
  const found = candidates.find(p => { try { return fs.existsSync(p) } catch { return false } })
  if (found) return found
  log.error('Backend não encontrado. Candidatos:', candidates)
  return candidates[0]
}

// ─── Start backend ────────────────────────────────────────────────────────────
async function startBackend() {
  // Se porta já em uso, backend (systemd ou outra instância) já está rodando
  const inUse = await isPortInUse(8765)
  if (inUse) {
    log.info('Porta 8765 já em uso — backend existente será reutilizado.')
    return
  }

  const backendPath = resolveBackendPath()
  log.info(`Subindo backend: ${backendPath}`)

  // Usa o Python do sistema (não do AppImage) com PYTHONPATH limpo
  const python3 = '/usr/bin/python3'
  const env = Object.assign({}, process.env, {
    PYTHONUNBUFFERED: '1',
    // Remove variáveis de ambiente que o AppImage injeta e podem quebrar imports
    LD_LIBRARY_PATH: '',
    PYTHONPATH: '',
    PYTHONHOME: '',
  })

  backendProcess = spawn(python3, [backendPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
    detached: false,
  })

  backendProcess.stdout.on('data', (d) => log.info(`[backend] ${d.toString().trim()}`))
  backendProcess.stderr.on('data', (d) => log.warn(`[backend:err] ${d.toString().trim()}`))
  backendProcess.on('exit', (code, signal) => {
    log.warn(`Backend saiu com código ${code} sinal ${signal}`)
    if (mainWindow) {
      mainWindow.webContents.send('backend-status', { connected: false, error: `Backend encerrou (código ${code})` })
    }
    // Tenta reiniciar após 3s se não foi kill intencional
    if (signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      setTimeout(async () => {
        log.info('Tentando reiniciar backend...')
        await startBackend()
      }, 3000)
    }
  })

  log.info(`Backend PID: ${backendProcess.pid}`)
}

// ─── Create window ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0c14',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,   // permite ws://localhost do file://
    },
  })

  Menu.setApplicationMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('window-minimize',   () => mainWindow?.minimize())
ipcMain.handle('window-maximize',   () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window-close',      () => mainWindow?.close())
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('get-platform',      () => ({ platform: process.platform, arch: process.arch, hostname: os.hostname(), release: os.release() }))
ipcMain.handle('open-external',     (_, url) => shell.openExternal(url))

ipcMain.handle('set-autostart', (_, enable) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,  // inicia em segundo plano sem janela
    })
    // Fallback para Linux via .desktop em autostart
    if (process.platform === 'linux') {
      const autostartDir = require('path').join(require('os').homedir(), '.config', 'autostart')
      const desktopFile  = require('path').join(autostartDir, 'machctrl.desktop')
      require('fs').mkdirSync(autostartDir, { recursive: true })
      if (enable) {
        require('fs').writeFileSync(desktopFile,
          '[Desktop Entry]\nType=Application\nName=MachCtrl\nExec=/usr/local/bin/machctrl\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true\n')
      } else {
        try { require('fs').unlinkSync(desktopFile) } catch { /* ok */ }
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})
ipcMain.handle('restart-backend',   async () => {
  if (backendProcess) { backendProcess.kill(); backendProcess = null }
  await new Promise(r => setTimeout(r, 600))
  await startBackend()
  return { ok: true }
})

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startBackend()
  // Dá tempo ao backend para ligar na porta antes de abrir a janela
  await new Promise(r => setTimeout(r, 1200))
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) backendProcess.kill()
    app.quit()
  }
})

app.on('before-quit', () => {
  if (backendProcess) { backendProcess.kill(); backendProcess = null }
})
