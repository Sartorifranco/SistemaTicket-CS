#!/bin/bash
# Límite de subida 256M (videos hasta 200 MB + margen). Una sola directiva global en conf.d.
# Ejecutar en el VPS como root:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/nginx-upload-limit-200m.sh

set -e

LIMIT="256M"
CONF_D="/etc/nginx/conf.d/kb-upload-limits.conf"
TICKETS="/etc/nginx/sites-available/tickets"

echo ">>> 1. Límite global en conf.d (contexto http)"
cat > "$CONF_D" <<EOF
# Videos Base de Conocimientos y otros uploads (hasta 200 MB de archivo)
client_max_body_size ${LIMIT};
client_body_timeout 600s;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
proxy_connect_timeout 120s;
EOF

echo ">>> 2. Quitar client_max_body_size duplicado de nginx.conf (evita emerg duplicate)"
if [[ -f /etc/nginx/nginx.conf ]]; then
  sed -i '/client_max_body_size/d' /etc/nginx/nginx.conf
  echo "    (eliminadas líneas client_max_body_size de nginx.conf)"
fi

echo ">>> 3. Sitio tickets: un límite en server y otro en location /api"
if [[ -f "$TICKETS" ]]; then
  cp -a "$TICKETS" "${TICKETS}.bak.$(date +%Y%m%d%H%M%S)"
  sed -i '/client_max_body_size/d' "$TICKETS"
  sed -i "0,/server {/s/server {/server {\n    client_max_body_size ${LIMIT};/" "$TICKETS"
  if grep -q 'location /api' "$TICKETS"; then
    sed -i "/location \/api {/a\\        client_max_body_size ${LIMIT};" "$TICKETS"
  fi
  echo "    Parcheado: $TICKETS"
fi

ENABLED="/etc/nginx/sites-enabled/tickets"
if [[ -f "$ENABLED" ]] && [[ ! "$TICKETS" -ef "$ENABLED" ]]; then
  cp -a "$ENABLED" "${ENABLED}.bak.$(date +%Y%m%d%H%M%S)"
  sed -i '/client_max_body_size/d' "$ENABLED"
  sed -i "0,/server {/s/server {/server {\n    client_max_body_size ${LIMIT};/" "$ENABLED"
  if grep -q 'location /api' "$ENABLED"; then
    sed -i "/location \/api {/a\\        client_max_body_size ${LIMIT};" "$ENABLED"
  fi
  echo "    Parcheado copia en sites-enabled (no es symlink)"
fi

echo ">>> 4. Validar y recargar"
nginx -t
systemctl reload nginx
echo ">>> Nginx recargado OK."

echo ""
echo "=== client_max_body_size activos ==="
grep -rn "client_max_body_size" /etc/nginx/nginx.conf /etc/nginx/conf.d/kb-upload-limits.conf /etc/nginx/sites-enabled/tickets 2>/dev/null

echo ""
echo ">>> Probar: bash scripts/diagnose-413-upload.sh"
echo ">>> En paso 4 debe ser 401/403, NO 413."
