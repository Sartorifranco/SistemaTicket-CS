const express = require('express');
const router = express.Router();
const multer = require('multer'); // Importamos multer
const path = require('path');

// Configuración básica de subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Asegúrate de que esta carpeta exista o usa /tmp
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
    deleteTicket,
    getTicketCategories 
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/authMiddleware');

// 1. Ruta de Categorías (SIEMPRE ANTES DE /:id)
router.get('/categories', protect, getTicketCategories);

// 2. Rutas Generales
router.route('/')
    .get(protect, authorize('admin', 'agent', 'client'), getTickets) 
    // AQUI ESTA LA MAGIA: Agregamos 'upload.array' para procesar el formulario
    .post(protect, authorize('client', 'agent', 'admin'), upload.array('attachments'), createTicket);

// 3. Rutas por ID
router.route('/:id')
    .get(protect, authorize('admin', 'agent', 'client'), getTicketById)
    .put(protect, authorize('admin', 'agent'), updateTicket)
    .delete(protect, authorize('admin'), deleteTicket);

module.exports = router;