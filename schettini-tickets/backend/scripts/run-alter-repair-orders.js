/**
 * Ejecuta ALTER TABLE para agregar nuevos campos a repair_orders.
 * Uso: node scripts/run-alter-repair-orders.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const alterations = [
  'ALTER TABLE repair_orders ADD COLUMN accepted_date DATE NULL',
  'ALTER TABLE repair_orders ADD COLUMN promised_date DATE NULL',
  'ALTER TABLE repair_orders ADD COLUMN delivered_date DATE NULL',
  'ALTER TABLE repair_orders ADD COLUMN warranty_expiration_date DATE NULL',
  'ALTER TABLE repair_orders ADD COLUMN public_notes TEXT NULL',
  'ALTER TABLE repair_orders ADD COLUMN spare_parts_detail TEXT NULL'
];

(async () => {
  try {
    const conn = await pool.getConnection();
    for (const stmt of alterations) {
      try {
        await conn.query(stmt);
        console.log('✓', stmt.substring(0, 55) + '...');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') console.log('  (columna ya existe, omitiendo)');
        else throw err;
      }
    }
    conn.release();
    console.log('\n✅ Migración completada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
