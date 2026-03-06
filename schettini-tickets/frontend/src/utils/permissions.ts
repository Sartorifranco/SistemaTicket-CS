/**
 * Permisos granulares del sistema.
 * El admin configura qué puede hacer cada usuario (agente/supervisor/viewer) en Admin → Usuarios → Permisos.
 */

export const PERMISSION_GROUPS = [
  {
    id: 'tickets',
    title: 'Módulo Tickets',
    icon: '🎫',
    perms: [
      { key: 'tickets_view', label: 'Ver listado y detalle' },
      { key: 'tickets_reply', label: 'Responder' },
      { key: 'tickets_delete', label: 'Borrar' },
      { key: 'tickets_assign', label: 'Asignar y reasignar' },
    ],
  },
  {
    id: 'tasks',
    title: 'Tareas',
    icon: '✅',
    perms: [
      { key: 'tasks_view', label: 'Ver tareas' },
      { key: 'tasks_edit', label: 'Actualizar estado (marcar hecha)' },
      { key: 'tasks_manage', label: 'Crear, eliminar y asignar tareas' },
    ],
  },
  {
    id: 'taller',
    title: 'Taller - Órdenes y monitor',
    icon: '🔧',
    perms: [
      { key: 'repairs_view', label: 'Ver órdenes, monitor y área reciclaje' },
      { key: 'repairs_create', label: 'Crear orden e ingresar equipo' },
      { key: 'repairs_edit', label: 'Editar estados, notas, fotos y reciclaje' },
      { key: 'repairs_delete', label: 'Eliminar órdenes' },
    ],
  },
  {
    id: 'activations',
    title: 'Taller - Planillas',
    icon: '📋',
    perms: [
      { key: 'activations_view', label: 'Ver planillas' },
      { key: 'activations_edit', label: 'Validar y cambiar estado' },
    ],
  },
  {
    id: 'ready',
    title: 'Taller - Equipos listos',
    icon: '📦',
    perms: [
      { key: 'ready_view', label: 'Ver equipos listos' },
      { key: 'ready_edit', label: 'Gestionar equipos listos' },
    ],
  },
  {
    id: 'refurbished',
    title: 'Taller - Reacondicionados',
    icon: '🔄',
    perms: [
      { key: 'refurbished_view', label: 'Ver equipos reacondicionados' },
      { key: 'refurbished_create', label: 'Crear equipo reacondicionado' },
      { key: 'refurbished_edit', label: 'Editar y activar/desactivar' },
    ],
  },
  {
    id: 'movements',
    title: 'Taller - Movimientos',
    icon: '📤',
    perms: [
      { key: 'movements_view', label: 'Ver movimientos de artículos' },
    ],
  },
  {
    id: 'warranties',
    title: 'Garantías',
    icon: '🛡️',
    perms: [
      { key: 'warranties_view', label: 'Ver garantías' },
    ],
  },
  {
    id: 'activity',
    title: 'Registro de actividad',
    icon: '📜',
    perms: [
      { key: 'activity_logs_view', label: 'Ver registro de actividad' },
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
      { key: 'reports_view', label: 'Ver métricas y reportes' },
    ],
  },
  {
    id: 'tech_finances',
    title: 'Finanzas técnicas',
    icon: '💰',
    perms: [
      { key: 'tech_finances', label: 'Caja técnica y reportes de deudas' },
    ],
  },
  {
    id: 'resources',
    title: 'Centro de ayuda',
    icon: '📚',
    perms: [
      { key: 'resources_view', label: 'Ver recursos y capacitaciones' },
    ],
  },
  {
    id: 'clients',
    title: 'Clientes / Empresas',
    icon: '👥',
    perms: [
      { key: 'clients_view', label: 'Ver clientes y empresas' },
    ],
  },
] as const;

/** Todos los permisos posibles (flat) */
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

/** Permiso requerido para ver cada sección en el Sidebar (el primero que se cumpla da acceso) */
export const SIDEBAR_PERMISSION_MAP = {
  tickets: ['tickets_view'],
  repair_orders: ['repairs_view'],
  activations: ['repairs_view', 'activations_view'],
  ready_equipments: ['repairs_view', 'ready_view'],
  refurbished: ['repairs_view', 'refurbished_view'],
  movements: ['repairs_view', 'movements_view'],
  warranties: ['repairs_view', 'warranties_view'],
  cotizador: ['quoter_access'],
  reports: ['reports_view'],
  activity_logs: ['tickets_view', 'activity_logs_view'],
  tech_finances: ['tech_finances'],
  resources: ['resources_view'],
  clients: ['clients_view'],
} as const;

/** Verifica si el usuario tiene al menos uno de los permisos indicados */
export function hasAnyPermission(userPerms: string[] | undefined, required: string | string[] | readonly string[]): boolean {
  const perms = userPerms || [];
  const list: string[] = Array.isArray(required) ? [...required] : [required];
  return list.some((r: string) => perms.includes(r));
}

/** Verifica si el usuario tiene un permiso (o alguno de la lista para vista de módulo) */
export function hasPermission(userPerms: string[] | undefined, required: string): boolean {
  const perms = userPerms || [];
  return perms.includes(required);
}

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
  return migrated.length ? Array.from(new Set(migrated)) : ['tickets_view', 'tickets_reply'];
}

/** Permisos por defecto para nuevos agentes/supervisores */
export const DEFAULT_AGENT_PERMISSIONS = ['tickets_view', 'tickets_reply', 'repairs_view', 'repairs_edit', 'activity_logs_view'];
