const pool = require('../config/db');

// Obtener configuraciones
const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM system_settings');
        // Convertir array a objeto { tech_hour_cost: "15000", ... }
        const settings = rows.reduce((acc, curr) => ({ ...acc, [curr.setting_key]: curr.setting_value }), {});
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener configuraciones' });
    }
};

// Actualizar configuraciones
const updateSettings = async (req, res) => {
    try {
        const settings = req.body; // Espera un objeto { tech_hour_cost: 20000, ... }
        
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, String(value), String(value)]
            );
        }
        res.json({ success: true, message: 'Configuración actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al guardar configuraciones' });
    }
};

module.exports = { getSettings, updateSettings };