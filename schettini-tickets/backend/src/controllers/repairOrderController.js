const pool = require('../config/db');

const VALID_STATUSES = [
  'ingresado',
  'cotizado',
  'aceptado',
  'no_aceptado',
  'en_espera',
  'sin_reparacion',
  'listo',
  'entregado',
  'entregado_sin_reparacion'
];

const isValidStatus = (s) => s && VALID_STATUSES.includes(String(s).toLowerCase());

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

// GET - Listar todas las órdenes
const getRepairOrders = async (req, res) => {
  try {
    const { status, clientId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT ro.*,
        u.username AS client_name,
        u.business_name AS client_business_name,
        t.username AS technician_name
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

    query += ' ORDER BY ro.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
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
      `SELECT ro.id, ro.order_number, ro.entry_date, ro.status, ro.equipment_type, ro.model,
        ro.serial_number, ro.reported_fault, ro.included_accessories, ro.is_warranty,
        ro.labor_cost, ro.spare_parts_cost, ro.total_cost, ro.deposit_paid,
        ro.technical_report, ro.created_at,
        ro.accepted_date, ro.promised_date, ro.delivered_date, ro.warranty_expiration_date,
        ro.public_notes, ro.spare_parts_detail
       FROM repair_orders ro
       WHERE ro.client_id = ?
       ORDER BY ro.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
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

    const data = { ...order, photos };
    if (userRole === 'client') {
      delete data.internal_notes;
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

// POST - Crear orden (con fotos opcionales)
const createRepairOrder = async (req, res) => {
  try {
    const files = req.files || [];
    const {
      clientId,
      entryDate,
      status,
      equipmentType,
      model,
      serialNumber,
      reportedFault,
      includedAccessories,
      isWarranty,
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
      sparePartsDetail
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

    const orderNumber = await generateOrderNumber();
    const isWarrantyVal = isWarranty === 'true' || isWarranty === true ? 1 : 0;

    const [result] = await pool.query(
      `INSERT INTO repair_orders (
        client_id, order_number, entry_date, status,
        equipment_type, model, serial_number, reported_fault,
        included_accessories, is_warranty,
        labor_cost, spare_parts_cost, total_cost, deposit_paid,
        internal_notes, technical_report, technician_id,
        accepted_date, promised_date, delivered_date, warranty_expiration_date,
        public_notes, spare_parts_detail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        orderNumber,
        entryDate || null,
        status || 'ingresado',
        equipmentType || null,
        model || null,
        serialNumber || null,
        reportedFault || null,
        includedAccessories || null,
        isWarrantyVal,
        laborCost ? parseFloat(laborCost) : null,
        sparePartsCost ? parseFloat(sparePartsCost) : null,
        totalCost ? parseFloat(totalCost) : null,
        depositPaid ? parseFloat(depositPaid) : null,
        internalNotes || null,
        technicalReport || null,
        technicianId || null,
        acceptedDate || null,
        promisedDate || null,
        deliveredDate || null,
        warrantyExpirationDate || null,
        publicNotes || null,
        sparePartsDetail || null
      ]
    );

    const repairOrderId = result.insertId;

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
      equipmentType,
      model,
      serialNumber,
      reportedFault,
      includedAccessories,
      isWarranty,
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
      sparePartsDetail
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM repair_orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    if (status !== undefined && status !== null && status !== '' && !isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`
      });
    }

    const isWarrantyVal = isWarranty === 'true' || isWarranty === true ? 1 : 0;

    await pool.query(
      `UPDATE repair_orders SET
        client_id = COALESCE(?, client_id),
        entry_date = COALESCE(?, entry_date),
        status = COALESCE(?, status),
        equipment_type = COALESCE(?, equipment_type),
        model = COALESCE(?, model),
        serial_number = COALESCE(?, serial_number),
        reported_fault = COALESCE(?, reported_fault),
        included_accessories = COALESCE(?, included_accessories),
        is_warranty = ?,
        labor_cost = ?,
        spare_parts_cost = ?,
        total_cost = ?,
        deposit_paid = ?,
        internal_notes = COALESCE(?, internal_notes),
        technical_report = COALESCE(?, technical_report),
        technician_id = COALESCE(?, technician_id),
        accepted_date = COALESCE(?, accepted_date),
        promised_date = COALESCE(?, promised_date),
        delivered_date = COALESCE(?, delivered_date),
        warranty_expiration_date = COALESCE(?, warranty_expiration_date),
        public_notes = COALESCE(?, public_notes),
        spare_parts_detail = COALESCE(?, spare_parts_detail)
      WHERE id = ?`,
      [
        clientId || null,
        entryDate || null,
        status || null,
        equipmentType || null,
        model || null,
        serialNumber || null,
        reportedFault || null,
        includedAccessories || null,
        isWarrantyVal,
        laborCost !== undefined && laborCost !== '' ? parseFloat(laborCost) : null,
        sparePartsCost !== undefined && sparePartsCost !== '' ? parseFloat(sparePartsCost) : null,
        totalCost !== undefined && totalCost !== '' ? parseFloat(totalCost) : null,
        depositPaid !== undefined && depositPaid !== '' ? parseFloat(depositPaid) : null,
        internalNotes || null,
        technicalReport || null,
        technicianId !== undefined ? (technicianId || null) : null,
        acceptedDate || null,
        promisedDate || null,
        deliveredDate || null,
        warrantyExpirationDate || null,
        publicNotes || null,
        sparePartsDetail || null,
        id
      ]
    );

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
    await pool.query('DELETE FROM repair_orders WHERE id = ?', [id]);

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

module.exports = {
  getRepairOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrder,
  deleteRepairOrder,
  addPhotosToRepairOrder,
  deleteRepairOrderPhoto,
  requestInvoice
};
