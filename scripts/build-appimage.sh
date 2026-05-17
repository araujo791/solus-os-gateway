#!/usr/bin/env bash
# Build do AppImage do Sensei.
# Requisitos: node/npm, python3, e appimagetool (será baixado se faltar).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1/5] Instalando dependências (Electron etc)…"
if [ ! -d node_modules/electron ]; then
  npm install --save-dev electron @electron/packager
else
  npm install
fi

echo "[2/5] Build do frontend (Vite)…"
npx vite build

echo "[3/5] Empacotando Electron…"
rm -rf release
npx @electron/packager . Sensei \
  --platform=linux --arch=x64 \
  --out=release --overwrite \
  --icon=packaging/sensei.png \
  --ignore='^/src$' \
  --ignore='^/public$' \
  --ignore='^/release$' \
  --ignore='^/packaging$' \
  --ignore='^/scripts$' \
  --ignore='^/playwright.*' \
  --ignore='^/vitest.*' \
  --ignore='\.git'

# Copia o backend Python para resources/
mkdir -p release/Sensei-linux-x64/resources/backend
cp -r backend/*.py release/Sensei-linux-x64/resources/backend/

echo "[4/5] Montando AppDir…"
APPDIR="release/Sensei.AppDir"
rm -rf "$APPDIR"
mkdir -p "$APPDIR"
cp -r release/Sensei-linux-x64/* "$APPDIR/"
cp packaging/sensei.desktop "$APPDIR/sensei.desktop"
cp packaging/sensei.png "$APPDIR/sensei.png"
ln -sf sensei.png "$APPDIR/.DirIcon"

cat > "$APPDIR/AppRun" <<'EOF'
#!/usr/bin/env bash
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/Sensei" "$@"
EOF
chmod +x "$APPDIR/AppRun"

echo "[5/5] Gerando AppImage…"
if ! command -v appimagetool >/dev/null 2>&1; then
  echo "appimagetool não encontrado — baixando…"
  curl -L -o /tmp/appimagetool \
    https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
  chmod +x /tmp/appimagetool
  APPIMAGETOOL=/tmp/appimagetool
else
  APPIMAGETOOL=$(command -v appimagetool)
fi

ARCH=x86_64 "$APPIMAGETOOL" "$APPDIR" Sensei-x86_64.AppImage

echo ""
echo "✓ Pronto: $ROOT/Sensei-x86_64.AppImage"
echo "  Para empacotar como pacman:"
echo "    cp Sensei-x86_64.AppImage packaging/ && cd packaging && makepkg -si"
