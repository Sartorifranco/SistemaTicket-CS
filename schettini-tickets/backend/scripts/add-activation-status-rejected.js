/**
 * Añade el valor 'rejected' al ENUM status de la tabla activations.
 * Ejecutar: node backend/scripts/add-activation-status-rejected.js
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
    const conn = await pool.getConnection();
    console.log('Conectado a la base de datos.');

    const [cols] = await conn.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activations' AND COLUMN_NAME = 'status'`
    );
    if (cols.length === 0) {
      console.log('Columna status no encontrada en activations.');
      conn.release();
      return;
    }
    const type = (cols[0].COLUMN_TYPE || '').toLowerCase();
    if (type.includes("'rejected'")) {
      console.log("El ENUM status ya incluye 'rejected'. No requiere cambio.");
    } else {
      console.log("Añadiendo 'rejected' al ENUM status...");
      await conn.query(
        "ALTER TABLE activations MODIFY COLUMN status ENUM('pending_validation', 'pending_client_fill', 'processing', 'ready', 'rejected') NOT NULL DEFAULT 'pending_validation'"
      );
      console.log("Listo. status ahora acepta 'rejected'.");
    }
    conn.release();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
