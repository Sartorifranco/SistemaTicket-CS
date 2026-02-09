const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 6 Meses en milisegundos
const INACTIVITY_LIMIT = 180 * 24 * 60 * 60 * 1000; 

// ✅ REGISTER USER MEJORADO (Auto-creación de Empresa)
const registerUser = async (req, res) => {
    try {
        const { 
            username, email, password, phone, cuit, 
            business_name, fantasy_name, 
            role, status, company_id, department_id, plan 
        } = req.body;

        // 1. Validaciones
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Faltan datos obligatorios (Usuario, Email, Pass).' });
        }

        // 2. Verificar usuario duplicado
        const [existingUser] = await pool.query('SELECT id FROM Users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'El correo ya está registrado.' });
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

        // 5. Insertar Usuario
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
            finalPhone,     
            finalCuit,      
            finalBusiness,  
            finalFantasy,   
            finalCompanyId, // ✅ Ahora lleva el ID (existente o nuevo)
            userDepartment, 
            userPlan         
        ]);

        res.status(201).json({ success: true, message: 'Usuario registrado correctamente.' });

    } catch (error) {
        console.error("Error en registerUser:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Faltan credenciales.' });

        const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
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

        res.json({
            success: true,
            message: 'Bienvenido',
            token,
            user: {
                id: user.id, username: user.username, email: user.email,
                role: user.role, business_name: user.business_name, plan: user.plan
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error de servidor.' });
    }
};

const getMe = async (req, res) => {
    try {
        if (!req.user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        const [users] = await pool.query('SELECT id, username, email, role, phone, business_name, fantasy_name, cuit, plan, company_id FROM Users WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: users[0] });
    } catch (error) { res.status(500).json({ message: 'Error.' }); }
};

const activateAccount = async (req, res) => { res.json({ message: 'OK' }); };

module.exports = { registerUser, loginUser, getMe, activateAccount };