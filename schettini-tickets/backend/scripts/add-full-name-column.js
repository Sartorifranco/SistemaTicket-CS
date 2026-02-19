/**
 * Agrega columna full_name a Users si no existe
 * node backend/scripts/add-full-name-column.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306
  });
  try {
    await pool.query(`
      ALTER TABLE Users 
      ADD COLUMN full_name VARCHAR(200) NULL AFTER username
    `);
    console.log('Columna full_name agregada correctamente.');
  } catch (e) {
    if (e.message?.includes('Duplicate column')) {
      console.log('La columna full_name ya existe.');
    } else {
      console.error('Error:', e.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

run();
