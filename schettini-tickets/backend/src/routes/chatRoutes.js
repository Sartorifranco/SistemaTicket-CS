const express = require('express');
const router = express.Router();
const { getMyChat, getAllConversations, getChatByUserId, sendMessage } = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Rutas Cliente
router.get('/', getMyChat);

// Rutas Admin/Agente
router.get('/conversations', authorize('admin', 'agent'), getAllConversations);
router.get('/:userId', authorize('admin', 'agent'), getChatByUserId);

// Ruta Compartida (Enviar)
router.post('/', sendMessage);

module.exports = router;