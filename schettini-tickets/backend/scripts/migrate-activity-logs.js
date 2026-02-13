/**
 * Migración: Agrega columnas user_username y user_role a activity_logs si no existen.
 * Ejecutar: node scripts/migrate-activity-logs.js
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
    const columns = [
      ['user_username', 'VARCHAR(100) NULL'],
      ['user_role', 'VARCHAR(20) NULL'],
      ['activity_type', 'VARCHAR(50) NULL'],
      ['action_type', 'VARCHAR(50) NULL'],
      ['target_type', 'VARCHAR(50) NULL'],
      ['target_id', 'INT UNSIGNED NULL'],
      ['old_value', 'JSON NULL'],
      ['new_value', 'JSON NULL']
    ];

    for (const [col, def] of columns) {
      try {
        await pool.query(`ALTER TABLE activity_logs ADD COLUMN ${col} ${def}`);
        console.log('Agregada columna:', col);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('Columna', col, 'ya existe');
        } else {
          console.log('Columna', col, ':', e.message);
        }
      }
    }
    console.log('Migración completada.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
