/**
 * Traducciones al español para el log de actividad
 */

export const ACTION_TYPE_LABELS: Record<string, string> = {
  created: 'Creado',
  status_updated: 'Estado actualizado',
  assigned: 'Asignado',
  reassigned: 'Reasignado',
  comment_added: 'Comentario agregado',
  deleted: 'Eliminado',
  actividad: 'Actividad',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'abierto',
  'in-progress': 'en progreso',
  in_progress: 'en progreso',
  resolved: 'resuelto',
  closed: 'cerrado',
  reopened: 'reabierto',
};

export function translateActionType(actionType: string): string {
  const key = (actionType || '').toLowerCase().replace(/\s/g, '_');
  return ACTION_TYPE_LABELS[key] || actionType?.replace(/_/g, ' ') || 'Actividad';
}

export function translateDescription(description: string): string {
  if (!description) return '';
  let result = description;
  Object.entries(STATUS_LABELS).forEach(([en, es]) => {
    const regex = new RegExp(`"${en}"`, 'gi');
    result = result.replace(regex, `"${es}"`);
  });
  return result;
}
