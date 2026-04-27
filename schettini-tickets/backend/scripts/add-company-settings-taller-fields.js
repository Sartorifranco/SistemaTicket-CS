/**
 * Añade a company_settings: recycling_days_abandonment, default_warranty_months, legal_terms_ticket.
 * Ejecutar una vez: node scripts/add-company-settings-taller-fields.js (desde backend/)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'schettini_tickets',
    });
    const cols = [
      { name: 'recycling_days_abandonment', def: 'INT UNSIGNED NULL COMMENT "Días para abandono en Área Reciclaje"' },
      { name: 'default_warranty_months', def: 'INT UNSIGNED NULL COMMENT "Garantía por defecto en meses"' },
      { name: 'legal_terms_ticket', def: 'TEXT NULL COMMENT "Términos legales para tickets"' },
    ];
    for (const col of cols) {
      const [rows] = await conn.query("SHOW COLUMNS FROM company_settings LIKE ?", [col.name]);
      if (rows.length === 0) {
        await conn.query(`ALTER TABLE company_settings ADD COLUMN ${col.name} ${col.def}`);
        console.log(`Columna ${col.name} agregada.`);
      } else {
        console.log(`Columna ${col.name} ya existe.`);
      }
    }
    console.log('Listo.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}
run();
