const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// @desc Obtener notificaciones
const getNotifications = asyncHandler(async (req, res) => {
    const [notifications] = await pool.execute(
        `SELECT id, user_id, type, message, related_id, related_type, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC LIMIT 50`,
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

// --- NUEVO: Crear Anuncio Masivo (Ofertas/Novedades) ---
const createAnnouncement = asyncHandler(async (req, res) => {
    const { title, message, targetRole, type } = req.body; 
    
    let query = 'SELECT id FROM Users';
    let params = [];

    // Filtrar usuarios
    if (targetRole && targetRole !== 'all') {
        query += ' WHERE role = ?';
        params.push(targetRole);
    }

    const [users] = await pool.execute(query, params);

    if (users.length === 0) {
        return res.status(404).json({ message: 'No hay usuarios destinatarios.' });
    }

    // ✅ CAMBIO IMPORTANTE: Combinamos Título y Mensaje para guardarlos juntos
    const formattedMessage = title ? `${title}|||${message}` : message;

    // Insertar notificaciones y emitir eventos
    for (const user of users) {
        // Guardar en BD (Campanita)
        const [result] = await pool.execute(
            `INSERT INTO notifications (user_id, type, message, related_type, is_read) 
             VALUES (?, ?, ?, 'system', FALSE)`,
            [user.id, type || 'info', formattedMessage]
        );

        // Emitir Socket
        if (req.io) {
            // 1. Evento para la campanita (usa el mensaje combinado)
            req.io.to(`user-${user.id}`).emit('notification', {
                id: result.insertId,
                user_id: user.id,
                type: type || 'info',
                message: formattedMessage,
                related_type: 'system',
                is_read: false,
                created_at: new Date()
            });
            
            // 2. Evento especial para el POP-UP (envía título y mensaje por separado)
            if (type === 'promotion' || type === 'alert') {
                req.io.to(`user-${user.id}`).emit('promotion_alert', {
                    title: title || 'Novedad',
                    message: message,
                    type: type
                });
            }
        }
    }

    res.status(201).json({ success: true, message: `Anuncio enviado a ${users.length} usuarios.` });
});

module.exports = {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
    createAnnouncement
};