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

// ─── Sub-opciones por producto ────────────────────────────────────────────────

// GET /api/planilla-products/:id/suboptions — sub-opciones activas de un producto (clientes)
router.get('/:id/suboptions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM planilla_product_suboptions WHERE product_id = ? AND is_active = 1 ORDER BY name ASC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error GET suboptions:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener sub-opciones' });
  }
});

// GET /api/planilla-products/:id/suboptions/all — todas (incluyendo inactivas), solo admin/supervisor
router.get('/:id/suboptions/all', authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, is_active FROM planilla_product_suboptions WHERE product_id = ? ORDER BY name ASC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error GET suboptions/all:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener sub-opciones' });
  }
});

// POST /api/planilla-products/:id/suboptions — crear sub-opción, solo admin/supervisor
router.post('/:id/suboptions', authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'El nombre es requerido' });

    const [existing] = await pool.query(
      'SELECT id FROM planilla_product_suboptions WHERE product_id = ? AND LOWER(name) = LOWER(?)',
      [id, name]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Ya existe una sub-opción con ese nombre' });
    }
    const [result] = await pool.query(
      'INSERT INTO planilla_product_suboptions (product_id, name) VALUES (?, ?)',
      [id, name]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name, is_active: 1 } });
  } catch (err) {
    console.error('Error POST suboptions:', err.message);
    res.status(500).json({ success: false, message: 'Error al crear sub-opción' });
  }
});

// PATCH /api/planilla-products/suboptions/:subId/toggle — activar/desactivar, solo admin/supervisor
router.patch('/suboptions/:subId/toggle', authorize('admin', 'supervisor'), async (req, res) => {
  try {
    const { subId } = req.params;
    const [rows] = await pool.query('SELECT is_active FROM planilla_product_suboptions WHERE id = ?', [subId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Sub-opción no encontrada' });
    const newState = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE planilla_product_suboptions SET is_active = ? WHERE id = ?', [newState, subId]);
    res.json({ success: true, is_active: newState });
  } catch (err) {
    console.error('Error PATCH suboptions toggle:', err.message);
    res.status(500).json({ success: false, message: 'Error al cambiar estado' });
  }
});

module.exports = router;
