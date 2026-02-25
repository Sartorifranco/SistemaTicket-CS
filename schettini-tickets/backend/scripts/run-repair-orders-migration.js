/**
 * Ejecuta el script SQL de Órdenes de Reparación usando la conexión del backend.
 * Uso: node scripts/run-repair-orders-migration.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));
const fs = require('fs');

const sqlPath = path.join(__dirname, 'create-repair-orders.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// MySQL no soporta múltiples statements en query() por defecto. Dividimos por ; y ejecutamos cada uno.
const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('SET NAMES') && !s.startsWith('--'));

(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query("SET NAMES utf8mb4");
    for (const stmt of statements) {
      if (stmt) {
        await conn.query(stmt);
        console.log('✓ Ejecutado:', stmt.substring(0, 60) + '...');
      }
    }
    conn.release();
    console.log('\n✅ Migración de repair_orders completada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
