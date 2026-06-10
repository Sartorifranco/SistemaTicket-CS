/**
 * Columna payment_operation_number en repair_order_payments + backfill desde repair_orders.
 * Uso: cd backend && node scripts/migrate-repair-order-payment-operation-number.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));
const { buildRepairOrderPaymentNotes } = require('../src/utils/repairOrderPaymentNotes');

async function run() {
  const [col] = await pool.query(
    "SHOW COLUMNS FROM repair_order_payments LIKE 'payment_operation_number'"
  );
  if (col.length === 0) {
    await pool.query(
      'ALTER TABLE repair_order_payments ADD COLUMN payment_operation_number VARCHAR(100) NULL AFTER payment_method'
    );
    console.log('>>> Columna payment_operation_number agregada a repair_order_payments.');
  } else {
    console.log('>>> Columna payment_operation_number ya existe.');
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.notes, p.repair_order_id, ro.order_number, ro.payment_operation_number
     FROM repair_order_payments p
     INNER JOIN repair_orders ro ON ro.id = p.repair_order_id
     INNER JOIN (
       SELECT repair_order_id, MIN(id) AS first_id
       FROM repair_order_payments
       GROUP BY repair_order_id
     ) fp ON fp.first_id = p.id
     WHERE ro.payment_operation_number IS NOT NULL AND TRIM(ro.payment_operation_number) <> ''
       AND (p.payment_operation_number IS NULL OR TRIM(p.payment_operation_number) = '')`
  );

  let updated = 0;
  for (const row of rows) {
    const op = String(row.payment_operation_number).trim();
    const isLegacySynthetic =
      row.notes != null && String(row.notes).includes('Pago histórico (migración');
    const notes = buildRepairOrderPaymentNotes({
      orderNumber: row.order_number,
      userNotes: isLegacySynthetic ? null : row.notes,
      operationNumber: op,
      prefix: 'Seña'
    });
    await pool.query(
      'UPDATE repair_order_payments SET payment_operation_number = ?, notes = ? WHERE id = ?',
      [op, notes, row.id]
    );
    updated++;
  }

  console.log(`>>> Backfill: ${updated} pago(s) actualizados con Nº de operación desde la orden.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
