const pool = require('../config/db');

// --- Obtener todos los usuarios (Solo Admin) ---
const getUsers = async (req, res) => {
    try {
        const { role } = req.query; // Para filtrar por ?role=client
        
        // CORRECCIÓN: Quitamos first_name y last_name de la consulta
        let query = 'SELECT id, username, email, role, status, created_at FROM Users';
        const params = [];

        if (role) {
            query += ' WHERE role = ?';
            params.push(role);
        }

        query += ' ORDER BY created_at DESC';

        const [users] = await pool.query(query, params);
        
        res.json({ success: true, data: users });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
};

// --- Obtener lista de agentes (Para asignar tickets) ---
const getAgents = async (req, res) => {
    try {
        // CORRECCIÓN: Solo pedimos username e email
        const [agents] = await pool.query(
            "SELECT id, username, email FROM Users WHERE role = 'agent' AND status = 'active'"
        );
        res.json({ success: true, data: agents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener agentes' });
    }
};

// --- Actualizar Usuario (Admin) ---
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;
        
        let query = 'UPDATE Users SET ';
        const updates = [];
        const params = [];

        if (role) { updates.push('role = ?'); params.push(role); }
        if (status) { updates.push('status = ?'); params.push(status); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Nada que actualizar' });
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
    }
};

// --- Eliminar Usuario ---
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM Users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
};

module.exports = {
    getUsers,
    getAgents,
    updateUser,
    deleteUser
};