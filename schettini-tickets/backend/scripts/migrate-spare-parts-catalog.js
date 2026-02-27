/**
 * Crea tabla spare_parts_catalog para el cotizador integrado.
 * Uso: cd backend && node scripts/migrate-spare-parts-catalog.js
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
    await conn.query(`
      CREATE TABLE IF NOT EXISTS spare_parts_catalog (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(255) NOT NULL,
        precio_usd DECIMAL(12,2) NULL,
        precio_ars DECIMAL(12,2) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Tabla spare_parts_catalog creada');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
