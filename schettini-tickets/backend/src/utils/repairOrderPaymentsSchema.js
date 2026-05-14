/**
 * Tipos SQL alineados con repair_orders / Users / tech_cash_movements para FKs compatibles entre entornos.
 */
const SAFE_COLUMN_TYPE = /^[a-z0-9 ()]+$/i;

async function columnType(executor, tableName, columnName) {
  const [rows] = await executor.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  const t = rows[0]?.COLUMN_TYPE;
  if (!t || !SAFE_COLUMN_TYPE.test(t)) return null;
  return t;
}

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').Connection} executor
 */
async function resolveRepairOrderPaymentsColumnTypes(executor) {
  let repairOrderIdType = await columnType(executor, 'repair_order_items', 'repair_order_id');
  if (!repairOrderIdType) repairOrderIdType = await columnType(executor, 'repair_orders', 'id');
  if (!repairOrderIdType) repairOrderIdType = 'int unsigned';

  let userIdType = null;
  for (const t of ['Users', 'users']) {
    userIdType = await columnType(executor, t, 'id');
    if (userIdType) break;
  }
  if (!userIdType) userIdType = 'int unsigned';

  let techCashIdType = await columnType(executor, 'tech_cash_movements', 'id');
  if (!techCashIdType) techCashIdType = 'int unsigned';

  return { repairOrderIdType, userIdType, techCashIdType };
}

function buildCreateRepairOrderPaymentsTableSql(types) {
  const { repairOrderIdType, userIdType, techCashIdType } = types;
  return `
CREATE TABLE IF NOT EXISTS repair_order_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_order_id ${repairOrderIdType} NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL DEFAULT 'Efectivo',
  notes TEXT NULL,
  registered_by_user_id ${userIdType} NULL,
  tech_cash_movement_id ${techCashIdType} NULL,
  is_legacy_import TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ro_payments_order (repair_order_id),
  KEY idx_ro_payments_tcm (tech_cash_movement_id),
  CONSTRAINT fk_rop_order FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_rop_registered_by FOREIGN KEY (registered_by_user_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
}

module.exports = {
  resolveRepairOrderPaymentsColumnTypes,
  buildCreateRepairOrderPaymentsTableSql
};
