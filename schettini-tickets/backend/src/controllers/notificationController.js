const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
// --- ¡CORRECCIÓN CLAVE AQUÍ! ---
// La ruta correcta para los servicios es '../services/activityLogService'
const { logActivity } = require('../services/activityLogService');

// @desc    Obtener todas las notificaciones para el usuario autenticado
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const [notifications] = await pool.execute(
        `SELECT id, user_id, type, message, related_id, related_type, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [req.user.id]
    );
    // Se estandariza la respuesta para que siempre devuelva un objeto con una propiedad 'data'
    res.status(200).json({ success: true, data: notifications });
});

// @desc    Obtener el conteo de notificaciones no leídas
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadNotificationCount = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const [result] = await pool.execute(
        `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
        [req.user.id]
    );
    res.status(200).json({ count: result[0].count });
});

// @desc    Marcar notificación como leída
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const [notificationRows] = await pool.execute(
        `SELECT * FROM notifications WHERE id = ?`,
        [id]
    );
    const notification = notificationRows[0];

    if (!notification) {
        res.status(404);
        throw new Error('Notificación no encontrada.');
    }

    if (notification.user_id !== req.user.id) {
        res.status(403);
        throw new Error('No autorizado para marcar esta notificación.');
    }

    await pool.execute(
        `UPDATE notifications SET is_read = TRUE WHERE id = ?`,
        [id]
    );

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'notification_read',
        `marcó la notificación #${id} como leída`,
        'notification',
        parseInt(id),
        { is_read: false },
        { is_read: true }
    );

    res.status(200).json({ success: true, message: 'Notificación marcada como leída exitosamente.' });
});

// @desc    Marcar todas las notificaciones del usuario como leídas
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const [result] = await pool.execute(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
        [req.user.id]
    );

    if (result.affectedRows > 0) {
        await logActivity(
            req.user.id,
            req.user.username,
            req.user.role,
            'notification_read_all',
            `marcó ${result.affectedRows} notificaciones como leídas`,
            'user',
            req.user.id,
            null,
            null
        );
        res.status(200).json({ success: true, message: `${result.affectedRows} notificaciones marcadas como leídas.` });
    } else {
        res.status(200).json({ success: true, message: 'No hay notificaciones no leídas para marcar.' });
    }
});

// @desc    Eliminar notificación
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const [notificationRows] = await pool.execute(
        `SELECT * FROM notifications WHERE id = ?`,
        [id]
    );
    const notification = notificationRows[0];

    if (!notification) {
        res.status(404);
        throw new Error('Notificación no encontrada.');
    }

    if (notification.user_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('No autorizado para eliminar esta notificación.');
    }

    await pool.execute(
        `DELETE FROM notifications WHERE id = ?`,
        [id]
    );

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'notification_deleted',
        `eliminó la notificación #${id}`,
        'notification',
        parseInt(id),
        notification,
        null
    );

    res.status(200).json({ success: true, message: 'Notificación eliminada exitosamente.' });
});

// @desc    Eliminar todas las notificaciones del usuario
// @route   DELETE /api/notifications/delete-all
// @access  Private
const deleteAllNotifications = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    const [result] = await pool.execute(
        `DELETE FROM notifications WHERE user_id = ?`,
        [req.user.id]
    );

    if (result.affectedRows > 0) {
        await logActivity(
            req.user.id,
            req.user.username,
            req.user.role,
            'notification_deleted_all',
            `eliminó todas sus notificaciones (${result.affectedRows} en total)`,
            'user',
            req.user.id,
            null,
            null
        );
        res.status(200).json({ success: true, message: `Se eliminaron ${result.affectedRows} notificaciones.` });
    } else {
        res.status(200).json({ success: true, message: 'No hay notificaciones para eliminar.' });
    }
});

module.exports = {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    deleteAllNotifications
};
