/**
 * Migración: Módulo de Garantías en repair_orders.
 * Agrega columnas is_warranty, warranty_type, purchase_invoice_number, purchase_date,
 * original_supplier, requires_factory_shipping, warranty_status y tabla repair_order_status_history.
 * Uso: cd backend && node scripts/run-warranty-migration.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const run = async (conn, sql, label) => {
  try {
    await conn.query(sql);
    console.log('✓', label || sql.substring(0, 60) + '...');
    return true;
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
      console.log('  (ya existe, omitiendo)');
      return false;
    }
    throw e;
  }
};

const alterations = [
  ['ALTER TABLE repair_orders ADD COLUMN is_warranty TINYINT(1) NOT NULL DEFAULT 0', 'is_warranty'],
  ['ALTER TABLE repair_orders ADD COLUMN warranty_type VARCHAR(50) NULL', 'warranty_type'],
  ['ALTER TABLE repair_orders ADD COLUMN purchase_invoice_number VARCHAR(255) NULL', 'purchase_invoice_number'],
  ['ALTER TABLE repair_orders ADD COLUMN purchase_date DATE NULL', 'purchase_date'],
  ['ALTER TABLE repair_orders ADD COLUMN original_supplier VARCHAR(255) NULL', 'original_supplier'],
  ['ALTER TABLE repair_orders ADD COLUMN requires_factory_shipping TINYINT(1) NOT NULL DEFAULT 0', 'requires_factory_shipping'],
  ['ALTER TABLE repair_orders ADD COLUMN warranty_status VARCHAR(50) NULL', 'warranty_status'],
];

const indexes = [
  ['CREATE INDEX idx_is_warranty ON repair_orders (is_warranty)', 'idx_is_warranty'],
  ['CREATE INDEX idx_warranty_status ON repair_orders (warranty_status)', 'idx_warranty_status'],
  ['CREATE INDEX idx_original_supplier ON repair_orders (original_supplier(100))', 'idx_original_supplier'],
];

const createHistoryTable = `
  CREATE TABLE IF NOT EXISTS repair_order_status_history (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    repair_order_id INT UNSIGNED NOT NULL,
    field_changed VARCHAR(50) NOT NULL,
    old_value VARCHAR(100) NULL,
    new_value VARCHAR(100) NULL,
    changed_by INT UNSIGNED NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_repair_order_id (repair_order_id),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_rosh_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_rosh_user FOREIGN KEY (changed_by) REFERENCES Users (id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('\n=== Columnas de garantía en repair_orders ===\n');
    for (const [stmt, name] of alterations) {
      await run(conn, stmt, name);
    }
    console.log('\n=== Índices ===\n');
    for (const [stmt, name] of indexes) {
      await run(conn, stmt, name);
    }
    console.log('\n=== Tabla repair_order_status_history ===\n');
    await conn.query(createHistoryTable);
    console.log('✓ repair_order_status_history');
    conn.release();
    console.log('\n✅ Migración de garantías completada.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
