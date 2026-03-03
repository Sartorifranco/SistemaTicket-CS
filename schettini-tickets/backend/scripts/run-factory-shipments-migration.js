/**
 * Migración: Módulo Equipos en Fábrica (factory_shipments + equipment_inventory)
 * Uso: cd backend && node scripts/run-factory-shipments-migration.js
 * O ejecutar manualmente: mysql -u usuario -p base < scripts/create-factory-shipments.sql
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

async function run() {
  const sqlPath = path.join(__dirname, 'create-factory-shipments.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && !s.startsWith('SET NAMES'));

  for (const stmt of statements) {
    if (!stmt) continue;
    try {
      await pool.query(stmt);
      console.log('✓ Ejecutado:', stmt.substring(0, 80) + '...');
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.message?.includes('already exists')) {
        console.log('  (tabla ya existe, omitiendo)');
      } else {
        throw e;
      }
    }
  }
  console.log('\n✅ Migración factory_shipments completada.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
