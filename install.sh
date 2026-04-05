#!/bin/bash
# ============================================================
#  MachCtrl - Script de Instalação para Solus Linux
#  Monitor e controle de hardware para Machinist E5 D8 Max
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       🛡️  MachCtrl - Instalação          ║"
echo "  ║   Monitor de Hardware para Machinist     ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Verifica se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Execute como root: sudo bash install.sh${NC}"
    exit 1
fi

INSTALL_DIR="/opt/machctrl"
CURRENT_USER="${SUDO_USER:-$USER}"

echo -e "${GREEN}[1/7]${NC} 📦 Instalando dependências do sistema..."
eopkg install -y lm_sensors fancontrol python3 python3-pip curl 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Alguns pacotes podem já estar instalados${NC}"
}

echo -e "${GREEN}[2/7]${NC} 🔍 Detectando sensores de hardware..."
sensors-detect --auto || true
echo ""
echo -e "${CYAN}Sensores detectados:${NC}"
sensors || echo -e "${YELLOW}⚠️  Nenhum sensor encontrado. Verifique os módulos do kernel.${NC}"

echo -e "${GREEN}[3/7]${NC} 🐍 Instalando dependências Python..."
# Tenta instalar pip primeiro se não existir
if ! command -v pip3 &> /dev/null; then
    echo "   Instalando pip3..."
    eopkg install -y pip 2>/dev/null || python3 -m ensurepip --upgrade 2>/dev/null || true
fi
# Instala dependências Python
python3 -m pip install --break-system-packages websockets psutil 2>/dev/null || \
python3 -m pip install websockets psutil 2>/dev/null || \
pip3 install websockets psutil 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Instalação via pip falhou. Tentando via eopkg...${NC}"
    eopkg install -y python3-psutil 2>/dev/null || true
    python3 -m pip install --user websockets 2>/dev/null || true
}

echo -e "${GREEN}[4/7]${NC} 📁 Instalando MachCtrl em ${INSTALL_DIR}..."
mkdir -p "$INSTALL_DIR"
cp -r . "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/backend/machctrl_server.py"

echo -e "${GREEN}[5/7]${NC} ⚙️  Criando serviço systemd..."
cat > /etc/systemd/system/machctrl.service << EOF
[Unit]
Description=MachCtrl - Monitor de Hardware
After=network.target lm-sensors.service

[Service]
Type=simple
ExecStart=/usr/bin/python3 ${INSTALL_DIR}/backend/machctrl_server.py
WorkingDirectory=${INSTALL_DIR}
Restart=always
RestartSec=5
User=root
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}[6/7]${NC} 🚀 Habilitando e iniciando serviço..."
systemctl daemon-reload
systemctl enable machctrl.service
systemctl start machctrl.service

echo -e "${GREEN}[7/7]${NC} 🌐 Configurando acesso ao dashboard..."

# Verifica se Node.js está instalado para build
if command -v node &> /dev/null; then
    echo "   Node.js detectado, fazendo build do dashboard..."
    cd "$INSTALL_DIR"
    npm install 2>/dev/null || true
    npm run build 2>/dev/null || true
    
    # Serve com um servidor simples
    cat > /etc/systemd/system/machctrl-web.service << EOF
[Unit]
Description=MachCtrl Web Dashboard
After=machctrl.service

[Service]
Type=simple
ExecStart=/usr/bin/python3 -m http.server 3000 --directory ${INSTALL_DIR}/dist
WorkingDirectory=${INSTALL_DIR}/dist
Restart=always
User=${CURRENT_USER}

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable machctrl-web.service
    systemctl start machctrl-web.service
else
    echo -e "${YELLOW}   Node.js não encontrado. Instale com: sudo eopkg install nodejs${NC}"
    echo "   Depois execute: cd $INSTALL_DIR && npm install && npm run build"
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}✅ MachCtrl instalado com sucesso!${NC}              ${CYAN}║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC}                                                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  🌐 Dashboard: ${GREEN}http://localhost:3000${NC}             ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  🔌 Backend:   ${GREEN}ws://localhost:8765${NC}               ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  📋 Comandos úteis:                              ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • Ver status:  systemctl status machctrl      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • Ver logs:    journalctl -u machctrl -f      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • Reiniciar:   systemctl restart machctrl     ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • Parar:       systemctl stop machctrl        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    • Sensores:    sensors                        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}                                                  ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}💡 Dica: Todos os fans e sensores de temperatura são${NC}"
echo -e "${YELLOW}   detectados automaticamente pelo lm_sensors!${NC}"
echo ""
