#!/bin/bash
# Ejecutar en el VPS desde la carpeta del proyecto:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/verificar-frontend-nginx.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD="$PROJECT_ROOT/frontend/build"

echo "=== 1. server_name en Nginx (debe incluir sch.soporte.com.ar) ==="
grep -n "server_name" /etc/nginx/sites-available/tickets 2>/dev/null | head -5 || echo "(no se encontró sites-available/tickets)"

echo ""
echo "=== 2. Archivo JS del build y qué referencia index.html ==="
echo "Ruta build: $BUILD"
ls -la "$BUILD/static/js/main."*.js 2>/dev/null || echo "No hay main.*.js (¿corriste bash scripts/deploy.sh?)"
echo "Referencia en index.html:"
grep -o 'main\.[^"]*\.js' "$BUILD/index.html" 2>/dev/null || echo "No se pudo leer index.html"

echo ""
echo "=== 3. Qué devuelve Nginx para Host sch.soporte.com.ar (puerto 80) ==="
curl -s -H "Host: sch.soporte.com.ar" http://127.0.0.1/ 2>/dev/null | grep -o 'main\.[a-z0-9]*\.js' || echo "(sin coincidencia o error)"

echo ""
echo "=== 4. Qué devuelve Nginx para Host sch.soporte.com.ar (HTTPS, -k ignora cert) ==="
curl -s -k -H "Host: sch.soporte.com.ar" https://127.0.0.1/ 2>/dev/null | grep -o 'main\.[a-z0-9]*\.js' || echo "(sin coincidencia o error)"

echo ""
echo "=== 5. Límite de subida Nginx (videos: backend 200 MB — todos los vhosts + conf.d) ==="
grep -rn "client_max_body_size" /etc/nginx/sites-available/ /etc/nginx/conf.d/ /etc/nginx/nginx.conf 2>/dev/null | head -15 || echo "(no encontrado)"

echo ""
echo "=== 5b. Timeouts proxy (uploads lentos; recomendado proxy_read_timeout >= 600s) ==="
grep -rn "proxy_read_timeout\|client_body_timeout" /etc/nginx/conf.d/ /etc/nginx/sites-available/tickets 2>/dev/null | head -10 || echo "(sin timeouts — ejecutá bash scripts/nginx-upload-limit-200m.sh)"

echo ""
echo "=== 5c. API en producción (el frontend sube videos a esta URL, no al dominio del panel) ==="
if [[ -f "$PROJECT_ROOT/frontend/.env" ]]; then
  grep REACT_APP_API_URL "$PROJECT_ROOT/frontend/.env" || echo "(sin REACT_APP_API_URL en frontend/.env)"
else
  echo "No hay frontend/.env — revisá REACT_APP_API_URL del build"
fi

LIMIT_LINE="$(grep -h "client_max_body_size" /etc/nginx/sites-available/tickets /etc/nginx/nginx.conf 2>/dev/null | head -1 || true)"
if echo "$LIMIT_LINE" | grep -qiE '100m|50m|1m|10m'; then
  echo ""
  echo ">>> ATENCIÓN: el límite actual parece menor a 200 MB. Los videos >100 MB fallarán aunque el backend permita 200 MB."
  echo ">>> Ajustá con:"
  echo ">>>   sed -i 's/client_max_body_size 100M/client_max_body_size 200M/I' /etc/nginx/sites-available/tickets /etc/nginx/nginx.conf"
  echo ">>>   nginx -t && systemctl reload nginx"
elif echo "$LIMIT_LINE" | grep -qiE '200m'; then
  echo ""
  echo ">>> OK: Nginx configurado para 200 MB o más."
fi

echo ""
echo ">>> HTTPS (sección 4) con main.*.js indica que el frontend se sirve bien. Si el hash cambió tras deploy, es normal."
