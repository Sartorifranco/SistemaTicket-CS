const pool = require('../config/db');

/** Claves de system_settings que no deben exponerse en GET público (uso interno / ventas). */
const HIDDEN_FROM_PUBLIC = new Set(['sales_notification_email']);

// --- Obtener Configuraciones Públicas (Para clientes y login) ---
const getPublicConfig = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT setting_key, setting_value FROM system_settings");
        
        // Convertir array [{key: 'a', value: 'b'}] a objeto { a: 'b' }
        const config = rows.reduce((acc, row) => {
            if (HIDDEN_FROM_PUBLIC.has(row.setting_key)) return acc;
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});

        res.json({ success: true, data: config });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener configuración' });
    }
};

// --- Configuración completa (solo admin; incluye sales_notification_email, etc.) ---
const getAdminConfig = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT setting_key, setting_value FROM system_settings");
        const config = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json({ success: true, data: config });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener configuración' });
    }
};

// --- Actualizar Configuración (Solo Admin) ---
const updateConfig = async (req, res) => {
    try {
        const settings = req.body; // Espera objeto { billing_email: "nuevo@mail.com", ... }

        // Recorrer las claves y actualizar/insertar
        for (const [key, value] of Object.entries(settings)) {
            if (value === undefined) continue;
            const strVal = value === null || value === '' ? '' : String(value);
            await pool.query(
                `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE setting_value = ?`,
                [key, strVal, strVal]
            );
        }

        res.json({ success: true, message: 'Configuración actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
    }
};

module.exports = { getPublicConfig, getAdminConfig, updateConfig };