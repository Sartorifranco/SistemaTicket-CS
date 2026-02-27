const pool = require('../config/db');

const search = async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT id, nombre, precio_usd, precio_ars FROM spare_parts_catalog WHERE 1=1';
    const params = [];
    if (q && String(q).trim()) {
      query += ' AND nombre LIKE ?';
      params.push(`%${String(q).trim()}%`);
    }
    query += ' ORDER BY nombre ASC LIMIT 20';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('sparePartsCatalog search:', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar repuestos' });
  }
};

const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, precio_usd, precio_ars FROM spare_parts_catalog ORDER BY nombre ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('sparePartsCatalog getAll:', err.message);
    res.status(500).json({ success: false, message: 'Error al listar repuestos' });
  }
};

const bulkCreate = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de items' });
    }
    let inserted = 0;
    for (const it of items) {
      const nombre = String(it.nombre || it.name || '').trim();
      const precioUsd = it.precio_usd != null ? parseFloat(it.precio_usd) : null;
      const precioArs = it.precio_ars != null ? parseFloat(it.precio_ars) : null;
      if (!nombre) continue;
      await pool.query(
        'INSERT INTO spare_parts_catalog (nombre, precio_usd, precio_ars) VALUES (?, ?, ?)',
        [nombre, precioUsd, precioArs]
      );
      inserted++;
    }
    res.json({ success: true, message: `${inserted} repuestos importados`, count: inserted });
  } catch (err) {
    console.error('sparePartsCatalog bulkCreate:', err.message);
    res.status(500).json({ success: false, message: 'Error al importar repuestos' });
  }
};

module.exports = { search, getAll, bulkCreate };
