/**
 * Tabla repair_order_payments + backfill sintético (sin duplicar movimientos de caja).
 * Uso: cd backend && node scripts/migrate-repair-order-payments.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));
const {
  resolveRepairOrderPaymentsColumnTypes,
  buildCreateRepairOrderPaymentsTableSql
} = require(path.join(__dirname, '..', 'src', 'utils', 'repairOrderPaymentsSchema'));
const { buildRepairOrderPaymentNotes } = require('../src/utils/repairOrderPaymentNotes');

async function run() {
  const types = await resolveRepairOrderPaymentsColumnTypes(pool);
  await pool.query(buildCreateRepairOrderPaymentsTableSql(types));
  console.log('✅ Tabla repair_order_payments verificada/creada.');

  const [pmCol] = await pool.query("SHOW COLUMNS FROM repair_orders LIKE 'payment_method'");
  const paymentMethodExpr =
    pmCol.length > 0
      ? "COALESCE(NULLIF(TRIM(ro.payment_method), ''), 'Efectivo')"
      : "'Efectivo'";

  const [opCol] = await pool.query("SHOW COLUMNS FROM repair_order_payments LIKE 'payment_operation_number'");
  const hasOpCol = opCol.length > 0;

  const [candidates] = await pool.query(
    `SELECT ro.id, ro.order_number, ro.deposit_paid, ro.entry_date, ro.created_at,
            ro.payment_operation_number, ${paymentMethodExpr} AS payment_method
     FROM repair_orders ro
     WHERE COALESCE(ro.deposit_paid, 0) > 0
       AND NOT EXISTS (SELECT 1 FROM repair_order_payments p WHERE p.repair_order_id = ro.id)`
  );

  let inserted = 0;
  for (const ro of candidates) {
    const op =
      ro.payment_operation_number != null && String(ro.payment_operation_number).trim()
        ? String(ro.payment_operation_number).trim()
        : null;
    const notes = buildRepairOrderPaymentNotes({
      orderNumber: ro.order_number,
      operationNumber: op,
      prefix: 'Seña'
    });
    const createdAt = ro.entry_date || ro.created_at || new Date();
    const method = ro.payment_method || 'Efectivo';
    const amount = parseFloat(ro.deposit_paid) || 0;

    if (hasOpCol) {
      await pool.query(
        `INSERT INTO repair_order_payments (
          repair_order_id, amount, payment_method, payment_operation_number, notes,
          registered_by_user_id, tech_cash_movement_id, is_legacy_import, created_at
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, ?)`,
        [ro.id, amount, method, op, notes, createdAt]
      );
    } else {
      await pool.query(
        `INSERT INTO repair_order_payments (
          repair_order_id, amount, payment_method, notes,
          registered_by_user_id, tech_cash_movement_id, is_legacy_import, created_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, 1, ?)`,
        [ro.id, amount, method, notes, createdAt]
      );
    }
    inserted++;
  }
  console.log(`✅ Backfill: filas insertadas (sintéticas legacy): ${inserted}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
