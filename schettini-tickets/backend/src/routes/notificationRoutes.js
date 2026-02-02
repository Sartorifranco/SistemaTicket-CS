const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    deleteAllNotifications
} = require('../controllers/notificationController');

router.use(authenticateToken);

// GET /api/notifications -> Obtiene todas las notificaciones
// PUT /api/notifications -> Marca todas como leídas
router.route('/')
    .get(getNotifications)
    .put(markAllNotificationsAsRead); // ✅ AJUSTE: Esta ruta ahora es PUT

router.get('/unread-count', getUnreadNotificationCount);

router.put('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);
router.delete('/delete-all', deleteAllNotifications);

// La ruta /mark-all-read se elimina porque ya está cubierta por PUT /
// router.put('/mark-all-read', authenticateToken, markAllNotificationsAsRead);

module.exports = router;