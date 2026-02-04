const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// --- Obtener todos los usuarios (Con info del Plan) ---
const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.department_id, u.company_id, u.status, u.created_at, u.plan_id,
                   p.name as plan_name, p.color as plan_color
            FROM Users u
            LEFT JOIN plans p ON u.plan_id = p.id
            ORDER BY u.id DESC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

// --- Obtener usuario por ID ---
const getUserById = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.*, p.name as plan_name, p.color as plan_color
            FROM Users u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.id = ?
        `, [req.params.id]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ success: true, user: users[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// --- Crear usuario ---
const createUser = async (req, res) => {
    try {
        const { username, email, password, role, department_id, company_id, plan_id } = req.body; // Agregado plan_id

        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'El usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO Users (username, email, password, role, department_id, company_id, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, role, department_id || null, company_id || null, plan_id || 1] // 1 es FREE por defecto
        );

        res.status(201).json({ success: true, message: 'Usuario creado', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear usuario' });
    }
};

// --- Actualizar usuario (Ahora actualiza plan_id) ---
const updateUser = async (req, res) => {
    try {
        const { username, email, role, status, department_id, company_id, plan_id } = req.body;
        
        await pool.query(
            'UPDATE Users SET username = ?, email = ?, role = ?, status = ?, department_id = ?, company_id = ?, plan_id = ? WHERE id = ?',
            [username, email, role, status || 'active', department_id || null, company_id || null, plan_id || 1, req.params.id]
        );
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

// --- Eliminar usuario ---
const deleteUser = async (req, res) => {
    try {
        await pool.query('DELETE FROM Users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
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