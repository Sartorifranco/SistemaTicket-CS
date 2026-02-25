/**
 * Agrega columna permissions a Users.
 * Uso: cd backend && node scripts/add-users-permissions.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

(async () => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        ALTER TABLE Users ADD COLUMN permissions VARCHAR(500) NULL DEFAULT '["tickets"]'
      `);
      console.log('✓ Columna permissions agregada.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  Columna permissions ya existe.');
      } else throw e;
    }
    conn.release();
    console.log('✅ Migración completada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
