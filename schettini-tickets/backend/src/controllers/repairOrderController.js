const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { createDraftFromRepairOrder } = require('./factoryShipmentController');
const { registerDepositMovementFromRepairOrder } = require('./techCashController');
const { createNotification } = require('../utils/notificationManager');

/** Convierte un string de fecha/hora MySQL (sin Z) o un Date a ISO con Z para que el frontend la interprete como UTC. */
function toUTCISO(val) {
  if (val == null || val === '') return val;
  if (val instanceof Date) return isNaN(val.getTime()) ? val : val.toISOString();
  const s = String(val).trim();
  if (!s) return val;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return s;
  const isoLike = s.replace(' ', 'T');
  const withZ = /\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(isoLike)
    ? isoLike.slice(0, 19).replace(/T(\d):/, 'T0$1:') + 'Z'
    : isoLike.slice(0, 10) + 'T00:00:00.000Z';
  const d = new Date(withZ);
  return isNaN(d.getTime()) ? val : d.toISOString();
}

const DATETIME_KEYS = ['entry_date', 'created_at', 'updated_at', 'accepted_date', 'promised_date', 'delivered_date', 'warranty_expiration_date', 'purchase_date', 'visit_date'];

function normalizeRowDates(row) {
  const out = { ...row };
  DATETIME_KEYS.forEach((k) => {
    if (out[k] != null) out[k] = toUTCISO(out[k]);
  });
  return out;
}

const VALID_STATUSES = [
  'ingresado',
  'cotizado',
  'aceptado',
  'no_aceptado',
  'en_espera',
  'sin_reparacion',
  'listo',
  'entregado',
  'entregado_sin_reparacion',
  'abandonado'
];

const WARRANTY_TYPES = ['oficial_fabricante', 'garantia_propia', 'garantia_proveedor'];
const WARRANTY_STATUSES = [
  'ingresado_garantia', 'en_diagnostico', 'espera_aprobacion_proveedor', 'enviado_fabrica',
  'aprobado_cambio', 'reparado_garantia', 'rechazado_mal_uso', 'finalizado', 'entregado'
];

const isValidStatus = (s) => s && VALID_STATUSES.includes(String(s).toLowerCase());
const isValidWarrantyType = (t) => t && WARRANTY_TYPES.includes(String(t));
const isValidWarrantyStatus = (s) => !s || WARRANTY_STATUSES.includes(String(s));

/**
 * Deriva un warranty_status sugerido a partir del status general de la orden.
 * Solo aplica para órdenes en garantía y sirve como sincronización automática básica.
 */
const deriveWarrantyStatusFromOrderStatus = (status, previousWarrantyStatus) => {
  if (!status) return previousWarrantyStatus || null;
  const s = String(status).toLowerCase();
  switch (s) {
    case 'ingresado':
      return 'ingresado_garantia';
    case 'cotizado':
    case 'aceptado':
    case 'en_espera':
    case 'sin_reparacion':
      return 'en_diagnostico';
    case 'listo':
      return 'reparado_garantia';
    case 'entregado':
    case 'entregado_sin_reparacion':
      return 'entregado';
    default:
      return previousWarrantyStatus || null;
  }
};

/** Si el valor no existe en system_options para esa categoría, lo inserta (auto-guardado para creatable combos). */
const ensureSystemOption = async (category, value) => {
  if (!value || !String(value).trim()) return;
  const v = String(value).trim();
  try {
    const [rows] = await pool.query(
      'SELECT id FROM system_options WHERE category = ? AND LOWER(TRIM(value)) = LOWER(?)',
      [category, v]
    );
    if (rows.length === 0) {
      await pool.query('INSERT INTO system_options (category, value, sort_order) VALUES (?, ?, 0)', [category, v]);
    }
  } catch (e) {
    console.error('ensureSystemOption:', e);
  }
};

/** Registra cambio de status o warranty_status en historial */
const logStatusHistory = async (repairOrderId, fieldChanged, oldValue, newValue, userId) => {
  if (oldValue === newValue) return;
  await pool.query(
    `INSERT INTO repair_order_status_history (repair_order_id, field_changed, old_value, new_value, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [repairOrderId, fieldChanged, oldValue || null, newValue || null, userId || null]
  );
};

/** Inserta movimientos de artículos (repuestos) en article_movements a partir de spare_parts_detail (JSON array o texto). */
const insertArticleMovementsFromSpareParts = async (repairOrderId, sparePartsDetail, userId) => {
  if (!repairOrderId || !sparePartsDetail) return;
  let items = [];
  const raw = sparePartsDetail.trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      items = [{ nombre: raw, quantity: 1 }];
    }
  } else {
    items = [{ nombre: raw, quantity: 1 }];
  }
  for (const it of items) {
    const name = it.nombre || it.name || (typeof it === 'string' ? it : null);
    if (!name || !String(name).trim()) continue;
    const qty = Math.max(1, parseInt(it.cantidad || it.quantity || 1, 10) || 1);
    try {
      await pool.query(
        'INSERT INTO article_movements (article_name, order_id, quantity, user_id) VALUES (?, ?, ?, ?)',
        [String(name).trim(), repairOrderId, qty, userId || null]
      );
    } catch (e) {
      console.error('insertArticleMovementsFromSpareParts:', e.message);
    }
  }
};

// Genera order_number: REP-0001, REP-0002, etc.
const generateOrderNumber = async () => {
  const [rows] = await pool.query(
    `SELECT order_number FROM repair_orders ORDER BY id DESC LIMIT 1`
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const match = rows[0].order_number.match(/REP-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `REP-${String(nextNum).padStart(4, '0')}`;
};

const PENDING_STATUSES = ['ingresado', 'cotizado', 'aceptado', 'no_aceptado', 'en_espera', 'sin_reparacion', 'listo'];

// GET - Órdenes pendientes para Monitor KDS (pantalla de cocina)
const getMonitorOrders = async (req, res) => {
  try {
    if (req.user.role === 'client') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const [rows] = await pool.query(
      `SELECT ro.id, ro.order_number, ro.entry_date, ro.status, ro.promised_date,
        ro.client_id, ro.is_warranty,
        COALESCE(ro.priority, 'Normal') AS priority,
        u.username AS client_name, u.business_name AS client_business_name,
        t.username AS technician_name, t.full_name AS technician_full_name
       FROM repair_orders ro
       LEFT JOIN Users u ON ro.client_id = u.id
       LEFT JOIN Users t ON ro.technician_id = t.id
       WHERE ro.status IN (${PENDING_STATUSES.map(() => '?').join(',')})
       ORDER BY
         CASE COALESCE(ro.priority, 'Normal')
           WHEN 'Urgente' THEN 1 WHEN 'Critico' THEN 2 ELSE 3 END,
         ro.entry_date ASC`,
      [...PENDING_STATUSES]
    );
    const ids = rows.map((r) => r.id);
    const itemsMap = {};
    if (ids.length > 0) {
      const [items] = await pool.query(
        'SELECT repair_order_id, equipment_type, brand, model FROM repair_order_items WHERE repair_order_id IN (?) ORDER BY sort_order, id',
        [ids]
      );
      items.forEach((it) => {
        if (!itemsMap[it.repair_order_id]) itemsMap[it.repair_order_id] = [];
        itemsMap[it.repair_order_id].push(it);
      });
    }
    const data = rows.map((r) => {
      const items = itemsMap[r.id] || [];
      const first = items[0] || {};
      return normalizeRowDates({
        ...r,
        equipment_type: first.equipment_type,
        brand: first.brand,
        model: first.model
      });
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getMonitorOrders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
};

// GET - Listar todas las órdenes
const getRepairOrders = async (req, res) => {
  try {
    const { status, clientId, technicianId, orderNumber, dateFrom, dateTo, brand, model, serial } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // LEFT JOIN Users: órdenes con client_id NULL (externas/reciclaje) siguen apareciendo en el listado.
    let query = `
      SELECT ro.*,
        ro.entry_date, ro.updated_at,
        u.username AS client_name,
        u.business_name AS client_business_name,
        u.phone AS client_phone,
        t.username AS technician_name,
        ro.client_id, ro.technician_id
      FROM repair_orders ro
      LEFT JOIN Users u ON ro.client_id = u.id
      LEFT JOIN Users t ON ro.technician_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'client') {
      query += ' AND ro.client_id = ?';
      params.push(userId);
    }

    if (status) {
      if (!isValidStatus(status)) {
        return res.status(400).json({ success: false, message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` });
      }
      query += ' AND ro.status = ?';
      params.push(status);
    }
    if (clientId) {
      query += ' AND ro.client_id = ?';
      params.push(clientId);
    }
    if (technicianId) {
      query += ' AND ro.technician_id = ?';
      params.push(technicianId);
    }
    if (orderNumber && String(orderNumber).trim()) {
      query += ' AND ro.order_number LIKE ?';
      params.push(`%${String(orderNumber).trim()}%`);
    }
    if (dateFrom) {
      query += ' AND DATE(ro.entry_date) >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND DATE(ro.entry_date) <= ?';
      params.push(dateTo);
    }
    const brandQ = brand && String(brand).trim();
    const modelQ = model && String(model).trim();
    const serialQ = serial && String(serial).trim();
    if (brandQ || modelQ || serialQ) {
      const itemConds = [];
      if (brandQ) { itemConds.push('(roi.brand LIKE ? OR roi.equipment_type LIKE ?)'); params.push(`%${brandQ}%`, `%${brandQ}%`); }
      if (modelQ) { itemConds.push('roi.model LIKE ?'); params.push(`%${modelQ}%`); }
      if (serialQ) { itemConds.push('roi.serial_number LIKE ?'); params.push(`%${serialQ}%`); }
      query += ` AND ro.id IN (SELECT DISTINCT roi.repair_order_id FROM repair_order_items roi WHERE ${itemConds.join(' AND ')})`;
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
      return normalizeRowDates({ ...r, items, equipment_type: first.equipment_type, brand: first.brand, model: first.model, serial_number: first.serial_number });
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getRepairOrders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
};

// GET - Mis órdenes (solo clientes, SIN internal_notes)
const getMyRepairOrders = async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const [rows] = await pool.query(
      `SELECT ro.id, ro.order_number, ro.entry_date, ro.status,
        ro.labor_cost, ro.spare_parts_cost, ro.total_cost, ro.deposit_paid,
        ro.technical_report, ro.created_at,
        ro.accepted_date, ro.promised_date, ro.delivered_date, ro.warranty_expiration_date,
        ro.public_notes, ro.spare_parts_detail
       FROM repair_orders ro
       WHERE ro.client_id = ?
       ORDER BY ro.created_at DESC`,
      [req.user.id]
    );
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
      return normalizeRowDates({ ...r, items, equipment_type: first.equipment_type, model: first.model, serial_number: first.serial_number, reported_fault: first.reported_fault });
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getMyRepairOrders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
};

// GET - Obtener una orden por ID
const getRepairOrderById = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // LEFT JOIN Users: permite detalle de orden sin cliente (client_id NULL).
    const [orders] = await pool.query(
      `SELECT ro.*,
        u.username AS client_name,
        u.business_name AS client_business_name,
        u.email AS client_email,
        u.phone AS client_phone,
        u.address AS client_address,
        t.username AS technician_name
      FROM repair_orders ro
      LEFT JOIN Users u ON ro.client_id = u.id
      LEFT JOIN Users t ON ro.technician_id = t.id
      WHERE ro.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const order = orders[0];
    if (userRole === 'client' && order.client_id !== userId) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const [photos] = await pool.query(
      'SELECT id, photo_url, perspective_label, created_at FROM repair_order_photos WHERE repair_order_id = ? ORDER BY id',
      [id]
    );
    const [items] = await pool.query(
      'SELECT * FROM repair_order_items WHERE repair_order_id = ? ORDER BY sort_order, id',
      [id]
    );
    const first = items[0] || {};
    let data = normalizeRowDates({ ...order, photos, items, equipment_type: first.equipment_type, model: first.model, serial_number: first.serial_number, reported_fault: first.reported_fault });
    if (userRole === 'client') {
      delete data.internal_notes;
      delete data.recycling_notes;
      delete data.recycling_photos;
    }
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getRepairOrderById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener orden' });
  }
};

// Parse items desde body (JSON o array)
const parseItems = (body) => {
  let items = body.items;
  if (!items) {
    const { equipmentType, model, serialNumber, reportedFault, includedAccessories, isWarranty, brand, warrantyInvoice } = body;
    if (equipmentType || model || serialNumber || reportedFault) {
      items = [{ equipment_type: equipmentType, brand, model, serial_number: serialNumber, reported_fault: reportedFault, included_accessories: includedAccessories, is_warranty: isWarranty, warranty_invoice: warrantyInvoice }];
    } else items = [];
  }
  if (typeof items === 'string') try { items = JSON.parse(items); } catch { items = []; }
  return Array.isArray(items) ? items : [];
};

// POST - Crear orden (con fotos opcionales, items en body.items o legacy)
const createRepairOrder = async (req, res) => {
  try {
    const files = req.files || [];
    const {
      clientId,
      entryDate,
      status,
      laborCost,
      sparePartsCost,
      totalCost,
      depositPaid,
      internalNotes,
      technicalReport,
      technicianId,
      acceptedDate,
      promisedDate,
      deliveredDate,
      warrantyExpirationDate,
      publicNotes,
      sparePartsDetail,
      orderType,
      visitDate,
      remotePlatform,
      deliveryAddress,
      paymentMethod,
      paymentOperationNumber,
      priority,
      isWarranty,
      warrantyType,
      purchaseInvoiceNumber,
      purchaseDate,
      originalSupplier,
      requiresFactoryShipping,
      warrantyStatus
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Se requiere client_id' });
    }
    if (status && !isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`
      });
    }

    const items = parseItems(req.body);
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere al menos un equipo (items)' });
    }

    const isWarrantyOrder = isWarranty === true || isWarranty === 'true' || isWarranty === 1;
    if (isWarrantyOrder) {
      if (!warrantyType || !isValidWarrantyType(warrantyType)) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere warranty_type válido: oficial_fabricante, garantia_propia, garantia_proveedor' });
      }
      if (!purchaseInvoiceNumber || !String(purchaseInvoiceNumber).trim()) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere purchase_invoice_number' });
      }
      if (!purchaseDate || !String(purchaseDate).trim()) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere purchase_date' });
      }
      if (!originalSupplier || !String(originalSupplier).trim()) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere original_supplier' });
      }
      const hasSerial = items.some(it => it.serial_number && String(it.serial_number).trim());
      if (!hasSerial) {
        return res.status(400).json({ success: false, message: 'En garantía al menos un equipo debe tener serial_number' });
      }
      if (warrantyStatus && !isValidWarrantyStatus(warrantyStatus)) {
        return res.status(400).json({ success: false, message: `warranty_status inválido. Valores: ${WARRANTY_STATUSES.join(', ')}` });
      }
    }

    let finalLaborCost = laborCost ? parseFloat(laborCost) : null;
    let finalSparePartsCost = sparePartsCost ? parseFloat(sparePartsCost) : null;
    if (isWarrantyOrder && warrantyType === 'oficial_fabricante') {
      finalLaborCost = 0;
      finalSparePartsCost = 0;
    }
    const finalTotalCost = totalCost ? parseFloat(totalCost) : (finalLaborCost != null && finalSparePartsCost != null ? finalLaborCost + finalSparePartsCost : null);

    const orderNumber = await generateOrderNumber();

    const [result] = await pool.query(
      `INSERT INTO repair_orders (
        client_id, order_number, entry_date, status,
        labor_cost, spare_parts_cost, total_cost, deposit_paid,
        internal_notes, technical_report, technician_id,
        accepted_date, promised_date, delivered_date, warranty_expiration_date,
        public_notes, spare_parts_detail,
        order_type, visit_date, remote_platform, delivery_address,
        payment_method, payment_operation_number, priority,
        is_warranty, warranty_type, purchase_invoice_number, purchase_date, original_supplier, requires_factory_shipping, warranty_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        orderNumber,
        entryDate || null,
        status || 'ingresado',
        finalLaborCost,
        finalSparePartsCost,
        finalTotalCost,
        depositPaid ? parseFloat(depositPaid) : null,
        internalNotes || null,
        technicalReport || null,
        technicianId || null,
        acceptedDate || null,
        promisedDate || null,
        deliveredDate || null,
        warrantyExpirationDate || null,
        publicNotes || null,
        sparePartsDetail || null,
        orderType || 'Taller',
        visitDate || null,
        remotePlatform || null,
        deliveryAddress || null,
        paymentMethod || null,
        paymentOperationNumber || null,
        priority || 'Normal',
        isWarrantyOrder ? 1 : 0,
        isWarrantyOrder ? warrantyType : null,
        isWarrantyOrder ? String(purchaseInvoiceNumber).trim() : null,
        isWarrantyOrder && purchaseDate ? purchaseDate : null,
        isWarrantyOrder ? String(originalSupplier).trim() : null,
        requiresFactoryShipping === true || requiresFactoryShipping === 'true' || requiresFactoryShipping === 1 ? 1 : 0,
        isWarrantyOrder && warrantyStatus ? warrantyStatus : null
      ]
    );

    const repairOrderId = result.insertId;

    if (depositPaid && parseFloat(depositPaid) > 0) {
      await registerDepositMovementFromRepairOrder(
        repairOrderId,
        orderNumber,
        parseFloat(depositPaid),
        'ingreso',
        paymentMethod || 'Efectivo',
        clientId,
        req.user?.id,
        `Seña Orden #${orderNumber}`
      );
    }

    if (sparePartsDetail && String(sparePartsDetail).trim()) {
      await insertArticleMovementsFromSpareParts(repairOrderId, sparePartsDetail, req.user?.id);
    }

    if (isWarrantyOrder && warrantyStatus) {
      await logStatusHistory(repairOrderId, 'warranty_status', null, warrantyStatus, req.user?.id);
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await ensureSystemOption('equipment_type', it.equipment_type);
      await ensureSystemOption('brand', it.brand);
      await ensureSystemOption('model', it.model);
      const isWarranty = it.is_warranty === 'true' || it.is_warranty === true ? 1 : 0;
      await pool.query(
        `INSERT INTO repair_order_items (repair_order_id, equipment_type, brand, model, serial_number, reported_fault, included_accessories, is_warranty, warranty_invoice, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          repairOrderId,
          it.equipment_type || null,
          it.brand || null,
          it.model || null,
          it.serial_number || null,
          it.reported_fault || null,
          it.included_accessories || null,
          isWarranty,
          it.warranty_invoice || null,
          i
        ]
      );
    }

    // Solo insertar fotos si el usuario subió archivos. Nunca asignar imagen por defecto ni mock.
    if (Array.isArray(files) && files.length > 0) {
      let perspectiveLabels = [];
      try {
        perspectiveLabels = req.body.perspectiveLabels
          ? (typeof req.body.perspectiveLabels === 'string'
            ? JSON.parse(req.body.perspectiveLabels)
            : req.body.perspectiveLabels)
          : [];
      } catch (_) {
        perspectiveLabels = [];
      }

      const inserts = files.map((f, i) => [
        repairOrderId,
        `/uploads/${f.filename}`,
        perspectiveLabels[i] || `foto_${i + 1}`
      ]);
      await pool.query(
        'INSERT INTO repair_order_photos (repair_order_id, photo_url, perspective_label) VALUES ?',
        [inserts]
      );
    }

    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    // Notificar a admin y agentes que ingresó una nueva orden (registro en DB)
    const [staff] = await pool.query("SELECT id FROM Users WHERE role IN ('admin', 'agent') AND is_active = 1");
    for (const row of staff) {
      if (row.id !== req.user?.id) {
        await createNotification(row.id, 'Nueva orden', `Nueva orden de reparación: ${orderNumber}.`, 'info', req.io || null, repairOrderId, 'repair_order');
      }
    }
    res.status(201).json({
      success: true,
      message: 'Orden creada',
      data: { id: repairOrderId, orderNumber }
    });
  } catch (error) {
    console.error('Error createRepairOrder:', error);
    res.status(500).json({ success: false, message: 'Error al crear orden' });
  }
};

// PUT - Actualizar orden
const updateRepairOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      photoIds,
      clientId,
      entryDate,
      status,
      laborCost,
      sparePartsCost,
      totalCost,
      depositPaid,
      internalNotes,
      technicalReport,
      technicianId,
      acceptedDate,
      promisedDate,
      deliveredDate,
      warrantyExpirationDate,
      publicNotes,
      sparePartsDetail,
      orderType,
      visitDate,
      remotePlatform,
      deliveryAddress,
      paymentMethod,
      paymentOperationNumber,
      priority,
      recyclingNotes,
      recyclingPhotos,
      isWarranty,
      warrantyType,
      purchaseInvoiceNumber,
      purchaseDate,
      originalSupplier,
      requiresFactoryShipping,
      warrantyStatus
    } = req.body;

    const [existingRows] = await pool.query(
      'SELECT id, status, deposit_paid, total_cost, order_number, client_id, payment_method, requires_factory_shipping, warranty_status, is_warranty, warranty_type, purchase_invoice_number, purchase_date, original_supplier FROM repair_orders WHERE id = ?',
      [id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    const existing = existingRows[0];
    if (status !== undefined && status !== null && status !== '' && !isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`
      });
    }

    const isWarrantyOrder = isWarranty === true || isWarranty === 'true' || isWarranty === 1;
    const effectiveIsWarranty = isWarranty !== undefined ? isWarrantyOrder : !!existing.is_warranty;
    if (effectiveIsWarranty) {
      const effType = warrantyType !== undefined ? warrantyType : existing.warranty_type;
      if (!effType || !isValidWarrantyType(effType)) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere warranty_type válido' });
      }
      const effInvoice = purchaseInvoiceNumber !== undefined ? purchaseInvoiceNumber : existing.purchase_invoice_number;
      if (!effInvoice || !String(effInvoice).trim()) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere purchase_invoice_number' });
      }
      const effDate = purchaseDate !== undefined ? purchaseDate : existing.purchase_date;
      if (!effDate || !String(effDate).trim()) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere purchase_date' });
      }
      const effSupplier = originalSupplier !== undefined ? originalSupplier : existing.original_supplier;
      if (!effSupplier || !String(effSupplier).trim()) {
        return res.status(400).json({ success: false, message: 'En garantía se requiere original_supplier' });
      }
      const items = parseItems(req.body);
      if (items.length > 0) {
        const hasSerial = items.some(it => it.serial_number && String(it.serial_number).trim());
        if (!hasSerial) {
          const [currentItems] = await pool.query('SELECT serial_number FROM repair_order_items WHERE repair_order_id = ?', [id]);
          const hasExistingSerial = currentItems.some(it => it.serial_number && String(it.serial_number).trim());
          if (!hasExistingSerial) {
            return res.status(400).json({ success: false, message: 'En garantía al menos un equipo debe tener serial_number' });
          }
        }
      }
      if (warrantyStatus !== undefined && warrantyStatus !== null && warrantyStatus !== '' && !isValidWarrantyStatus(warrantyStatus)) {
        return res.status(400).json({ success: false, message: `warranty_status inválido. Valores: ${WARRANTY_STATUSES.join(', ')}` });
      }
    }

    // Sincronizar automáticamente warranty_status con status cuando la orden es de garantía,
    // salvo que se envíe un warrantyStatus explícito.
    let computedWarrantyStatus = warrantyStatus;
    if (effectiveIsWarranty && status !== undefined && status !== null && status !== '') {
      const autoStatus = deriveWarrantyStatusFromOrderStatus(status, existing.warranty_status);
      if (!computedWarrantyStatus || !String(computedWarrantyStatus).trim()) {
        computedWarrantyStatus = autoStatus;
      }
    }

    let finalLaborCost = laborCost !== undefined ? (laborCost === '' || laborCost == null ? null : parseFloat(laborCost)) : undefined;
    let finalSparePartsCost = sparePartsCost !== undefined ? (sparePartsCost === '' || sparePartsCost == null ? null : parseFloat(sparePartsCost)) : undefined;
    const effWarrantyType = warrantyType !== undefined ? warrantyType : existing.warranty_type;
    if (effectiveIsWarranty && effWarrantyType === 'oficial_fabricante') {
      finalLaborCost = 0;
      finalSparePartsCost = 0;
    }

    const setClause = [];
    const setParams = [];
    const add = (col, val, isNum) => {
      setClause.push(`${col} = ?`);
      setParams.push(isNum && (val === '' || val == null) ? null : (isNum && val != null ? parseFloat(val) : val));
    };
    if (clientId !== undefined) {
      let cid = null;
      if (clientId !== '' && clientId != null) {
        const n = parseInt(String(clientId), 10);
        cid = Number.isNaN(n) ? null : n;
      }
      add('client_id', cid);
    }
    if (entryDate !== undefined) add('entry_date', entryDate);
    if (status !== undefined && status !== '') add('status', status);
    if (finalLaborCost !== undefined) add('labor_cost', finalLaborCost, true);
    else if (laborCost !== undefined) add('labor_cost', laborCost, true);
    if (finalSparePartsCost !== undefined) add('spare_parts_cost', finalSparePartsCost, true);
    else if (sparePartsCost !== undefined) add('spare_parts_cost', sparePartsCost, true);
    if (totalCost !== undefined) add('total_cost', totalCost, true);
    if (depositPaid !== undefined) add('deposit_paid', depositPaid, true);
    if (internalNotes !== undefined) add('internal_notes', internalNotes);
    if (technicalReport !== undefined) add('technical_report', technicalReport);
    if (technicianId !== undefined) add('technician_id', technicianId || null);
    if (acceptedDate !== undefined) add('accepted_date', acceptedDate);
    if (promisedDate !== undefined) add('promised_date', promisedDate);
    if (deliveredDate !== undefined) add('delivered_date', deliveredDate);
    if (warrantyExpirationDate !== undefined) add('warranty_expiration_date', warrantyExpirationDate);
    if (publicNotes !== undefined) add('public_notes', publicNotes);
    if (sparePartsDetail !== undefined) {
      add('spare_parts_detail', sparePartsDetail);
      if (sparePartsDetail && String(sparePartsDetail).trim()) {
        await insertArticleMovementsFromSpareParts(id, sparePartsDetail, req.user?.id);
      }
    }
    if (orderType !== undefined) add('order_type', orderType);
    if (visitDate !== undefined) add('visit_date', visitDate);
    if (remotePlatform !== undefined) add('remote_platform', remotePlatform);
    if (deliveryAddress !== undefined) add('delivery_address', deliveryAddress);
    if (paymentMethod !== undefined) add('payment_method', paymentMethod);
    if (paymentOperationNumber !== undefined) add('payment_operation_number', paymentOperationNumber);
    if (priority !== undefined) add('priority', priority);
    if (recyclingNotes !== undefined) add('recycling_notes', recyclingNotes);
    if (recyclingPhotos !== undefined) {
      const val = typeof recyclingPhotos === 'string' ? (recyclingPhotos ? JSON.parse(recyclingPhotos) : null) : recyclingPhotos;
      add('recycling_photos', val ? JSON.stringify(val) : null);
    }
    if (isWarranty !== undefined) add('is_warranty', isWarrantyOrder ? 1 : 0);
    if (warrantyType !== undefined) add('warranty_type', warrantyType || null);
    if (purchaseInvoiceNumber !== undefined) add('purchase_invoice_number', purchaseInvoiceNumber ? String(purchaseInvoiceNumber).trim() : null);
    if (purchaseDate !== undefined) add('purchase_date', purchaseDate || null);
    if (originalSupplier !== undefined) add('original_supplier', originalSupplier ? String(originalSupplier).trim() : null);
    const newRequiresFactory = requiresFactoryShipping === true || requiresFactoryShipping === 'true' || requiresFactoryShipping === 1;
    if (requiresFactoryShipping !== undefined) add('requires_factory_shipping', newRequiresFactory ? 1 : 0);
    if (computedWarrantyStatus !== undefined) add('warranty_status', computedWarrantyStatus || null);
    if (setClause.length > 0) {
      setParams.push(id);
      await pool.query(`UPDATE repair_orders SET ${setClause.join(', ')} WHERE id = ?`, setParams);
    }

    const oldDeposit = parseFloat(existing.deposit_paid) || 0;
    const newDeposit = depositPaid !== undefined ? (depositPaid === '' || depositPaid == null ? 0 : parseFloat(depositPaid)) : oldDeposit;
    const paymentMethodOrder = req.body.payment_method !== undefined ? req.body.payment_method : existing.payment_method;
    if (depositPaid !== undefined && newDeposit > oldDeposit) {
      const delta = newDeposit - oldDeposit;
      await registerDepositMovementFromRepairOrder(
        id,
        existing.order_number,
        delta,
        'ingreso',
        paymentMethodOrder || 'Efectivo',
        existing.client_id,
        req.user?.id,
        `Agregado a Seña Orden #${existing.order_number}`
      );
    }
    if (depositPaid !== undefined && newDeposit < oldDeposit) {
      const delta = oldDeposit - newDeposit;
      await registerDepositMovementFromRepairOrder(
        id,
        existing.order_number,
        delta,
        'egreso',
        paymentMethodOrder || 'Efectivo',
        existing.client_id,
        req.user?.id,
        `Devolución parcial/total de Seña Orden #${existing.order_number}`
      );
    }

    // Saldo final en Caja Técnica: solo cuando la orden pasa a "Entregado" por primera vez (no duplicar)
    const incomingStatus = (status !== undefined && status !== '') ? String(status).toLowerCase() : null;
    const isNowDelivered = incomingStatus === 'entregado' || incomingStatus === 'entregado_sin_reparacion';
    const wasDelivered = (String(existing.status || '').toLowerCase() === 'entregado') || (String(existing.status || '').toLowerCase() === 'entregado_sin_reparacion');
    if (isNowDelivered && !wasDelivered) {
      const effectiveTotal = parseFloat(totalCost !== undefined ? totalCost : existing.total_cost) || 0;
      const effectiveDeposit = depositPaid !== undefined ? newDeposit : (parseFloat(existing.deposit_paid) || 0);
      const saldoFinal = effectiveTotal - effectiveDeposit;
      if (saldoFinal > 0) {
        await registerDepositMovementFromRepairOrder(
          id,
          existing.order_number,
          saldoFinal,
          'ingreso',
          paymentMethodOrder || existing.payment_method || 'Efectivo',
          existing.client_id,
          req.user?.id,
          `Cobro de saldo final - Orden #${existing.order_number}`
        );
      }
    }

    if (requiresFactoryShipping !== undefined && newRequiresFactory && !existing.requires_factory_shipping) {
      const [orderData] = await pool.query(
        `SELECT ro.order_number, ro.equipment_type, ro.model, ro.serial_number, ro.original_supplier,
                (SELECT serial_number FROM repair_order_items WHERE repair_order_id = ro.id LIMIT 1) AS item_serial,
                (SELECT brand FROM repair_order_items WHERE repair_order_id = ro.id LIMIT 1) AS item_brand,
                (SELECT model FROM repair_order_items WHERE repair_order_id = ro.id LIMIT 1) AS item_model
         FROM repair_orders ro WHERE ro.id = ?`,
        [id]
      );
      const od = orderData[0] || {};
      await createDraftFromRepairOrder(id, {
        order_number: od.order_number,
        serial_number: od.item_serial || od.serial_number,
        brand: od.item_brand || od.equipment_type,
        model: od.item_model || od.model,
        original_supplier: od.original_supplier
      });
    }

    const userId = req.user?.id || null;
    if (status !== undefined && status !== '' && String(status) !== String(existing.status)) {
      await logStatusHistory(id, 'status', existing.status, status, userId);
    }
    if (computedWarrantyStatus !== undefined && String(computedWarrantyStatus || '') !== String(existing.warranty_status || '')) {
      await logStatusHistory(id, 'warranty_status', existing.warranty_status || null, computedWarrantyStatus || null, userId);
    }

    const items = parseItems(req.body);
    if (items.length > 0) {
      await pool.query('DELETE FROM repair_order_items WHERE repair_order_id = ?', [id]);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await ensureSystemOption('equipment_type', it.equipment_type);
        await ensureSystemOption('brand', it.brand);
        await ensureSystemOption('model', it.model);
        const isWarranty = it.is_warranty === 'true' || it.is_warranty === true ? 1 : 0;
        await pool.query(
          `INSERT INTO repair_order_items (repair_order_id, equipment_type, brand, model, serial_number, reported_fault, included_accessories, is_warranty, warranty_invoice, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, it.equipment_type || null, it.brand || null, it.model || null, it.serial_number || null, it.reported_fault || null, it.included_accessories || null, isWarranty, it.warranty_invoice || null, i]
        );
      }
    }

    // Sincronizar fotos: si el frontend envía photoIds, mantener solo esas y borrar el resto (y el archivo físico)
    let requestedPhotoIds = photoIds ?? req.body.photo_ids;
    if (typeof requestedPhotoIds === 'string') {
      try {
        requestedPhotoIds = JSON.parse(requestedPhotoIds);
      } catch {
        requestedPhotoIds = null;
      }
    }
    if (Array.isArray(requestedPhotoIds)) {
      const keepIds = requestedPhotoIds
        .filter((pid) => Number.isInteger(pid) || (typeof pid === 'string' && /^\d+$/.test(pid)))
        .map((pid) => parseInt(pid, 10));
      const [currentPhotos] = await pool.query(
        'SELECT id, photo_url FROM repair_order_photos WHERE repair_order_id = ?',
        [id]
      );
      const toDelete = currentPhotos.filter((row) => !keepIds.includes(Number(row.id)));
      for (const row of toDelete) {
        const relativePath = (row.photo_url || '').replace(/^\//, '');
        if (relativePath) {
          const filePath = path.join(process.cwd(), relativePath);
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Error al borrar archivo de foto:', filePath, err.message);
          }
        }
        await pool.query('DELETE FROM repair_order_photos WHERE id = ?', [row.id]);
      }
    }

    // Si llegan archivos nuevos en la edición, se agregan (append) a las fotos existentes conservadas.
    const newFiles = req.files || [];
    if (Array.isArray(newFiles) && newFiles.length > 0) {
      let perspectiveLabels = [];
      try {
        perspectiveLabels = req.body.perspectiveLabels
          ? (typeof req.body.perspectiveLabels === 'string'
            ? JSON.parse(req.body.perspectiveLabels)
            : req.body.perspectiveLabels)
          : [];
      } catch (_) {
        perspectiveLabels = [];
      }

      const inserts = newFiles.map((f, i) => [
        id,
        `/uploads/${f.filename}`,
        perspectiveLabels[i] || `foto_${i + 1}`
      ]);
      await pool.query(
        'INSERT INTO repair_order_photos (repair_order_id, photo_url, perspective_label) VALUES ?',
        [inserts]
      );
    }

    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    res.json({ success: true, message: 'Orden actualizada' });
  } catch (error) {
    console.error('Error updateRepairOrder:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar orden' });
  }
};

// PUT - Actualizar solo el estado (usado desde el listado)
const updateRepairOrderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status: newStatus } = req.body;
    if (!newStatus || !String(newStatus).trim()) {
      return res.status(400).json({ success: false, message: 'Se requiere status' });
    }
    const s = String(newStatus).toLowerCase();
    if (!isValidStatus(s)) {
      return res.status(400).json({ success: false, message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` });
    }
    if (s === 'abandonado') {
      return res.status(400).json({
        success: false,
        message: 'Para declarar abandono debe entrar al detalle de la orden (se requieren fotos y notas obligatorias).'
      });
    }
    const [existing] = await pool.query('SELECT id, status, client_id, is_warranty, warranty_status FROM repair_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    const row = existing[0];
    const oldStatus = row.status;
    const clientId = row.client_id;
    await pool.query('UPDATE repair_orders SET status = ?, updated_at = NOW() WHERE id = ?', [s, id]);
    await logStatusHistory(id, 'status', oldStatus, s, req.user?.id);

    // Si es una orden en garantía, sincronizar automáticamente warranty_status.
    if (row.is_warranty) {
      const autoWarrantyStatus = deriveWarrantyStatusFromOrderStatus(s, row.warranty_status);
      if (autoWarrantyStatus && autoWarrantyStatus !== row.warranty_status) {
        await pool.query('UPDATE repair_orders SET warranty_status = ? WHERE id = ?', [autoWarrantyStatus, id]);
        await logStatusHistory(id, 'warranty_status', row.warranty_status || null, autoWarrantyStatus, req.user?.id);
      }
    }
    // Notificar al cliente del cambio de estado (registro en DB + Socket si hay io)
    const statusLabels = { ingresado: 'Ingresado', cotizado: 'Cotizado', aceptado: 'Aceptado', no_aceptado: 'No aceptado', en_espera: 'En espera', sin_reparacion: 'Sin reparación', listo: 'Listo', entregado: 'Entregado', entregado_sin_reparacion: 'Entregado sin reparación', abandonado: 'Abandonado' };
    const statusLabel = statusLabels[s] || s;
    if (clientId) {
      await createNotification(clientId, 'Estado actualizado', `Tu equipo pasó a estado: ${statusLabel}.`, 'info', req.io || null, parseInt(id, 10), 'repair_order');
    }
    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    res.json({ success: true, message: 'Estado actualizado correctamente', data: { status: s } });
  } catch (error) {
    console.error('Error updateRepairOrderStatus:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado' });
  }
};

// DELETE - Eliminar orden (solo admin). Borrado en cascada: fotos físicas, status_history, article_movements, tech_cash, items, photos.
const deleteRepairOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const [existing] = await pool.query('SELECT id, order_number FROM repair_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    const orderNumber = existing[0].order_number;

    // 1. Eliminar archivos físicos de las fotos
    const [photos] = await pool.query('SELECT id, photo_url FROM repair_order_photos WHERE repair_order_id = ?', [id]);
    for (const row of photos) {
      const relativePath = (row.photo_url || '').replace(/^\//, '');
      if (relativePath) {
        const filePath = path.join(process.cwd(), relativePath);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Error al borrar archivo de foto:', filePath, err.message);
        }
      }
    }

    // 2. Tablas vinculadas (evitar FK constraint)
    await pool.query('DELETE FROM repair_order_photos WHERE repair_order_id = ?', [id]);
    await pool.query('DELETE FROM repair_order_status_history WHERE repair_order_id = ?', [id]);
    await pool.query('DELETE FROM article_movements WHERE order_id = ?', [id]);
    await pool.query(
      "DELETE FROM tech_cash_movements WHERE linked_reference = ? OR linked_reference = CONCAT('REP-', ?)",
      [orderNumber, orderNumber]
    );
    await pool.query('DELETE FROM repair_order_items WHERE repair_order_id = ?', [id]);
    await pool.query('DELETE FROM repair_orders WHERE id = ?', [id]);

    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    res.json({ success: true, message: 'Orden eliminada' });
  } catch (error) {
    console.error('Error deleteRepairOrder:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar orden' });
  }
};

// POST - Agregar fotos a una orden existente
const addPhotosToRepairOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const files = req.files || [];

    const [existing] = await pool.query('SELECT id FROM repair_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay archivos para subir' });
    }

    let perspectiveLabels = [];
    try {
      perspectiveLabels = req.body.perspectiveLabels
        ? (typeof req.body.perspectiveLabels === 'string'
          ? JSON.parse(req.body.perspectiveLabels)
          : req.body.perspectiveLabels)
        : [];
    } catch (_) {
      perspectiveLabels = [];
    }

    const inserts = files.map((f, i) => [
      id,
      `/uploads/${f.filename}`,
      perspectiveLabels[i] || `foto_${i + 1}`
    ]);
    await pool.query(
      'INSERT INTO repair_order_photos (repair_order_id, photo_url, perspective_label) VALUES ?',
      [inserts]
    );

    res.status(201).json({ success: true, message: 'Fotos agregadas' });
  } catch (error) {
    console.error('Error addPhotosToRepairOrder:', error);
    res.status(500).json({ success: false, message: 'Error al agregar fotos' });
  }
};

// POST - Solicitar factura/comprobante (simulado)
const requestInvoice = async (req, res) => {
  try {
    const id = req.params.id;
    const { method } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [orders] = await pool.query('SELECT id, client_id FROM repair_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    const order = orders[0];

    if (userRole === 'client' && order.client_id !== userId) {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }

    const sendMethod = method === 'whatsapp' ? 'whatsapp' : 'email';
    const msg =
      sendMethod === 'whatsapp'
        ? 'Se enviará el comprobante por WhatsApp a la brevedad.'
        : 'Se enviará el comprobante por email a la brevedad.';

    res.json({
      success: true,
      message: msg,
      data: { orderId: parseInt(id, 10), method: sendMethod }
    });
  } catch (error) {
    console.error('Error requestInvoice:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
  }
};

// DELETE - Eliminar una foto
const deleteRepairOrderPhoto = async (req, res) => {
  try {
    const { orderId, photoId } = req.params;
    const [existing] = await pool.query(
      'SELECT id FROM repair_order_photos WHERE id = ? AND repair_order_id = ?',
      [photoId, orderId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Foto no encontrada' });
    }

    await pool.query('DELETE FROM repair_order_photos WHERE id = ?', [photoId]);
    res.json({ success: true, message: 'Foto eliminada' });
  } catch (error) {
    console.error('Error deleteRepairOrderPhoto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar foto' });
  }
};

// POST - Procesar a reciclaje (estado abandonado): recycling_notes + fotos
const processRecyclingToAbandoned = async (req, res) => {
  try {
    const id = req.params.id;
    const files = req.files || [];
    const recyclingNotes = req.body.recycling_notes || req.body.recyclingNotes || null;

    const [existing] = await pool.query('SELECT id FROM repair_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    const recyclingPhotoUrls = files.map((f) => `/uploads/${f.filename}`);
    const recyclingPhotosJson = recyclingPhotoUrls.length > 0 ? JSON.stringify(recyclingPhotoUrls) : null;

    await pool.query(
      'UPDATE repair_orders SET status = ?, recycling_notes = ?, recycling_photos = ? WHERE id = ?',
      ['abandonado', recyclingNotes, recyclingPhotosJson, id]
    );

    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    res.json({ success: true, message: 'Orden procesada a reciclaje (abandonado)' });
  } catch (error) {
    console.error('Error processRecyclingToAbandoned:', error);
    res.status(500).json({ success: false, message: 'Error al procesar reciclaje' });
  }
};

// PATCH - Actualizar reciclaje (notas y/o adjuntar más fotos/PDFs) en orden ya abandonada
const updateRecycling = async (req, res) => {
  try {
    const id = req.params.id;
    const files = req.files || [];
    const recyclingNotes = req.body.recycling_notes !== undefined ? (req.body.recycling_notes || null) : undefined;

    const [rows] = await pool.query('SELECT id, recycling_notes, recycling_photos FROM repair_orders WHERE id = ? AND status = ?', [id, 'abandonado']);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada o no está en reciclaje' });
    }

    let recyclingPhotosJson = rows[0].recycling_photos;
    let currentUrls = [];
    if (recyclingPhotosJson) {
      try {
        currentUrls = typeof recyclingPhotosJson === 'string' ? JSON.parse(recyclingPhotosJson) : recyclingPhotosJson;
        if (!Array.isArray(currentUrls)) currentUrls = [];
      } catch {
        currentUrls = [];
      }
    }
    const newUrls = files.map((f) => `/uploads/${f.filename}`);
    const allUrls = [...currentUrls, ...newUrls];
    const finalPhotosJson = allUrls.length > 0 ? JSON.stringify(allUrls) : (currentUrls.length > 0 ? recyclingPhotosJson : null);

    const updates = [];
    const params = [];
    if (recyclingNotes !== undefined) {
      updates.push('recycling_notes = ?');
      params.push(recyclingNotes);
    }
    if (newUrls.length > 0 || finalPhotosJson !== recyclingPhotosJson) {
      updates.push('recycling_photos = ?');
      params.push(finalPhotosJson);
    }
    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE repair_orders SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    res.json({ success: true, message: 'Reciclaje actualizado', data: { recycling_photos: allUrls } });
  } catch (error) {
    console.error('Error updateRecycling:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar reciclaje' });
  }
};

// POST - Crear orden externa (sistema legado) directamente en Área de Reciclaje
const createExternalRecycledOrder = async (req, res) => {
  try {
    const externalOrderNumber = (req.body.external_order_number || '').trim() || null;
    const brand = (req.body.brand || '').trim() || null;
    const model = (req.body.model || '').trim() || null;
    const serialNumber = (req.body.serial_number || '').trim() || null;
    const equipmentStatus = (req.body.equipment_status || '').trim() || null;
    const files = req.files || [];
    const recyclingPhotoUrls = files.map((f) => `/uploads/${f.filename}`);
    const recyclingPhotosJson = recyclingPhotoUrls.length > 0 ? JSON.stringify(recyclingPhotoUrls) : null;

    const orderNumber = await generateOrderNumber();

    // client_id NULL = orden sin cliente (externa/histórica). Columnas alineadas: order_number, entry_date=NOW(), status, …
    const [result] = await pool.query(
      `INSERT INTO repair_orders (
        client_id, order_number, entry_date, status,
        is_external_recycled, external_order_number, external_equipment_status,
        recycling_photos
      ) VALUES (?, ?, NOW(), ?, 1, ?, ?, ?)`,
      [
        null,
        orderNumber,
        'abandonado',
        externalOrderNumber,
        equipmentStatus,
        recyclingPhotosJson
      ]
    );
    const repairOrderId = result.insertId;

    await pool.query(
      `INSERT INTO repair_order_items (repair_order_id, equipment_type, brand, model, serial_number, reported_fault, included_accessories, is_warranty, warranty_invoice, sort_order)
       VALUES (?, NULL, ?, ?, ?, NULL, NULL, 0, NULL, 0)`,
      [repairOrderId, brand, model, serialNumber]
    );

    if (req.user?.id) {
      const { createActivityLog } = require('../utils/activityLogger');
      createActivityLog(req.user.id, 'repair_order', 'created', `Orden externa cargada: ${externalOrderNumber || orderNumber}`, repairOrderId, null, { is_external_recycled: true });
    }
    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('repair_orders_update', {});
    }
    res.status(201).json({
      success: true,
      message: 'Orden externa cargada en reciclaje',
      data: { id: repairOrderId, orderNumber, external_order_number: externalOrderNumber }
    });
  } catch (error) {
    if (error.message?.includes('is_external_recycled') || error.message?.includes('external_order_number') || error.message?.includes('external_equipment_status')) {
      return res.status(500).json({ success: false, message: 'Faltan columnas en la BD. Ejecutá la migración: node backend/scripts/add-external-recycled-fields.js' });
    }
    console.error('Error createExternalRecycledOrder:', error);
    res.status(500).json({ success: false, message: 'Error al cargar orden externa' });
  }
};

module.exports = {
  getRepairOrders,
  getMonitorOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  createExternalRecycledOrder,
  updateRepairOrder,
  updateRepairOrderStatus,
  deleteRepairOrder,
  addPhotosToRepairOrder,
  deleteRepairOrderPhoto,
  requestInvoice,
  processRecyclingToAbandoned,
  updateRecycling
};
