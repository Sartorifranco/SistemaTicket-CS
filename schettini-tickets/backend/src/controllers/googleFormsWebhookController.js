const pool = require('../config/db');
const { notifyStaffNewPlanillaActivation } = require('./activationController');

/** POST /api/webhooks/google-forms */
const handleGoogleFormsWebhook = async (req, res) => {
  try {
    const { formTitle, clientEmail, invoiceNumber, equipment, rawAnswers } = req.body || {};

    const email = clientEmail != null ? String(clientEmail).trim().toLowerCase() : '';
    const invoice = invoiceNumber != null ? String(invoiceNumber).trim() : '';
    const equip = (equipment != null && String(equipment).trim()) || (formTitle != null ? String(formTitle).trim() : '');

    if (!email) {
      return res.status(400).json({ success: false, message: 'clientEmail es obligatorio' });
    }
    if (!invoice) {
      return res.status(400).json({ success: false, message: 'invoiceNumber es obligatorio' });
    }
    if (!equip) {
      return res.status(400).json({ success: false, message: 'formTitle o equipment es obligatorio' });
    }

    let clientId = null;
    const [users] = await pool.query(
      'SELECT id, username, full_name, email FROM Users WHERE LOWER(email) = ? AND role = ? LIMIT 1',
      [email, 'client']
    );
    if (users.length > 0) {
      clientId = users[0].id;
    }

    const rawPayload = {
      source: 'google_forms_webhook',
      formTitle: formTitle || equip,
      clientEmail: email,
      invoiceNumber: invoice,
      equipment: equip,
      rawAnswers: rawAnswers != null ? rawAnswers : {}
    };

    const [result] = await pool.query(
      `INSERT INTO activations (
        client_id, guest_email, invoice_number, equipment, form_type, status,
        raw_data, created_at
      ) VALUES (?, ?, ?, ?, 'general', 'processing', ?, NOW())`,
      [
        clientId,
        clientId ? null : email,
        invoice,
        equip,
        JSON.stringify(rawPayload)
      ]
    );

    const activationId = result.insertId;
    const displayName =
      users.length > 0
        ? users[0].full_name || users[0].username || email
        : email;

    await notifyStaffNewPlanillaActivation(displayName, activationId, req.io);

    res.status(200).json({ success: true, message: 'OK', data: { id: activationId } });
  } catch (error) {
    console.error('Error handleGoogleFormsWebhook:', error);
    res.status(500).json({ success: false, message: 'Error al procesar webhook' });
  }
};

module.exports = { handleGoogleFormsWebhook };
