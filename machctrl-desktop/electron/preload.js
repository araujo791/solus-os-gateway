const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize:       () => ipcRenderer.invoke('window-minimize'),
  maximize:       () => ipcRenderer.invoke('window-maximize'),
  close:          () => ipcRenderer.invoke('window-close'),
  isMaximized:    () => ipcRenderer.invoke('window-is-maximized'),
  getPlatform:    () => ipcRenderer.invoke('get-platform'),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  openExternal:   (url) => ipcRenderer.invoke('open-external', url),
  setAutostart:   (enable) => ipcRenderer.invoke('set-autostart', enable),
  onBackendStatus:(cb) => ipcRenderer.on('backend-status', (_, v) => cb(v)),
})
