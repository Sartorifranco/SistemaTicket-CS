const pool = require('../config/db');

const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM ticket_categories ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error ticketCategories getAll:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
    }
    const [result] = await pool.query('INSERT INTO ticket_categories (name) VALUES (?)', [String(name).trim()]);
    res.status(201).json({ success: true, data: { id: result.insertId, name: String(name).trim() } });
  } catch (err) {
    console.error('Error ticketCategories create:', err.message);
    res.status(500).json({ success: false, message: 'Error al crear categoría' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM ticket_categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }
    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (err) {
    console.error('Error ticketCategories remove:', err.message);
    res.status(500).json({ success: false, message: 'Error al eliminar categoría' });
  }
};

module.exports = { getAll, create, remove };
