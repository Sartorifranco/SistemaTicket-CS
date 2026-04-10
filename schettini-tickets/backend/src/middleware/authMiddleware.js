const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let users;
            try {
                [users] = await pool.query(
                    'SELECT id, username, email, role, status, is_active, can_manage_tech_finances, permissions FROM Users WHERE id = ?',
                    [decoded.id]
                );
            } catch (colErr) {
                // Fallback robusto: manejar cada columna faltante por separado
                // IMPORTANTE: si solo falta 'permissions', preservar can_manage_tech_finances y viceversa
                const missingPerms = colErr.message?.includes('permissions');
                const missingCanManage = colErr.message?.includes('can_manage_tech_finances');
                const missingStatus = colErr.message?.includes('status');

                if (missingPerms && !missingCanManage) {
                    // Solo falta 'permissions': consultar sin esa columna pero preservar can_manage_tech_finances
                    [users] = await pool.query(
                        'SELECT id, username, email, role, status, is_active, can_manage_tech_finances FROM Users WHERE id = ?',
                        [decoded.id]
                    );
                    if (users[0]) users[0].permissions = null;
                } else if (missingCanManage && !missingPerms) {
                    // Solo falta 'can_manage_tech_finances': consultar sin esa columna pero preservar permissions
                    [users] = await pool.query(
                        'SELECT id, username, email, role, status, is_active, permissions FROM Users WHERE id = ?',
                        [decoded.id]
                    );
                    if (users[0]) users[0].can_manage_tech_finances = false;
                } else if (missingPerms || missingCanManage) {
                    // Ambas columnas faltan: fallback mínimo
                    try {
                        [users] = await pool.query(
                            'SELECT id, username, email, role, status, is_active FROM Users WHERE id = ?',
                            [decoded.id]
                        );
                    } catch (innerErr) {
                        [users] = await pool.query(
                            'SELECT id, username, email, role, is_active FROM Users WHERE id = ?',
                            [decoded.id]
                        );
                    }
                    if (users[0]) {
                        users[0].can_manage_tech_finances = false;
                        users[0].permissions = null;
                    }
                } else if (missingStatus) {
                    [users] = await pool.query(
                        'SELECT id, username, email, role, is_active, can_manage_tech_finances, permissions FROM Users WHERE id = ?',
                        [decoded.id]
                    );
                } else throw colErr;
            }

            if (!users || users.length === 0) {
                res.status(401);
                throw new Error('Usuario no encontrado');
            }

            // Normalizar para evitar Buffer/encoding en MySQL (ENUM puede venir raro)
            const u = users[0];
            let permissions = [];
            try {
                if (u.permissions) {
                    const arr = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
                    permissions = Array.isArray(arr) ? arr : [];
                }
            } catch (_) {}

            // Verificar cuenta activa: soporta columna `status` (texto) y/o `is_active` (boolean)
            const statusStr = String(u.status || '').toLowerCase().trim();
            const isActiveFlag = u.is_active !== undefined ? Boolean(u.is_active) : true;
            const isAccountActive = statusStr === 'active' || (statusStr === '' && isActiveFlag);

            req.user = {
                id: Number(u.id),
                username: String(u.username || ''),
                email: String(u.email || ''),
                role: String(u.role || '').toLowerCase().trim(),
                status: statusStr || (isActiveFlag ? 'active' : 'inactive'),
                can_manage_tech_finances: Boolean(u.can_manage_tech_finances),
                permissions
            };

            if (!isAccountActive) {
                res.status(401);
                throw new Error('Cuenta desactivada');
            }

            // Rol Vista (viewer): solo lectura; rechazar POST, PUT, PATCH, DELETE excepto login
            if (req.user.role === 'viewer' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                const isLogin = req.originalUrl.includes('/api/auth/login') || req.path.endsWith('/login');
                if (!isLogin) {
                    res.status(403).json({ message: 'Rol Vista: solo lectura. No puede realizar esta acción.' });
                    return;
                }
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

/**
 * Autoriza por permiso configurable desde el admin (Usuarios > Permisos).
 * Admin siempre pasa. Para el resto, se requiere tener al menos uno de los permisos indicados.
 * Los permisos se cargan en req.user.permissions (array) desde la columna Users.permissions.
 */
const authorizeByPermission = (...allowedPerms) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(403);
            throw new Error('No autorizado');
        }
        if (req.user.role === 'admin') return next();
        const userPerms = req.user.permissions || [];
        const hasAny = allowedPerms.some(p => userPerms.includes(p));
        if (!hasAny) {
            console.log(`⛔ [Auth] Sin permiso. Rol: ${req.user.role} (id:${req.user.id}), requiere uno de: ${allowedPerms.join(', ')}, URL: ${req.originalUrl}`);
            res.status(403);
            throw new Error(`No tenés permiso para esta acción. Requiere: ${allowedPerms.join(' o ')}`);
        }
        next();
    };
};

/** Finanzas Técnicas: admin y supervisor siempre; agent/viewer si can_manage_tech_finances o permiso tech_finances */
const authorizeTechFinances = (req, res, next) => {
    if (!req.user) {
        res.status(403);
        throw new Error('No autorizado');
    }
    if (req.user.role === 'admin' || req.user.role === 'supervisor') return next();
    const perms = req.user.permissions || [];
    console.log(`[TechFin] Verificando: id=${req.user.id} rol=${req.user.role} can_manage=${req.user.can_manage_tech_finances} perms=${JSON.stringify(perms)} URL=${req.originalUrl}`);
    if ((req.user.role === 'agent' || req.user.role === 'viewer') && (req.user.can_manage_tech_finances === true || perms.includes('tech_finances'))) return next();
    console.log(`⛔ [Auth] Finanzas Técnicas denegado. Rol: ${req.user.role}, can_manage_tech_finances: ${req.user.can_manage_tech_finances}`);
    res.status(403);
    throw new Error('No tenés permiso para Finanzas Técnicas');
};

/** Admin siempre; agent/supervisor/viewer con permiso reports_view */
const authorizeReports = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(403);
        throw new Error('No autorizado');
    }
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'agent' || req.user.role === 'supervisor' || req.user.role === 'viewer') {
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

module.exports = { protect, optionalProtect, authenticateToken: protect, authorize, authorizeByPermission, authorizeReports, authorizeTechFinances };