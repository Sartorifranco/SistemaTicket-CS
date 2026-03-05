const pool = require('../config/db');

/**
 * Convierte string de precio (ej: "$ 1.234,56", "1,5", "1234.56", "1,234.56") a número o null.
 * Limpia $, espacios; soporta formato europeo (1.234,56) y US (1,234.56).
 */
function parsePrice(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  let s = String(value).replace(/\s/g, '').replace(/^\$/, '').trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const num = parseFloat(s);
  return Number.isNaN(num) ? null : num;
}

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
 * Los precios se normalizan ($, comas, puntos) con parsePrice.
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
      const nombre = String(it.nombre || it.descripcion || it.name || '').trim();
      const rawCodigo = String(it.codigo || '').trim();
      const codigo = rawCodigo || `gen-${(nombre || 'item').slice(0, 50)}-${i}`;
      const precioUsd = parsePrice(it.precio_usd ?? it.precioVentaUsd);
      const precioArs = parsePrice(it.precio_ars ?? it.precioVentaPesos);

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
    console.error('🚨 ERROR EXCEL IMPORT:', err.message, err.sqlMessage || err);
    res.status(500).json({ success: false, message: 'Error al importar lista de precios' });
  }
};

const clearCatalog = async (req, res) => {
  try {
    await pool.query('DELETE FROM spare_parts_catalog');
    res.json({ success: true, message: 'Catálogo de repuestos vaciado correctamente' });
  } catch (err) {
    console.error('sparePartsCatalog clearCatalog:', err.message);
    res.status(500).json({ success: false, message: 'Error al vaciar el catálogo' });
  }
};

module.exports = { search, getAll, bulkCreate, importFromExcel, clearCatalog };
