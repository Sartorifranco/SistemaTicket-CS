const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

const getActivityLogs = asyncHandler(async (req, res) => {
    let query = `
        SELECT log.*, u.username as username 
        FROM activity_logs log
        LEFT JOIN users u ON log.user_id = u.id
    `;
    const params = [];
    const whereClauses = [];

    // Esta parte está bien y es segura.
    if (req.query.user_id) {
        whereClauses.push('log.user_id = ?');
        params.push(req.query.user_id);
    }
    
    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' ORDER BY log.created_at DESC';

    // --- SECCIÓN CORREGIDA ---
    // El valor de LIMIT no puede ser un parámetro "?". Debe ser un número insertado directamente.
    if (req.query.limit) {
        // 1. Convertimos el límite a un número entero.
        const limit = parseInt(req.query.limit, 10);

        // 2. Validamos que sea un número positivo para seguridad.
        if (!isNaN(limit) && limit > 0) {
            // 3. Lo añadimos directamente a la consulta. NO lo agregamos al array `params`.
            query += ` LIMIT ${limit}`;
        }
    }
    // --- FIN DE LA CORRECCIÓN ---

    // La consulta ahora se ejecuta con los parámetros correctos (solo el de user_id si existe).
    const [logs] = await pool.execute(query, params);

    res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
    });
});

module.exports = {
    getActivityLogs,
};