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

            // Normalizar para evitar Buffer/encoding en MySQL (ENUM puede venir raro)
            const u = users[0];
            req.user = {
                id: Number(u.id),
                username: String(u.username || ''),
                email: String(u.email || ''),
                role: String(u.role || '').toLowerCase().trim(),
                status: String(u.status || '').toLowerCase().trim()
            };

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

// Opcional: setea req.user si hay token válido, sin fallar si no hay
const optionalProtect = asyncHandler(async (req, res, next) => {
    req.user = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [users] = await pool.query(
                'SELECT id, username, email, role, status FROM Users WHERE id = ?',
                [decoded.id]
            );
            if (users.length > 0) {
                const u = users[0];
                req.user = {
                    id: Number(u.id),
                    username: String(u.username || ''),
                    email: String(u.email || ''),
                    role: String(u.role || '').toLowerCase().trim(),
                    status: String(u.status || '').toLowerCase().trim()
                };
            }
        } catch (_) { /* ignorar token inválido */ }
    }
    next();
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

/** Admin siempre; agent/supervisor solo con permiso reports_view */
const authorizeReports = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(403);
        throw new Error('No autorizado');
    }
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'agent' || req.user.role === 'supervisor') {
        const [rows] = await pool.query(
            'SELECT permissions FROM Users WHERE id = ? AND status = ?',
            [req.user.id, 'active']
        );
        if (rows.length === 0) {
            res.status(403);
            throw new Error('Usuario no encontrado o inactivo');
        }
        let perms = [];
        try {
            const val = rows[0].permissions;
            if (val) {
                const arr = typeof val === 'string' ? JSON.parse(val) : val;
                perms = Array.isArray(arr) ? arr : [];
            }
        } catch (_) {}
        const hasView = perms.includes('reports_view');
        if (!hasView) {
            res.status(403);
            throw new Error('No tienes permiso para ver reportes');
        }
        return next();
    }
    res.status(403);
    throw new Error('Rol no autorizado para reportes');
});

module.exports = { protect, optionalProtect, authenticateToken: protect, authorize, authorizeReports };