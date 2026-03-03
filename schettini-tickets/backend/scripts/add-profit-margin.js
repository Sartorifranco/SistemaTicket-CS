/**
 * Agrega columna profit_margin_percent a company_settings para la Calculadora Manual.
 * Uso: cd backend && node scripts/add-profit-margin.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets'
  });

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM company_settings LIKE 'profit_margin_percent'");
    if (cols.length === 0) {
      await conn.query(`
        ALTER TABLE company_settings 
        ADD COLUMN profit_margin_percent DECIMAL(5,2) NULL DEFAULT 30 COMMENT 'Margen % para cotizador manual'
      `);
      await conn.query('UPDATE company_settings SET profit_margin_percent = 30 WHERE id = 1');
      console.log('✓ Columna profit_margin_percent agregada (default 30%)');
    } else {
      console.log('  profit_margin_percent ya existe');
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
