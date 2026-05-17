# Sensei

<<<<<<< HEAD
Monitor de hardware estilo **Sensei 2.0 (macOS)** para **CachyOS / Arch Linux**.
=======
Monitor de hardware estilo **MachCtrl 2.0 (macOS)** para **CachyOS / Arch Linux**.
>>>>>>> parent of ae33164 (Changes)

App desktop com sidebar de navegação, tela Overview central, ícone na bandeja
mostrando a temperatura da CPU em tempo real, tema claro/escuro e auto-start
no boot. O backend Python lê `lm_sensors`, `psutil`, `dmidecode`, `RAPL` e
sysfs diretamente — sem dependências externas em nuvem.

## Instalar (CachyOS / Arch)

```bash
./install.sh
```

Você poderá escolher:

1. **Pacman** — compila um pacote `.pkg.tar.zst` via `makepkg -si`
<<<<<<< HEAD
2. **AppImage portátil** — gera `Sensei-x86_64.AppImage` para rodar de qualquer lugar
=======
2. **AppImage portátil** — gera `MachCtrl-x86_64.AppImage` para rodar de qualquer lugar
>>>>>>> parent of ae33164 (Changes)
3. **Modo dev** — sobe o backend + Vite no navegador para desenvolvimento

## Build manual

```bash
# AppImage
bash scripts/build-appimage.sh

# Pacote pacman
cp Sensei-x86_64.AppImage packaging/
cd packaging && makepkg -si
```

## Desenvolvimento

```bash
# Terminal 1 — backend
python3 backend/machctrl_server.py

# Terminal 2 — frontend (browser)
npm run dev

# OU rodar dentro do Electron com hot-reload
npm run electron:dev
```

## Estrutura

```
backend/        # WebSocket server Python (porta 8765)
electron/       # main.cjs + preload.cjs
src/            # React app (HashRouter)
  layouts/      # AppLayout (sidebar + header)
  pages/        # Overview, CpuPage, GpuPage, MemoryPage, ...
  components/   # AppSidebar, dashboard/*
packaging/      # PKGBUILD, .desktop, ícone
scripts/        # build-appimage.sh
```

## Recursos

- 🎛 Sidebar com Overview, CPU, GPU, Memória, Discos, Fans, Energia, Sistema
- 🌡 Tray icon com temperatura da CPU sempre visível
- 🌓 Tema claro/escuro
- 🚀 Auto-start no login (gera `~/.config/autostart/sensei.desktop`)
- 🔌 Backend Python embutido (spawn automático ao abrir)
