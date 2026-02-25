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
    res.json({ success: true, data: rows[0] });
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

    let logoUrl = null;
    if (file && file.filename) {
      logoUrl = `/uploads/${file.filename}`;
    }

    const updates = [
      'company_name = ?', 'address = ?', 'phone = ?', 'email = ?', 'website = ?',
      'tax_percentage = ?', 'quote_footer_text = ?', 'primary_color = ?',
      'updated_at = NOW()'
    ];
    const values = [companyName, address, phone, email, website, taxPercentage, quoteFooterText, primaryColor];

    if (logoUrl !== null) {
      updates.splice(5, 0, 'logo_url = ?');
      values.splice(5, 0, logoUrl);
    }

    values.push(ID);
    await pool.query(
      `UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query('SELECT * FROM company_settings WHERE id = ? LIMIT 1', [ID]);
    res.json({ success: true, message: 'Configuración actualizada.', data: rows[0] });
  } catch (error) {
    console.error('updateCompanySettings:', error);
    res.status(500).json({ message: 'Error al actualizar configuración.' });
  }
};

module.exports = { getCompanySettings, updateCompanySettings };
