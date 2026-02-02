// backend/src/utils/notificationSender.js
const pool = require('../config/db'); // Asumiendo que necesitas el pool para guardar en DB

/**
 * Envía una notificación a un usuario específico o a un rol.
 * Si userId es null, se asume que es una notificación general para un rol (ej. 'admin').
 *
 * @param {number | null} userId - El ID del usuario a notificar. Si es null, se usa el rol.
 * @param {string} message - El mensaje de la notificación.
 * @param {string} type - El tipo de notificación (ej. 'new_ticket', 'ticket_updated', 'system_alert').
 * @param {number | null} targetId - El ID del recurso relacionado (ej. ticket_id).
 * @param {string | null} role - El rol a notificar si userId es null (ej. 'admin').
 */
const sendNotification = async (userId, message, type, targetId = null, role = null) => {
    try {
        // Guardar la notificación en la base de datos
        // Asegúrate de que tu tabla 'notifications' tiene estas columnas
        await pool.query(
            `INSERT INTO notifications (user_id, message, type, is_read, target_id)
             VALUES ($1, $2, $3, FALSE, $4)`,
            [userId, message, type, targetId]
        );
        console.log(`[NotificationSender] Notificación guardada para ${userId || role}: ${message}`);

        // NOTA: La lógica para emitir a través de Socket.IO se maneja
        // directamente en los controladores (ej. ticketController)
        // usando `req.app.get('io')` para tener acceso a la instancia de `io`.
        // Esto evita que `notificationSender` tenga una dependencia directa de `io`.

    } catch (error) {
        console.error('[NotificationSender] Error al enviar/guardar notificación:', error);
        // Podrías añadir un log más detallado o un sistema de reintentos aquí
    }
};

module.exports = {
    sendNotification,
};
