// Electron main process — Sensei (CachyOS)
// CommonJS porque o package.json tem "type": "module".
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow = null;
let tray = null;
let pyProc = null;
let lastTemp = 0;

const BACKEND_PORT = 8765;

function findPython() {
  const candidates = ["/usr/bin/python3", "/usr/local/bin/python3", "python3", "python"];
  for (const p of candidates) {
    try {
      if (p.startsWith("/") && fs.existsSync(p)) return p;
    } catch {}
  }
  return "python3";
}

function findBackendScript() {
  // 1) dev: ./backend/machctrl_server.py
  // 2) packaged: resources/backend/machctrl_server.py
  const dev = path.join(__dirname, "..", "backend", "machctrl_server.py");
  if (fs.existsSync(dev)) return dev;
  const packed = path.join(process.resourcesPath || "", "backend", "machctrl_server.py");
  if (fs.existsSync(packed)) return packed;
  return null;
}

function startBackend() {
  const script = findBackendScript();
  if (!script) {
    console.error("[sensei] backend script não encontrado");
    return;
  }
  const py = findPython();
  console.log(`[sensei] iniciando backend: ${py} ${script}`);
  pyProc = spawn(py, [script], {
    env: { ...process.env, MACHCTRL_PORT: String(BACKEND_PORT) },
    stdio: "inherit",
  });
  pyProc.on("exit", (code) => {
    console.log(`[sensei] backend saiu (${code})`);
    pyProc = null;
  });
}

function stopBackend() {
  if (pyProc) {
    try { pyProc.kill("SIGTERM"); } catch {}
    pyProc = null;
  }
}

function tempIcon(temp) {
  // Gera um PNG 32x32 simples com a temperatura desenhada via SVG.
  const color = temp >= 80 ? "#ef4444" : temp >= 65 ? "#f59e0b" : "#10b981";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <rect width="32" height="32" rx="6" fill="#0E1116"/>
      <text x="16" y="21" font-family="sans-serif" font-size="13" font-weight="700"
            text-anchor="middle" fill="${color}">${temp}</text>
    </svg>`;
  return nativeImage.createFromBuffer(Buffer.from(svg));
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: "Abrir Sensei", click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: "separator" },
    { label: `CPU: ${lastTemp || "--"}°C`, enabled: false },
    { type: "separator" },
    { label: "Sair", click: () => { app.quit(); } },
  ]);
}

function createTray() {
  tray = new Tray(tempIcon(0));
  tray.setToolTip("Sensei — Hardware Monitor");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#0E1116",
    title: "Sensei",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexHtml = path.join(__dirname, "..", "dist", "index.html");
  if (process.env.SENSEI_DEV_URL) {
    mainWindow.loadURL(process.env.SENSEI_DEV_URL);
  } else {
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ---- Auto-start (~/.config/autostart/sensei.desktop) ----
function autostartPath() {
  return path.join(os.homedir(), ".config", "autostart", "sensei.desktop");
}

function readAutostart() {
  return fs.existsSync(autostartPath());
}

function writeAutostart(enabled) {
  const file = autostartPath();
  if (!enabled) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const exec = process.env.APPIMAGE || process.execPath;
  const content =
`[Desktop Entry]
Type=Application
Name=Sensei
Comment=Hardware monitor
Exec=${exec} --hidden
Icon=sensei
X-GNOME-Autostart-enabled=true
Terminal=false
Categories=Utility;System;
`;
  fs.writeFileSync(file, content);
  return true;
}

// ---- IPC ----
ipcMain.handle("sensei:set-tray-temp", (_e, temp) => {
  lastTemp = Math.round(Number(temp) || 0);
  if (tray) {
    tray.setImage(tempIcon(lastTemp));
    tray.setToolTip(`Sensei — CPU ${lastTemp}°C`);
    tray.setContextMenu(buildTrayMenu());
  }
});
ipcMain.handle("sensei:get-autostart", () => readAutostart());
ipcMain.handle("sensei:toggle-autostart", (_e, enabled) => writeAutostart(!!enabled));
ipcMain.handle("sensei:open-external", (_e, url) => shell.openExternal(url));

app.on("before-quit", () => { app.isQuitting = true; stopBackend(); });
app.on("window-all-closed", () => { /* mantém vivo na tray */ });

app.whenReady().then(() => {
  startBackend();
  createWindow();
  createTray();
  // Se iniciou com --hidden (autostart), não força mostrar.
  if (process.argv.includes("--hidden") && mainWindow) mainWindow.hide();
});
