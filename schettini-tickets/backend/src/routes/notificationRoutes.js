const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    deleteAllNotifications,
    createAnnouncement // ✅ Importado
} = require('../controllers/notificationController');

router.use(authenticateToken);

// Rutas Generales
router.route('/')
    .get(getNotifications)
    .put(markAllNotificationsAsRead);

router.get('/unread-count', getUnreadNotificationCount);

// Ruta para enviar Anuncios Masivos (Solo Admin)
router.post('/announce', authorize('admin'), createAnnouncement);

// Acciones sobre notificaciones específicas
router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);
router.delete('/delete-all', deleteAllNotifications);

module.exports = router;