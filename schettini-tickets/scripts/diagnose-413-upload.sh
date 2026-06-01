#!/bin/bash
# Diagnóstico error 413 al subir videos (ej. 105 MB con límite efectivo 100 MB).
# Ejecutar en el VPS como root:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/diagnose-413-upload.sh

set -e

echo "=== 1. Todos los client_max_body_size en Nginx ==="
grep -rn "client_max_body_size" /etc/nginx/ 2>/dev/null || echo "(ninguno)"

echo ""
echo "=== 2. Sitios habilitados ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true

echo ""
echo "=== 3. ¿Sigue apareciendo 100M? (debe ser 0 líneas tras nginx-upload-limit-200m.sh) ==="
grep -rn "client_max_body_size.*100" /etc/nginx/ 2>/dev/null && echo ">>> PROBLEMA: aún hay límite 100M" || echo ">>> OK: no hay 100M explícito"

echo ""
echo "=== 4. Prueba local Nginx (HTTPS, Host sch-soporte.com.ar) — archivo ~105 MB ==="
TMP=$(mktemp)
dd if=/dev/zero of="$TMP" bs=1M count=105 status=none 2>/dev/null || dd if=/dev/zero of="$TMP" bs=1048576 count=105 2>/dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -k \
  -H "Host: sch-soporte.com.ar" \
  -X POST "https://127.0.0.1/api/resources" \
  -F "file=@${TMP};filename=test.bin" \
  -F "title=test" -F "type=video" -F "category=General" 2>/dev/null || echo "000")
rm -f "$TMP"
echo "HTTP status (sin token esperado 401/403, NO debe ser 413): $CODE"
if [[ "$CODE" == "413" ]]; then
  echo ">>> Nginx local rechaza ~105 MB → ejecutá: bash scripts/nginx-upload-limit-200m.sh"
else
  echo ">>> Nginx local acepta el tamaño (~105 MB). Si el navegador da 413, revisá Cloudflare/CDN (límite 100 MB)."
fi

echo ""
echo "=== 5. Cabeceras del sitio público (¿Cloudflare?) ==="
curl -sI "https://sch-soporte.com.ar/" 2>/dev/null | grep -iE 'server:|cf-ray|cloudflare' || echo "(sin cabeceras Cloudflare visibles)"

echo ""
echo "=== 6. Prueba directa a Node :5050 (sin Nginx) — mismo archivo ==="
TMP2=$(mktemp)
dd if=/dev/zero of="$TMP2" bs=1M count=105 status=none 2>/dev/null || dd if=/dev/zero of="$TMP2" bs=1048576 count=105 2>/dev/null
CODE2=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://127.0.0.1:5050/api/resources" \
  -F "file=@${TMP2};filename=test.bin" \
  -F "title=test" -F "type=video" -F "category=General" 2>/dev/null || echo "000")
rm -f "$TMP2"
echo "HTTP status Node directo: $CODE2 (401/403 OK; 413 = problema en Node/Multer)"
