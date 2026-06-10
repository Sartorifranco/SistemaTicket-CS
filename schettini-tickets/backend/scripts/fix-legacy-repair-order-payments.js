/**
 * Corrige pagos sintéticos de migrate-repair-order-payments.js:
 * - created_at → entry_date de la orden (día/hora del ingreso)
 * - notas → "Seña Orden #…" (+ Ref si hay Nº de operación)
 * - payment_operation_number desde repair_orders
 * Uso: cd backend && node scripts/fix-legacy-repair-order-payments.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));
const { buildRepairOrderPaymentNotes } = require('../src/utils/repairOrderPaymentNotes');

const LEGACY_NOTE_PREFIX = 'Pago histórico (migración';

async function run() {
  const [rows] = await pool.query(
    `SELECT p.id, p.notes, p.payment_method,
            ro.order_number, ro.entry_date, ro.created_at AS order_created_at,
            ro.payment_operation_number, ro.payment_method AS order_payment_method
     FROM repair_order_payments p
     INNER JOIN repair_orders ro ON ro.id = p.repair_order_id
     WHERE p.is_legacy_import = 1
        OR p.notes LIKE ?`,
    [`${LEGACY_NOTE_PREFIX}%`]
  );

  let updated = 0;
  for (const row of rows) {
    const op =
      row.payment_operation_number != null && String(row.payment_operation_number).trim()
        ? String(row.payment_operation_number).trim()
        : null;
    const notes = buildRepairOrderPaymentNotes({
      orderNumber: row.order_number,
      operationNumber: op,
      prefix: 'Seña'
    });
    const paymentAt = row.entry_date || row.order_created_at;
    const method =
      row.order_payment_method != null && String(row.order_payment_method).trim()
        ? String(row.order_payment_method).trim()
        : row.payment_method || 'Efectivo';

    await pool.query(
      `UPDATE repair_order_payments
       SET created_at = COALESCE(?, created_at),
           payment_method = ?,
           payment_operation_number = ?,
           notes = ?,
           is_legacy_import = 0
       WHERE id = ?`,
      [paymentAt, method, op, notes, row.id]
    );
    updated++;
  }

  console.log(`>>> Pagos legacy corregidos: ${updated} (fecha de ingreso + nota de seña).`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
