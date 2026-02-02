const pool = require('../config/db'); // Importa tu conexión a la base de datos

/**
 * Crea una notificación en la base de datos para un usuario específico o para todos los administradores.
 * @param {string} message - El mensaje de la notificación.
 * @param {string} type - El tipo de notificación (ej. 'info', 'warning', 'success', 'error').
 * @param {number} [userId=null] - El ID del usuario específico a notificar. Si es null, notifica a todos los administradores.
 * @param {number} [relatedId=null] - El ID de la entidad relacionada (ej. ticket_id).
 * @param {string} [relatedType=null] - El tipo de entidad relacionada (ej. 'ticket', 'user', 'department').
 */
const createNotification = async (message, type, userId = null, relatedId = null, relatedType = null) => {
    try {
        if (userId) {
            // Notificar a un usuario específico
            await pool.execute(
                `INSERT INTO notifications (user_id, message, type, related_id, related_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, message, type, relatedId, relatedType]
            );
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[NotificationUtil] Notificación creada para usuario ${userId}: ${message}`);
            }
        } else {
            // Notificar a todos los administradores
            const [adminUsers] = await pool.execute('SELECT id FROM users WHERE role = ?', ['admin']);
            for (const admin of adminUsers) {
                await pool.execute(
                    `INSERT INTO notifications (user_id, message, type, related_id, related_type)
                     VALUES (?, ?, ?, ?, ?)`,
                    [admin.id, message, type, relatedId, relatedType]
                );
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[NotificationUtil] Notificación creada para admin ${admin.id}: ${message}`);
                }
            }
        }
    } catch (error) {
        console.error('[NotificationUtil] Error al crear notificación:', error);
    }
};

module.exports = { createNotification };
