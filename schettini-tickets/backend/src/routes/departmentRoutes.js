const express = require('express');
const router = express.Router();
const { getDepartments } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

// --- RUTAS DE DEPARTAMENTOS ---

// GET /api/departments
// (Protegemos la ruta para que solo usuarios logueados puedan ver la lista)
router.get('/', protect, getDepartments);

module.exports = router;