const pool = require('../config/db');

/**
 * GET /api/movements
 * Lista movimientos de artículos (repuestos usados en órdenes).
 * Query: search (opcional) - filtra por nombre o código de artículo.
 * Agent solo puede acceder si company_settings.agents_can_view_movements es true.
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
    res.json({ success: true, data: rows });
  } catch (err) {
    if (err.message?.includes("doesn't exist")) {
      return res.json({ success: true, data: [] });
    }
    console.error('getMovements:', err);
    res.status(500).json({ message: 'Error al listar movimientos' });
  }
};

module.exports = { getMovements };
