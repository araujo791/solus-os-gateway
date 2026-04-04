#!/bin/bash
# Desinstalação do MachCtrl

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Execute como root: sudo bash uninstall.sh${NC}"
    exit 1
fi

echo "🗑️  Removendo MachCtrl..."

systemctl stop machctrl.service 2>/dev/null || true
systemctl stop machctrl-web.service 2>/dev/null || true
systemctl disable machctrl.service 2>/dev/null || true
systemctl disable machctrl-web.service 2>/dev/null || true
rm -f /etc/systemd/system/machctrl.service
rm -f /etc/systemd/system/machctrl-web.service
systemctl daemon-reload

rm -rf /opt/machctrl

echo -e "${GREEN}✅ MachCtrl removido com sucesso!${NC}"
