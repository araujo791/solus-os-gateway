# MachCtrl

Monitor e otimizador de hardware estilo **Sensei 2.0 (macOS)** para **CachyOS / Arch Linux**.

App desktop com sidebar de navegação, tela Overview central, ícone na bandeja
mostrando a temperatura da CPU em tempo real, tema claro/escuro, auto-start
no boot, **Benchmark** (CPU + memória) e **Limpeza** (cache pacman, órfãos,
journal, temp, thumbnails). O backend Python lê `lm_sensors`, `psutil`,
`dmidecode`, `RAPL` e sysfs diretamente.

## Instalar (CachyOS / Arch)

```bash
./install.sh
```

Opções:

1. **Pacman** — compila um pacote `.pkg.tar.zst` via `makepkg -si`
2. **AppImage portátil** — gera `MachCtrl-x86_64.AppImage`
3. **Modo dev** — sobe o backend + Vite no navegador

## Build manual

```bash
# AppImage
bash scripts/build-appimage.sh

# Pacote pacman
cp MachCtrl-x86_64.AppImage packaging/
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
src/
  layouts/      # AppLayout (sidebar + header)
  pages/        # Overview, CpuPage, GpuPage, MemoryPage, DisksPage,
                # FansPage, PowerPage, BenchmarkPage, CleanerPage, SystemPage
  components/   # AppSidebar, dashboard/*
packaging/      # PKGBUILD, .desktop, ícone
scripts/        # build-appimage.sh
```

## Recursos

- 🎛 Sidebar com Visão geral, CPU, GPU, Memória, Discos, Ventiladores, Energia, Benchmark, Limpeza, Sistema
- 🌡 Tray icon com temperatura da CPU sempre visível
- 🌓 Tema claro/escuro
- 🚀 Auto-start no login (gera `~/.config/autostart/machctrl.desktop`)
- 🔌 Backend Python embutido (spawn automático ao abrir)
- ⚡ Benchmark de CPU (crivo + ponto flutuante) e largura de banda de memória
- 🧹 Limpeza de cache pacman, órfãos, journal, temp, thumbnails, pip, npm
