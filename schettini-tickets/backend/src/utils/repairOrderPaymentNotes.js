/**
 * Texto de notas / referencia para filas de repair_order_payments.
 */
function buildRepairOrderPaymentNotes({ orderNumber, userNotes, operationNumber, prefix = 'Seña' }) {
  const parts = [];
  const custom = userNotes != null ? String(userNotes).trim() : '';
  const op = operationNumber != null ? String(operationNumber).trim() : '';

  if (custom) {
    parts.push(custom);
  } else if (orderNumber) {
    parts.push(`${prefix} Orden #${orderNumber}`);
  }

  if (op) {
    const refLabel = `Ref: ${op}`;
    const base = parts.join(' · ');
    if (base && base.includes(op)) return base;
    parts.push(refLabel);
  }

  return parts.length ? parts.join(' · ') : null;
}

module.exports = { buildRepairOrderPaymentNotes };
