const pool = require('../config/db');

// Obtener planes
const getPlans = async (req, res) => {
    try {
        const [plans] = await pool.query('SELECT * FROM plans');
        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener planes' });
    }
};

// Crear plan
const createPlan = async (req, res) => {
    try {
        const { name, color, price, features } = req.body;
        await pool.query(
            'INSERT INTO plans (name, color, price, features) VALUES (?, ?, ?, ?)', 
            [name, color, price || 0, features || '']
        );
        res.json({ success: true, message: 'Plan creado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear plan' });
    }
};

// --- Actualizar plan (NUEVO) ---
const updatePlan = async (req, res) => {
    try {
        const { name, color, price, features } = req.body;
        const { id } = req.params;
        
        await pool.query(
            'UPDATE plans SET name = ?, color = ?, price = ?, features = ? WHERE id = ?',
            [name, color, price || 0, features || '', id]
        );
        res.json({ success: true, message: 'Plan actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar plan' });
    }
};

// Borrar plan
const deletePlan = async (req, res) => {
    try {
        await pool.query('DELETE FROM plans WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Plan eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar plan' });
    }
};

module.exports = { getPlans, createPlan, updatePlan, deletePlan };