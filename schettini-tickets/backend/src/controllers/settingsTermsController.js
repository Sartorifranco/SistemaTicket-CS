const pool = require('../config/db');
const DEFAULT_TERMS = require('../constants/termsAndConditionsDefault');

const TERMS_KEY = 'terms_and_conditions';

/**
 * GET — usuarios autenticados (clientes, agentes, admin).
 * Si no hay fila o el valor está vacío, devuelve el texto por defecto del sistema.
 */
const getTerms = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
            [TERMS_KEY]
        );
        let text = DEFAULT_TERMS;
        if (rows.length > 0 && rows[0].setting_value != null) {
            const v = String(rows[0].setting_value);
            if (v.trim() !== '') text = v;
        }
        res.json({ success: true, data: { text } });
    } catch (error) {
        console.error('getTerms:', error);
        res.status(500).json({ success: false, message: 'Error al obtener términos y condiciones' });
    }
};

/**
 * PUT — solo rol admin.
 * Cuerpo: { "text": "..." }
 */
const putTerms = async (req, res) => {
    try {
        const body = req.body || {};
        const text = body.text != null ? String(body.text) : body.value != null ? String(body.value) : '';
        await pool.query(
            `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [TERMS_KEY, text]
        );
        res.json({ success: true, message: 'Términos y condiciones actualizados', data: { text } });
    } catch (error) {
        console.error('putTerms:', error);
        res.status(500).json({ success: false, message: 'Error al guardar términos y condiciones' });
    }
};

module.exports = { getTerms, putTerms, TERMS_KEY };
