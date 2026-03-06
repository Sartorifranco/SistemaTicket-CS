/**
 * Migración: Cambia la columna `role` de ENUM a VARCHAR(100)
 * para permitir cualquier valor de rol sin restricciones (viewer, etc.)
 * Ejecutar: node backend/scripts/fix-role-varchar.js
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
    console.log('✅ Conectado a la base de datos.');

    // Verificar el tipo actual de la columna
    const [cols] = await conn.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'role'`
    );

    if (cols.length === 0) {
      console.log('⚠ Columna role no encontrada en Users.');
      conn.release();
      return;
    }

    const currentType = (cols[0].COLUMN_TYPE || '').toLowerCase();
    if (currentType.startsWith('varchar')) {
      console.log(`✓ Columna role ya es VARCHAR (${cols[0].COLUMN_TYPE}), no requiere cambio.`);
    } else {
      console.log(`>>> Convirtiendo role de ${cols[0].COLUMN_TYPE} a VARCHAR(100)...`);
      await conn.query("ALTER TABLE Users MODIFY COLUMN role VARCHAR(100) NOT NULL DEFAULT 'client'");
      console.log('✓ Columna role convertida a VARCHAR(100) correctamente.');
    }

    conn.release();
    console.log('Migración completada.');
  } catch (e) {
    console.error('Error en fix-role-varchar:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
