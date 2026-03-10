const pool = require('../config/db');

const CLOSED_WARRANTY_STATUSES = ['finalizado', 'entregado', 'rechazado_mal_uso'];

/**
 * GET /api/warranties/stats
 * Estadísticas del módulo de garantías: activas, por proveedor, por marca, tiempo promedio, rechazados, alertas >30 días.
 */
const getWarrantyStats = async (req, res) => {
  try {
    const placeholders = CLOSED_WARRANTY_STATUSES.map(() => '?').join(',');
    const closedList = [...CLOSED_WARRANTY_STATUSES];

    const [totalActivasRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM repair_orders
       WHERE is_warranty = 1 AND (warranty_status IS NULL OR warranty_status NOT IN (${placeholders}))`,
      closedList
    );
    const total_activas = totalActivasRow[0]?.total ?? 0;

    const [bySupplierRows] = await pool.query(
      `SELECT original_supplier AS supplier, COUNT(*) AS count
       FROM repair_orders
       WHERE is_warranty = 1 AND (warranty_status IS NULL OR warranty_status NOT IN (${placeholders}))
         AND original_supplier IS NOT NULL AND original_supplier != ''
       GROUP BY original_supplier
       ORDER BY count DESC`,
      closedList
    );
    const by_supplier = bySupplierRows || [];

    const [byBrandRows] = await pool.query(
      `SELECT COALESCE(roi.brand, roi.equipment_type, 'Sin marca') AS brand, COUNT(DISTINCT ro.id) AS count
       FROM repair_orders ro
       INNER JOIN repair_order_items roi ON roi.repair_order_id = ro.id
       WHERE ro.is_warranty = 1 AND (ro.warranty_status IS NULL OR ro.warranty_status NOT IN (${placeholders}))
       GROUP BY COALESCE(roi.brand, roi.equipment_type, 'Sin marca')
       ORDER BY count DESC`,
      closedList
    );
    const by_brand = byBrandRows || [];

    const [avgResolutionRow] = await pool.query(
      `SELECT AVG(DATEDIFF(updated_at, entry_date)) AS avg_days
       FROM repair_orders
       WHERE is_warranty = 1 AND warranty_status IN ('finalizado', 'entregado')
         AND entry_date IS NOT NULL AND updated_at IS NOT NULL`
    );
    const tiempo_promedio_resolucion_dias = avgResolutionRow[0]?.avg_days != null
      ? Math.round(parseFloat(avgResolutionRow[0].avg_days) * 10) / 10
      : null;

    const [rechazadosRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM repair_orders
       WHERE is_warranty = 1 AND warranty_status = 'rechazado_mal_uso'`
    );
    const total_rechazados = rechazadosRow[0]?.total ?? 0;

    const [alertRows] = await pool.query(
      `SELECT ro.id, ro.order_number, ro.entry_date, ro.warranty_status, ro.original_supplier,
              u.username AS client_name
       FROM repair_orders ro
       LEFT JOIN Users u ON ro.client_id = u.id
       WHERE ro.is_warranty = 1
         AND (ro.warranty_status IS NULL OR ro.warranty_status NOT IN (${placeholders}))
         AND ro.entry_date IS NOT NULL
         AND DATEDIFF(NOW(), ro.entry_date) > 30
       ORDER BY ro.entry_date ASC`,
      closedList
    );
    const ordenes_mas_30_dias_activas = (alertRows || []).map(r => {
      if (!r.entry_date) {
        return {
          id: r.id,
          order_number: r.order_number,
          entry_date: r.entry_date,
          warranty_status: r.warranty_status,
          original_supplier: r.original_supplier,
          client_name: r.client_name,
          dias_activos: null
        };
      }
      const entry = new Date(r.entry_date);
      if (Number.isNaN(entry.getTime())) {
        return {
          id: r.id,
          order_number: r.order_number,
          entry_date: r.entry_date,
          warranty_status: r.warranty_status,
          original_supplier: r.original_supplier,
          client_name: r.client_name,
          dias_activos: null
        };
      }
      const diffMs = Date.now() - entry.getTime();
      const days = Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000));
      return {
        id: r.id,
        order_number: r.order_number,
        entry_date: r.entry_date,
        warranty_status: r.warranty_status,
        original_supplier: r.original_supplier,
        client_name: r.client_name,
        dias_activos: days
      };
    });

    res.json({
      success: true,
      data: {
        total_activas,
        by_supplier: by_supplier,
        by_brand: by_brand,
        tiempo_promedio_resolucion_dias: tiempo_promedio_resolucion_dias,
        total_rechazados,
        ordenes_mas_30_dias_activas
      }
    });
  } catch (error) {
    console.error('Error getWarrantyStats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de garantías' });
  }
};

/**
 * GET /api/warranties
 * Lista órdenes con is_warranty = 1. Filtros: warranty_status, original_supplier, dateFrom, dateTo, etc.
 */
const getWarranties = async (req, res) => {
  try {
    const { warranty_status, original_supplier, dateFrom, dateTo, warranty_type, orderNumber } = req.query;

    let query = `
      SELECT ro.*,
        ro.entry_date, ro.updated_at, ro.created_at,
        u.username AS client_name,
        u.business_name AS client_business_name,
        u.phone AS client_phone,
        t.username AS technician_name
      FROM repair_orders ro
      LEFT JOIN Users u ON ro.client_id = u.id
      LEFT JOIN Users t ON ro.technician_id = t.id
      WHERE ro.is_warranty = 1
    `;
    const params = [];

    if (warranty_status && String(warranty_status).trim()) {
      query += ' AND ro.warranty_status = ?';
      params.push(String(warranty_status).trim());
    }
    if (original_supplier && String(original_supplier).trim()) {
      query += ' AND ro.original_supplier LIKE ?';
      params.push(`%${String(original_supplier).trim()}%`);
    }
    if (dateFrom) {
      query += ' AND DATE(ro.entry_date) >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND DATE(ro.entry_date) <= ?';
      params.push(dateTo);
    }
    if (warranty_type && String(warranty_type).trim()) {
      query += ' AND ro.warranty_type = ?';
      params.push(String(warranty_type).trim());
    }
    if (orderNumber && String(orderNumber).trim()) {
      query += ' AND ro.order_number LIKE ?';
      params.push(`%${String(orderNumber).trim()}%`);
    }

    query += ' ORDER BY ro.entry_date DESC, ro.created_at DESC';

    const [rows] = await pool.query(query, params);
    const ids = rows.map(r => r.id);
    const itemsMap = {};
    if (ids.length > 0) {
      const [items] = await pool.query(
        'SELECT * FROM repair_order_items WHERE repair_order_id IN (?) ORDER BY sort_order, id',
        [ids]
      );
      items.forEach(it => {
        if (!itemsMap[it.repair_order_id]) itemsMap[it.repair_order_id] = [];
        itemsMap[it.repair_order_id].push(it);
      });
    }
    const data = rows.map(r => {
      const items = itemsMap[r.id] || [];
      const first = items[0] || {};
      return {
        ...r,
        items,
        equipment_type: first.equipment_type,
        model: first.model,
        serial_number: first.serial_number
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getWarranties:', error);
    res.status(500).json({ success: false, message: 'Error al listar garantías' });
  }
};

module.exports = {
  getWarrantyStats,
  getWarranties
};
