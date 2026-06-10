/** Nº de operación explícito o extraído de notas con formato "Ref: …". */
export function getRepairOrderPaymentOperationNumber(payment: {
  payment_operation_number?: string | null;
  notes?: string | null;
}): string {
  const direct = payment.payment_operation_number?.trim();
  if (direct) return direct;
  const notes = payment.notes?.trim() || '';
  const match = notes.match(/Ref:\s*(.+?)(?:\s·|$)/);
  return match ? match[1].trim() : '';
}
