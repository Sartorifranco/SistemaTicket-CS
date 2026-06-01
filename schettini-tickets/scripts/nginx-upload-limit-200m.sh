#!/bin/bash
# Subida de videos (Base de Conocimientos): 200 MB + timeouts para uploads lentos.
# Ejecutar en el VPS como root:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/nginx-upload-limit-200m.sh

set -e

CONF_D="/etc/nginx/conf.d/kb-upload-limits.conf"
cat > "$CONF_D" <<'EOF'
# Límites globales para uploads (videos KB, adjuntos, etc.)
client_max_body_size 200M;
client_body_timeout 600s;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
proxy_connect_timeout 120s;
EOF
echo ">>> Escrito $CONF_D"

# Actualizar cualquier client_max_body_size en sitios (api.sch-soporte.com.ar, sch-soporte, etc.)
shopt -s nullglob
for f in /etc/nginx/sites-available/* /etc/nginx/nginx.conf; do
  [[ -f "$f" ]] || continue
  if grep -q 'client_max_body_size' "$f" 2>/dev/null; then
    sed -i 's/client_max_body_size\s*[0-9]*[mMkKgG]*/client_max_body_size 200M/g' "$f"
    echo ">>> Actualizado: $f"
  fi
done

# En location /api sin timeouts explícitos, agregar (solo si no existen ya)
TICKETS="/etc/nginx/sites-available/tickets"
if [[ -f "$TICKETS" ]] && grep -q 'location /api' "$TICKETS"; then
  if ! grep -q 'proxy_read_timeout' "$TICKETS"; then
    sed -i '/location \/api/,/^[[:space:]]*}/ {
      /proxy_set_header X-Forwarded-Proto/a\
        proxy_read_timeout 600s;\
        proxy_send_timeout 600s;\
        client_body_timeout 600s;
    }' "$TICKETS" 2>/dev/null || echo ">>> Revisá manualmente proxy_read_timeout en location /api de $TICKETS"
  fi
fi

nginx -t
systemctl reload nginx

echo ""
echo ">>> Nginx recargado. Comprobá TODOS los límites:"
grep -rn "client_max_body_size\|proxy_read_timeout" /etc/nginx/sites-available/ /etc/nginx/conf.d/ /etc/nginx/nginx.conf 2>/dev/null | head -20
echo ""
echo ">>> Luego: pm2 restart tickets-api"
echo ">>> Verificación: bash scripts/verificar-frontend-nginx.sh"
