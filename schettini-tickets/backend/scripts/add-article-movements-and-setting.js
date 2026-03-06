/**
 * Fase 3: Crea tabla article_movements y agrega agents_can_view_movements en company_settings.
 * Ejecutar: node backend/scripts/add-article-movements-and-setting.js
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

    const [tables] = await conn.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'article_movements'"
    );
    if (tables.length === 0) {
      await conn.query(`
        CREATE TABLE article_movements (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          article_name VARCHAR(255) NOT NULL,
          order_id INT UNSIGNED NOT NULL,
          quantity INT UNSIGNED NOT NULL DEFAULT 1,
          user_id INT UNSIGNED NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_order (order_id),
          KEY idx_user (user_id),
          KEY idx_article_name (article_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Tabla article_movements creada.');
    } else {
      console.log('Tabla article_movements ya existe.');
    }

    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_settings' AND COLUMN_NAME = 'agents_can_view_movements'`
    );
    if (cols.length === 0) {
      await conn.query('ALTER TABLE company_settings ADD COLUMN agents_can_view_movements TINYINT(1) NOT NULL DEFAULT 0');
      console.log('Columna company_settings.agents_can_view_movements agregada.');
    } else {
      console.log('Columna agents_can_view_movements ya existe.');
    }

    conn.release();
    console.log('Migración completada.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
