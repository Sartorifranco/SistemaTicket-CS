/**
 * Migración: crea la tabla planilla_product_suboptions y carga datos iniciales.
 * Vincula sub-opciones a cada producto (ej: modelos de CF, tipos de software).
 * Uso: node scripts/migrate-planilla-suboptions.js
 */
const pool = require('../src/config/db');

async function run() {
  let conn;
  try {
    conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS planilla_product_suboptions (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNSIGNED NOT NULL,
        name       VARCHAR(200) NOT NULL,
        is_active  TINYINT(1)  NOT NULL DEFAULT 1,
        created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_suboption_product
          FOREIGN KEY (product_id) REFERENCES planilla_products(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabla planilla_product_suboptions creada o ya existía.');

    // Solo insertar datos iniciales si la tabla está vacía
    const [countRows] = await conn.query('SELECT COUNT(*) AS cnt FROM planilla_product_suboptions');
    if (countRows[0].cnt > 0) {
      console.log('ℹ️  La tabla ya tiene datos. No se insertan datos iniciales.');
      return;
    }

    // Buscar los productos base para asociar sub-opciones
    const [products] = await conn.query('SELECT id, name FROM planilla_products');

    for (const product of products) {
      const nameLower = product.name.toLowerCase();

      if (nameLower.includes('controlador') || nameLower.includes('fiscal')) {
        await conn.query(
          'INSERT INTO planilla_product_suboptions (product_id, name) VALUES (?,?),(?,?),(?,?),(?,?)',
          [
            product.id, 'Sam4s 330',
            product.id, 'Moretti Kinder',
            product.id, 'Epson',
            product.id, 'Hasar'
          ]
        );
        console.log(`✅ Sub-opciones (modelos CF) cargadas para: ${product.name}`);
      } else if (nameLower.includes('software') || nameLower.includes('gestión') || nameLower.includes('gestion')) {
        await conn.query(
          'INSERT INTO planilla_product_suboptions (product_id, name) VALUES (?,?),(?,?),(?,?)',
          [
            product.id, 'StarPOS Restaurant',
            product.id, 'StarPOS Market',
            product.id, 'Dux'
          ]
        );
        console.log(`✅ Sub-opciones (tipos de software) cargadas para: ${product.name}`);
      }
      // Productos sin sub-opciones (ej: Balanza) no necesitan entradas
    }

    console.log('✅ Migración planilla_product_suboptions completada.');
  } catch (err) {
    console.error('❌ Error en migración planilla_product_suboptions:', err.message);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

run();
