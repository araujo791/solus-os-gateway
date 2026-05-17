const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("machctrl", {
  setTrayTemp: (temp) => ipcRenderer.invoke("machctrl:set-tray-temp", temp),
  getAutostart: () => ipcRenderer.invoke("machctrl:get-autostart"),
  toggleAutostart: (enabled) => ipcRenderer.invoke("machctrl:toggle-autostart", enabled),
  openExternal: (url) => ipcRenderer.invoke("machctrl:open-external", url),
  isElectron: true,
});
