/**
 * Migración: Rol Supervisor + Módulo de Tareas
 * Ejecutar: node backend/scripts/migrate-supervisor-and-tasks.js
 * Usa las credenciales de .env del backend
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const QUERIES = [
  "ALTER TABLE Users MODIFY COLUMN role VARCHAR(100) NOT NULL DEFAULT 'client'",
  `CREATE TABLE IF NOT EXISTS agent_tasks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to_user_id INT UNSIGNED NOT NULL,
    assigned_by_user_id INT UNSIGNED NOT NULL,
    due_date DATE NULL,
    due_time TIME NULL,
    status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_assigned_to (assigned_to_user_id),
    KEY idx_assigned_by (assigned_by_user_id),
    KEY idx_due_date (due_date),
    KEY idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'schettini_tickets',
    port: process.env.DB_PORT || 3306
  });
  try {
    console.log('Conectando a la base de datos...');
    const conn = await pool.getConnection();
    console.log('Ejecutando migración supervisor + tareas...');
    for (const q of QUERIES) {
      try {
        await conn.query(q);
        console.log('  ✓ Query ejecutada');
      } catch (e) {
        if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
          console.log('  ⚠ Ya aplicada (se omite)');
        } else {
          throw e;
        }
      }
    }
    conn.release();
    console.log('Migración completada correctamente.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
