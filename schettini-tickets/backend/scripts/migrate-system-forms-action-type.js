/**
 * Agrega action_type a system_forms (iframe | external_link).
 * Uso: cd backend && node scripts/migrate-system-forms-action-type.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

async function run() {
  const [tables] = await pool.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_forms'"
  );
  if (tables.length === 0) {
    console.log('⚠️  Tabla system_forms no existe. Ejecutá primero: node scripts/migrate-system-forms.js');
    process.exit(1);
  }

  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_forms' AND COLUMN_NAME = 'action_type'`
  );
  if (cols.length === 0) {
    await pool.query(`
      ALTER TABLE system_forms
      ADD COLUMN action_type VARCHAR(32) NOT NULL DEFAULT 'iframe'
      COMMENT 'iframe | external_link'
      AFTER external_url
    `);
    console.log('✅ Columna action_type agregada (default: iframe).');
  } else {
    console.log('✅ Columna action_type ya existe.');
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
