/**
 * Permisos válidos al guardar usuarios (agente/supervisor/viewer).
 * Debe coincidir con frontend/src/utils/permissions.ts (ALL_PERMISSIONS).
 */
const NEW_PERMISSIONS = [
    'tickets_view', 'tickets_reply', 'tickets_delete', 'tickets_assign',
    'tasks_view', 'tasks_edit', 'tasks_manage',
    'repairs_view', 'repairs_create', 'repairs_edit', 'repairs_delete',
    'activations_view', 'activations_edit',
    'ready_view', 'ready_edit',
    'refurbished_view', 'refurbished_create', 'refurbished_edit',
    'movements_view', 'warranties_view', 'activity_logs_view',
    'quoter_access', 'reports_view', 'tech_finances', 'resources_view', 'clients_view',
    'marketing_promotions', 'marketing_announcements',
    'payments_review',
];

module.exports = { NEW_PERMISSIONS };
