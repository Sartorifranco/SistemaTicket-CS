#!/bin/bash
# Ejecutar en el VPS desde la raíz del proyecto: bash scripts/verificar-build-incluye-cambios.sh
# Comprueba que el build actual del frontend incluya el código nuevo (ej. botón "Eliminar foto").

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD="$ROOT_DIR/frontend/build"

echo "=== 1. Carpeta de build ==="
echo "   $BUILD"
echo "   Existe: $([ -d "$BUILD" ] && echo 'Sí' || echo 'No')"
echo ""

echo "=== 2. Archivo main.js que usa index.html ==="
if [[ -f "$BUILD/index.html" ]]; then
  MAIN_REF=$(grep -o 'main\.[^"]*\.js' "$BUILD/index.html" | head -1)
  echo "   $MAIN_REF"
else
  echo "   (no hay index.html)"
  exit 1
fi
echo ""

echo "=== 3. ¿El backend (Node) ve ese mismo build? ==="
echo "   Ejecutá: curl -s http://localhost:5050/api/build-info"
echo "   Debe mostrar mainJs igual al de arriba y exists: true."
echo ""

echo "=== 4. ¿El main.js incluye el texto del botón 'Eliminar foto'? ==="
MAIN_JS="$BUILD/static/js/$MAIN_REF"
if [[ -f "$MAIN_JS" ]]; then
  if grep -q "Eliminar foto" "$MAIN_JS" 2>/dev/null; then
    echo "   Sí. El build actual tiene el botón Eliminar foto."
  else
    echo "   No. El build es viejo. Volvé a ejecutar: bash scripts/deploy.sh --pull"
  fi
else
  echo "   (archivo $MAIN_JS no encontrado)"
fi
echo ""

echo "=== 5. Si entrás por dominio (ej. https://...), ¿Nginx sirve ese mismo build? ==="
echo "   Ejecutá: bash scripts/verificar-frontend-nginx.sh"
echo "   Si Nginx sirve desde otra carpeta o otro main.*.js, ahí está el problema."
