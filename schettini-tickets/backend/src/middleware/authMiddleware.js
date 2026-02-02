const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener el token del encabezado
            token = req.headers.authorization.split(' ')[1];

            // Decodificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // ✅ CORRECCIÓN CRÍTICA:
            // Solo seleccionamos columnas que SÍ existen en tu tabla Users.
            // Eliminamos 'department_id' y 'company_id' de la consulta.
            const [users] = await pool.query(
                'SELECT id, username, email, role, status FROM Users WHERE id = ?', 
                [decoded.id]
            );

            // Verificar si el usuario existe
            if (users.length === 0) {
                res.status(401);
                throw new Error('Usuario no encontrado con este token');
            }

            req.user = users[0];

            // Verificar si está activo
            if (req.user.status !== 'active') {
                res.status(401);
                throw new Error('Tu cuenta está desactivada');
            }

            next();
        } catch (error) {
            console.error('[AuthMiddleware] Error:', error.message);
            res.status(401);
            throw new Error('No autorizado, token fallido');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('No autorizado, no hay token');
    }
});

// Middleware para roles (admin, agent, etc.)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Rol ${req.user ? req.user.role : 'desconocido'} no autorizado`);
        }
        next();
    };
};

// Exportamos 'protect' también como 'authenticateToken' para compatibilidad
module.exports = { 
    protect, 
    authenticateToken: protect, 
    authorize 
};