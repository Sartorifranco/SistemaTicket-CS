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
    assignTicket,   // ✅ Importar
    reassignTicket, // ✅ Importar
    addCommentToTicket,
    deleteTicket,
    getTicketCategories,
    getDepartments,
    getTicketComments
} = require('../controllers/ticketController');

// Configuración de Subida de Archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `ticket-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Rutas Protegidas
router.use(protect);

router.post('/', upload.array('attachments', 5), createTicket);
router.get('/', getTickets);
router.get('/categories', getTicketCategories);
router.get('/departments', getDepartments);

router.get('/:id', getTicketById);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

// --- RUTAS DE ESTADO Y ASIGNACIÓN (CORREGIDAS) ---
router.put('/:id/status', updateTicketStatus);

// 1. Tomar Ticket (Auto-asignación) -> Botón "Tomar" del Agente
router.put('/:id/assign', authorize('admin', 'agent'), assignTicket);

// 2. Reasignar Ticket (Delegar) -> Modal de "Reasignar" del Admin/Agente
router.put('/:id/reassign', authorize('admin', 'agent'), reassignTicket); // ✅ Esta faltaba y daba 404

router.post('/:id/comments', addCommentToTicket);
router.get('/:id/comments', getTicketComments);

module.exports = router;