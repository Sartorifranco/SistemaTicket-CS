const pool = require('../config/db');

const ID = 1;

// Normaliza el campo de emails aceptando array o CSV, devolviendo siempre CSV trimeado.
const normalizeEmailList = (value) => {
  if (value == null) return null;
  const arr = Array.isArray(value)
    ? value
    : String(value).split(/[,\n;]+/);
  const cleaned = arr
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => e && /\S+@\S+\.\S+/.test(e));
  return cleaned.length > 0 ? cleaned.join(',') : null;
};

const getCompanySettings = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM company_settings WHERE id = ? LIMIT 1',
      [ID]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Configuración de empresa no encontrada.' });
    }
    const row = rows[0];
    const data = { ...row };
    if (row.default_abandonment_days != null) data.recycling_days_abandonment = row.default_abandonment_days;
    if (row.legal_terms != null) data.legal_terms_ticket = row.legal_terms;

    // Normalizar ticket_notification_emails para el frontend: array de strings
    if (typeof row.ticket_notification_emails === 'string') {
      data.ticket_notification_emails = row.ticket_notification_emails
        .split(/[,\n;]+/)
        .map((e) => e.trim())
        .filter(Boolean);
    } else if (!row.ticket_notification_emails) {
      data.ticket_notification_emails = [];
    }

    // Default de horas si nunca se seteo
    if (row.ticket_response_time_hours == null) data.ticket_response_time_hours = 48;

    res.json({ success: true, data });
  } catch (error) {
    console.error('getCompanySettings:', error);
    res.status(500).json({ message: 'Error al obtener configuración.' });
  }
};

const updateCompanySettings = async (req, res) => {
  try {
    const body = req.body;
    const file = req.file;

    const companyName = (body.company_name ?? '').trim() || '';
    const address = (body.address ?? '').trim() || '';
    const phone = (body.phone ?? '').trim() || '';
    const email = (body.email ?? '').trim() || '';
    const website = (body.website ?? '').trim() || '';
    const taxPercentage = body.tax_percentage != null && body.tax_percentage !== ''
      ? parseFloat(body.tax_percentage)
      : 0;
    const quoteFooterText = (body.quote_footer_text ?? '').trim() || null;
    const primaryColor = (body.primary_color ?? '#000000').trim() || '#000000';
    const usdExchangeRate = body.usd_exchange_rate != null && body.usd_exchange_rate !== ''
      ? parseFloat(body.usd_exchange_rate)
      : null;
    const listPriceSurchargePercent = body.list_price_surcharge_percent != null && body.list_price_surcharge_percent !== ''
      ? parseFloat(body.list_price_surcharge_percent)
      : null;
    const defaultIvaPercent = body.default_iva_percent != null && body.default_iva_percent !== ''
      ? parseFloat(body.default_iva_percent)
      : null;
    const profitMarginPercent = body.profit_margin_percent != null && body.profit_margin_percent !== ''
      ? parseFloat(body.profit_margin_percent)
      : null;
    const legalFooterText = (body.legal_footer_text ?? '').trim() || null;
    const recyclingDaysAbandonment = body.recycling_days_abandonment != null && body.recycling_days_abandonment !== ''
      ? parseInt(body.recycling_days_abandonment, 10)
      : null;
    const defaultWarrantyMonths = body.default_warranty_months != null && body.default_warranty_months !== ''
      ? parseInt(body.default_warranty_months, 10)
      : null;
    const legalTermsTicket = (body.legal_terms_ticket ?? '').trim() || null;
    const agentsCanViewMovements = body.agents_can_view_movements === true || body.agents_can_view_movements === 'true' || body.agents_can_view_movements === 1 || body.agents_can_view_movements === '1';

    // Nuevos campos (abril 2026)
    const ticketNotificationEmails = normalizeEmailList(body.ticket_notification_emails);
    const ticketResponseTimeHours = body.ticket_response_time_hours != null && body.ticket_response_time_hours !== ''
      ? Math.max(1, parseInt(body.ticket_response_time_hours, 10) || 48)
      : null;

    let logoUrl = null;
    if (file && file.filename) {
      logoUrl = `/uploads/${file.filename}`;
    }

    const updates = [
      'company_name = ?', 'address = ?', 'phone = ?', 'email = ?', 'website = ?',
      'tax_percentage = ?', 'quote_footer_text = ?', 'primary_color = ?',
      'usd_exchange_rate = ?', 'list_price_surcharge_percent = ?', 'default_iva_percent = ?', 'profit_margin_percent = ?', 'legal_footer_text = ?',
      'default_abandonment_days = ?', 'default_warranty_months = ?', 'legal_terms = ?',
      'agents_can_view_movements = ?'
    ];
    const values = [companyName, address, phone, email, website, taxPercentage, quoteFooterText, primaryColor, usdExchangeRate, listPriceSurchargePercent, defaultIvaPercent, profitMarginPercent, legalFooterText, recyclingDaysAbandonment, defaultWarrantyMonths, legalTermsTicket, agentsCanViewMovements ? 1 : 0];

    if (logoUrl !== null) {
      updates.splice(5, 0, 'logo_url = ?');
      values.splice(5, 0, logoUrl);
    }

    // Nuevos campos se agregan con fallback: si la columna no existe (BD vieja), los ignoramos.
    const optionalFieldsOrder = [];
    if (body.ticket_notification_emails !== undefined) {
      updates.push('ticket_notification_emails = ?');
      values.push(ticketNotificationEmails);
      optionalFieldsOrder.push('ticket_notification_emails');
    }
    if (ticketResponseTimeHours !== null) {
      updates.push('ticket_response_time_hours = ?');
      values.push(ticketResponseTimeHours);
      optionalFieldsOrder.push('ticket_response_time_hours');
    }

    values.push(ID);
    try {
      await pool.query(
        `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (colErr) {
      // Fallback: si alguna columna opcional no existe, se retira y se reintenta.
      const msg = colErr.message || '';
      const removable = ['agents_can_view_movements', 'ticket_notification_emails', 'ticket_response_time_hours'];
      let retried = false;
      for (const col of removable) {
        if (msg.includes(col)) {
          const idx = updates.findIndex((u) => u.startsWith(`${col} =`));
          if (idx >= 0) {
            updates.splice(idx, 1);
            // values sigue el mismo orden que updates más el ID al final
            // buscamos la posición en values considerando que id está al final
            values.splice(idx, 1);
            retried = true;
          }
        }
      }
      if (retried) {
        await pool.query(
          `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      } else {
        throw colErr;
      }
    }

    const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = ? LIMIT 1', [ID]);
    res.json({ success: true, message: 'Configuración actualizada.', data: rows[0] });
  } catch (error) {
    console.error('updateCompanySettings:', error);
    res.status(500).json({ message: 'Error al actualizar configuración.' });
  }
};

module.exports = { getCompanySettings, updateCompanySettings };
