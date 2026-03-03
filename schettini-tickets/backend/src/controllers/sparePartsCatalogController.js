const pool = require('../config/db');

const search = async (req, res) => {
  try {
    const { q } = req.query;
    let query = 'SELECT id, codigo, nombre, precio_usd, precio_ars FROM spare_parts_catalog WHERE 1=1';
    const params = [];
    if (q && String(q).trim()) {
      const term = `%${String(q).trim()}%`;
      query += ' AND (nombre LIKE ? OR codigo LIKE ?)';
      params.push(term, term);
    }
    query += ' ORDER BY nombre ASC LIMIT 15';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('sparePartsCatalog search:', err.message);
    res.status(500).json({ success: false, message: 'Error al buscar repuestos' });
  }
};

const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, codigo, nombre, precio_usd, precio_ars FROM spare_parts_catalog ORDER BY nombre ASC');
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

/**
 * Importación con upsert: recibe array del Excel (QuoterPage) y hace insert o update por código.
 * Acepta: codigo, descripcion, precioVentaPesos, precioVentaUsd | nombre, precio_usd, precio_ars
 */
const importFromExcel = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de items' });
    }

    let upserted = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Formato QuoterPage: codigo, descripcion, precioVentaPesos, precioVentaUsd
      const nombre = String(it.nombre || it.descripcion || it.name || '').trim();
      const rawCodigo = String(it.codigo || '').trim();
      const codigo = rawCodigo || `gen-${(nombre || 'item').slice(0, 50)}-${i}`;
      const precioUsd = it.precio_usd != null ? parseFloat(it.precio_usd) : (it.precioVentaUsd != null ? parseFloat(it.precioVentaUsd) : null);
      const precioArs = it.precio_ars != null ? parseFloat(it.precio_ars) : (it.precioVentaPesos != null ? parseFloat(it.precioVentaPesos) : null);

      if (!nombre && !rawCodigo) continue;

      await pool.query(
        `INSERT INTO spare_parts_catalog (codigo, nombre, precio_usd, precio_ars)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), precio_usd = VALUES(precio_usd), precio_ars = VALUES(precio_ars)`,
        [codigo, nombre || codigo, precioUsd, precioArs]
      );
      upserted++;
    }
    res.json({ success: true, message: `${upserted} repuestos actualizados en la base de datos`, count: upserted });
  } catch (err) {
    console.error('sparePartsCatalog importFromExcel:', err.message);
    res.status(500).json({ success: false, message: 'Error al importar lista de precios' });
  }
};

module.exports = { search, getAll, bulkCreate, importFromExcel };
