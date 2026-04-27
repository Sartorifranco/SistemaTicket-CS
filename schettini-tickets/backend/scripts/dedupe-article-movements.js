/**
 * Elimina filas duplicadas en article_movements: mismo artículo, orden, cantidad,
 * usuario y fecha/hora exacta (todas las columnas relevantes iguales salvo id).
 *
 * Ejecutar en el servidor una vez tras el fix de duplicados:
 *   node backend/scripts/dedupe-article-movements.js
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
    const [dupCount] = await conn.query(`
      SELECT COUNT(*) AS n FROM (
        SELECT am.id FROM article_movements am
        INNER JOIN article_movements keep ON
          keep.article_name = am.article_name
          AND keep.order_id = am.order_id
          AND keep.quantity = am.quantity
          AND (keep.user_id <=> am.user_id)
          AND keep.created_at = am.created_at
          AND keep.id < am.id
      ) t
    `);
    const toDelete = dupCount[0]?.n || 0;
    console.log(`Filas duplicadas (exactas) a eliminar: ${toDelete}`);

    const [result] = await conn.query(`
      DELETE am FROM article_movements am
      INNER JOIN article_movements keep ON
        keep.article_name = am.article_name
        AND keep.order_id = am.order_id
        AND keep.quantity = am.quantity
        AND (keep.user_id <=> am.user_id)
        AND keep.created_at = am.created_at
        AND keep.id < am.id
    `);
    console.log(`Eliminadas: ${result.affectedRows ?? 0}`);
    conn.release();
    console.log('Listo.');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
