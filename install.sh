#!/usr/bin/env bash
# Instalador do MachCtrl para CachyOS / Arch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

cat <<EOF

  ╔═══════════════════════════════════════════╗
  ║          MachCtrl — Instalador              ║
  ║    Hardware monitor para CachyOS/Arch     ║
  ╚═══════════════════════════════════════════╝

EOF

echo "Escolha a forma de instalação:"
echo "  1) Compilar e instalar via pacman (recomendado, makepkg -si)"
echo "  2) Apenas gerar o AppImage portátil (./MachCtrl-x86_64.AppImage)"
echo "  3) Modo desenvolvedor (rodar backend + vite local, sem build)"
echo ""
read -rp "Opção [1-3]: " OPT

build_appimage() {
  bash "$ROOT/scripts/build-appimage.sh"
}

case "$OPT" in
  1)
    build_appimage
    cp MachCtrl-x86_64.AppImage packaging/
    # cria um ícone placeholder se não existir
    [ -f packaging/machctrl.png ] || \
      curl -sL -o packaging/machctrl.png \
        https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/cpu.svg || true
    ( cd packaging && makepkg -si )
    ;;
  2)
    build_appimage
    echo ""
    echo "AppImage gerado em: $ROOT/MachCtrl-x86_64.AppImage"
    echo "Execute com: ./MachCtrl-x86_64.AppImage"
    ;;
  3)
    echo "Instalando dependências Python…"
    sudo pacman -S --needed --noconfirm lm_sensors python-psutil dmidecode || true
    echo "Iniciando backend em background (porta 8765)…"
    python3 backend/machctrl_server.py &
    BACK_PID=$!
    trap "kill $BACK_PID 2>/dev/null || true" EXIT
    npm install
    npm run dev
    ;;
  *)
    echo "Opção inválida"; exit 1 ;;
esac
