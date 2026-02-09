const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const [users] = await pool.query(
                'SELECT id, username, email, role, status FROM Users WHERE id = ?', 
                [decoded.id]
            );

            if (users.length === 0) {
                res.status(401);
                throw new Error('Usuario no encontrado');
            }

            req.user = users[0];

            if (req.user.status !== 'active') {
                res.status(401);
                throw new Error('Cuenta desactivada');
            }

            next();
        } catch (error) {
            console.error('❌ [Auth] Error:', error.message);
            res.status(401);
            throw new Error('No autorizado');
        }
    } else {
        res.status(401);
        throw new Error('No autorizado, sin token');
    }
});

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.log(`⛔ [Auth] Acceso denegado. Rol: ${req.user?.role}`);
            res.status(403);
            throw new Error(`Rol ${req.user ? req.user.role : 'desconocido'} no autorizado`);
        }
        next();
    };
};

module.exports = { protect, authenticateToken: protect, authorize };