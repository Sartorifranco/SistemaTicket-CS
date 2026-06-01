#!/bin/bash
# Ejecutar en el VPS: bash scripts/verificar-frontend-nginx.sh
# Verifica que el build y Nginx estén alineados para sch.soporte.com.ar

set -e
echo "=== 1. server_name en Nginx (debe incluir sch.soporte.com.ar) ==="
grep -n "server_name" /etc/nginx/sites-available/tickets | head -5

echo ""
echo "=== 2. Archivo JS del build y qué referencia index.html ==="
BUILD="/var/www/tickets/schettini-tickets/frontend/build"
ls -la "$BUILD/static/js/main."*.js 2>/dev/null || echo "No hay main.*.js"
echo "Referencia en index.html:"
grep -o 'main\.[^"]*\.js' "$BUILD/index.html" 2>/dev/null || echo "No se pudo leer index.html"

echo ""
echo "=== 3. Qué devuelve Nginx para Host sch.soporte.com.ar (puerto 80) ==="
curl -s -H "Host: sch.soporte.com.ar" http://127.0.0.1/ 2>/dev/null | grep -o 'main\.[a-z0-9]*\.js' || echo "(sin coincidencia o error)"

echo ""
echo "=== 4. Qué devuelve Nginx para Host sch.soporte.com.ar (HTTPS, -k ignora cert) ==="
curl -s -k -H "Host: sch.soporte.com.ar" https://127.0.0.1/ 2>/dev/null | grep -o 'main\.[a-z0-9]*\.js' || echo "(sin coincidencia o error)"

echo ""
echo "=== 5. Límite de subida Nginx (videos Base de Conocimientos; recomendado >= 500m) ==="
grep -rn "client_max_body_size" /etc/nginx/sites-available/ /etc/nginx/nginx.conf 2>/dev/null | head -10 || echo "(no encontrado — por defecto 1m; agregar client_max_body_size 500m; en el server o location /api)"

echo ""
echo ">>> Si en 3 o 4 sale main.4a09f6e9.js, el servidor está bien; el problema es caché del navegador o DNS."
