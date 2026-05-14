/**
 * Tabla repair_order_payments + backfill sintético (sin duplicar movimientos de caja).
 * Uso: cd backend && node scripts/migrate-repair-order-payments.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS repair_order_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL DEFAULT 'Efectivo',
  notes TEXT NULL,
  registered_by_user_id INT NULL,
  tech_cash_movement_id INT UNSIGNED NULL,
  is_legacy_import TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ro_payments_order (repair_order_id),
  KEY idx_ro_payments_tcm (tech_cash_movement_id),
  CONSTRAINT fk_rop_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_rop_registered_by FOREIGN KEY (registered_by_user_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function run() {
  await pool.query(CREATE_SQL);
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
