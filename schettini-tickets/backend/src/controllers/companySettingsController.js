const pool = require('../config/db');

const ID = 1;

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

    values.push(ID);
    try {
      await pool.query(
        `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (colErr) {
      if (colErr.message?.includes('agents_can_view_movements')) {
        updates.pop();
        values.pop();
        await pool.query(
          `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      } else throw colErr;
    }

    const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = ? LIMIT 1', [ID]);
    res.json({ success: true, message: 'Configuración actualizada.', data: rows[0] });
  } catch (error) {
    console.error('updateCompanySettings:', error);
    res.status(500).json({ message: 'Error al actualizar configuración.' });
  }
};

module.exports = { getCompanySettings, updateCompanySettings };
