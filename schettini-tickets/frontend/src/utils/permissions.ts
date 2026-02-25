/**
 * Estándar de permisos granulares del sistema.
 * Usado por Admin, Layout (Sidebar) y PrivateRoute.
 */

export const PERMISSION_GROUPS = [
  {
    id: 'tickets',
    title: 'Módulo Tickets',
    icon: '🎫',
    perms: [
      { key: 'tickets_view', label: 'Ver listado' },
      { key: 'tickets_reply', label: 'Responder' },
      { key: 'tickets_delete', label: 'Borrar' },
    ],
  },
  {
    id: 'taller',
    title: 'Módulo Taller',
    icon: '🔧',
    perms: [
      { key: 'repairs_view', label: 'Ver listado' },
      { key: 'repairs_create', label: 'Ingresar equipo' },
      { key: 'repairs_edit', label: 'Cambiar estados y notas' },
    ],
  },
  {
    id: 'cotizador',
    title: 'Cotizador',
    icon: '📊',
    perms: [
      { key: 'quoter_access', label: 'Usar la calculadora' },
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: '📈',
    perms: [
      { key: 'reports_view', label: 'Ver métricas financieras y operativas' },
    ],
  },
] as const;

/** Todos los permisos posibles (flat) */
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

/** Permiso requerido para ver cada sección en el Sidebar */
export const SIDEBAR_PERMISSION_MAP = {
  tickets: 'tickets_view',
  repair_orders: 'repairs_view',
  cotizador: 'quoter_access',
  reports: 'reports_view',
} as const;

/** Migra permisos antiguos al formato nuevo */
export function migrateOldPermissions(perms: string[]): string[] {
  if (!Array.isArray(perms) || perms.length === 0) return ['tickets_view', 'tickets_reply'];
  const migrated: string[] = [];
  const newKeys = new Set(ALL_PERMISSIONS);
  for (const p of perms) {
    if (newKeys.has(p as any)) {
      migrated.push(p);
    } else if (p === 'tickets') {
      migrated.push('tickets_view', 'tickets_reply');
    } else if (p === 'repair_orders') {
      migrated.push('repairs_view', 'repairs_create', 'repairs_edit');
    } else if (p === 'cotizador') {
      migrated.push('quoter_access');
    }
  }
  return migrated.length ? [...new Set(migrated)] : ['tickets_view', 'tickets_reply'];
}

/** Verifica si el usuario tiene un permiso (o alguno de la lista para vista de módulo) */
export function hasPermission(userPerms: string[] | undefined, required: string): boolean {
  const perms = userPerms || [];
  return perms.includes(required);
}

/** Permisos por defecto para nuevos agentes */
export const DEFAULT_AGENT_PERMISSIONS = ['tickets_view', 'tickets_reply'];
