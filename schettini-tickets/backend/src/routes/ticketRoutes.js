const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    updateTicketStatus,
    reassignTicket,
    addCommentToTicket,
    deleteTicket,
    getTicketCategories, // ✅ Ahora sí existe
    getDepartments,      // ✅ Ahora sí existe
    getTicketComments    // ✅ Ahora sí existe
} = require('../controllers/ticketController');

// Configuración de Subida de Archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `ticket-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Rutas Públicas (Protegidas por Token)
router.use(protect);

router.post('/', upload.array('attachments', 5), createTicket);
router.get('/', getTickets);
router.get('/categories', getTicketCategories); // Para selectores viejos
router.get('/departments', getDepartments);     // Para selectores viejos

router.get('/:id', getTicketById);
router.put('/:id', updateTicket); // Edición general
router.delete('/:id', deleteTicket);

// Rutas Específicas
router.put('/:id/status', updateTicketStatus);
router.put('/:id/assign', authorize('admin', 'agent'), reassignTicket);
router.post('/:id/comments', addCommentToTicket);
router.get('/:id/comments', getTicketComments);

module.exports = router;