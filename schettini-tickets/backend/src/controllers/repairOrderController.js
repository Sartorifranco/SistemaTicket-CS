const pool = require('../config/db');
const { createDraftFromRepairOrder } = require('./factoryShipmentController');
const { registerPaymentFromRepairOrder } = require('./techCashController');

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

/** Registra cambio de status o warranty_status en historial */
const logStatusHistory = async (repairOrderId, fieldChanged, oldValue, newValue, userId) => {
  if (oldValue === newValue) return;
  await pool.query(
    `INSERT INTO repair_order_status_history (repair_order_id, field_changed, old_value, new_value, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [repairOrderId, fieldChanged, oldValue || null, newValue || null, userId || null]
  );
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
      return {
        ...r,
        equipment_type: first.equipment_type,
        brand: first.brand,
        model: first.model
      };
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
      return { ...r, items, equipment_type: first.equipment_type, model: first.model, serial_number: first.serial_number };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getRepairOrders:', error);
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
      return { ...r, items, equipment_type: first.equipment_type, model: first.model, serial_number: first.serial_number, reported_fault: first.reported_fault };
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
    const data = { ...order, photos, items, equipment_type: first.equipment_type, model: first.model, serial_number: first.serial_number, reported_fault: first.reported_fault };
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

    if (isWarrantyOrder && warrantyStatus) {
      await logStatusHistory(repairOrderId, 'warranty_status', null, warrantyStatus, req.user?.id);
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
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

    if (files.length > 0) {
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
    if (clientId !== undefined) add('client_id', clientId);
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
    if (sparePartsDetail !== undefined) add('spare_parts_detail', sparePartsDetail);
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
    if (warrantyStatus !== undefined) add('warranty_status', warrantyStatus || null);
    if (setClause.length > 0) {
      setParams.push(id);
      await pool.query(`UPDATE repair_orders SET ${setClause.join(', ')} WHERE id = ?`, setParams);
    }

    const oldDeposit = parseFloat(existing.deposit_paid) || 0;
    const newDeposit = depositPaid !== undefined ? (depositPaid === '' || depositPaid == null ? 0 : parseFloat(depositPaid)) : oldDeposit;
    if (depositPaid !== undefined && newDeposit > oldDeposit) {
      const delta = newDeposit - oldDeposit;
      await registerPaymentFromRepairOrder(
        id,
        existing.order_number,
        delta,
        req.body.paymentMethod || existing.payment_method,
        existing.client_id,
        req.user?.id
      );
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
    if (warrantyStatus !== undefined && String(warrantyStatus || '') !== String(existing.warranty_status || '')) {
      await logStatusHistory(id, 'warranty_status', existing.warranty_status || null, warrantyStatus || null, userId);
    }

    const items = parseItems(req.body);
    if (items.length > 0) {
      await pool.query('DELETE FROM repair_order_items WHERE repair_order_id = ?', [id]);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const isWarranty = it.is_warranty === 'true' || it.is_warranty === true ? 1 : 0;
        await pool.query(
          `INSERT INTO repair_order_items (repair_order_id, equipment_type, brand, model, serial_number, reported_fault, included_accessories, is_warranty, warranty_invoice, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, it.equipment_type || null, it.brand || null, it.model || null, it.serial_number || null, it.reported_fault || null, it.included_accessories || null, isWarranty, it.warranty_invoice || null, i]
        );
      }
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

// DELETE - Eliminar orden
const deleteRepairOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const [existing] = await pool.query('SELECT id FROM repair_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    await pool.query('DELETE FROM repair_order_photos WHERE repair_order_id = ?', [id]);
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

module.exports = {
  getRepairOrders,
  getMonitorOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrder,
  deleteRepairOrder,
  addPhotosToRepairOrder,
  deleteRepairOrderPhoto,
  requestInvoice,
  processRecyclingToAbandoned,
  updateRecycling
};
