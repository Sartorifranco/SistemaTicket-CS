const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configuración de subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

const { 
    getTickets, 
    createTicket, 
    getTicketById, 
    updateTicket, 
    updateTicketStatus, 
    deleteTicket,
    getTicketCategories,
    addCommentToTicket,
    getTicketComments,
    getPredefinedProblemsPublic // <--- Importado
} = require('../controllers/ticketController');

const { protect, authorize } = require('../middleware/authMiddleware');

// --- RUTAS DE TICKETS ---

// 1. Categorías y Configuración
router.get('/categories', protect, getTicketCategories);

// NUEVO: Ruta para obtener los problemas en el formulario (Antes de /:id)
router.get('/predefined-problems', protect, authorize('admin', 'agent', 'client'), getPredefinedProblemsPublic);

// 2. Rutas Generales
router.route('/')
    .get(protect, authorize('admin', 'agent', 'client'), getTickets) 
    .post(protect, authorize('client', 'agent', 'admin'), upload.array('attachments'), createTicket);

// 3. Ruta Específica para CAMBIAR ESTADO
router.put('/:id/status', protect, authorize('admin', 'agent', 'client'), updateTicketStatus);

// 4. Rutas de Comentarios
router.route('/:id/comments')
    .post(protect, addCommentToTicket)
    .get(protect, getTicketComments);

// 5. Rutas por ID (Siempre al final)
router.route('/:id')
    .get(protect, authorize('admin', 'agent', 'client'), getTicketById)
    .put(protect, authorize('admin', 'agent'), updateTicket)
    .delete(protect, authorize('admin'), deleteTicket);

module.exports = router;