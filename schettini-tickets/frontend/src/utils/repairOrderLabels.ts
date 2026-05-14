/** Etiqueta para órdenes sin usuario cliente (externas, históricas, reciclaje). */
export const REPAIR_ORDER_EXTERNAL_CLIENT_LABEL = 'Cliente externo / histórico';

/**
 * Número de orden tal como está en base (siempre REP-xxxx).
 * La garantía se indica con badge/icono en listados — no se cambia el prefijo,
 * para que coincida con WhatsApp, comprobantes y lo que ve el cliente.
 */
export function formatOrderNumber(
  orderNumber: string,
  _isWarranty?: number | boolean | null | undefined
): string {
  return orderNumber || '';
}

/**
 * Texto seguro para listados y comprobantes (evita pantalla en blanco si no hay cliente).
 */
export function formatRepairOrderClientDisplay(o: {
  client_id?: number | null;
  client_name?: string | null;
  client_business_name?: string | null;
}): string {
  const n = o.client_name?.trim();
  const b = o.client_business_name?.trim();
  if (n && b) return `${n} (${b})`;
  if (n) return n;
  if (b) return b;
  if (o.client_id == null) return REPAIR_ORDER_EXTERNAL_CLIENT_LABEL;
  return '—';
}
