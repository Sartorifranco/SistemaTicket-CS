const express = require('express');
const router = express.Router();
const { getLocationsByCompany, getLocationsForAdmin } = require('../controllers/locationController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Aplica autenticación a todas las rutas de este archivo
router.use(authenticateToken);

// ✅ CORRECCIÓN: Se añade el rol 'agent' para que puedan obtener las ubicaciones de su propia empresa si es necesario.
router.route('/').get(authorize(['client', 'admin', 'agent']), getLocationsByCompany);

// ✅ CORRECCIÓN CLAVE: Se añade el rol 'agent' para que puedan obtener las ubicaciones de CUALQUIER empresa al crear un ticket.
router.route('/:companyId').get(authorize(['admin', 'agent']), getLocationsForAdmin);

module.exports = router;

