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

        const query = `
            INSERT INTO activity_logs
            (user_id, action, description, user_username, user_role, activity_type, action_type, target_type, target_id, old_value, new_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            userId,
            actionType, // Columna 'action' (legacy, requerida)
            description,
            username,
            userRole,
            actionType,
            actionType,
            targetType,
            targetId,
            oldValJson,
            newValJson,
        ];

        await pool.execute(query, values);
        console.log('[ACTIVITY LOGGER] Actividad registrada:', description);

    } catch (error) {
        console.error('[ACTIVITY LOGGER ERROR] Error al registrar actividad:', error);
    }
};

module.exports = {
    createActivityLog,
};
