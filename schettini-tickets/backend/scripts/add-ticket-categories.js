/**
 * Crea la tabla ticket_categories e inserta datos por defecto.
 * Uso: cd backend && node scripts/add-ticket-categories.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DEFAULTS = [
  'Fallo Técnico',
  'Consulta de Cotización',
  'Reclamo de Garantía',
  'Otro'
];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets'
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ticket_categories (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Tabla ticket_categories creada o ya existe.');

    const [existing] = await conn.query('SELECT COUNT(*) as n FROM ticket_categories');
    if (existing[0].n === 0) {
      for (const name of DEFAULTS) {
        await conn.query('INSERT INTO ticket_categories (name) VALUES (?)', [name]);
      }
    }
    console.log('✓ Datos por defecto insertados.');
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
