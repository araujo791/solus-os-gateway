## Objetivo

Transformar o dashboard atual em um app desktop nativo no estilo do **Sensei 2.0 (macOS)**, distribuído para o CachyOS via **AppImage portátil** e **PKGBUILD nativo (pacman)**. O app abre, spawna o backend Python automaticamente, mostra um sidebar de navegação à esquerda e uma tela "Overview" central com cards grandes de saúde do sistema.

---

## 1. Empacotamento Electron

- Criar `electron/main.cjs` (CommonJS):
  - `BrowserWindow` 1280×800, frameless opcional, fundo escuro.
  - Carrega `dist/index.html` via `file://`.
  - Spawna `python3 backend/machctrl_server.py` como child process ao iniciar; mata no `before-quit`.
  - Cria **Tray icon** com label dinâmico (`"CPU 62°C"`) atualizado via IPC vindo do renderer.
  - Menu do tray: Abrir, Auto-start (toggle), Sair.
- Criar `electron/preload.cjs` expondo:
  - `window.sensei.setTrayTemp(temp)`
  - `window.sensei.toggleAutostart(enabled)`
  - `window.sensei.getTheme()` / `setTheme()`
- `vite.config.ts`: setar `base: './'`.
- `package.json`: `"main": "electron/main.cjs"`, scripts `electron:dev`, `electron:build`.

## 2. Sidebar + Overview (estilo Sensei)

Reorganizar a UI:

```text
┌──────────┬─────────────────────────────────┐
│ Sensei   │  Overview                       │
│ ──────   │  ┌─────────┐ ┌─────────┐        │
│ ◉ Home   │  │  CPU    │ │  GPU    │        │
│ ▣ CPU    │  │  62°C   │ │  48°C   │        │
│ ▤ GPU    │  ├─────────┤ ├─────────┤        │
│ ▦ Memory │  │ Memory  │ │ Disks   │        │
│ ▥ Disks  │  └─────────┘ └─────────┘        │
│ ◈ Fans   │  ┌─────────┐ ┌─────────┐        │
│ ⚡ Power │  │ Fans    │ │ Power   │        │
│          │  └─────────┘ └─────────┘        │
│ ☀ Tema   │                                 │
└──────────┴─────────────────────────────────┘
```

- Adicionar `react-router-dom` rotas: `/`, `/cpu`, `/gpu`, `/memory`, `/disks`, `/fans`, `/power`.
- Criar `src/layouts/AppLayout.tsx` com `SidebarProvider` + `AppSidebar`.
- Criar `src/components/AppSidebar.tsx` com itens (Home, CPU, GPU, Memória, Discos, Fans, Energia) usando `NavLink` + `lucide-react`.
- Criar páginas em `src/pages/`:
  - `Overview.tsx` — grid 2-col de cards-resumo (mini-versões dos painéis atuais), clicáveis para navegar.
  - `CpuPage.tsx` — reusa `CpuPanel` + `TempChart`.
  - `GpuPage.tsx`, `MemoryPage.tsx`, `DisksPage.tsx`, `FansPage.tsx`, `PowerPage.tsx` — reusam componentes existentes.
- Substituir `Index.tsx` para virar a `Overview`.

## 3. Tema claro/escuro

- Adicionar `ThemeProvider` (context simples) com `light`/`dark`/`system`.
- Persistir em `localStorage` + sincronizar com Electron via preload (para tray icon).
- Refinar tokens em `index.css`: definir `:root` (light) e `.dark` (dark) com paleta Sensei (cinza-azulado escuro `#0E1116`, accent ciano `#5EE2D6`).
- Toggle no rodapé do sidebar (sun/moon).

## 4. Tray icon com temp da CPU

- Renderer envia `setTrayTemp(cpuPackageMaxTemp)` a cada update do WebSocket.
- Main process atualiza `tray.setTitle(`${temp}°`)` (Linux: usa `setToolTip` + ícone gerado via canvas/PNG estático em `electron/assets/`).
- Ícone PNG gerado sob demanda com a temp desenhada (usando `electron.nativeImage` + buffer canvas no main).

## 5. Auto-start no boot

- Implementar via arquivo `.desktop` em `~/.config/autostart/sensei.desktop`.
- Toggle no sidebar grava/remove o arquivo via IPC.
- API: `window.sensei.toggleAutostart(true|false)` no preload; main process escreve o desktop file.

## 6. Empacotamento — AppImage + PKGBUILD

### 6a. AppImage
- Usar `@electron/packager` + `appimagetool` (baixado on-demand via `nix run nixpkgs#appimagetool`).
- Script `scripts/build-appimage.sh`:
  ```bash
  npx vite build
  npx @electron/packager . Sensei --platform=linux --arch=x64 --out=release --overwrite --ignore=node_modules
  # criar AppDir, copiar build, AppRun, .desktop, ícone
  appimagetool Sensei.AppDir Sensei-x86_64.AppImage
  ```

### 6b. PKGBUILD (pacman)
- Criar `packaging/PKGBUILD`:
  ```bash
  pkgname=sensei-cachyos
  pkgver=1.0.0
  depends=('lm_sensors' 'python' 'python-psutil' 'dmidecode')
  source=("Sensei-x86_64.AppImage")
  package() {
    install -Dm755 Sensei-x86_64.AppImage "$pkgdir/opt/sensei/sensei"
    install -Dm644 sensei.desktop "$pkgdir/usr/share/applications/sensei.desktop"
    install -Dm644 sensei.png "$pkgdir/usr/share/icons/hicolor/512x512/apps/sensei.png"
    ln -s /opt/sensei/sensei "$pkgdir/usr/bin/sensei"
  }
  ```
- Adicionar `packaging/sensei.desktop` e ícone.
- README com `makepkg -si` para build local.

## 7. Atualização do install.sh

- Renomear o atual `install.sh` (modo browser) para `install-dev.sh`.
- Novo `install.sh` simples: detecta CachyOS/Arch e oferece:
  1. `makepkg -si` (compila pacote local)
  2. Baixar AppImage pré-compilado

## 8. Passos técnicos detalhados

1. `bun add -d electron @electron/packager` + `bun add react-router-dom` (já existe? confirmar).
2. Criar estrutura Electron (`electron/main.cjs`, `preload.cjs`, `assets/icon.png`).
3. Setar `base: './'` em `vite.config.ts`.
4. Refatorar `App.tsx` → adicionar `BrowserRouter` + `AppLayout` + rotas.
5. Mover conteúdo do `Index.tsx` atual → `Overview.tsx` (versão card-resumo) + páginas dedicadas.
6. Criar `AppSidebar` + `ThemeProvider` + toggle.
7. Adicionar IPC tray temp + autostart.
8. Criar scripts `scripts/build-appimage.sh` e `packaging/PKGBUILD`.
9. Atualizar `install.sh` e `README.md`.

## 9. Fora de escopo (próximas iterações)

- Notificações de alerta (já recusado nesta versão).
- Build Windows/macOS (foco CachyOS).
- Auto-update do AppImage.
- Histórico persistente em SQLite.

---

**Resultado esperado:** ao rodar `makepkg -si` ou abrir o `.AppImage`, o usuário vê um app desktop escuro estilo Sensei, com sidebar lateral, Overview central, tray com temperatura da CPU, e tema claro/escuro — sem precisar de navegador.
