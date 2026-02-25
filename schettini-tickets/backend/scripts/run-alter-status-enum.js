/**
 * Actualiza el ENUM status en repair_orders (agrega entregado_sin_reparacion).
 * Uso: node scripts/run-alter-status-enum.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const sql = `ALTER TABLE repair_orders
  MODIFY COLUMN status ENUM(
    'ingresado',
    'cotizado',
    'aceptado',
    'no_aceptado',
    'en_espera',
    'sin_reparacion',
    'listo',
    'entregado',
    'entregado_sin_reparacion'
  ) NOT NULL DEFAULT 'ingresado'`;

(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query(sql);
    conn.release();
    console.log('✅ ENUM status actualizado correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
