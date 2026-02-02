const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const { getActivityLogs } = require('../controllers/activityLogController');

// Se protegen todas las rutas del archivo.
router.use(authenticateToken);

// La ruta GET ahora apunta a la única función del controlador.
router.route('/')
    .get(authorize(['admin', 'agent', 'client']), getActivityLogs);

module.exports = router;