const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// --- Obtener todos los usuarios (Con info del Plan) ---
const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.department_id, u.company_id, u.status, u.created_at, u.plan_id,
                   p.name as plan_name, p.color as plan_color,
                   u.is_active, u.phone, u.cuit, u.business_name, u.last_login
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

// --- Crear usuario (Admin) ---
const createUser = async (req, res) => {
    try {
        const { username, email, password, role, department_id, company_id, plan_id, phone, cuit, business_name, fantasy_name } = req.body;

        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'El usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario con todos los campos nuevos y viejos
        const [result] = await pool.query(
            `INSERT INTO Users (username, email, password, role, department_id, company_id, plan_id, phone, cuit, business_name, fantasy_name, is_active, status, last_login) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', NOW())`,
            [
                username, 
                email, 
                hashedPassword, 
                role || 'client', 
                department_id || null, 
                company_id || null, 
                plan_id || 1, // 1 es FREE por defecto
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

// --- Actualizar usuario ---
const updateUser = async (req, res) => {
    try {
        const { username, email, role, status, department_id, company_id, plan_id, phone, cuit, business_name, fantasy_name } = req.body;
        const userId = req.params.id;

        // Mapear 'status' (string) a 'is_active' (booleano) para consistencia
        const isActive = status === 'active' ? 1 : 0;
        
        await pool.query(
            `UPDATE Users SET 
                username = ?, email = ?, role = ?, status = ?, is_active = ?, 
                department_id = ?, company_id = ?, plan_id = ?,
                phone = ?, cuit = ?, business_name = ?, fantasy_name = ?
             WHERE id = ?`,
            [
                username, email, role, status || 'active', isActive,
                department_id || null, company_id || null, plan_id || 1,
                phone || '', cuit || '', business_name || '', fantasy_name || '',
                userId
            ]
        );
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

// ✅ --- ELIMINAR USUARIO (CASCADE MANUAL) ---
const deleteUser = async (req, res) => {
    const { id } = req.params;
    
    // 1. Obtener conexión para transacción
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction(); // Iniciar transacción

        // 2. Eliminar datos dependientes primero (Orden es clave)
        // a. Notificaciones
        await connection.query('DELETE FROM notifications WHERE user_id = ?', [id]);
        
        // b. Pagos
        await connection.query('DELETE FROM payments WHERE user_id = ?', [id]);
        
        // c. Datos de Facturación
        await connection.query('DELETE FROM billing_details WHERE user_id = ?', [id]);

        // d. Opcional: Tickets (si quieres borrarlos también, descomenta esto)
        // await connection.query('DELETE FROM Tickets WHERE created_by_user_id = ? OR assigned_to_user_id = ?', [id, id]);
        // Si NO borras tickets, deberías poner el usuario en NULL para no romper integridad
        // await connection.query('UPDATE Tickets SET assigned_to_user_id = NULL WHERE assigned_to_user_id = ?', [id]);

        // 3. Finalmente eliminar al usuario
        await connection.query('DELETE FROM Users WHERE id = ?', [id]);

        await connection.commit(); // Confirmar cambios
        res.json({ success: true, message: 'Usuario y sus datos eliminados correctamente' });

    } catch (error) {
        await connection.rollback(); // Deshacer todo si algo falla
        console.error("Error eliminando usuario:", error);
        res.status(500).json({ message: 'No se pudo eliminar el usuario debido a datos vinculados.' });
    } finally {
        connection.release(); // Liberar conexión
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