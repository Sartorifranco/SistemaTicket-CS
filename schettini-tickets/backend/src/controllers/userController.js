const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const NEW_PERMISSIONS = ['tickets_view', 'tickets_reply', 'tickets_delete', 'repairs_view', 'repairs_create', 'repairs_edit', 'quoter_access', 'reports_view'];

const migrateOldPermissions = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return ['tickets_view', 'tickets_reply'];
    const migrated = [];
    for (const p of arr) {
        if (NEW_PERMISSIONS.includes(p)) migrated.push(p);
        else if (p === 'tickets') { migrated.push('tickets_view', 'tickets_reply'); }
        else if (p === 'repair_orders') { migrated.push('repairs_view', 'repairs_create', 'repairs_edit'); }
        else if (p === 'cotizador') { migrated.push('quoter_access'); }
    }
    return migrated.length ? [...new Set(migrated)] : ['tickets_view', 'tickets_reply'];
};

const parsePermissions = (val) => {
    if (!val) return ['tickets_view', 'tickets_reply'];
    let arr = [];
    if (Array.isArray(val)) arr = val;
    else if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            arr = Array.isArray(parsed) ? parsed : val.split(',').map(s => s.trim()).filter(Boolean);
        } catch {
            arr = val.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    if (arr.length === 0) return ['tickets_view', 'tickets_reply'];
    return migrateOldPermissions(arr);
};

const serializePermissions = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return '["tickets_view","tickets_reply"]';
    const valid = arr.filter(p => NEW_PERMISSIONS.includes(p));
    return JSON.stringify(valid.length ? valid : ['tickets_view', 'tickets_reply']);
};

// --- Obtener todos los usuarios (Con info de Empresa, Depto y Plan) ---
const getUsers = async (req, res) => {
    try {
        let users;
        try {
            [users] = await pool.query(`
                SELECT u.id, u.username, u.full_name, u.email, u.role, u.status, u.is_active,
                    u.plan, u.phone, u.cuit, u.company_id, u.department_id,
                    u.permissions,
                    u.business_name as business_name_text,
                    c.name as company_name_linked, d.name as department_name
                FROM Users u
                LEFT JOIN Companies c ON u.company_id = c.id
                LEFT JOIN Departments d ON u.department_id = d.id
                ORDER BY u.id DESC
            `);
        } catch (colErr) {
            if (colErr.message?.includes('full_name')) {
                [users] = await pool.query(`
                    SELECT u.id, u.username, u.username as full_name, u.email, u.role, u.status, u.is_active,
                        u.plan, u.phone, u.cuit, u.company_id, u.department_id,
                        u.permissions,
                        u.business_name as business_name_text,
                        c.name as company_name_linked, d.name as department_name
                    FROM Users u
                    LEFT JOIN Companies c ON u.company_id = c.id
                    LEFT JOIN Departments d ON u.department_id = d.id
                    ORDER BY u.id DESC
                `);
            } else throw colErr;
        }

        // ✅ LOGICA DE RESPALDO:
        // Si hay empresa vinculada (ID), usa ese nombre.
        // Si no, usa el nombre escrito manualmente.
        // Si no, muestra "Sin Empresa".
        const formattedUsers = users.map(user => ({
            ...user,
            business_name: user.company_name_linked || user.business_name_text || 'Sin Empresa Asignada',
            company_name: user.company_name_linked || user.business_name_text || 'Sin Empresa Asignada',
            permissions: parsePermissions(user.permissions)
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
        const u = users[0];
        res.json({ success: true, user: { ...u, permissions: parsePermissions(u.permissions) } });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// --- Crear usuario (Admin) ---
const createUser = async (req, res) => {
    try {
        const { username, email, password, role, department_id, company_id, plan, phone, cuit, business_name, fantasy_name, iva_condition, address, city, province, zip_code } = req.body;

        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'El usuario ya existe' });

        const cuitNorm = (cuit || '').replace(/\D/g, '');
        if (cuitNorm.length >= 8) {
            const [existingCuit] = await pool.query('SELECT id FROM Users WHERE REPLACE(REPLACE(REPLACE(cuit, "-", ""), " ", ""), ".", "") = ?', [cuitNorm]);
            if (existingCuit.length > 0) return res.status(400).json({ message: 'Este CUIT ya está registrado' });
        }

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
                iva_condition, address, city, province, zip_code,
                is_active, status, last_login, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', NOW(), NOW())`,
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
                fantasy_name || '',
                (iva_condition || '').trim() || null,
                (address || '').trim() || null,
                (city || '').trim() || null,
                (province || '').trim() || null,
                (zip_code || '').trim() || null
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
        const { username, full_name, email, role, status, department_id, company_id, plan, phone, cuit, business_name, fantasy_name, permissions, iva_condition, address, city, province, zip_code } = req.body;
        const userId = req.params.id;

        const cuitNorm = (cuit || '').replace(/\D/g, '');
        if (cuitNorm.length >= 8) {
            const [existingCuit] = await pool.query(
                'SELECT id FROM Users WHERE REPLACE(REPLACE(REPLACE(cuit, "-", ""), " ", ""), ".", "") = ? AND id != ?',
                [cuitNorm, userId]
            );
            if (existingCuit.length > 0) return res.status(400).json({ message: 'Este CUIT ya está registrado' });
        }

        // Lógica corregida: Si 'status' no viene, asumimos 'active'
        const newStatus = status || 'active';
        const isActive = newStatus === 'active' ? 1 : 0;
        
        // Aseguramos que si viene vacío sea NULL en la base de datos
        const finalCompanyId = (company_id && company_id !== '' && company_id !== '0') ? company_id : null;
        const finalDepartmentId = (department_id && department_id !== '' && department_id !== '0') ? department_id : null;

        const finalFullName = (full_name || '').trim() || null;
        const finalPermissions = (role === 'agent' || role === 'supervisor') && Array.isArray(permissions)
            ? serializePermissions(permissions)
            : null;

        const updates = [
            'username = ?', 'full_name = ?', 'email = ?', 'role = ?', 'status = ?', 'is_active = ?',
            'department_id = ?', 'company_id = ?', 'plan = ?',
            'phone = ?', 'cuit = ?', 'business_name = ?', 'fantasy_name = ?',
            'iva_condition = ?', 'address = ?', 'city = ?', 'province = ?', 'zip_code = ?'
        ];
        const values = [
            username, finalFullName, email, role, newStatus, isActive,
            finalDepartmentId, finalCompanyId, plan || 'Free',
            phone || '', cuit || '', business_name || '', fantasy_name || '',
            (iva_condition || '').trim() || null, (address || '').trim() || null, (city || '').trim() || null, (province || '').trim() || null, (zip_code || '').trim() || null
        ];
        if (finalPermissions !== null) {
            updates.push('permissions = ?');
            values.push(finalPermissions);
        }
        values.push(userId);

        await pool.query(
            `UPDATE Users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('Error en updateUser:', error);
        const msg = error.message || 'Error al actualizar';
        // Si MySQL rechaza el rol (ej. ENUM sin 'supervisor'), informar al admin
        const hint = (msg.includes('Data truncated') || msg.includes("enum") || msg.includes('role'))
            ? ' Ejecutá en el VPS: cd schettini-tickets/backend && node scripts/migrate-supervisor-and-tasks.js'
            : '';
        res.status(500).json({ message: msg + hint });
    }
};

// --- Eliminar/Desactivar usuario ---
// DELETE /api/users/:id           -> desactiva (status inactive)
// DELETE /api/users/:id?permanent=1 -> elimina de BD (solo si no tiene tickets)
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const permanent = req.query.permanent === '1' || req.query.permanent === 'true';
    try {
        const [tickets] = await pool.query('SELECT id FROM Tickets WHERE user_id = ? OR assigned_to_user_id = ? LIMIT 1', [id, id]);

        if (permanent) {
            if (tickets.length > 0) {
                return res.status(400).json({ message: 'No se puede eliminar: el usuario tiene tickets asociados. Usá "Desactivar" en su lugar.' });
            }
            const [comments] = await pool.query('SELECT 1 FROM comments WHERE user_id = ? LIMIT 1', [id]);
            if (comments.length > 0) {
                return res.status(400).json({ message: 'No se puede eliminar: el usuario tiene comentarios. Usá "Desactivar" en su lugar.' });
            }
            await pool.query('DELETE FROM notifications WHERE user_id = ?', [id]);
            await pool.query('DELETE FROM agent_tasks WHERE assigned_to_user_id = ? OR assigned_by_user_id = ?', [id, id]);
            const [result] = await pool.query('DELETE FROM Users WHERE id = ?', [id]);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
            return res.json({ success: true, message: 'Usuario eliminado permanentemente.' });
        }

        // Desactivar (siempre posible)
        await pool.query('UPDATE Users SET status = "inactive", is_active = 0 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Usuario desactivado correctamente.' });
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
            SELECT id, username, email, role, username as full_name
            FROM Users 
            WHERE role IN ('agent', 'supervisor', 'admin') AND status = 'active'
            ORDER BY 
                CASE role WHEN 'admin' THEN 1 WHEN 'supervisor' THEN 2 ELSE 3 END,
                username ASC
        `);
        res.json({ success: true, data: agents });
    } catch (error) {
        console.error('getAgents error:', error.message);
        res.status(500).json({ success: false, message: 'Error al obtener agentes' });
    }
};

/** Permisos que otorgan acceso al módulo Taller (para Técnico Asignado) */
const TALLER_PERMISSIONS = ['repairs_view', 'repairs_edit', 'repairs_create', 'repair_orders'];

// --- Técnicos (agentes con permiso de taller, excluye admin) ---
const getTechnicians = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, username, email, role, COALESCE(full_name, username) as full_name, permissions
            FROM Users 
            WHERE role = 'agent' AND status = 'active'
            ORDER BY username ASC
        `);
        const technicians = rows.filter((u) => {
            const perms = parsePermissions(u.permissions);
            return perms.some((p) => TALLER_PERMISSIONS.includes(p));
        }).map(({ permissions, ...u }) => u);
        res.json({ success: true, data: technicians });
    } catch (error) {
        console.error('getTechnicians error:', error.message);
        res.status(500).json({ success: false, message: 'Error al obtener técnicos' });
    }
};

module.exports = {
    getUsers, getUserById, createUser, updateUser, deleteUser, getUserActiveTickets, getAgents, getTechnicians
};