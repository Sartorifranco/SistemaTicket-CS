/**
 * Migración: Agrega columna full_name a Users para separar nombre de identificación del usuario de login.
 * Ejecutar: node scripts/migrate-add-full-name.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306
  });

  try {
    try {
      await pool.query('ALTER TABLE Users ADD COLUMN full_name VARCHAR(200) NULL AFTER username');
      console.log('Agregada columna: full_name');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Columna full_name ya existe');
      } else {
        throw e;
      }
    }
    console.log('Migración completada. Ejecuta el backend y prueba el registro.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
