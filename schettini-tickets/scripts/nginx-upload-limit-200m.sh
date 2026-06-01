#!/bin/bash
# Límite de subida 256M (videos hasta 200 MB + margen).
# IMPORTANTE: los backups NUNCA van en sites-enabled (nginx carga todos los archivos ahí).
# Ejecutar en el VPS como root:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/nginx-upload-limit-200m.sh

set -e

LIMIT="256M"
CONF_D="/etc/nginx/conf.d/kb-upload-limits.conf"
TICKETS="/etc/nginx/sites-available/tickets"
BACKUP_DIR="/etc/nginx/backups-manual"
ENABLED="/etc/nginx/sites-enabled"

mkdir -p "$BACKUP_DIR"

echo ">>> 0. Limpiar backups sueltos en sites-enabled (rompen nginx -t)"
shopt -s nullglob
for junk in "$ENABLED"/*.bak.* "$ENABLED"/*.save "$ENABLED"/*.save.*; do
  [[ -f "$junk" ]] || continue
  mv -v "$junk" "$BACKUP_DIR/"
done

echo ">>> 1. Límite global en conf.d (contexto http)"
cat > "$CONF_D" <<EOF
# Videos Base de Conocimientos y otros uploads (hasta 200 MB de archivo)
client_max_body_size ${LIMIT};
client_body_timeout 600s;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
proxy_connect_timeout 120s;
EOF

echo ">>> 2. Quitar client_max_body_size duplicado de nginx.conf"
if [[ -f /etc/nginx/nginx.conf ]]; then
  sed -i '/client_max_body_size/d' /etc/nginx/nginx.conf
fi

patch_tickets_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  cp -a "$f" "${BACKUP_DIR}/$(basename "$f").$(date +%Y%m%d%H%M%S)"
  sed -i '/client_max_body_size/d' "$f"
  sed -i "0,/server {/s/server {/server {\n    client_max_body_size ${LIMIT};/" "$f"
  if grep -q 'location /api' "$f"; then
    sed -i "/location \/api {/a\\        client_max_body_size ${LIMIT};" "$f"
  fi
  echo "    Parcheado: $f"
}

echo ">>> 3. Sitio tickets"
patch_tickets_file "$TICKETS"
if [[ -f "$ENABLED/tickets" ]] && [[ ! "$TICKETS" -ef "$ENABLED/tickets" ]]; then
  patch_tickets_file "$ENABLED/tickets"
fi

echo ">>> 4. Validar y recargar"
nginx -t
systemctl reload nginx
echo ">>> Nginx recargado OK."

echo ""
echo "=== sites-enabled (solo debe quedar 'tickets', sin .bak) ==="
ls -la "$ENABLED/"

echo ""
echo "=== client_max_body_size activos ==="
grep -rn "client_max_body_size" /etc/nginx/conf.d/kb-upload-limits.conf /etc/nginx/sites-enabled/tickets 2>/dev/null

echo ""
echo ">>> Probar: bash scripts/diagnose-413-upload.sh"
