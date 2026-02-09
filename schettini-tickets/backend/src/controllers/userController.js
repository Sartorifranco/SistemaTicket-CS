const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// --- Obtener todos los usuarios (Con info de Empresa, Depto y Plan) ---
const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.role, 
                u.status, 
                u.is_active,
                u.plan, 
                u.phone,
                u.cuit,
                u.company_id, 
                u.department_id,
                u.business_name as business_name_text,  -- Nombre escrito manualmente
                c.name as company_name_linked,          -- Nombre real por ID
                d.name as department_name
            FROM Users u
            LEFT JOIN Companies c ON u.company_id = c.id
            LEFT JOIN Departments d ON u.department_id = d.id
            ORDER BY u.id DESC
        `);

        // ✅ LOGICA DE RESPALDO:
        // Si hay empresa vinculada (ID), usa ese nombre.
        // Si no, usa el nombre escrito manualmente.
        // Si no, muestra "Sin Empresa".
        const formattedUsers = users.map(user => ({
            ...user,
            business_name: user.company_name_linked || user.business_name_text || 'Sin Empresa Asignada',
            // Mantenemos compatibilidad si el front espera 'company_name'
            company_name: user.company_name_linked || user.business_name_text || 'Sin Empresa Asignada'
        }));

        res.json({ success: true, data: formattedUsers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// --- Obtener usuario por ID ---
const getUserById = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.*, c.name as company_name 
            FROM Users u
            LEFT JOIN Companies c ON u.company_id = c.id
            WHERE u.id = ?
        `, [req.params.id]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ success: true, user: users[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// --- Crear usuario (Admin) ---
const createUser = async (req, res) => {
    try {
        const { username, email, password, role, department_id, company_id, plan, phone, cuit, business_name, fantasy_name } = req.body;

        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'El usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Validación estricta para company_id
        const finalCompanyId = (company_id && company_id !== '' && company_id !== '0') ? company_id : null;
        const finalDepartmentId = (department_id && department_id !== '' && department_id !== '0') ? department_id : null;

        const [result] = await pool.query(
            `INSERT INTO Users (
                username, email, password, role, 
                department_id, company_id, plan, 
                phone, cuit, business_name, fantasy_name, 
                is_active, status, last_login, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', NOW(), NOW())`,
            [
                username, 
                email, 
                hashedPassword, 
                role || 'client', 
                finalDepartmentId, 
                finalCompanyId, 
                plan || 'Free',
                phone || '',
                cuit || '',
                business_name || '',
                fantasy_name || ''
            ]
        );

        res.status(201).json({ success: true, message: 'Usuario creado', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};

// --- Actualizar usuario (BLINDADO) ---
const updateUser = async (req, res) => {
    try {
        const { username, email, role, status, department_id, company_id, plan, phone, cuit, business_name, fantasy_name } = req.body;
        const userId = req.params.id;

        // Lógica corregida: Si 'status' no viene, asumimos 'active'
        const newStatus = status || 'active';
        const isActive = newStatus === 'active' ? 1 : 0;
        
        // Aseguramos que si viene vacío sea NULL en la base de datos
        const finalCompanyId = (company_id && company_id !== '' && company_id !== '0') ? company_id : null;
        const finalDepartmentId = (department_id && department_id !== '' && department_id !== '0') ? department_id : null;

        await pool.query(
            `UPDATE Users SET 
                username = ?, email = ?, role = ?, status = ?, is_active = ?, 
                department_id = ?, company_id = ?, plan = ?, 
                phone = ?, cuit = ?, business_name = ?, fantasy_name = ?
             WHERE id = ?`,
            [
                username, email, role, newStatus, isActive,
                finalDepartmentId, finalCompanyId, plan || 'Free',
                phone || '', cuit || '', business_name || '', fantasy_name || '',
                userId
            ]
        );
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

// --- Eliminar usuario (Smart Delete) ---
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const [tickets] = await pool.query('SELECT id FROM Tickets WHERE user_id = ? OR assigned_to_user_id = ? LIMIT 1', [id, id]);

        if (tickets.length > 0) {
            await pool.query('UPDATE Users SET status = "inactive", is_active = 0 WHERE id = ?', [id]);
            return res.json({ success: true, message: 'Usuario desactivado (tiene historial).' });
        }

        const [result] = await pool.query('DELETE FROM Users WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json({ success: true, message: 'Usuario eliminado.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
};

// --- Tickets Activos ---
const getUserActiveTickets = async (req, res) => {
    try {
        const userId = req.params.id;
        const [tickets] = await pool.query(`
            SELECT id, title, status, priority, created_at 
            FROM Tickets 
            WHERE assigned_to_user_id = ? AND status IN ('open', 'in_progress', 'in-progress')
            ORDER BY created_at DESC
        `, [userId]);
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener tickets activos' });
    }
};

// --- Agentes ---
const getAgents = async (req, res) => {
    try {
        const [agents] = await pool.query(`
            SELECT id, username, email, role 
            FROM Users 
            WHERE role IN ('agent', 'admin') AND status = 'active'
            ORDER BY username ASC
        `);
        res.json({ success: true, data: agents });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener agentes' });
    }
};

module.exports = {
    getUsers, getUserById, createUser, updateUser, deleteUser, getUserActiveTickets, getAgents
};