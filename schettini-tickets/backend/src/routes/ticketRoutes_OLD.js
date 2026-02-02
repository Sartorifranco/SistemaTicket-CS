// backend/src/routes/ticketRoutes.js
console.log('[DEBUG] ticketRoutes.js: Archivo cargado.');
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Importar funciones del ticketController
const {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketComments
} = require('../controllers/ticketController');
console.log('[DEBUG] ticketRoutes.js: Funciones de ticketController importadas:');
console.log('  - getAllTickets:', typeof getAllTickets);
console.log('  - getTicketById:', typeof getTicketById);
console.log('  - createTicket:', typeof createTicket);
console.log('  - updateTicket:', typeof updateTicket);
console.log('  - deleteTicket:', typeof deleteTicket);
console.log('  - getTicketComments:', typeof getTicketComments);


// Importar funciones del commentController
const {
    addCommentToTicket,
    getCommentsForTicket,
    deleteComment,
} = require('../controllers/commentController');
console.log('[DEBUG] ticketRoutes.js: Funciones de commentController importadas:');
console.log('  - addCommentToTicket:', typeof addCommentToTicket);
console.log('  - getCommentsForTicket:', typeof getCommentsForTicket);
console.log('  - deleteComment:', typeof deleteComment);


// Rutas principales de tickets (ej. /api/tickets)
router.get('/', protect, getAllTickets);
router.post('/', protect, createTicket);

// Rutas para un ID de ticket específico (ej. /api/tickets/:id)
router.get('/:id', protect, getTicketById);
router.put('/:id', protect, updateTicket);
router.delete('/:id', protect, deleteTicket);

// Rutas de comentarios relacionadas con un ID de ticket (ej. /api/tickets/:ticketId/comments)
router.post('/:ticketId/comments', protect, addCommentToTicket);
router.get('/:ticketId/comments', protect, getTicketComments); // <-- Esta es la línea 38 en tu error anterior

module.exports = router;
console.log('[DEBUG] ticketRoutes.js: Router configurado y exportado.');
