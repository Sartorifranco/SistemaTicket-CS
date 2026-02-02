const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ --- registerUser (VERSIÓN CORREGIDA: SIN company_id) ---
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Validaciones
        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: 'Por favor, complete todos los campos (Usuario, Email, Contraseña).' 
            });
        }

        // 2. Verificar duplicados
        const [existingUser] = await pool.query(
            'SELECT id FROM Users WHERE username = ? OR email = ?', 
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                message: 'El nombre de usuario o el correo ya están registrados.' 
            });
        }

        // 3. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Insertar Usuario
        // ⚠️ CORRECCIÓN: Quitamos company_id y department_id porque tu base de datos no los tiene.
        const sql = `
            INSERT INTO Users (username, email, password, role, status) 
            VALUES (?, ?, ?, 'client', 'active')
        `;
        
        await pool.query(sql, [username, email, hashedPassword]);

        // 5. Responder éxito
        res.status(201).json({
            success: true,
            message: 'Registro exitoso. Iniciando sesión...',
        });

    } catch (error) {
        console.error("Error en registerUser:", error); // Esto muestra el error real en consola negra
        res.status(500).json({ message: 'Error en el servidor al crear la cuenta.' });
    }
};

// ✅ --- loginUser ---
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const identifier = email || req.body.username; 

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Faltan credenciales.' });
        }

        const [users] = await pool.query(
            'SELECT * FROM Users WHERE email = ? OR username = ?', 
            [identifier, identifier]
        );
        
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
        }

        if (user.status !== 'active') {
            return res.status(401).json({ message: 'Tu cuenta está desactivada.' });
        }

        // Generar Token JWT (Sin company_id para evitar errores)
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role, 
                username: user.username
            }, 
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
                role: user.role
            },
        });

    } catch (error) {
        console.error("Error en loginUser:", error);
        res.status(500).json({ message: 'Error interno al iniciar sesión.' });
    }
};

// ✅ --- getMe ---
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json({ success: true, user: req.user });
    } catch (error) {
        console.error("Error en getMe:", error);
        res.status(500).json({ message: 'Error al obtener perfil.' });
    }
};

const activateAccount = async (req, res) => {
    res.json({ message: 'Activación no requerida.' });
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    activateAccount
};