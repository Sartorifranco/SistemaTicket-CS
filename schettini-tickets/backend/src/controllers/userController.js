const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const NEW_PERMISSIONS = [
    'tickets_view', 'tickets_reply', 'tickets_delete', 'tickets_assign',
    'tasks_view', 'tasks_edit', 'tasks_manage',
    'repairs_view', 'repairs_create', 'repairs_edit', 'repairs_delete',
    'activations_view', 'activations_edit',
    'ready_view', 'ready_edit',
    'refurbished_view', 'refurbished_create', 'refurbished_edit',
    'movements_view', 'warranties_view', 'activity_logs_view',
    'quoter_access', 'reports_view', 'tech_finances', 'resources_view', 'clients_view',
    'marketing_promotions', 'marketing_announcements'
];

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
                    u.permissions, u.can_manage_tech_finances,
                    u.business_name as business_name_text,
                    u.billing_type, u.contracted_services,
                    c.name as company_name_linked, d.name as department_name
                FROM Users u
                LEFT JOIN Companies c ON u.company_id = c.id
                LEFT JOIN Departments d ON u.department_id = d.id
                ORDER BY u.id DESC
            `);
        } catch (colErr) {
            if (colErr.message?.includes('billing_type') || colErr.message?.includes('contracted_services')) {
                [users] = await pool.query(`
                    SELECT u.id, u.username, u.full_name, u.email, u.role, u.status, u.is_active,
                        u.plan, u.phone, u.cuit, u.company_id, u.department_id,
                        u.permissions, u.can_manage_tech_finances,
                        u.business_name as business_name_text,
                        c.name as company_name_linked, d.name as department_name
                    FROM Users u
                    LEFT JOIN Companies c ON u.company_id = c.id
                    LEFT JOIN Departments d ON u.department_id = d.id
                    ORDER BY u.id DESC
                `);
                users.forEach(u => { u.billing_type = null; u.contracted_services = null; });
            } else if (colErr.message?.includes('full_name')) {
                [users] = await pool.query(`
                    SELECT u.id, u.username, u.username as full_name, u.email, u.role, u.status, u.is_active,
                        u.plan, u.phone, u.cuit, u.company_id, u.department_id,
                        u.permissions, u.can_manage_tech_finances,
                        u.business_name as business_name_text,
                        c.name as company_name_linked, d.name as department_name
                    FROM Users u
                    LEFT JOIN Companies c ON u.company_id = c.id
                    LEFT JOIN Departments d ON u.department_id = d.id
                    ORDER BY u.id DESC
                `);
            } else if (colErr.message?.includes('can_manage_tech_finances')) {
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
                users.forEach(u => { u.can_manage_tech_finances = 0; });
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
            permissions: parsePermissions(user.permissions),
            can_manage_tech_finances: Boolean(user.can_manage_tech_finances)
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
        const { username, email, password, role, department_id, company_id, plan, phone, cuit, business_name, fantasy_name, iva_condition, address, city, province, zip_code, billing_type, contracted_services } = req.body;

        const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'El usuario ya existe' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Validación estricta para company_id
        const finalCompanyId = (company_id && company_id !== '' && company_id !== '0') ? company_id : null;
        const finalDepartmentId = (department_id && department_id !== '' && department_id !== '0') ? department_id : null;

        const contractedServicesStr = Array.isArray(contracted_services)
            ? JSON.stringify(contracted_services)
            : (typeof contracted_services === 'string' ? contracted_services : null);

        const [result] = await pool.query(
            `INSERT INTO Users (
                username, email, password, role, 
                department_id, company_id, plan, 
                phone, cuit, business_name, fantasy_name, 
                iva_condition, address, city, province, zip_code,
                billing_type, contracted_services,
                is_active, status, last_login, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', NOW(), NOW())`,
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
                (zip_code || '').trim() || null,
                (billing_type || '').trim() || null,
                contractedServicesStr,
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
        const { username, full_name, email, role, status, department_id, company_id, plan, phone, cuit, business_name, fantasy_name, permissions, can_manage_tech_finances, iva_condition, address, city, province, zip_code, billing_type, contracted_services, password } = req.body;
        const userId = req.params.id;

        // Si el rol del solicitante es 'agent', solo puede actualizar campos básicos del cliente
        // No puede cambiar rol, estado, plan ni permisos
        if (req.user?.role === 'agent') {
            const [targetUsers] = await pool.query('SELECT role, status FROM Users WHERE id = ?', [userId]);
            if (targetUsers.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
            const target = targetUsers[0];
            // Agentes solo pueden editar clientes
            if (target.role !== 'client') {
                return res.status(403).json({ message: 'No tenés permiso para editar este usuario.' });
            }
            // Solo actualiza campos básicos + facturación/servicios — preserva role y status existentes
            const agentBilling = (billing_type || '').trim() || null;
            const agentServices = Array.isArray(contracted_services) ? JSON.stringify(contracted_services) : (typeof contracted_services === 'string' ? contracted_services : null);
            const agentUpdates = ['username = ?', 'full_name = ?', 'email = ?', 'phone = ?', 'cuit = ?', 'company_id = ?', 'department_id = ?', 'billing_type = ?', 'contracted_services = ?'];
            const agentValues = [
                username,
                (full_name || '').trim() || null,
                email,
                phone || '',
                cuit || '',
                (company_id && company_id !== '' && company_id !== '0') ? company_id : null,
                (department_id && department_id !== '' && department_id !== '0') ? department_id : null,
                agentBilling,
                agentServices
            ];
            const agentPwd = password != null ? String(password).trim() : '';
            if (agentPwd.length > 0 && agentPwd.length < 6) {
                return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
            }
            if (agentPwd.length >= 6) {
                agentUpdates.push('password = ?');
                agentValues.push(await bcrypt.hash(agentPwd, 10));
            }
            agentValues.push(userId);
            await pool.query(`UPDATE Users SET ${agentUpdates.join(', ')} WHERE id = ?`, agentValues);
            return res.json({ success: true, message: 'Cliente actualizado correctamente' });
        }

        // Lógica corregida: Si 'status' no viene, asumimos 'active'
        const newStatus = status || 'active';
        const isActive = newStatus === 'active' ? 1 : 0;
        
        // Aseguramos que si viene vacío sea NULL en la base de datos
        const finalCompanyId = (company_id && company_id !== '' && company_id !== '0') ? company_id : null;
        const finalDepartmentId = (department_id && department_id !== '' && department_id !== '0') ? department_id : null;

        const finalFullName = (full_name || '').trim() || null;
        const canHavePerms = role === 'agent' || role === 'supervisor' || role === 'viewer';
        const finalPermissions = canHavePerms && Array.isArray(permissions)
            ? serializePermissions(permissions)
            : null;

        const contractedServicesStr = Array.isArray(contracted_services)
            ? JSON.stringify(contracted_services)
            : (typeof contracted_services === 'string' ? contracted_services : null);

        const updates = [
            'username = ?', 'full_name = ?', 'email = ?', 'role = ?', 'status = ?', 'is_active = ?',
            'department_id = ?', 'company_id = ?', 'plan = ?',
            'phone = ?', 'cuit = ?', 'business_name = ?', 'fantasy_name = ?',
            'iva_condition = ?', 'address = ?', 'city = ?', 'province = ?', 'zip_code = ?',
            'can_manage_tech_finances = ?', 'billing_type = ?', 'contracted_services = ?'
        ];
        const values = [
            username, finalFullName, email, role, newStatus, isActive,
            finalDepartmentId, finalCompanyId, plan || 'Free',
            phone || '', cuit || '', business_name || '', fantasy_name || '',
            (iva_condition || '').trim() || null, (address || '').trim() || null, (city || '').trim() || null, (province || '').trim() || null, (zip_code || '').trim() || null,
            ((role === 'agent' || role === 'viewer') && can_manage_tech_finances === true) ? 1 : 0,
            (billing_type || '').trim() || null,
            contractedServicesStr
        ];
        if (finalPermissions !== null) {
            updates.push('permissions = ?');
            values.push(finalPermissions);
        }
        const newPassword = password != null ? String(password).trim() : '';
        if (newPassword.length > 0 && newPassword.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }
        if (newPassword.length >= 6) {
            updates.push('password = ?');
            values.push(await bcrypt.hash(newPassword, 10));
        }
        values.push(userId);

        await pool.query(
            `UPDATE Users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(500).json({ message: error.message || 'Error al actualizar' });
    }
};

// --- Eliminar/Desactivar usuario ---
// DELETE /api/users/:id           -> desactiva (status inactive)
// DELETE /api/users/:id?permanent=1 -> elimina de BD (solo si no tiene tickets)
const deleteUser = async (req, res) => {
    const { id } = req.params;
    const permanent = req.query.permanent === '1' || req.query.permanent === 'true';

    if (req.user?.role === 'agent') {
        return res.status(403).json({ message: 'No tenés permiso para eliminar o desactivar usuarios.' });
    }

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

// --- Técnicos (agentes, supervisores y admins con permiso de taller) ---
const getTechnicians = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, username, email, role, COALESCE(full_name, username) as full_name, permissions
            FROM Users 
            WHERE role IN ('agent', 'supervisor', 'admin') AND status = 'active'
            ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'supervisor' THEN 2 ELSE 3 END, username ASC
        `);
        const technicians = rows.filter((u) => {
            if (u.role === 'admin' || u.role === 'supervisor') return true;
            const perms = parsePermissions(u.permissions);
            return perms.some((p) => TALLER_PERMISSIONS.includes(p));
        }).map(({ permissions, ...u }) => u);
        res.json({ success: true, data: technicians });
    } catch (error) {
        console.error('getTechnicians error:', error.message);
        res.status(500).json({ success: false, message: 'Error al obtener técnicos' });
    }
};

// --- Documentos del usuario (planillas, contratos) ---
const getUserDocuments = async (req, res) => {
    try {
        const userId = req.params.id;
        const [rows] = await pool.query(
            `SELECT id, user_id, document_name, document_type, file_path, uploaded_by, created_at 
             FROM user_documents WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        if (error.message?.includes("doesn't exist")) {
            return res.json({ success: true, data: [] });
        }
        console.error('getUserDocuments:', error);
        res.status(500).json({ message: 'Error al listar documentos' });
    }
};

const uploadUserDocument = async (req, res) => {
    try {
        const userId = req.params.id;
        const uploadedBy = req.user?.id;
        const documentType = (req.body.document_type || 'other').trim() || 'other';
        const documentName = (req.body.document_name || '').trim() || (req.file?.originalname || 'documento');

        if (!req.file || !req.file.filename) {
            return res.status(400).json({ message: 'No se envió ningún archivo o el tipo no está permitido (PDF, JPG, PNG).' });
        }
        const filePath = `/uploads/${req.file.filename}`;

        await pool.query(
            `INSERT INTO user_documents (user_id, document_name, document_type, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
            [userId, documentName, documentType, filePath, uploadedBy]
        );
        res.status(201).json({ success: true, message: 'Documento subido correctamente' });
    } catch (error) {
        if (error.message?.includes("doesn't exist")) {
            return res.status(500).json({ message: 'La tabla user_documents no existe. Ejecutá la migración.' });
        }
        console.error('uploadUserDocument:', error);
        res.status(500).json({ message: 'Error al subir documento' });
    }
};

// --- Cambiar contraseña (propio usuario) ---
const changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Las contraseñas nuevas no coinciden.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'La contraseña nueva debe tener al menos 6 caracteres.' });
    }

    try {
        const [rows] = await pool.query('SELECT password FROM Users WHERE id = ?', [userId]);
        if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) return res.status(400).json({ message: 'La contraseña actual es incorrecta.' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE Users SET password = ? WHERE id = ?', [hashed, userId]);

        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('changePassword:', error);
        res.status(500).json({ message: 'Error al actualizar la contraseña.' });
    }
};

module.exports = {
    getUsers, getUserById, createUser, updateUser, deleteUser, getUserActiveTickets, getAgents, getTechnicians,
    getUserDocuments, uploadUserDocument, changePassword
};