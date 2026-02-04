const pool = require('../config/db');

// Obtener módulos (Público para clientes, Admin ve todo)
const getModules = async (req, res) => {
    try {
        const [modules] = await pool.query('SELECT * FROM modules WHERE is_active = true');
        res.json({ success: true, data: modules });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener módulos' });
    }
};

// Crear módulo (Admin)
const createModule = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        await pool.query(
            'INSERT INTO modules (name, description, price) VALUES (?, ?, ?)',
            [name, description, price || 0]
        );
        res.json({ success: true, message: 'Módulo creado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear módulo' });
    }
};

// Actualizar módulo (Admin)
const updateModule = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const { id } = req.params;
        await pool.query(
            'UPDATE modules SET name = ?, description = ?, price = ? WHERE id = ?',
            [name, description, price, id]
        );
        res.json({ success: true, message: 'Módulo actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar módulo' });
    }
};

// Eliminar (Soft delete o físico)
const deleteModule = async (req, res) => {
    try {
        await pool.query('DELETE FROM modules WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Módulo eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar módulo' });
    }
};

module.exports = { getModules, createModule, updateModule, deleteModule };