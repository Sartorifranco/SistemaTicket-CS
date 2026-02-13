// backend/src/utils/activityLogger.js
const pool = require('../config/db');

/**
 * Registra una actividad en la base de datos.
 * @param {number} userId - ID del usuario que realiza la actividad.
 * @param {string} targetType - Tipo de entidad afectada (ej. 'ticket', 'user', 'department').
 * @param {string} actionType - Tipo de acción realizada (ej. 'created', 'updated', 'deleted', 'login').
 * @param {string} description - Descripción detallada de la actividad.
 * @param {number | null} targetId - ID de la entidad afectada, si aplica.
 * @param {object | null} oldValue - Valor anterior de la entidad (para actualizaciones), si aplica.
 * @param {object | null} newValue - Nuevo valor de la entidad (para creaciones/actualizaciones), si aplica.
 */
const createActivityLog = async (userId, targetType, actionType, description, targetId = null, oldValue = null, newValue = null) => {
    try {
        // Convierte objetos a JSON string si no son null
        const oldValJson = oldValue ? JSON.stringify(oldValue) : null;
        const newValJson = newValue ? JSON.stringify(newValue) : null;

        // Opcional: Obtener username y user_role desde la DB si no se pasan
        let username = null;
        let userRole = null;
        if (userId) {
            const [userRows] = await pool.execute('SELECT username, role FROM Users WHERE id = ?', [userId]);
            if (userRows.length > 0) {
                username = userRows[0].username;
                userRole = userRows[0].role;
            }
        }

        const queries = [
            { sql: 'INSERT INTO activity_logs (user_id, description, user_username, user_role, activity_type, action_type, target_type, target_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', vals: [userId, description, username, userRole, actionType, actionType, targetType, targetId, oldValJson, newValJson] },
            { sql: 'INSERT INTO activity_logs (user_id, action_type, description) VALUES (?, ?, ?)', vals: [userId, actionType, description] },
            { sql: 'INSERT INTO activity_logs (user_id, description) VALUES (?, ?)', vals: [userId, description] }
        ];
        let ok = false;
        for (const q of queries) {
            try {
                await pool.execute(q.sql, q.vals);
                ok = true;
                break;
            } catch (err) {
                if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054) continue;
                throw err;
            }
        }
        if (!ok) return;
        console.log('[ACTIVITY LOGGER] Actividad registrada:', description);

    } catch (error) {
        console.error('[ACTIVITY LOGGER ERROR] Error al registrar actividad:', error);
    }
};

module.exports = {
    createActivityLog,
};
