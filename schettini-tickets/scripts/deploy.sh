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

# Refactor Órdenes de Taller (system_options, repair_order_items, Users, company_settings)
if [[ -f "backend/scripts/migrate-repair-orders-advanced.js" ]]; then
    echo ">>> Ejecutando migración repair-orders-advanced..."
    (cd backend && node scripts/migrate-repair-orders-advanced.js) || true
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

# Reiniciar backend con PM2
echo ">>> Reiniciando backend (PM2 tickets-api)..."
pm2 restart tickets-api
echo ""

echo ">>> Despliegue terminado."
pm2 list
echo ""
echo "--- Si NO ves los cambios en el navegador (ej. botón Eliminar foto) ---"
echo "1. Verificar qué build sirve el backend: curl -s http://localhost:5050/api/build-info"
echo "2. Si usás Nginx, puede estar sirviendo otra carpeta. Ejecutá: bash scripts/verificar-frontend-nginx.sh"
echo "3. Recarga forzada en el navegador: Ctrl+F5 o ventana de incógnito."
echo "   Ver: schettini-tickets/VERIFICAR-FRONTEND-SERVIDO.md"
