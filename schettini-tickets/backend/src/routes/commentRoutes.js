// backend/routes/commentRoutes.js
const express = require('express');
const { addCommentToTicket, getCommentsForTicket } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

// 'mergeParams: true' es crucial para acceder a :ticketId de la ruta padre
const router = express.Router({ mergeParams: true });

router.route('/')
  .post(protect, addCommentToTicket) // Añadir un comentario al ticket
  .get(protect, getCommentsForTicket); // Obtener comentarios de un ticket específico (aunque getTicketById ya los trae)

module.exports = router;