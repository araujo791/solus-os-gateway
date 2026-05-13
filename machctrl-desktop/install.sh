#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MachCtrl Desktop — Instalador para CachyOS / Arch Linux
#  Monitor e Otimizador de Hardware estilo Sensei
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

C_RESET='\033[0m'
C_BOLD='\033[1m'
C_BLUE='\033[38;5;75m'
C_GREEN='\033[38;5;83m'
C_YELLOW='\033[38;5;220m'
C_RED='\033[38;5;196m'
C_DIM='\033[2m'
C_CYAN='\033[38;5;87m'

banner() {
  echo -e "\n${C_BLUE}${C_BOLD}"
  echo "  ╔══════════════════════════════════════════════════════╗"
  echo "  ║                                                      ║"
  echo "  ║   ███╗   ███╗ █████╗  ██████╗██╗  ██╗               ║"
  echo "  ║   ████╗ ████║██╔══██╗██╔════╝██║  ██║               ║"
  echo "  ║   ██╔████╔██║███████║██║     ███████║               ║"
  echo "  ║   ██║╚██╔╝██║██╔══██║██║     ██╔══██║               ║"
  echo "  ║   ██║ ╚═╝ ██║██║  ██║╚██████╗██║  ██║               ║"
  echo "  ║   ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   v2.0       ║"
  echo "  ║                                                      ║"
  echo "  ║        Monitor de Hardware para CachyOS              ║"
  echo "  ╚══════════════════════════════════════════════════════╝"
  echo -e "${C_RESET}\n"
}

step()  { echo -e "\n${C_BLUE}${C_BOLD}[$(printf '%02d' $1)/${TOTAL_STEPS}]${C_RESET} ${C_BOLD}$2${C_RESET}"; }
ok()    { echo -e "   ${C_GREEN}✓${C_RESET} $1"; }
warn()  { echo -e "   ${C_YELLOW}⚠${C_RESET} $1"; }
error() { echo -e "   ${C_RED}✗${C_RESET} $1"; }
info()  { echo -e "   ${C_DIM}→ $1${C_RESET}"; }

TOTAL_STEPS=8
INSTALL_DIR="/opt/machctrl"
SERVICE_USER="machctrl"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

banner

# ── Verificação root ──────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Execute como root: ${C_CYAN}sudo bash install.sh${C_RESET}"
  exit 1
fi

CURRENT_USER="${SUDO_USER:-$USER}"
if [[ "$CURRENT_USER" == "root" ]]; then
  error "Defina SUDO_USER. Execute com: ${C_CYAN}sudo -E bash install.sh${C_RESET}"
  exit 1
fi

echo -e "  ${C_DIM}Usuário: ${CURRENT_USER} | Destino: ${INSTALL_DIR}${C_RESET}\n"

# ── 1. Dependências do sistema ────────────────────────────────────────────────
step 1 "Instalando dependências do sistema"

PKGS_PACMAN=(
  "python"        "python-psutil"
  "lm_sensors"    "dmidecode"      "lshw"
  "nodejs"        "npm"
  "electron"
)
PKGS_AUR=(
  "electron-builder"
)

info "Atualizando banco de dados de pacotes..."
pacman -Sy --noconfirm 2>/dev/null || warn "Sync falhou — continuando..."

for pkg in "${PKGS_PACMAN[@]}"; do
  if pacman -Qi "$pkg" &>/dev/null; then
    ok "$pkg (já instalado)"
  else
    info "Instalando $pkg..."
    pacman -S --noconfirm "$pkg" 2>/dev/null && ok "$pkg" || warn "$pkg não encontrado no repositório oficial"
  fi
done

# Verifica se yay ou paru está disponível para AUR
AUR_HELPER=""
for h in yay paru; do
  if command -v "$h" &>/dev/null; then AUR_HELPER="$h"; break; fi
done

if [[ -n "$AUR_HELPER" ]]; then
  for pkg in "${PKGS_AUR[@]}"; do
    info "Instalando $pkg via $AUR_HELPER..."
    sudo -u "$CURRENT_USER" $AUR_HELPER -S --noconfirm "$pkg" 2>/dev/null && ok "$pkg" || warn "$pkg (AUR) — instalação manual pode ser necessária"
  done
else
  warn "Nenhum helper AUR encontrado (yay/paru) — electron-builder via npm"
fi

# ── 2. Configurar sensores ────────────────────────────────────────────────────
step 2 "Detectando sensores de hardware"
sensors-detect --auto 2>/dev/null || warn "sensors-detect falhou — sensores podem não estar disponíveis"
sensors 2>/dev/null | head -20 || warn "Nenhum sensor detectado via lm_sensors"

# ── 3. Copiar arquivos ────────────────────────────────────────────────────────
step 3 "Instalando MachCtrl em ${INSTALL_DIR}"

mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR"/{electron,src,backend,index.html,package.json,vite.config.ts,tailwind.config.js,postcss.config.js,tsconfig.json} "$INSTALL_DIR/" 2>/dev/null || {
  # Fallback: se rodando do diretório clonado
  rsync -a --exclude=node_modules --exclude=dist --exclude=dist-electron \
    "$SCRIPT_DIR/" "$INSTALL_DIR/" 2>/dev/null || cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/" 2>/dev/null
}
chown -R "$CURRENT_USER:$CURRENT_USER" "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/backend/machctrl_server.py" 2>/dev/null || true
ok "Arquivos copiados"

# ── 4. Instalar dependências Node ─────────────────────────────────────────────
step 4 "Instalando dependências Node.js"
cd "$INSTALL_DIR"
sudo -u "$CURRENT_USER" npm install --prefer-offline 2>&1 | tail -3
ok "npm install concluído"

# ── 5. Build da UI ────────────────────────────────────────────────────────────
step 5 "Compilando interface (Vite + React)"
sudo -u "$CURRENT_USER" npm run build 2>&1 | tail -5
ok "Build concluído → dist/"

# ── 6. Build Electron (AppImage + Pacman package) ────────────────────────────
step 6 "Empacotando aplicação Electron"

# Tenta electron-builder via npx
if sudo -u "$CURRENT_USER" npx electron-builder --version &>/dev/null; then
  info "Gerando AppImage..."
  sudo -u "$CURRENT_USER" npx electron-builder build --linux AppImage 2>&1 | tail -5 && ok "AppImage gerado" || warn "AppImage falhou"
  info "Gerando pacote pacman (.pkg.tar.zst)..."
  sudo -u "$CURRENT_USER" npx electron-builder build --linux pacman 2>&1 | tail -5 && ok "Pacote .pkg.tar.zst gerado" || warn "pacman pkg falhou"
else
  warn "electron-builder não disponível — criando lançador direto"
fi

# Lançador direto como fallback
LAUNCHER="/usr/local/bin/machctrl"
cat > "$LAUNCHER" << 'LAUNCHEOF'
#!/bin/bash
exec electron /opt/machctrl/electron/main.js "$@"
LAUNCHEOF
chmod +x "$LAUNCHER"
ok "Lançador: /usr/local/bin/machctrl"

# ── 7. Serviço systemd (backend Python) ──────────────────────────────────────
step 7 "Configurando serviço systemd"

# sudoers para dmidecode (memória)
SUDOERS_FILE="/etc/sudoers.d/machctrl"
cat > "$SUDOERS_FILE" << EOF
# MachCtrl: permite dmidecode sem senha para leitura de hardware
machctrl ALL=(ALL) NOPASSWD: /usr/sbin/dmidecode
${CURRENT_USER} ALL=(ALL) NOPASSWD: /usr/sbin/dmidecode
EOF
chmod 440 "$SUDOERS_FILE"
ok "sudoers configurado (dmidecode sem senha)"

# Serviço backend
cat > /etc/systemd/system/machctrl-backend.service << EOF
[Unit]
Description=MachCtrl Backend — Monitor de Hardware
After=network.target lm-sensors.service
Wants=lm-sensors.service

[Service]
Type=simple
ExecStart=/usr/bin/python3 ${INSTALL_DIR}/backend/machctrl_server.py
WorkingDirectory=${INSTALL_DIR}
Restart=on-failure
RestartSec=3
User=root
Environment=PYTHONUNBUFFERED=1
StandardOutput=journal
StandardError=journal
SyslogIdentifier=machctrl

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable machctrl-backend.service
systemctl restart machctrl-backend.service && ok "Backend iniciado" || warn "Backend não iniciou — verifique: journalctl -u machctrl-backend -n 20"

# ── 8. Criar entrada .desktop ─────────────────────────────────────────────────
step 8 "Criando entrada no menu de aplicativos"

DESKTOP_FILE="/usr/share/applications/machctrl.desktop"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=MachCtrl
GenericName=Monitor de Hardware
Comment=Monitor e Otimizador de Hardware para Linux
Exec=/usr/local/bin/machctrl
Icon=${INSTALL_DIR}/src/assets/icon.png
Terminal=false
Type=Application
Categories=System;Monitor;
Keywords=hardware;monitor;cpu;gpu;ram;temperatura;fan;ventilador;benchmark;
StartupNotify=true
EOF

# Verifica se há pacote .pkg.tar.zst para instalar
PKG_FILE=$(ls "$INSTALL_DIR/dist-electron/"*".pkg.tar.zst" 2>/dev/null | head -1)
if [[ -n "$PKG_FILE" ]]; then
  info "Instalando pacote nativo: $PKG_FILE"
  pacman -U --noconfirm "$PKG_FILE" 2>/dev/null && ok "Pacote nativo instalado" || warn "Instalação do pacote nativo falhou"
fi

ok "Entrada .desktop criada"

# ── Resumo ────────────────────────────────────────────────────────────────────
echo -e "\n${C_BLUE}${C_BOLD}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║                                                          ║"
echo -e "  ║  ${C_GREEN}✅  MachCtrl instalado com sucesso!${C_BLUE}${C_BOLD}                  ║"
echo "  ║                                                          ║"
echo -e "  ║  ${C_CYAN}Como usar:${C_BLUE}${C_BOLD}                                            ║"
echo -e "  ║  • Menu de apps → MachCtrl                               ║"
echo -e "  ║  • Terminal: ${C_CYAN}machctrl${C_BLUE}${C_BOLD}                                  ║"
echo "  ║                                                          ║"
echo -e "  ║  ${C_CYAN}Comandos úteis:${C_BLUE}${C_BOLD}                                       ║"
echo "  ║  • systemctl status machctrl-backend                     ║"
echo "  ║  • journalctl -u machctrl-backend -f                     ║"
echo "  ║  • systemctl restart machctrl-backend                    ║"
echo "  ║                                                          ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${C_RESET}\n"

if [[ -n "$PKG_FILE" ]]; then
  echo -e "  ${C_DIM}Pacote gerado: $PKG_FILE${C_RESET}"
fi

echo -e "  ${C_DIM}Logs: journalctl -u machctrl-backend${C_RESET}\n"
