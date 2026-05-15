#!/bin/bash
# MachCtrl — Script de atualização rápida
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MachCtrl — Atualizando...          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Puxa código novo
echo -e "\n${YELLOW}[1/5]${NC} Baixando atualizações do GitHub..."
git pull origin main

# 2. Para o app
echo -e "\n${YELLOW}[2/5]${NC} Parando MachCtrl..."
pkill -f MachCtrl 2>/dev/null || true
sleep 1

# 3. Atualiza backend (não precisa rebuild)
echo -e "\n${YELLOW}[3/5]${NC} Atualizando backend..."
sudo cp backend/machctrl_server.py /opt/machctrl/backend/
sudo systemctl restart machctrl-backend
echo -e "   ${GREEN}✓${NC} Backend atualizado"

# 4. Rebuild do frontend
echo -e "\n${YELLOW}[4/5]${NC} Compilando interface (pode demorar ~1 min)..."
npm run build:appimage 2>&1 | grep -E "(built|error|AppImage|✓|✗|Error)" || true

# 5. Instala novo AppImage
echo -e "\n${YELLOW}[5/5]${NC} Instalando novo AppImage..."
APPIMAGE=$(find dist-electron -name '*.AppImage' 2>/dev/null | head -1)
if [ -n "$APPIMAGE" ]; then
    sudo cp "$APPIMAGE" /opt/machctrl/MachCtrl.AppImage
    echo -e "   ${GREEN}✓${NC} AppImage instalado: $APPIMAGE"
else
    echo -e "   ✗ AppImage não encontrado — verifique erros acima"
    exit 1
fi

echo -e "\n${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅  MachCtrl atualizado!             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo -e "\nAbrindo MachCtrl...\n"

# Abre o app
machctrl &
