const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const log = require('electron-log')
const os = require('os')

log.transports.file.level = 'info'
log.info('MachCtrl Desktop iniciando...')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
let mainWindow = null
let backendProcess = null
let tray = null

// ─── Spawn Python backend ────────────────────────────────────────────────────
function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'machctrl_server.py')
    : path.join(__dirname, '..', 'backend', 'machctrl_server.py')

  log.info(`Backend path: ${backendPath}`)

  backendProcess = spawn('python3', [backendPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  backendProcess.stdout.on('data', (d) => log.info(`[backend] ${d.toString().trim()}`))
  backendProcess.stderr.on('data', (d) => log.warn(`[backend:err] ${d.toString().trim()}`))
  backendProcess.on('exit', (code) => {
    log.warn(`Backend saiu com código ${code}`)
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.send('backend-status', { connected: false, error: `Backend encerrou (${code})` })
    }
  })

  log.info(`Backend PID: ${backendProcess.pid}`)
}

// ─── Create main window ──────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    frame: false,            // Sem borda — como o Sensei
    transparent: false,
    backgroundColor: '#0a0c14',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'src', 'assets', 'icon.png'),
  })

  // Remove menu bar
  Menu.setApplicationMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC handlers ────────────────────────────────────────────────────────────
ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window-close', () => mainWindow?.close())
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)

ipcMain.handle('get-platform', () => ({
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  release: os.release(),
}))

ipcMain.handle('restart-backend', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  setTimeout(startBackend, 500)
  return { ok: true }
})

ipcMain.handle('open-external', (_, url) => shell.openExternal(url))

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) backendProcess.kill()
    app.quit()
  }
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})
