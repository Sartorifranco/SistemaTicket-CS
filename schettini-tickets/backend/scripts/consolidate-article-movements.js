/**
 * Consolida article_movements duplicados: mismo repuesto en la misma orden
 * (mismo código o nombre normalizado) → una fila con cantidad sumada.
 *
 * Uso: cd backend && node scripts/consolidate-article-movements.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require(path.join(__dirname, '..', 'src', 'config', 'db'));
const { normalizeArticleNameForGrouping, buildArticleDisplayName, extractCodigoFromNombre } = require('../src/utils/sparePartsDetailUtils');

async function run() {
  const [rows] = await pool.query(
    `SELECT am.id, am.article_name, am.order_id, am.quantity, am.user_id, am.created_at
     FROM article_movements am
     ORDER BY am.order_id ASC, am.created_at ASC, am.id ASC`
  );

  const groups = new Map();
  for (const row of rows) {
    const key = `${row.order_id}:${normalizeArticleNameForGrouping(row.article_name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let mergedGroups = 0;
  let deletedRows = 0;

  for (const [, list] of groups) {
    if (list.length <= 1) continue;
    mergedGroups++;
    const keep = list[0];
    const totalQty = list.reduce((s, r) => s + (Number(r.quantity) || 1), 0);
    const codigo = extractCodigoFromNombre(keep.article_name);
    const displayName = buildArticleDisplayName(keep.article_name, codigo);

    await pool.query(
      'UPDATE article_movements SET article_name = ?, quantity = ? WHERE id = ?',
      [displayName, totalQty, keep.id]
    );

    const deleteIds = list.slice(1).map((r) => r.id);
    if (deleteIds.length > 0) {
      const [del] = await pool.query(
        `DELETE FROM article_movements WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
        deleteIds
      );
      deletedRows += del.affectedRows ?? 0;
    }
  }

  console.log(`>>> Grupos consolidados: ${mergedGroups}`);
  console.log(`>>> Filas eliminadas (duplicadas): ${deletedRows}`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
