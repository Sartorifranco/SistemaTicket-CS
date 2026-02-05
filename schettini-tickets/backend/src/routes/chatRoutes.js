const express = require('express');
const router = express.Router();
const { getMyChat, getAllConversations, getChatByUserId, sendMessage, closeChat, closeClientChat } = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Rutas Cliente
router.get('/', getMyChat);
router.post('/close', closeChat); // Cliente cierra su propio chat

// Rutas Admin/Agente
router.get('/conversations', authorize('admin', 'agent'), getAllConversations);
router.get('/:userId', authorize('admin', 'agent'), getChatByUserId);
router.post('/admin/close', authorize('admin', 'agent'), closeClientChat); // ✅ ADMIN CIERRA CHAT

// Ruta Compartida (Enviar)
router.post('/', sendMessage);

module.exports = router;