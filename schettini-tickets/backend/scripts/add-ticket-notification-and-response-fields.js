// Migración para cambios solicitados por Casa Schettini (abril 2026)
// - company_settings: ticket_notification_emails (JSON/CSV de destinatarios al crear ticket)
// - company_settings: ticket_response_time_hours (tiempo máximo de respuesta configurable, default 48)
// - Users: is_company (TINYINT) para diferenciar Persona (0) de Empresa (1) en el registro
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('>>> Migración: ticket notification + response time + is_company');

    // 1) company_settings.ticket_notification_emails (JSON string o CSV con los correos a notificar al abrir ticket)
    const [cols1] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_settings'
          AND COLUMN_NAME = 'ticket_notification_emails'`
    );
    if (cols1.length === 0) {
      await pool.query(
        `ALTER TABLE company_settings
           ADD COLUMN ticket_notification_emails VARCHAR(1000) NULL
             COMMENT 'Correos separados por coma que reciben la notificación al crear un ticket'`
      );
      console.log('  ✓ Agregada columna ticket_notification_emails');
    } else {
      console.log('  · ticket_notification_emails ya existe');
    }

    // 2) company_settings.ticket_response_time_hours (default 48)
    const [cols2] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company_settings'
          AND COLUMN_NAME = 'ticket_response_time_hours'`
    );
    if (cols2.length === 0) {
      await pool.query(
        `ALTER TABLE company_settings
           ADD COLUMN ticket_response_time_hours INT UNSIGNED NOT NULL DEFAULT 48
             COMMENT 'Horas hábiles máximo de respuesta al ticket (configurable)'`
      );
      console.log('  ✓ Agregada columna ticket_response_time_hours (default 48)');
    } else {
      console.log('  · ticket_response_time_hours ya existe');
    }

    // 3) Default inicial de ticket_notification_emails en fila id=1
    await pool.query(
      `UPDATE company_settings
          SET ticket_notification_emails = COALESCE(ticket_notification_emails, 'posventa@casaschettini.com')
        WHERE id = 1`
    );

    // 4) Users.is_company (0 = persona, 1 = empresa)
    const [cols3] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'
          AND COLUMN_NAME = 'is_company'`
    );
    if (cols3.length === 0) {
      await pool.query(
        `ALTER TABLE Users
           ADD COLUMN is_company TINYINT(1) NOT NULL DEFAULT 0
             COMMENT '0 = persona, 1 = empresa (para registro)'`
      );
      console.log('  ✓ Agregada columna is_company en Users');
      // Seed: usuarios que ya tienen razón social/CUIT se marcan como empresa
      await pool.query(
        `UPDATE Users
            SET is_company = 1
          WHERE (business_name IS NOT NULL AND business_name <> '')
             OR (cuit IS NOT NULL AND cuit <> '')`
      );
      console.log('  ✓ Seed: usuarios con business_name/cuit marcados como empresa');
    } else {
      console.log('  · is_company ya existe');
    }

    console.log('>>> Migración finalizada OK');
  } catch (error) {
    console.error('Error en migración:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
