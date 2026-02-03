const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// Función auxiliar segura para loguear actividad
const safeLogActivity = async (userId, username, role, action, description, entityType, entityId) => {
    try {
        // Intenta insertar solo si la tabla existe
        await pool.query(
            `INSERT INTO activity_logs (user_id, action, description, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`,
            [userId, action, description, entityType, entityId]
        );
    } catch (error) {
        // Si falla (ej: tabla no existe), solo lo ignoramos para no romper el flujo
        console.warn("No se pudo guardar el log de actividad:", error.message);
    }
};

// @desc Obtener notificaciones
const getNotifications = asyncHandler(async (req, res) => {
    const [notifications] = await pool.execute(
        `SELECT id, user_id, type, message, related_id, related_type, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [req.user.id]
    );
    res.status(200).json({ success: true, data: notifications });
});

// @desc Conteo de no leídas
const getUnreadNotificationCount = asyncHandler(async (req, res) => {
    const [result] = await pool.execute(
        `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
        [req.user.id]
    );
    res.status(200).json({ success: true, count: result[0].count });
});

// @desc Marcar como leída
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Verificar propiedad
    const [rows] = await pool.query('SELECT user_id FROM notifications WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Notificación no encontrada' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'No autorizado' });

    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
    
    res.status(200).json({ success: true, message: 'Marcada como leída' });
});

// @desc Marcar todas como leídas
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    await pool.execute(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [req.user.id]
    );
    res.status(200).json({ success: true, message: 'Todas marcadas como leídas' });
});

// @desc Eliminar notificación
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(200).json({ success: true, message: 'Eliminada' });
});

// @desc Eliminar todas
const deleteAllNotifications = asyncHandler(async (req, res) => {
    await pool.execute('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
    res.status(200).json({ success: true, message: 'Todas eliminadas' });
});

module.exports = {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
};