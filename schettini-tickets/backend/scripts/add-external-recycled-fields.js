/**
 * Agrega columnas para Órdenes Externas (sistema legado) en repair_orders.
 * Ejecutar una vez; si ya existen, se omite.
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const additions = [
  { name: 'is_external_recycled', def: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { name: 'external_order_number', def: 'VARCHAR(255) NULL' },
  { name: 'external_equipment_status', def: 'VARCHAR(500) NULL' }
];

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'schettini_tickets'
    });
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_orders'`
    );
    const existing = new Set(cols.map((c) => c.COLUMN_NAME));
    for (const { name, def } of additions) {
      if (existing.has(name)) {
        console.log(`repair_orders.${name} ya existe.`);
      } else {
        await conn.query(`ALTER TABLE repair_orders ADD COLUMN \`${name}\` ${def}`);
        console.log(`repair_orders.${name} agregado.`);
      }
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
