const pool = require('../config/db');

// --- Obtener Empresas ---
const getCompanies = async (req, res) => {
    try {
        const [companies] = await pool.query('SELECT * FROM Companies ORDER BY id DESC');
        // CORRECCIÓN: Enviamos 'success' y 'data' para que el frontend lo lea bien
        res.json({ success: true, data: companies });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener empresas' });
    }
};

// --- Crear Empresa ---
const createCompany = async (req, res) => {
    try {
        const { name, address, phone, email } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
        }

        const [result] = await pool.query(
            'INSERT INTO Companies (name, address, phone, email, status) VALUES (?, ?, ?, ?, ?)',
            [name, address, phone, email, 'active']
        );

        res.status(201).json({ 
            success: true, 
            message: 'Empresa creada exitosamente',
            data: { id: result.insertId, name } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear empresa' });
    }
};

// --- Actualizar Empresa ---
const updateCompany = async (req, res) => {
    try {
        const { name, address, phone, email, status } = req.body;
        const { id } = req.params;

        await pool.query(
            'UPDATE Companies SET name = ?, address = ?, phone = ?, email = ?, status = ? WHERE id = ?',
            [name, address, phone, email, status || 'active', id]
        );

        res.json({ success: true, message: 'Empresa actualizada' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar empresa' });
    }
};

// --- Eliminar Empresa ---
const deleteCompany = async (req, res) => {
    try {
        await pool.query('DELETE FROM Companies WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Empresa eliminada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar empresa' });
    }
};

module.exports = {
    getCompanies,
    createCompany,
    updateCompany,
    deleteCompany
};