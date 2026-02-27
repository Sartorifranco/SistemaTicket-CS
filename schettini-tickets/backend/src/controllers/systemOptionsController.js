const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT id, category, value, sort_order FROM system_options WHERE 1=1';
    const params = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY category ASC, sort_order ASC, value ASC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error systemOptions getAll:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener opciones' });
  }
};

const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM system_options ORDER BY category'
    );
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (err) {
    console.error('Error systemOptions getCategories:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

const create = async (req, res) => {
  try {
    const { category, value, sort_order } = req.body;
    if (!category || !String(value).trim()) {
      return res.status(400).json({ success: false, message: 'category y value son obligatorios' });
    }
    const [result] = await pool.query(
      'INSERT INTO system_options (category, value, sort_order) VALUES (?, ?, ?)',
      [String(category).trim(), String(value).trim(), sort_order != null ? parseInt(sort_order, 10) : 0]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, category, value } });
  } catch (err) {
    console.error('Error systemOptions create:', err.message);
    res.status(500).json({ success: false, message: 'Error al crear opción' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, value, sort_order } = req.body;
    const updates = [];
    const params = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(String(category).trim()); }
    if (value !== undefined) { updates.push('value = ?'); params.push(String(value).trim()); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(parseInt(sort_order, 10)); }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Nada que actualizar' });
    }
    params.push(id);
    const [result] = await pool.query(
      `UPDATE system_options SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Opción no encontrada' });
    }
    res.json({ success: true, message: 'Actualizado' });
  } catch (err) {
    console.error('Error systemOptions update:', err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM system_options WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Opción no encontrada' });
    }
    res.json({ success: true, message: 'Eliminado' });
  } catch (err) {
    console.error('Error systemOptions remove:', err.message);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
};

module.exports = { getAll, getCategories, create, update, remove };
