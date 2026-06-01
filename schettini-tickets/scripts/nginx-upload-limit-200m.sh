#!/bin/bash
# Fuerza límite 256M en TODO Nginx (videos hasta 200 MB + margen multipart).
# Error 413 con archivo ~105 MB = casi siempre límite 100M activo o Cloudflare.
# Ejecutar en el VPS como root:
#   cd /var/www/tickets/schettini-tickets/schettini-tickets && bash scripts/nginx-upload-limit-200m.sh

set -e

LIMIT="256M"
CONF_D="/etc/nginx/conf.d/kb-upload-limits.conf"

cat > "$CONF_D" <<EOF
# Límites globales (http {}) — videos Base de Conocimientos hasta 200 MB
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
  [[ "$f" == *".save"* ]] && return 0

  # Reemplazar cualquier client_max_body_size (100M, 200M, 1m, etc.)
  if grep -q 'client_max_body_size' "$f" 2>/dev/null; then
    sed -i -E 's/client_max_body_size[[:space:]]+[0-9]+[mMkKgG]?/client_max_body_size '"${LIMIT}"'/g' "$f"
    echo ">>> Reemplazado client_max_body_size en: $f"
  fi

  # Cada bloque server sin límite
  while grep -q 'server {' "$f" 2>/dev/null; do
    if awk '/server \{/,/\}/' "$f" | head -20 | grep -q 'client_max_body_size'; then
      break
    fi
    sed -i '0,/server {/s/server {/server {\n    client_max_body_size '"${LIMIT}"';/' "$f"
    echo ">>> Agregado client_max_body_size en un server de: $f"
    break
  done

  # location /api — el más importante para POST /api/resources
  if grep -q 'location /api' "$f" 2>/dev/null; then
    if ! awk '/location \/api/,/^[[:space:]]*\}/' "$f" | grep -q 'client_max_body_size'; then
      sed -i "/location \/api {/a\\        client_max_body_size ${LIMIT};" "$f"
      echo ">>> Agregado client_max_body_size en location /api de: $f"
    else
      sed -i -E '/location \/api/,/^[[:space:]]*\}/ s/client_max_body_size[[:space:]]+[0-9]+[mMkKgG]?/client_max_body_size '"${LIMIT}"'/g' "$f"
      echo ">>> Actualizado location /api en: $f"
    fi
  fi
}

shopt -s nullglob
for f in /etc/nginx/nginx.conf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*; do
  patch_file "$f"
done

# Asegurar que nginx.conf incluye conf.d
if ! grep -q 'conf.d/\*\.conf' /etc/nginx/nginx.conf 2>/dev/null; then
  echo ">>> AVISO: verificá que nginx.conf tenga: include /etc/nginx/conf.d/*.conf;"
fi

nginx -t
systemctl reload nginx

echo ""
echo "=== Límites tras el parche (NO debe quedar 100M) ==="
grep -rn "client_max_body_size" /etc/nginx/nginx.conf /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null | grep -v '.save' | head -30

REMAIN=$(grep -rni "client_max_body_size.*100" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /etc/nginx/nginx.conf 2>/dev/null | grep -v '.save' || true)
if [[ -n "$REMAIN" ]]; then
  echo ""
  echo ">>> ATENCIÓN: aún hay 100M:"
  echo "$REMAIN"
fi

echo ""
echo ">>> Diagnóstico: bash scripts/diagnose-413-upload.sh"
echo ""
echo ">>> Si diagnose dice Nginx OK pero el navegador sigue con 413:"
echo ">>>   Cloudflare limita a 100 MB. Poné el registro DNS en 'Solo DNS' (nube gris) o subí por debajo de 100 MB."
