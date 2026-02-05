const pool = require('../config/db');

// --- Obtener Configuraciones Públicas (Para clientes y login) ---
const getPublicConfig = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT setting_key, setting_value FROM system_settings");
        
        // Convertir array [{key: 'a', value: 'b'}] a objeto { a: 'b' }
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
            await pool.query(
                `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE setting_value = ?`,
                [key, value, value]
            );
        }

        res.json({ success: true, message: 'Configuración actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar configuración' });
    }
};

module.exports = { getPublicConfig, updateConfig };