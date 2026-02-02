const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    getMe 
} = require('../controllers/authController');
const { 
    getUsers, 
    getAgents 
} = require('../controllers/userController'); // Asegúrate de tener este controlador (ver paso 3)
const { protect, authorize } = require('../middleware/authMiddleware');

// --- RUTAS DE USUARIOS ---

// Rutas públicas de Auth
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rutas protegidas generales
router.get('/me', protect, getMe);

// --- GESTIÓN DE USUARIOS (ADMIN) ---

// Obtener todos los usuarios (Permitir a 'admin')
router.get('/', protect, authorize('admin'), getUsers);

// Obtener solo agentes (Permitir a 'admin' y 'agent')
router.get('/agents', protect, authorize('admin', 'agent'), getAgents);

module.exports = router;