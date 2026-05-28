/**
 * Tabla system_forms: enlaces externos (Google Forms) gestionados por admin.
 * Uso: cd backend && node scripts/migrate-system-forms.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const SQL = `
CREATE TABLE IF NOT EXISTS system_forms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  external_url VARCHAR(2048) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_system_forms_active (is_active),
  KEY idx_system_forms_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function run() {
  await pool.query(SQL);
  console.log('✅ Tabla system_forms verificada/creada.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
