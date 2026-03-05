const pool = require('../config/db');

/**
 * Función global exportable: crea una notificación en la DB y, si hay Socket.io, la emite en tiempo real al usuario.
 * @param {number} userId - ID del usuario destinatario.
 * @param {string} title - Título (opcional); se guarda junto al mensaje en el campo message).
 * @param {string} message - Texto de la notificación.
 * @param {string} type - Tipo: 'info', 'alert', 'promotion', etc.
 * @param {object} [io] - Instancia de Socket.IO (opcional). Si existe, emite el evento al usuario.
 * @param {number} [relatedId] - ID del recurso relacionado (ticket_id, repair_order_id, etc.).
 * @param {string} [relatedType] - Tipo: 'ticket', 'repair_order', 'comment', etc.
 * @returns {Promise<number|null>} - ID de la notificación insertada o null si falla.
 */
const createNotification = async (userId, title, message, type = 'info', io = null, relatedId = null, relatedType = null) => {
    try {
        const fullMessage = title && String(title).trim() ? `${String(title).trim()}|||${message}` : message;
        const [result] = await pool.execute(
            'INSERT INTO notifications (user_id, type, message, related_id, related_type, is_read) VALUES (?, ?, ?, ?, ?, 0)',
            [userId, type || 'info', fullMessage, relatedId || null, relatedType || null]
        );
        const notifId = result.insertId;
        if (io) {
            io.to(`user-${userId}`).emit('notification', {
                id: notifId,
                user_id: userId,
                type: type || 'info',
                message: fullMessage,
                related_id: relatedId || null,
                related_type: relatedType || null,
                is_read: false,
                created_at: new Date()
            });
        }
        return notifId;
    } catch (error) {
        console.error(`Error createNotification para usuario ${userId}:`, error);
        return null;
    }
};

/**
 * Crea una notificación en la DB y envía un evento de socket a un usuario específico.
 * @param {object} io - La instancia del servidor de Socket.IO.
 * @param {object} notificationData - Datos de la notificación { user_id, message, type, related_id, related_type }.
 */
const createAndSendNotification = async (io, notificationData) => {
    try {
        const { user_id, message, type, related_id, related_type } = notificationData;
        
        // 1. Guardar la notificación en la base de datos
        await pool.execute(
            'INSERT INTO notifications (user_id, message, type, related_id, related_type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, message, type, related_id || null, related_type || null, false]
        );

        // 2. Emitir evento de socket a la sala personal del usuario
        if (io) {
            io.to(`user-${user_id}`).emit('newNotification', { message });
        }
    } catch (error) {
        console.error(`Error al crear notificación para el usuario ${notificationData.user_id}:`, error);
    }
};

/**
 * --- CAMBIO: La función ahora notifica solo a los admins y a los agentes del departamento específico.
 * Notifica a los administradores y/o agentes relevantes sobre un evento.
 * @param {object} req - El objeto de la petición de Express (para acceder a 'io' y 'user').
 * @param {object} data - Los datos de la notificación { message, type, ticketId, departmentId? }.
 */
const notifyAdminsAndAgents = async (req, data) => {
    // --- CAMBIO: Se extrae departmentId de los datos.
    const { message, type, ticketId, departmentId } = data;
    const io = req.io;

    try {
        // --- CAMBIO: La consulta ahora es dinámica para filtrar por departamento.
        let getUsersQuery = "SELECT id FROM Users WHERE role = 'admin'";
        const queryParams = [];

        // Si se está creando un nuevo ticket, se notifica también a los agentes del departamento correspondiente.
        if (type === 'new_ticket' && departmentId) {
            getUsersQuery += " OR (role = 'agent' AND department_id = ?)";
            queryParams.push(departmentId);
        } else if (type !== 'new_ticket') {
            // Para otros eventos (como eliminación), notificar a todos los agentes.
            // Si quieres que la eliminación también sea por departamento, puedes ajustar esta lógica.
            getUsersQuery += " OR role = 'agent'";
        }
        
        const [usersToNotify] = await pool.execute(getUsersQuery, queryParams);

        if (usersToNotify.length > 0) {
            console.log(`[NotificationManager] Notificando a ${usersToNotify.length} usuarios relevantes.`);
            
            for (const user of usersToNotify) {
                // No notificar al usuario que originó la acción
                if (user.id !== req.user.id) {
                    await createAndSendNotification(io, {
                        user_id: user.id,
                        message: message,
                        type: type,
                        related_id: ticketId,
                        related_type: 'ticket'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error en notifyAdminsAndAgents:', error);
    }
};

module.exports = { createNotification, createAndSendNotification, notifyAdminsAndAgents };
