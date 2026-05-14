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

async function run() {
  const types = await resolveRepairOrderPaymentsColumnTypes(pool);
  await pool.query(buildCreateRepairOrderPaymentsTableSql(types));
  console.log('✅ Tabla repair_order_payments verificada/creada.');

  const [pmCol] = await pool.query("SHOW COLUMNS FROM repair_orders LIKE 'payment_method'");
  const paymentMethodExpr =
    pmCol.length > 0
      ? "COALESCE(NULLIF(TRIM(ro.payment_method), ''), 'Efectivo')"
      : "'Efectivo'";

  const [bf] = await pool.query(
    `INSERT INTO repair_order_payments (
      repair_order_id, amount, payment_method, notes, registered_by_user_id, tech_cash_movement_id, is_legacy_import
    )
    SELECT ro.id,
      COALESCE(ro.deposit_paid, 0),
      ${paymentMethodExpr},
      'Pago histórico (migración — total acumulado en seña preexistente)',
      NULL,
      NULL,
      1
    FROM repair_orders ro
    WHERE COALESCE(ro.deposit_paid, 0) > 0
      AND NOT EXISTS (SELECT 1 FROM repair_order_payments p WHERE p.repair_order_id = ro.id)`
  );
  console.log(`✅ Backfill: filas insertadas (sintéticas legacy): ${bf.affectedRows ?? 0}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
