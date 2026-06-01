#!/bin/bash
# Subida de videos (Base de Conocimientos): 200 MB + timeouts.
# El error 413 = Nginx rechazó el cuerpo (client_max_body_size muy bajo).
# Ejecutar en el VPS como root:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/nginx-upload-limit-200m.sh

set -e

LIMIT="200M"
CONF_D="/etc/nginx/conf.d/kb-upload-limits.conf"

cat > "$CONF_D" <<EOF
# Límites globales para uploads (videos KB, adjuntos, etc.)
client_max_body_size ${LIMIT};
client_body_timeout 600s;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
proxy_connect_timeout 120s;
EOF
echo ">>> Escrito $CONF_D"

patch_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0

  if grep -q 'client_max_body_size' "$f" 2>/dev/null; then
    sed -i "s/client_max_body_size\s*[0-9]*[mMkKgG]*/client_max_body_size ${LIMIT}/g" "$f"
    echo ">>> Actualizado límite en: $f"
  elif grep -q 'server {' "$f" 2>/dev/null; then
    sed -i "0,/server {/s/server {/server {\n    client_max_body_size ${LIMIT};/" "$f"
    echo ">>> Agregado client_max_body_size en primer server de: $f"
  fi

  if grep -q 'location /api' "$f" 2>/dev/null; then
    if ! awk '/location \/api/,/^[[:space:]]*}/' "$f" | grep -q 'client_max_body_size'; then
      sed -i "/location \/api {/a\\        client_max_body_size ${LIMIT};" "$f"
      echo ">>> Agregado client_max_body_size en location /api de: $f"
    fi
  fi
}

shopt -s nullglob
for f in /etc/nginx/sites-available/* /etc/nginx/sites-enabled/* /etc/nginx/nginx.conf; do
  patch_file "$f"
done

nginx -t
systemctl reload nginx

echo ""
echo "=== Límites activos (debe aparecer 200M en http, server y/o location /api) ==="
grep -rn "client_max_body_size" /etc/nginx/nginx.conf /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null | head -25

echo ""
echo ">>> Si seguís con 413: el video puede pesar >200 MB, o hay CDN (Cloudflare) con límite menor."
echo ">>> pm2 restart tickets-api"
echo ">>> bash scripts/verificar-frontend-nginx.sh"
