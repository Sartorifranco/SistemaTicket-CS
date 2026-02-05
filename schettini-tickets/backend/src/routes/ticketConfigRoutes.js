const express = require('express');
const router = express.Router();
const { getTicketOptions, createOption, deleteOption } = require('../controllers/ticketConfigController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Proteger todas las rutas (requieren login)
router.use(protect);

// Ruta para obtener las opciones (pública para usuarios logueados)
// GET /api/ticket-config/options
router.get('/options', getTicketOptions);

// Rutas para editar opciones (Solo Admin)
router.post('/options', authorize('admin'), createOption);
router.delete('/options/:table/:id', authorize('admin'), deleteOption);

module.exports = router;