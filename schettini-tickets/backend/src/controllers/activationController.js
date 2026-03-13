const pool = require('../config/db');
const { sendEquipmentReadyEmail } = require('../services/emailService');
const { createNotification } = require('../utils/notificationManager');

const VALID_FORM_TYPES = ['general', 'controlador_fiscal', 'alta_general', 'fiscal', 'no_fiscal', 'none'];
const VALID_STATUSES = ['pending_validation', 'pending_client_fill', 'processing', 'ready'];

// POST /api/activations/request — Cliente envía { invoice_number }
const requestActivation = async (req, res) => {
  try {
    const { invoice_number } = req.body;
    const clientId = req.user.id;
    const role = req.user.role;

    if (!invoice_number || String(invoice_number).trim() === '') {
      return res.status(400).json({ success: false, message: 'invoice_number es obligatorio.' });
    }

    if (role !== 'client') {
      return res.status(403).json({ success: false, message: 'Solo clientes pueden solicitar una activación.' });
    }

    const [result] = await pool.query(
      `INSERT INTO activations (client_id, invoice_number, form_type, status, created_at)
       VALUES (?, ?, 'none', 'pending_validation', NOW())`,
      [clientId, String(invoice_number).trim()]
    );
    const activationId = result.insertId;

    const [clientRow] = await pool.query('SELECT username, full_name FROM Users WHERE id = ?', [clientId]);
    const clientName = (clientRow[0] && (clientRow[0].full_name || clientRow[0].username)) || 'Un cliente';
    const [staffRows] = await pool.query(
      "SELECT id FROM Users WHERE role IN ('admin', 'supervisor', 'agent') AND (is_active = 1 OR is_active IS NULL)"
    );
    for (const row of staffRows) {
      await createNotification(
        row.id,
        'Nueva Planilla Solicitada',
        `${clientName} ha solicitado una planilla para validación (factura ${String(invoice_number).trim()}).`,
        'info',
        req.io || null,
        activationId,
        'activation'
      );
    }

    res.status(201).json({
      success: true,
      message: 'Solicitud de activación creada. Será validada por el equipo.',
      data: { id: activationId, invoice_number: String(invoice_number).trim(), status: 'pending_validation' }
    });
  } catch (error) {
    console.error('Error requestActivation:', error);
    res.status(500).json({ success: false, message: 'Error al crear solicitud de activación.' });
  }
};

// PUT /api/activations/:id/validate — Admin/Supervisor aprueba o rechaza (body: { action: 'approve' | 'reject' })
const validateActivation = async (req, res) => {
  try {
    const id = req.params.id;
    const action = req.body.action === 'reject' ? 'reject' : 'approve';

    const [rows] = await pool.query(
      'SELECT id, client_id, status FROM activations WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activación no encontrada.' });
    }
    if (rows[0].status !== 'pending_validation') {
      return res.status(400).json({ success: false, message: 'Solo se puede validar una activación en estado pending_validation.' });
    }
    const clientId = rows[0].client_id;

    if (action === 'reject') {
      await pool.query(
        `UPDATE activations SET status = 'rejected', updated_at = NOW() WHERE id = ?`,
        [id]
      );
      if (clientId) {
        await createNotification(
          clientId,
          'Solicitud de Planilla Rechazada',
          'Tu solicitud de planilla ha sido rechazada. Contactá al equipo para más información.',
          'warning',
          req.io || null,
          parseInt(id, 10),
          'activation'
        );
      }
      return res.json({
        success: true,
        message: 'Solicitud rechazada.',
        data: { id: parseInt(id, 10), status: 'rejected' }
      });
    }

    // Aprobar: habilitar al cliente para completar la planilla (sin cambiar form_type)
    await pool.query(
      `UPDATE activations SET status = 'pending_client_fill', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    if (clientId) {
      await createNotification(
        clientId,
        'Actualización de Planilla',
        'Tu solicitud fue aprobada. Podés completar la planilla con tus datos.',
        'info',
        req.io || null,
        parseInt(id, 10),
        'activation'
      );
    }

    res.json({
      success: true,
      message: 'Activación aprobada. El cliente puede completar el formulario.',
      data: { id: parseInt(id, 10), status: 'pending_client_fill' }
    });
  } catch (error) {
    console.error('Error validateActivation:', error);
    res.status(500).json({ success: false, message: 'Error al validar activación.' });
  }
};

// POST /api/activations/:id/submit-form — Cliente envía formulario + archivos (multer)
// Crea ticket automáticamente, vincula ticket_id y pasa status a 'processing'
const submitForm = async (req, res) => {
  try {
    const id = req.params.id;
    const clientId = req.user.id;
    const files = req.files || [];

    const [rows] = await pool.query(
      'SELECT id, client_id, invoice_number, status FROM activations WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activación no encontrada.' });
    }
    const activation = rows[0];
    if (Number(activation.client_id) !== Number(clientId)) {
      return res.status(403).json({ success: false, message: 'No puede enviar el formulario de esta activación.' });
    }
    if (activation.status !== 'pending_client_fill') {
      return res.status(400).json({ success: false, message: 'Solo puede enviar el formulario cuando el estado es pending_client_fill.' });
    }

    const body = { ...req.body };
    const uploads = files.map(f => ({
      field: f.fieldname || 'file',
      path: `/uploads/${f.filename}`,
      originalName: f.originalname
    }));
    const formData = { ...body, _uploads: uploads };

    if (body.billing_type === 'fiscal' || body.billing_type === 'no_fiscal') {
      await pool.query('UPDATE Users SET billing_type = ?, updated_at = NOW() WHERE id = ?', [body.billing_type, clientId]);
    }

    const cloudNubeFiles = files.filter(f => (f.fieldname || '') === 'cloud_nube_contrato');
    for (const cloudNubeFile of cloudNubeFiles) {
      if (cloudNubeFile && cloudNubeFile.filename) {
        try {
          await pool.query(
            'INSERT INTO user_documents (user_id, document_name, document_type, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
            [clientId, 'Contrato Cloud Nube firmado', 'cloud_nube_contrato', `/uploads/${cloudNubeFile.filename}`, clientId]
          );
        } catch (docErr) {
          if (!docErr.message || !docErr.message.includes("doesn't exist")) {
            console.error('Error guardando contrato Cloud Nube en user_documents:', docErr);
          }
        }
      }
    }

    const invoiceNumber = activation.invoice_number || '';
    const ticketTitle = `Alta de Sistema - Factura ${invoiceNumber}`.trim();
    const ticketDescription = `Activación/Planilla asociada. Factura/Pedido: ${invoiceNumber}. Formulario enviado por el cliente.`;

    // assigned_to_user_id debe ser NULL: el cliente no puede ser agente asignado
    const [ticketResult] = await pool.query(
      `INSERT INTO Tickets (user_id, assigned_to_user_id, title, description, priority, status, created_at)
       VALUES (?, NULL, ?, ?, 'medium', ?, NOW())`,
      [clientId, ticketTitle, ticketDescription, 'Alta pendiente']
    );
    const ticketId = ticketResult.insertId;

    await pool.query(
      `UPDATE activations SET form_data = ?, ticket_id = ?, status = 'processing', updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(formData), ticketId, id]
    );

    const [clientRow] = await pool.query('SELECT username, full_name FROM Users WHERE id = ?', [clientId]);
    const clientName = (clientRow[0] && (clientRow[0].full_name || clientRow[0].username)) || 'Un cliente';
    const [staffRows] = await pool.query(
      "SELECT id FROM Users WHERE role IN ('admin', 'supervisor', 'agent') AND (is_active = 1 OR is_active IS NULL)"
    );
    for (const row of staffRows) {
      await createNotification(
        row.id,
        'Nueva Planilla Recibida',
        `${clientName} ha enviado una planilla para validación.`,
        'info',
        req.io || null,
        parseInt(id, 10),
        'activation'
      );
    }
    if (req.io) {
      req.io.to('admin').to('agent').to('supervisor').emit('dashboard_update', { message: 'Nueva activación con formulario enviado' });
    }

    res.json({
      success: true,
      message: 'Formulario enviado. Se creó el ticket de alta y la activación está en proceso.',
      data: { activationId: parseInt(id, 10), ticketId, status: 'processing' }
    });
  } catch (error) {
    console.error('Error submitForm:', error);
    res.status(500).json({ success: false, message: 'Error al enviar formulario.' });
  }
};

// GET /api/activations — Listado para staff (admin, supervisor, agent)
const getActivations = async (req, res) => {
  try {
    const { status, client_id: clientIdParam } = req.query;
    const role = req.user.role;

    let query = `
      SELECT a.*, u.username AS client_name, u.business_name AS client_business_name, u.email AS client_email
      FROM activations a
      LEFT JOIN Users u ON a.client_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && VALID_STATUSES.includes(String(status))) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (clientIdParam) {
      query += ' AND a.client_id = ?';
      params.push(clientIdParam);
    }

    query += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getActivations:', error);
    res.status(500).json({ success: false, message: 'Error al listar activaciones.' });
  }
};

// GET /api/activations/client — Listado para el cliente logueado
const getClientActivations = async (req, res) => {
  try {
    const clientId = req.user.id;
    if (req.user.role !== 'client') {
      return res.status(403).json({ success: false, message: 'Solo clientes pueden usar este endpoint.' });
    }

    const [rows] = await pool.query(
      `SELECT id, invoice_number, form_type, status, ticket_id, created_at, updated_at
       FROM activations WHERE client_id = ? ORDER BY created_at DESC`,
      [clientId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getClientActivations:', error);
    res.status(500).json({ success: false, message: 'Error al listar sus activaciones.' });
  }
};

// GET /api/activations/:id — Detalle de una activación (para cliente propio o staff)
const getActivationById = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const [rows] = await pool.query(
      `SELECT a.*, u.username AS client_name, u.business_name AS client_business_name, u.email AS client_email
       FROM activations a LEFT JOIN Users u ON a.client_id = u.id WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activación no encontrada.' });
    }
    const act = rows[0];
    if (role === 'client' && Number(act.client_id) !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'No puede ver esta activación.' });
    }

    res.json({ success: true, data: act });
  } catch (error) {
    console.error('Error getActivationById:', error);
    res.status(500).json({ success: false, message: 'Error al obtener activación.' });
  }
};

// PUT /api/activations/:id — Actualizar estado (ej: marcar como 'ready') y opcionalmente notificar al cliente
const updateActivationStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, notify_client } = req.body;

    if (!status || !VALID_STATUSES.includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: `status inválido. Valores: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [rows] = await pool.query(
      'SELECT a.id, a.client_id, a.invoice_number, a.status, u.email, u.username, u.full_name FROM activations a LEFT JOIN Users u ON a.client_id = u.id WHERE a.id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activación no encontrada.' });
    }
    const act = rows[0];

    await pool.query(
      'UPDATE activations SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    const statusLabels = {
      pending_validation: 'Pendiente de validación',
      pending_client_fill: 'Pendiente de completar por vos',
      processing: 'En proceso',
      ready: 'Lista / Finalizada'
    };
    const statusLabel = statusLabels[status] || status;
    if (act.client_id) {
      await createNotification(
        act.client_id,
        'Actualización de Planilla',
        `El estado de tu planilla ha cambiado a: ${statusLabel}.`,
        'info',
        req.io || null,
        parseInt(id, 10),
        'activation'
      );
    }

    if (status === 'ready' && notify_client && act.email) {
      sendEquipmentReadyEmail(act.email, act.full_name || act.username || '', act.invoice_number || '').catch(err => console.error(err));
    }

    res.json({
      success: true,
      message: status === 'ready' && notify_client ? 'Estado actualizado y cliente notificado por email.' : 'Estado actualizado.',
      data: { id: parseInt(id, 10), status }
    });
  } catch (error) {
    console.error('Error updateActivationStatus:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado.' });
  }
};

module.exports = {
  requestActivation,
  validateActivation,
  submitForm,
  getActivations,
  getClientActivations,
  getActivationById,
  updateActivationStatus
};
