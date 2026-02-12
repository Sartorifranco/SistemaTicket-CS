#!/bin/bash
# =============================================================================
# Script de despliegue - ejecutar EN EL VPS (Linux)
# Uso: cd /var/www/tickets/schettini-tickets && bash scripts/deploy.sh
#      o: bash scripts/deploy.sh --pull   para hacer git pull antes
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo ">>> Raíz del proyecto: $ROOT_DIR"
echo ""

# Opcional: actualizar código desde Git
if [[ "$1" == "--pull" ]]; then
    if [[ -d ".git" ]]; then
        echo ">>> Git pull..."
        git pull
        echo ""
    else
        echo ">>> (Sin Git en este directorio, se omite pull)"
        echo ""
    fi
fi

# Build del frontend (instalar dependencias si faltan)
echo ">>> Frontend: instalando dependencias..."
cd frontend
npm install --production=false
echo ">>> Build del frontend..."
npm run build
cd ..
echo ">>> Build listo."
echo ""

# Reiniciar backend con PM2
echo ">>> Reiniciando backend (PM2 tickets-api)..."
pm2 restart tickets-api
echo ""

echo ">>> Despliegue terminado."
pm2 list
