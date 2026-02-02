const express = require('express');
const router = express.Router();
const { getReports } = require('../controllers/reportController'); // Importa la función unificada
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Protege todas las rutas de este archivo para que solo los admins puedan acceder
router.use(authenticateToken);
router.use(authorize('admin'));

// Define la ruta principal GET /api/reports para obtener todos los reportes
router.get('/', getReports);

module.exports = router;