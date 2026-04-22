#!/bin/bash
# =============================================================================
# Script de despliegue - ejecutar EN EL VPS (Linux)
# Uso: cd /var/www/tickets/schettini-tickets && bash scripts/deploy.sh
#      o: bash scripts/deploy.sh --pull   para hacer git pull antes
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo ">>> Raíz del proyecto: $ROOT_DIR"
echo ""

# ╭──────────────────────────────────────────────────────────────────────────╮
# │  SALVAGUARDA Centro de Ayuda: snapshot ANTES de tocar la DB.             │
# │  Si alguna migración accidentalmente pierde folder_id, kb-restore.js     │
# │  al final del deploy reasigna las carpetas desde este backup.            │
# ╰──────────────────────────────────────────────────────────────────────────╯
if [[ -f "backend/scripts/kb-backup.js" ]]; then
    echo ">>> [Salvaguarda] Snapshot de estructura del Centro de Ayuda..."
    (cd backend && node scripts/kb-backup.js) || true
    echo ""
fi

# Opcional: actualizar código desde Git
if [[ "$1" == "--pull" ]]; then
    if [[ -d ".git" ]]; then
        echo ">>> Git pull..."
        git pull
        echo ""
    else
        echo ">>> (Sin Git en este directorio, se omite pull)"
        echo ""
    fi
fi

# Migración resource_sections (si existe el script)
if [[ -f "backend/scripts/migrate-resource-sections.js" ]]; then
    echo ">>> Ejecutando migración resource_sections..."
    (cd backend && node scripts/migrate-resource-sections.js) || true
    echo ""
fi

# Migración password_reset_tokens (recuperación de contraseña)
if [[ -f "backend/scripts/migrate-password-reset.js" ]]; then
    echo ">>> Ejecutando migración password_reset_tokens..."
    (cd backend && node scripts/migrate-password-reset.js) || true
    echo ""
fi

# Tabla ticket_categories (categorías para tipos de problema)
if [[ -f "backend/scripts/add-ticket-categories.js" ]]; then
    echo ">>> Ejecutando migración ticket_categories..."
    (cd backend && node scripts/add-ticket-categories.js) || true
    echo ""
fi

# Catálogo de repuestos (cotizador integrado)
if [[ -f "backend/scripts/migrate-spare-parts-catalog.js" ]]; then
    echo ">>> Ejecutando migración spare_parts_catalog..."
    (cd backend && node scripts/migrate-spare-parts-catalog.js) || true
    echo ""
fi

# Margen de ganancia para Calculadora Manual
if [[ -f "backend/scripts/add-profit-margin.js" ]]; then
    echo ">>> Ejecutando migración profit_margin_percent..."
    (cd backend && node scripts/add-profit-margin.js) || true
    echo ""
fi

# Estado abandonado en repair_orders
if [[ -f "backend/scripts/run-alter-status-enum.js" ]]; then
    echo ">>> Actualizando ENUM status (abandonado)..."
    (cd backend && node scripts/run-alter-status-enum.js) || true
    echo ""
fi

# Campos de fechas en repair_orders (accepted_date, promised_date, delivered_date, warranty_expiration_date, public_notes, spare_parts_detail)
if [[ -f "backend/scripts/run-alter-repair-orders.js" ]]; then
    echo ">>> Agregando campos extra a repair_orders (promised_date, etc.)..."
    (cd backend && node scripts/run-alter-repair-orders.js) || true
    echo ""
fi

# Área de Reciclaje: columnas recycling_notes y recycling_photos en repair_orders + rol viewer en Users
if [[ -f "backend/scripts/add-recycling-columns.js" ]]; then
    echo ">>> Agregando columnas de Reciclaje y rol Viewer..."
    (cd backend && node scripts/add-recycling-columns.js) || true
    echo ""
fi

# SALVAGUARDA system_options: proteger accesorios/marcas/modelos que el admin ya
# configuró. Debe correr ANTES de migrate-repair-orders-advanced.js, para que
# éste no re-inyecte los defaults eliminados por el cliente.
if [[ -f "backend/scripts/protect-system-options.js" ]]; then
    echo ">>> [Salvaguarda] Protegiendo listas dinámicas (accesorios, marcas, etc.)..."
    (cd backend && node scripts/protect-system-options.js) || true
    echo ""
fi

# Refactor Órdenes de Taller (system_options, repair_order_items, Users, company_settings)
if [[ -f "backend/scripts/migrate-repair-orders-advanced.js" ]]; then
    echo ">>> Ejecutando migración repair-orders-advanced..."
    (cd backend && node scripts/migrate-repair-orders-advanced.js) || true
    echo ""
fi

# Módulo de Garantías en repair_orders (is_warranty, warranty_type, purchase_invoice_number, etc.)
if [[ -f "backend/scripts/run-warranty-migration.js" ]]; then
    echo ">>> Ejecutando migración garantías (repair_orders + repair_order_status_history)..."
    (cd backend && node scripts/run-warranty-migration.js) || true
    echo ""
fi

# Caja Técnica (tabla tech_cash_movements)
if [[ -f "backend/scripts/create-tech-cash.js" ]]; then
    echo ">>> Ejecutando migración tech_cash_movements..."
    (cd backend && node scripts/create-tech-cash.js) || true
    echo ""
fi

# Equipos en fábrica (factory_shipments + equipment_inventory)
if [[ -f "backend/scripts/run-factory-shipments-migration.js" ]]; then
    echo ">>> Ejecutando migración factory_shipments..."
    (cd backend && node scripts/run-factory-shipments-migration.js) || true
    echo ""
fi

# Configuración empresa - campos Taller (recycling_days_abandonment, default_warranty_months, legal_terms_ticket)
if [[ -f "backend/scripts/add-company-settings-taller-fields.js" ]]; then
    echo ">>> Ejecutando migración company_settings taller fields..."
    (cd backend && node scripts/add-company-settings-taller-fields.js) || true
    echo ""
fi

# Columna permissions en Users (permisos granulares por agente)
if [[ -f "backend/scripts/add-users-permissions.js" ]]; then
    echo ">>> Ejecutando migración columna permissions en Users..."
    (cd backend && node scripts/add-users-permissions.js) || true
    echo ""
fi

# Columna can_manage_tech_finances (Finanzas Técnicas para agentes)
if [[ -f "backend/scripts/add-can-manage-tech-finances.js" ]]; then
    echo ">>> Ejecutando migración can_manage_tech_finances..."
    (cd backend && node scripts/add-can-manage-tech-finances.js) || true
    echo ""
fi

# Columna role: ENUM → VARCHAR(100) para soportar viewer y cualquier rol futuro
if [[ -f "backend/scripts/fix-role-varchar.js" ]]; then
    echo ">>> Convirtiendo columna role a VARCHAR(100)..."
    (cd backend && node scripts/fix-role-varchar.js) || true
    echo ""
fi

# Columna form_type: ENUM → VARCHAR(100) para planilla estándar (general) y controlador fiscal
if [[ -f "backend/scripts/fix-form-type-varchar.js" ]]; then
    echo ">>> Convirtiendo columna form_type a VARCHAR(100)..."
    (cd backend && node scripts/fix-form-type-varchar.js) || true
    echo ""
fi

# status en activations: añadir 'rejected' al ENUM (validación Aprobar/Rechazar)
if [[ -f "backend/scripts/add-activation-status-rejected.js" ]]; then
    echo ">>> Añadiendo status 'rejected' en activations..."
    (cd backend && node scripts/add-activation-status-rejected.js) || true
    echo ""
fi

# Tabla article_movements y agents_can_view_movements (Fase 3 Movimientos de Artículos)
if [[ -f "backend/scripts/add-article-movements-and-setting.js" ]]; then
    echo ">>> Ejecutando migración article_movements y agents_can_view_movements..."
    (cd backend && node scripts/add-article-movements-and-setting.js) || true
    echo ""
fi

# Órdenes externas en reciclaje (is_external_recycled, external_order_number, external_equipment_status)
if [[ -f "backend/scripts/add-external-recycled-fields.js" ]]; then
    echo ">>> Ejecutando migración add-external-recycled-fields..."
    (cd backend && node scripts/add-external-recycled-fields.js) || true
    echo ""
fi

# Carpetas jerárquicas Centro de Ayuda (kb_folders + folder_id en knowledge_base)
if [[ -f "backend/scripts/migrate-kb-folders.js" ]]; then
    echo ">>> Ejecutando migración kb_folders..."
    (cd backend && node scripts/migrate-kb-folders.js) || true
    echo ""
fi

# Productos de planilla (selector dinámico con creación inline)
if [[ -f "backend/scripts/migrate-planilla-products.js" ]]; then
    echo ">>> Ejecutando migración planilla_products..."
    (cd backend && node scripts/migrate-planilla-products.js) || true
    echo ""
fi

# Sub-opciones de productos de planilla (listas anidadas editables desde admin)
if [[ -f "backend/scripts/migrate-planilla-suboptions.js" ]]; then
    echo ">>> Ejecutando migración planilla_product_suboptions..."
    (cd backend && node scripts/migrate-planilla-suboptions.js) || true
    echo ""
fi

# Reparar tickets con clientes como agente asignado (bug histórico)
if [[ -f "backend/scripts/fix-ticket-assigned-clients.js" ]]; then
    echo ">>> Reparando tickets con clientes asignados como agentes..."
    (cd backend && node scripts/fix-ticket-assigned-clients.js) || true
    echo ""
fi

# Migración Casa Schettini (abril 2026): ticket_notification_emails, ticket_response_time_hours, Users.is_company
if [[ -f "backend/scripts/add-ticket-notification-and-response-fields.js" ]]; then
    echo ">>> Ejecutando migración ticket notification + response time + is_company..."
    (cd backend && node scripts/add-ticket-notification-and-response-fields.js) || true
    echo ""
fi

# ╭──────────────────────────────────────────────────────────────────────────╮
# │  RESTAURACIÓN Centro de Ayuda: si alguna migración desorganizó los       │
# │  drivers/tutoriales/videos (folder_id = NULL), se reasignan a su carpeta │
# │  original desde el snapshot guardado en kb-backup.                       │
# ╰──────────────────────────────────────────────────────────────────────────╯
if [[ -f "backend/scripts/kb-restore.js" ]]; then
    echo ">>> [Salvaguarda] Verificando estructura del Centro de Ayuda..."
    (cd backend && node scripts/kb-restore.js) || true
    echo ""
fi

# Build del frontend (limpio: borrar build anterior para que no queden JS viejos)
echo ">>> Frontend: instalando dependencias..."
cd frontend
npm install --production=false
echo ">>> Limpiando build anterior..."
rm -rf build
echo ">>> Build del frontend (esto puede tardar 1-2 min)..."
npm run build
# Mostrar qué main.js se generó (para verificar que el deploy incluye los cambios)
MAIN_JS=$(ls build/static/js/main.*.js 2>/dev/null | head -1)
if [[ -n "$MAIN_JS" ]]; then
  echo ">>> Build generado: $(basename "$MAIN_JS")"
else
  echo ">>> AVISO: No se encontró main.*.js; revisar si npm run build falló."
fi
cd ..
echo ">>> Build listo."
echo ""

# Reiniciar backend con PM2 (ruta correcta: evita código viejo si PM2 apuntaba a otro directorio)
BACKEND_DIR="$ROOT_DIR/backend"
APP_JS="$BACKEND_DIR/src/app.js"
if [[ ! -f "$APP_JS" ]]; then
  echo ">>> ERROR: No se encontró $APP_JS (¿estás en la raíz del repo schettini-tickets?)"
  exit 1
fi

EXPECTED_NORM=$(readlink -f "$APP_JS")
PM_NEEDS_FIX=0
if pm2 describe tickets-api &>/dev/null; then
  PM_LINE=$(pm2 show tickets-api 2>/dev/null | grep "script path" || true)
  # Tabla PM2: columnas separadas por │ (U+2502)
  PM_SCRIPT=$(echo "$PM_LINE" | awk -F '│' 'NF>=3 { gsub(/^[ \t]+|[ \t]+$/,"",$3); print $3; exit }')
  if [[ -z "$PM_SCRIPT" ]]; then
    PM_NEEDS_FIX=1
    echo ">>> PM2: no se pudo leer script path de tickets-api; se reconfigura desde este deploy."
  elif echo "$PM_SCRIPT" | grep -q "schettini-tickets/schettini-tickets"; then
    PM_NEEDS_FIX=1
    echo ">>> PM2: detectada ruta duplicada (.../schettini-tickets/schettini-tickets/...). Se corrige."
  else
    ACTUAL_NORM=$(readlink -f "$PM_SCRIPT" 2>/dev/null || echo "$PM_SCRIPT")
    if [[ "$ACTUAL_NORM" != "$EXPECTED_NORM" ]]; then
      PM_NEEDS_FIX=1
      echo ">>> PM2: tickets-api apuntaba a otro archivo que este deploy:"
      echo "    actual:  $PM_SCRIPT"
      echo "    esperado: $APP_JS"
      echo "    Se recrea el proceso con la ruta de este repositorio."
    fi
  fi
else
  PM_NEEDS_FIX=1
  echo ">>> PM2: no existe proceso tickets-api; se crea desde $APP_JS"
fi

echo ">>> Backend PM2 (tickets-api)..."
if [[ "$PM_NEEDS_FIX" == "1" ]]; then
  pm2 delete tickets-api 2>/dev/null || true
  pm2 start "$APP_JS" --name tickets-api --cwd "$BACKEND_DIR"
  pm2 save
else
  pm2 restart tickets-api
fi
echo ""

echo ">>> Despliegue terminado."
pm2 list
echo ""
echo "--- Si NO ves los cambios en el navegador (ej. botón Eliminar foto) ---"
echo "1. Verificar qué build sirve el backend: curl -s http://localhost:5050/api/build-info"
echo "2. Si usás Nginx, puede estar sirviendo otra carpeta. Ejecutá: bash scripts/verificar-frontend-nginx.sh"
echo "3. Recarga forzada en el navegador: Ctrl+F5 o ventana de incógnito."
echo "   Ver: schettini-tickets/VERIFICAR-FRONTEND-SERVIDO.md"
echo "4. Si la API parece 'vieja' tras deploy: PM2 puede apuntar a otra carpeta."
echo "   Ver: schettini-tickets/PM2-RUTA-DUPLICADA-Y-DESPLIEGUE.md"
