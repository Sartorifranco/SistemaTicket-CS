/** Etiqueta para órdenes sin usuario cliente (externas, históricas, reciclaje). */
export const REPAIR_ORDER_EXTERNAL_CLIENT_LABEL = 'Cliente externo / histórico';

/**
 * Si la orden es de garantía, reemplaza el prefijo REP- por GAR-.
 * Ej: "REP-0042" → "GAR-0042".
 */
export function formatOrderNumber(
  orderNumber: string,
  isWarranty: number | boolean | null | undefined
): string {
  if (isWarranty) {
    return (orderNumber || '').replace(/^REP-/i, 'GAR-');
  }
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
