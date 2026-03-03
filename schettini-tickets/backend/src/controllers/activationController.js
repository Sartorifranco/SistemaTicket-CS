const pool = require('../config/db');
const { sendEquipmentReadyEmail } = require('../services/emailService');

const VALID_FORM_TYPES = ['fiscal', 'no_fiscal', 'controlador_fiscal', 'none'];
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

    res.status(201).json({
      success: true,
      message: 'Solicitud de activación creada. Será validada por el equipo.',
      data: { id: result.insertId, invoice_number: String(invoice_number).trim(), status: 'pending_validation' }
    });
  } catch (error) {
    console.error('Error requestActivation:', error);
    res.status(500).json({ success: false, message: 'Error al crear solicitud de activación.' });
  }
};

// PUT /api/activations/:id/validate — Admin/Supervisor valida con { form_type }
const validateActivation = async (req, res) => {
  try {
    const id = req.params.id;
    const { form_type } = req.body;

    if (!form_type || !VALID_FORM_TYPES.includes(String(form_type))) {
      return res.status(400).json({
        success: false,
        message: `form_type inválido. Valores: ${VALID_FORM_TYPES.join(', ')}`
      });
    }

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

    await pool.query(
      `UPDATE activations SET form_type = ?, status = 'pending_client_fill', updated_at = NOW() WHERE id = ?`,
      [form_type, id]
    );

    res.json({
      success: true,
      message: 'Activación validada. El cliente puede completar el formulario.',
      data: { id: parseInt(id, 10), form_type, status: 'pending_client_fill' }
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

    const invoiceNumber = activation.invoice_number || '';
    const ticketTitle = `Alta de Sistema - Factura ${invoiceNumber}`.trim();
    const ticketDescription = `Activación/Planilla asociada. Factura/Pedido: ${invoiceNumber}. Formulario enviado por el cliente.`;

    const [ticketResult] = await pool.query(
      `INSERT INTO Tickets (user_id, assigned_to_user_id, title, description, priority, status, created_at)
       VALUES (?, ?, ?, ?, 'medium', ?, NOW())`,
      [clientId, clientId, ticketTitle, ticketDescription, 'Alta pendiente']
    );
    const ticketId = ticketResult.insertId;

    await pool.query(
      `UPDATE activations SET form_data = ?, ticket_id = ?, status = 'processing', updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(formData), ticketId, id]
    );

    if (req.io) {
      req.io.to('admin').emit('dashboard_update', { message: 'Nueva activación con formulario enviado' });
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
