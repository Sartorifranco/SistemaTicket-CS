#!/bin/bash
# Subir límite de subida Nginx a 200 MB (videos Base de Conocimientos).
# Ejecutar en el VPS como root:
#   bash scripts/nginx-upload-limit-200m.sh

set -e

FILES=(
  /etc/nginx/sites-available/tickets
  /etc/nginx/nginx.conf
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    if grep -q 'client_max_body_size' "$f"; then
      sed -i 's/client_max_body_size\s*[0-9]*[mM]/client_max_body_size 200M/g' "$f"
      echo "Actualizado: $f"
    else
      echo "Sin client_max_body_size en $f — agregalo manualmente dentro del bloque server."
    fi
  fi
done

nginx -t
systemctl reload nginx
echo ">>> Nginx recargado. Verificá con: bash scripts/verificar-frontend-nginx.sh"
