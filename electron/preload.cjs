const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sensei", {
  setTrayTemp: (temp) => ipcRenderer.invoke("sensei:set-tray-temp", temp),
  getAutostart: () => ipcRenderer.invoke("sensei:get-autostart"),
  toggleAutostart: (enabled) => ipcRenderer.invoke("sensei:toggle-autostart", enabled),
  openExternal: (url) => ipcRenderer.invoke("sensei:open-external", url),
  isElectron: true,
});
