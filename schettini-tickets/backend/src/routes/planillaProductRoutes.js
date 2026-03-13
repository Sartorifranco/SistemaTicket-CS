const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/planilla-products — todos los productos activos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM planilla_products WHERE is_active = 1 ORDER BY name ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error GET planilla-products:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener productos' });
  }
});

// GET /api/planilla-products/all — todos los productos (incluyendo inactivos), solo admin/supervisor
router.get('/all', authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_active FROM planilla_products ORDER BY name ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error GET planilla-products/all:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener productos' });
  }
});

// PATCH /api/planilla-products/:id/toggle — activar/desactivar un producto, solo admin/supervisor
router.patch('/:id/toggle', authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT is_active FROM planilla_products WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    const newState = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE planilla_products SET is_active = ? WHERE id = ?', [newState, id]);
    res.json({ success: true, is_active: newState });
  } catch (err) {
    console.error('Error PATCH planilla-products/toggle:', err.message);
    res.status(500).json({ success: false, message: 'Error al cambiar estado' });
  }
});

// POST /api/planilla-products — crear un nuevo producto
router.post('/', authorize('admin', 'supervisor', 'agent', 'viewer'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }
    // Evitar duplicados (case-insensitive)
    const [existing] = await pool.query(
      'SELECT id, name FROM planilla_products WHERE LOWER(name) = LOWER(?)',
      [name]
    );
    if (existing.length > 0) {
      return res.json({ success: true, data: existing[0] });
    }
    const [result] = await pool.query(
      'INSERT INTO planilla_products (name) VALUES (?)',
      [name]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (err) {
    console.error('Error POST planilla-products:', err.message);
    res.status(500).json({ success: false, message: 'Error al crear producto' });
  }
});

module.exports = router;
