/**
 * Migración: system_options (listas desplegables: accessory, equipment_type, brand, etc.)
 * Uso: cd backend && node scripts/create-system-options.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const SQL = `
CREATE TABLE IF NOT EXISTS system_options (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category VARCHAR(50) NOT NULL,
  value VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function run() {
  try {
    await pool.query(SQL);
    console.log('✅ Tabla system_options creada/verificada correctamente.');
  } catch (e) {
    console.error(e);
    throw e;
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
