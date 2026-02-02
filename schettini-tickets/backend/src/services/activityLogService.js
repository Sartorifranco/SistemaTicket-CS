// backend/src/services/activityLogService.js
const pool = require('../config/db'); // Asegúrate de que esta ruta sea correcta para tu conexión a la DB

/**
 * Registra una actividad en la tabla activity_logs.
 * @param {number} userId - ID del usuario que realiza la acción.
 * @param {string} username - Nombre de usuario del usuario que realiza la acción.
 * @param {string} userRole - Rol del usuario que realiza la acción.
 * @param {string} actionType - Tipo de acción (ej: 'user', 'ticket', 'comment').
 * @param {string} description - Descripción detallada de la actividad.
 * @param {string|null} targetType - Tipo del objetivo de la acción (ej: 'ticket', 'user').
 * @param {number|null} targetId - ID del objetivo de la acción.
 * @param {object|null} oldValue - Valor antiguo del objetivo (como objeto, se serializará a JSON).
 * @param {object|null} newValue - Nuevo valor del objetivo (como objeto, se serializará a JSON).
 */
const logActivity = async (
    userId,
    username,
    userRole,
    actionType,
    description,
    targetType = null,
    targetId = null,
    oldValue = null,
    newValue = null
) => {
    try {
        console.log(`[ActivityLogService] Intentando registrar actividad: 
            userId=${userId}, username=${username}, role=${userRole}, actionType=${actionType}, description=${description}, 
            targetType=${targetType}, targetId=${targetId}, oldValue=`, oldValue, `, newValue=`, newValue);

        const query = `
            INSERT INTO activity_logs 
            (user_id, user_username, user_role, action_type, description, target_type, target_id, old_value, new_value) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Serializar objetos JSON a string para la base de datos
        const serializedOldValue = oldValue ? JSON.stringify(oldValue) : null;
        const serializedNewValue = newValue ? JSON.stringify(newValue) : null;

        const [result] = await pool.execute(query, [
            userId,
            username,
            userRole,
            actionType,
            description,
            targetType,
            targetId,
            serializedOldValue,
            serializedNewValue
        ]);
        console.log(`[ActivityLogService] Actividad registrada exitosamente. InsertId: ${result.insertId}`);
    } catch (error) {
        console.error('[ActivityLogService] Error al registrar actividad:', error);
        // Considera no lanzar el error para no bloquear la operación principal de la app
    }
};

module.exports = {
    logActivity,
};
