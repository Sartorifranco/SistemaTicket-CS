const pool = require('../config/db');
const { normalizeArticleNameForGrouping } = require('../utils/sparePartsDetailUtils');

function groupMovementsRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const articleKey = normalizeArticleNameForGrouping(row.article_name);
    const key = `${row.order_id}:${articleKey}`;
    const existing = groups.get(key);
    const qty = Number(row.quantity) || 1;
    const userLabel = row.user_display_name || row.user_username || null;
    if (!existing) {
      groups.set(key, {
        id: row.id,
        article_name: row.article_name,
        order_id: row.order_id,
        order_number: row.order_number,
        quantity: qty,
        entry_count: 1,
        first_used_at: row.created_at,
        last_used_at: row.created_at,
        users: userLabel ? [userLabel] : []
      });
    } else {
      existing.quantity += qty;
      existing.entry_count += 1;
      if (row.created_at && (!existing.first_used_at || row.created_at < existing.first_used_at)) {
        existing.first_used_at = row.created_at;
      }
      if (row.created_at && (!existing.last_used_at || row.created_at > existing.last_used_at)) {
        existing.last_used_at = row.created_at;
        existing.article_name = row.article_name;
      }
      if (userLabel && !existing.users.includes(userLabel)) {
        existing.users.push(userLabel);
      }
    }
  }
  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      user_display_name: g.users.join(', ') || null
    }))
    .sort((a, b) => {
      const ta = a.last_used_at || '';
      const tb = b.last_used_at || '';
      return tb.localeCompare(ta);
    });
}

/**
 * GET /api/movements
 * Query: search, view=consolidated|detail (default consolidated)
 */
const getMovements = async (req, res) => {
  try {
    if (req.user?.role === 'agent') {
      const [settings] = await pool.query(
        'SELECT agents_can_view_movements FROM company_settings WHERE id = 1 LIMIT 1'
      );
      const canView = settings.length > 0 && (settings[0].agents_can_view_movements === 1 || settings[0].agents_can_view_movements === true);
      if (!canView) {
        return res.status(403).json({ message: 'No tenés permiso para ver los movimientos de artículos.' });
      }
    }

    const search = (req.query.search || '').trim();
    const view = String(req.query.view || 'consolidated').toLowerCase();
    let sql = `
      SELECT am.id, am.article_name, am.order_id, am.quantity, am.user_id, am.created_at,
        ro.order_number,
        u.username AS user_username,
        COALESCE(u.full_name, u.username) AS user_display_name
      FROM article_movements am
      LEFT JOIN repair_orders ro ON ro.id = am.order_id
      LEFT JOIN Users u ON u.id = am.user_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += ` AND am.article_name LIKE ?`;
      params.push(`%${search}%`);
    }
    sql += ` ORDER BY am.created_at DESC, am.id DESC`;

    const [rows] = await pool.query(sql, params);
    if (view === 'detail') {
      return res.json({ success: true, data: rows, view: 'detail' });
    }
    res.json({ success: true, data: groupMovementsRows(rows), view: 'consolidated' });
  } catch (err) {
    if (err.message?.includes("doesn't exist")) {
      return res.json({ success: true, data: [], view: 'consolidated' });
    }
    console.error('getMovements:', err);
    res.status(500).json({ message: 'Error al listar movimientos' });
  }
};

/**
 * DELETE /api/movements/:id
 * Solo administradores. Elimina un registro puntual de movimiento de artículo.
 */
const deleteMovement = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    const [result] = await pool.query('DELETE FROM article_movements WHERE id = ?', [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Movimiento no encontrado' });
    }
    res.json({ success: true, message: 'Movimiento eliminado' });
  } catch (err) {
    console.error('deleteMovement:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el movimiento' });
  }
};

module.exports = { getMovements, deleteMovement, groupMovementsRows };
