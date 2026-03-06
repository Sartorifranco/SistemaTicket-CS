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
    'quoter_access', 'reports_view', 'tech_finances', 'resources_view', 'clients_view'
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
        } catch { arr = val.split(',').map(s => s.trim()).filter(Boolean); }
    }
    return arr.length ? migrateOldPermissions(arr) : ['tickets_view', 'tickets_reply'];
};
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// 6 Meses en milisegundos
const INACTIVITY_LIMIT = 180 * 24 * 60 * 60 * 1000; 

// ✅ REGISTER USER MEJORADO (Auto-creación de Empresa)
// full_name = Nombre y apellido (identificación). username = Usuario para login (puede usar usuario o email).
const registerUser = async (req, res) => {
    try {
        const { 
            username, full_name, email, password, phone, cuit, 
            business_name, fantasy_name, 
            role, status, company_id, department_id, plan,
            accepted_confidentiality_agreement,
            permissions, can_manage_tech_finances,
            billing_type, contracted_services
        } = req.body;

        // 0. Acuerdo de confidencialidad (solo registro público; admin/supervisor eximidos)
        const isAdminOrSupervisorCreating = req.user && (req.user.role === 'admin' || req.user.role === 'supervisor' || req.user.role === 'agent');
        if (!isAdminOrSupervisorCreating && !accepted_confidentiality_agreement) {
            return res.status(400).json({ message: 'Debes aceptar el Acuerdo de Confidencialidad para registrarte.' });
        }

        // 1. Validaciones
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Faltan datos obligatorios (Usuario, Email, Contraseña).' });
        }

        // 2. Verificar usuario duplicado (username y email deben ser únicos)
        const [existingEmail] = await pool.query('SELECT id FROM Users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'El correo ya está registrado.' });
        }
        const [existingUsername] = await pool.query('SELECT id FROM Users WHERE username = ?', [username.trim()]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ message: 'Ese nombre de usuario ya está en uso.' });
        }

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Preparar datos
        const userRole = role || 'client';
        const isActive = status === 'inactive' ? false : true; 
        const userPlan = plan || 'Free'; 
        const userDepartment = department_id ? parseInt(department_id) : null;
        
        // Evitar nulos en campos de texto
        const finalPhone = phone || ''; 
        const finalCuit = cuit || '';
        const finalBusiness = business_name || '';
        const finalFantasy = fantasy_name || '';

        // --- 🚀 LÓGICA DE EMPRESA INTELIGENTE ---
        let finalCompanyId = company_id ? parseInt(company_id) : null;

        // Si NO viene un ID de empresa (registro público) pero SÍ un nombre de empresa
        if (!finalCompanyId && finalBusiness.trim() !== '') {
            try {
                // A. Buscar si ya existe una empresa con ese nombre exacto
                const [existingCompany] = await pool.query(
                    'SELECT id FROM Companies WHERE name = ? LIMIT 1', 
                    [finalBusiness]
                );

                if (existingCompany.length > 0) {
                    // Si existe, usamos su ID
                    finalCompanyId = existingCompany[0].id;
                } else {
                    // B. Si no existe, la CREAMOS automáticamente
                    console.log(`🏢 Creando empresa automática: ${finalBusiness}`);
                    const [newComp] = await pool.query(
                        `INSERT INTO Companies (name, email, phone, address, is_active, created_at) 
                         VALUES (?, ?, ?, '', 1, NOW())`,
                        [finalBusiness, email, finalPhone] // Usamos contacto del usuario como inicial
                    );
                    finalCompanyId = newComp.insertId;
                }
            } catch (err) {
                console.error("Error auto-asignando empresa:", err);
                // Si falla, seguimos sin ID para no bloquear el registro
            }
        }

        // 5. Insertar Usuario (full_name para identificación, username para login)
        const finalFullName = (full_name || '').trim() || username;
        const finalUsername = username.trim();

        const canHavePerms = userRole === 'agent' || userRole === 'supervisor' || userRole === 'viewer';
        const permsVal = canHavePerms && Array.isArray(permissions) && permissions.length > 0
            ? JSON.stringify(permissions.filter(p => NEW_PERMISSIONS.includes(p)))
            : canHavePerms ? '["tickets_view","tickets_reply"]' : null;

        const hasPermissions = permsVal !== null;
        const hasTechFinances = (userRole === 'agent' && can_manage_tech_finances === true);
        const contractedServicesStr = Array.isArray(contracted_services)
            ? JSON.stringify(contracted_services)
            : (typeof contracted_services === 'string' ? contracted_services : null);
        const finalBillingType = (billing_type || '').trim() || null;
        const hasBilling = finalBillingType !== null;
        const hasContractedServices = contractedServicesStr !== null && contractedServicesStr !== '';
        const sql = `
            INSERT INTO Users (
                username, full_name, email, password, role, is_active, 
                phone, cuit, business_name, fantasy_name, 
                company_id, department_id, plan, last_login
                ${hasPermissions ? ', permissions' : ''}
                ${hasTechFinances ? ', can_manage_tech_finances' : ''}
                ${hasBilling ? ', billing_type' : ''}
                ${hasContractedServices ? ', contracted_services' : ''}
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
                ${hasPermissions ? ', ?' : ''}
                ${hasTechFinances ? ', ?' : ''}
                ${hasBilling ? ', ?' : ''}
                ${hasContractedServices ? ', ?' : ''}
            )
        `;
        const insertValues = [
            finalUsername, finalFullName, email, hashedPassword, userRole, isActive,
            finalPhone, finalCuit, finalBusiness, finalFantasy, finalCompanyId, userDepartment, userPlan
        ];
        if (hasPermissions) insertValues.push(permsVal);
        if (hasTechFinances) insertValues.push(1);
        if (hasBilling) insertValues.push(finalBillingType);
        if (hasContractedServices) insertValues.push(contractedServicesStr);
        
        try {
            await pool.query(sql, insertValues);
        } catch (colErr) {
            if (colErr.code === 'ER_BAD_FIELD_ERROR' && colErr.sqlMessage?.includes('full_name')) {
                await pool.query(
                    `INSERT INTO Users (username, email, password, role, is_active, phone, cuit, business_name, fantasy_name, company_id, department_id, plan, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [finalUsername, email, hashedPassword, userRole, isActive, finalPhone, finalCuit, finalBusiness, finalFantasy, finalCompanyId, userDepartment, userPlan]
                );
            } else {
                throw colErr;
            }
        }

        res.status(201).json({ success: true, message: 'Usuario registrado correctamente.' });

    } catch (error) {
        console.error("Error en registerUser:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const loginUser = async (req, res) => {
    try {
        console.log('[Login] Intento de login recibido');
        const { email, password } = req.body;
        if (!email || !password) {
            console.log('[Login] Faltan credenciales: email=', !!email, 'password=', !!password);
            return res.status(400).json({ message: 'Faltan credenciales.' });
        }

        // Aceptar login por email O por nombre de usuario (sin exigir @)
        const identifier = (email || '').trim();
        const [users] = await pool.query(
            'SELECT * FROM Users WHERE email = ? OR username = ? LIMIT 1',
            [identifier, identifier]
        );
        const user = users[0];

        if (!user) {
            console.log('[Login] Usuario no encontrado para identificador:', identifier);
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            console.log('[Login] Contraseña incorrecta para usuario id:', user.id);
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }

        if (!user.is_active) return res.status(403).json({ message: 'Cuenta desactivada.' });

        // Verificar inactividad
        if (user.last_login) {
            const last = new Date(user.last_login).getTime();
            const now = new Date().getTime();
            if ((now - last) > INACTIVITY_LIMIT) {
                await pool.query('UPDATE Users SET is_active = false WHERE id = ?', [user.id]);
                return res.status(403).json({ message: 'Cuenta bloqueada por inactividad.' });
            }
        }

        await pool.query('UPDATE Users SET last_login = NOW() WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const perms = parsePermissions(user.permissions);
        res.json({
            success: true,
            message: 'Bienvenido',
            token,
            user: {
                id: user.id, username: user.username, full_name: user.full_name, email: user.email,
                role: user.role, business_name: user.business_name, plan: user.plan,
                permissions: perms,
                can_manage_tech_finances: Boolean(user.can_manage_tech_finances)
            },
        });
    } catch (error) {
        console.error('[Login] Error en login:', error);
        res.status(500).json({ message: 'Error de servidor.' });
    }
};

const getMe = async (req, res) => {
    try {
        if (!req.user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        let users;
        try {
            [users] = await pool.query('SELECT id, username, full_name, email, role, phone, business_name, fantasy_name, cuit, plan, company_id, permissions, can_manage_tech_finances FROM Users WHERE id = ?', [req.user.id]);
        } catch (colErr) {
            if (colErr.code === 'ER_BAD_FIELD_ERROR') {
                if (colErr.sqlMessage?.includes('can_manage_tech_finances')) {
                    [users] = await pool.query('SELECT id, username, full_name, email, role, phone, business_name, fantasy_name, cuit, plan, company_id, permissions FROM Users WHERE id = ?', [req.user.id]);
                    if (users[0]) users[0].can_manage_tech_finances = false;
                } else if (colErr.sqlMessage?.includes('full_name')) {
                    [users] = await pool.query('SELECT id, username, email, role, phone, business_name, fantasy_name, cuit, plan, company_id, permissions, can_manage_tech_finances FROM Users WHERE id = ?', [req.user.id]);
                    if (users[0]) users[0].full_name = users[0].username;
                } else if (colErr.sqlMessage?.includes('permissions')) {
                    [users] = await pool.query('SELECT id, username, full_name, email, role, phone, business_name, fantasy_name, cuit, plan, company_id, can_manage_tech_finances FROM Users WHERE id = ?', [req.user.id]);
                } else throw colErr;
            } else throw colErr;
        }
        const u = users[0];
        if (!u) return res.status(404).json({ message: 'Usuario no encontrado.' });
        res.json({ success: true, user: { ...u, permissions: parsePermissions(u.permissions), can_manage_tech_finances: Boolean(u.can_manage_tech_finances) } });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
};

const activateAccount = async (req, res) => { res.json({ message: 'OK' }); };

// --- Recuperación de contraseña ---
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Ingresá tu correo electrónico.' });
        }

        const [users] = await pool.query('SELECT id, email, full_name, username FROM Users WHERE email = ? AND status = ?', [email.trim(), 'active']);
        const user = users[0];

        // Siempre respondemos éxito para no revelar si el email existe
        if (!user) {
            return res.json({ success: true, message: 'Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
        }

        // Generar token único
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // Crear tabla si no existe (fallback)
        try {
            await pool.query(
                `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
                [user.id, token, expiresAt]
            );
        } catch (tableErr) {
            if (tableErr.message?.includes("doesn't exist")) {
                return res.status(503).json({ message: 'Función de recuperación no disponible. Contactá al administrador.' });
            }
            throw tableErr;
        }

        // Enviar email
        try {
            await sendPasswordResetEmail(user.email, token, user.full_name || user.username);
        } catch (mailErr) {
            console.error('Error enviando email de recuperación:', mailErr);
            return res.status(500).json({ message: 'No se pudo enviar el correo. Verificá la configuración de email del servidor.' });
        }

        res.json({ success: true, message: 'Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    } catch (error) {
        console.error('forgotPassword error:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: 'Token y contraseña son obligatorios.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const [rows] = await pool.query(
            `SELECT prt.*, u.id as user_id FROM password_reset_tokens prt
             JOIN Users u ON prt.user_id = u.id
             WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > NOW()`,
            [token]
        );

        if (!rows || rows.length === 0) {
            return res.status(400).json({ message: 'El enlace expiró o ya fue usado. Solicitá uno nuevo.' });
        }

        const record = rows[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query('UPDATE Users SET password = ? WHERE id = ?', [hashedPassword, record.user_id]);
        await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [record.id]);

        res.json({ success: true, message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
    } catch (error) {
        console.error('resetPassword error:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

module.exports = { registerUser, loginUser, getMe, activateAccount, forgotPassword, resetPassword };