/**
 * Migración: Tabla password_reset_tokens para recuperación de contraseña
 * Ejecutar: node scripts/migrate-password-reset.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');

const SQL = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_token (token),
  KEY idx_user_expires (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function run() {
    try {
        await pool.query(SQL);
        console.log('Tabla password_reset_tokens creada o ya existe.');
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    } finally {
        pool.end();
    }
}
run();
