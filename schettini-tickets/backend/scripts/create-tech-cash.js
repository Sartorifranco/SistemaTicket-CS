/**
 * Migración: Caja Técnica - tech_cash_movements
 * Uso: cd backend && node scripts/create-tech-cash.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));

const SQL = `
CREATE TABLE IF NOT EXISTS tech_cash_movements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  type ENUM('ingreso', 'egreso') NOT NULL,
  concept ENUM('taller', 'remoto', 'repuesto', 'gasto', 'otro') NOT NULL DEFAULT 'otro',
  linked_reference VARCHAR(255) NULL,
  client_id INT UNSIGNED NULL,
  payment_method VARCHAR(100) NULL,
  amount DECIMAL(10,2) NOT NULL,
  user_id INT UNSIGNED NULL,
  notes TEXT NULL,
  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_movement_date (movement_date),
  KEY idx_type (type),
  KEY idx_concept (concept),
  KEY idx_is_closed (is_closed),
  CONSTRAINT fk_tcm_client FOREIGN KEY (client_id) REFERENCES Users (id) ON DELETE SET NULL,
  CONSTRAINT fk_tcm_user FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function run() {
  try {
    await pool.query(SQL);
    console.log('✅ Tabla tech_cash_movements creada correctamente.');
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Tabla ya existe.');
    } else {
      throw e;
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
