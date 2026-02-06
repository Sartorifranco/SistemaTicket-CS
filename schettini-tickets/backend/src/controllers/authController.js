const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 6 Meses en milisegundos (180 días)
const INACTIVITY_LIMIT = 180 * 24 * 60 * 60 * 1000; 

// ✅ --- registerUser (Adaptado para Registro Público y Creación por Admin) ---
const registerUser = async (req, res) => {
    try {
        // Recibimos todos los campos posibles, incluyendo los de admin (company_id, plan, etc.)
        const { 
            username, email, password, phone, cuit, 
            business_name, fantasy_name, 
            role, status, company_id, department_id, plan 
        } = req.body;

        // 1. Validaciones Básicas (Solo lo esencial es obligatorio para todos)
        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: 'Usuario, Email y Contraseña son obligatorios.' 
            });
        }

        // 2. Verificar duplicados (Email)
        const [existingUser] = await pool.query(
            'SELECT id FROM Users WHERE email = ?', 
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                message: 'El correo electrónico ya está registrado.' 
            });
        }

        // 3. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Definir valores finales (Prioridad a lo que venga del body, sino defaults)
        const userRole = role || 'client';
        // Si status viene (del admin), lo usamos. Si no, por defecto es true (activo)
        const isActive = status === 'inactive' ? false : true; 
        const userPlan = plan || 'Free'; 
        const userCompany = company_id ? parseInt(company_id) : null;
        const userDepartment = department_id ? parseInt(department_id) : null;

        // 5. Insertar Usuario
        // Nota: Agregamos company_id, department_id y plan al INSERT
        const sql = `
            INSERT INTO Users (
                username, email, password, role, is_active, 
                phone, cuit, business_name, fantasy_name, 
                company_id, department_id, plan, last_login
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await pool.query(sql, [
            username, 
            email, 
            hashedPassword, 
            userRole, 
            isActive, 
            phone || null, 
            cuit || null, 
            business_name || null, 
            fantasy_name || null,
            userCompany,     // ✅ Se guarda la empresa
            userDepartment,  // ✅ Se guarda el departamento
            userPlan         // ✅ Se guarda el plan seleccionado
        ]);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente.',
        });

    } catch (error) {
        console.error("Error en registerUser:", error);
        res.status(500).json({ message: 'Error en el servidor al crear la cuenta.' });
    }
};

// ✅ --- loginUser (Con control de inactividad 6 meses) ---
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Faltan credenciales.' });
        }

        // Buscar usuario
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        // 1. Verificar si está desactivado manualmente (ban)
        if (!user.is_active) {
            return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta a soporte.' });
        }

        // 2. 🔒 VERIFICAR INACTIVIDAD (6 MESES)
        if (user.last_login) {
            const lastLoginDate = new Date(user.last_login).getTime();
            const currentDate = new Date().getTime();
            
            if ((currentDate - lastLoginDate) > INACTIVITY_LIMIT) {
                // Bloquear automáticamente
                await pool.query('UPDATE Users SET is_active = false WHERE id = ?', [user.id]);
                return res.status(403).json({ 
                    message: 'Cuenta bloqueada por inactividad (+6 meses). Debes solicitar el desbloqueo a soporte.' 
                });
            }
        }

        // 3. Actualizar fecha de último login (Resetear contador)
        await pool.query('UPDATE Users SET last_login = NOW() WHERE id = ?', [user.id]);

        // 4. Generar Token
        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                business_name: user.business_name,
                plan: user.plan // Enviamos el plan al front también
            },
        });

    } catch (error) {
        console.error("Error en loginUser:", error);
        res.status(500).json({ message: 'Error interno al iniciar sesión.' });
    }
};

const getMe = async (req, res) => {
    try {
        if (!req.user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        // Devolver datos actualizados
        const [users] = await pool.query('SELECT id, username, email, role, phone, business_name, fantasy_name, cuit, plan, company_id FROM Users WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: users[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener perfil.' });
    }
};

const activateAccount = async (req, res) => {
    res.json({ message: 'Activación no requerida.' });
};

module.exports = { registerUser, loginUser, getMe, activateAccount };