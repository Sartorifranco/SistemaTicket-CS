/**
 * Migración idempotente: agrega la columna `delayed_days_threshold` a company_settings.
 * Define después de cuántos días desde el ingreso una orden se considera "demorada"
 * en el Monitor de Órdenes y en las alertas del cron de avisos al técnico.
 *
 * Uso (desde backend/): node scripts/add-delayed-days-threshold.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'schettini_tickets',
    });

    const [rows] = await conn.query(
      "SHOW COLUMNS FROM company_settings LIKE 'delayed_days_threshold'"
    );

    if (rows.length === 0) {
      await conn.query(
        `ALTER TABLE company_settings
         ADD COLUMN delayed_days_threshold INT UNSIGNED NULL DEFAULT 3
         COMMENT 'Días desde el ingreso tras los cuales una orden se considera demorada'`
      );
      console.log('Columna delayed_days_threshold agregada (default 3).');
    } else {
      console.log('Columna delayed_days_threshold ya existe. Nada que hacer.');
    }

    // Asegura que no quede NULL si la BD vieja tenía la columna sin default.
    await conn.query(
      `UPDATE company_settings
       SET delayed_days_threshold = 3
       WHERE delayed_days_threshold IS NULL`
    );

    console.log('Listo.');
  } catch (e) {
    console.error('[add-delayed-days-threshold] Error:', e.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
