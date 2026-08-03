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

const hasOwn = (body, key) =>
  Object.prototype.hasOwnProperty.call(body || {}, key) && body[key] !== undefined;

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

    // Umbral de demora: default 3 días si no está configurado.
    if (row.delayed_days_threshold == null) data.delayed_days_threshold = 3;

    res.json({ success: true, data });
  } catch (error) {
    console.error('getCompanySettings:', error);
    res.status(500).json({ message: 'Error al obtener configuración.' });
  }
};

/**
 * Actualización PARCIAL: solo modifica campos enviados en el body.
 * Evita que guardar dólar/margen desde Cotizador borre nombre, dirección, tel, etc.
 */
const updateCompanySettings = async (req, res) => {
  try {
    const body = req.body || {};
    const file = req.file;

    const updates = [];
    const values = [];

    const setString = (col, key, { nullable = false } = {}) => {
      if (!hasOwn(body, key)) return;
      const raw = body[key];
      const trimmed = raw == null ? '' : String(raw).trim();
      updates.push(`${col} = ?`);
      values.push(nullable ? (trimmed || null) : trimmed);
    };

    const setFloat = (col, key) => {
      if (!hasOwn(body, key)) return;
      const raw = body[key];
      if (raw === '' || raw == null) {
        updates.push(`${col} = ?`);
        values.push(null);
        return;
      }
      const n = parseFloat(raw);
      updates.push(`${col} = ?`);
      values.push(Number.isNaN(n) ? null : n);
    };

    const setInt = (col, key, { min = null, max = null, fallbackNull = true } = {}) => {
      if (!hasOwn(body, key)) return;
      const raw = body[key];
      if (raw === '' || raw == null) {
        updates.push(`${col} = ?`);
        values.push(fallbackNull ? null : 0);
        return;
      }
      let n = parseInt(raw, 10);
      if (Number.isNaN(n)) {
        updates.push(`${col} = ?`);
        values.push(fallbackNull ? null : 0);
        return;
      }
      if (min != null) n = Math.max(min, n);
      if (max != null) n = Math.min(max, n);
      updates.push(`${col} = ?`);
      values.push(n);
    };

    setString('company_name', 'company_name');
    setString('address', 'address');
    setString('phone', 'phone');
    setString('email', 'email');
    setString('website', 'website');
    setFloat('tax_percentage', 'tax_percentage');
    setString('quote_footer_text', 'quote_footer_text', { nullable: true });
    setString('primary_color', 'primary_color');
    setFloat('usd_exchange_rate', 'usd_exchange_rate');
    setFloat('list_price_surcharge_percent', 'list_price_surcharge_percent');
    setFloat('default_iva_percent', 'default_iva_percent');
    setFloat('profit_margin_percent', 'profit_margin_percent');
    setString('legal_footer_text', 'legal_footer_text', { nullable: true });
    // Alias: frontend manda recycling_days_abandonment → columna default_abandonment_days
    if (hasOwn(body, 'recycling_days_abandonment')) {
      setInt('default_abandonment_days', 'recycling_days_abandonment');
    } else if (hasOwn(body, 'default_abandonment_days')) {
      setInt('default_abandonment_days', 'default_abandonment_days');
    }
    setInt('default_warranty_months', 'default_warranty_months');
    if (hasOwn(body, 'legal_terms_ticket')) {
      setString('legal_terms', 'legal_terms_ticket', { nullable: true });
    } else if (hasOwn(body, 'legal_terms')) {
      setString('legal_terms', 'legal_terms', { nullable: true });
    }

    if (hasOwn(body, 'agents_can_view_movements')) {
      const v = body.agents_can_view_movements;
      const on = v === true || v === 'true' || v === 1 || v === '1';
      updates.push('agents_can_view_movements = ?');
      values.push(on ? 1 : 0);
    }

    if (hasOwn(body, 'ticket_notification_emails')) {
      updates.push('ticket_notification_emails = ?');
      values.push(normalizeEmailList(body.ticket_notification_emails));
    }

    setInt('ticket_response_time_hours', 'ticket_response_time_hours', { min: 1 });
    setInt('delayed_days_threshold', 'delayed_days_threshold', { min: 1, max: 365 });

    if (file && file.filename) {
      updates.push('logo_url = ?');
      values.push(`/uploads/${file.filename}`);
    }

    if (updates.length === 0) {
      const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = ? LIMIT 1', [ID]);
      return res.json({ success: true, message: 'Sin cambios.', data: rows[0] || null });
    }

    values.push(ID);
    try {
      await pool.query(
        `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (colErr) {
      const msg = colErr.message || '';
      const removable = [
        'agents_can_view_movements',
        'ticket_notification_emails',
        'ticket_response_time_hours',
        'delayed_days_threshold',
        'profit_margin_percent',
        'list_price_surcharge_percent',
        'default_iva_percent',
        'usd_exchange_rate',
        'legal_footer_text',
        'default_abandonment_days',
        'default_warranty_months',
        'legal_terms'
      ];
      let retried = false;
      for (const col of removable) {
        if (msg.includes(col)) {
          const idx = updates.findIndex((u) => u.startsWith(`${col} =`));
          if (idx >= 0) {
            updates.splice(idx, 1);
            values.splice(idx, 1);
            retried = true;
          }
        }
      }
      if (retried && updates.length > 0) {
        await pool.query(
          `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      } else if (!retried) {
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
