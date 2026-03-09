/**
 * Migración: Cambia la columna `form_type` de ENUM a VARCHAR(100)
 * para permitir 'general', 'controlador_fiscal' y valores futuros sin restricciones.
 * Ejecutar: node backend/scripts/fix-form-type-varchar.js
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

    const [cols] = await conn.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activations' AND COLUMN_NAME = 'form_type'`
    );

    if (cols.length === 0) {
      console.log('⚠ Columna form_type no encontrada en activations.');
      conn.release();
      return;
    }

    const currentType = (cols[0].COLUMN_TYPE || '').toLowerCase();
    if (currentType.startsWith('varchar')) {
      console.log(`✓ Columna form_type ya es VARCHAR (${cols[0].COLUMN_TYPE}), no requiere cambio.`);
    } else {
      console.log(`>>> Convirtiendo form_type de ${cols[0].COLUMN_TYPE} a VARCHAR(100)...`);
      await conn.query("ALTER TABLE activations MODIFY COLUMN form_type VARCHAR(100) NOT NULL DEFAULT 'none'");
      console.log('✓ Columna form_type convertida a VARCHAR(100) correctamente.');
    }

    conn.release();
    console.log('Migración completada.');
  } catch (e) {
    console.error('Error en fix-form-type-varchar:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
