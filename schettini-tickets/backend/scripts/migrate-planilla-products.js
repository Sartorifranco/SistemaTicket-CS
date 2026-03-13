/**
 * Migración: crea la tabla planilla_products si no existe.
 * Uso: node scripts/migrate-planilla-products.js
 */
const pool = require('../src/config/db');

async function run() {
  let conn;
  try {
    conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS planilla_products (
        id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name      VARCHAR(200) NOT NULL,
        is_active TINYINT(1)   NOT NULL DEFAULT 1,
        created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabla planilla_products creada o ya existía.');

    // Productos iniciales si la tabla está vacía
    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM planilla_products');
    if (rows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO planilla_products (name) VALUES
          ('Controlador Fiscal'),
          ('Software de Gestión'),
          ('Balanza');
      `);
      console.log('✅ Productos iniciales insertados.');
    }
  } catch (err) {
    console.error('❌ Error en migración planilla_products:', err.message);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

run();
