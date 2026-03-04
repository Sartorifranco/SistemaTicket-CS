/**
 * Agrega columna can_manage_tech_finances a Users.
 * Uso: cd backend && node scripts/add-can-manage-tech-finances.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

(async () => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query(`
        ALTER TABLE Users ADD COLUMN can_manage_tech_finances TINYINT(1) NOT NULL DEFAULT 0
      `);
      console.log('✓ Columna can_manage_tech_finances agregada.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  Columna can_manage_tech_finances ya existe.');
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
