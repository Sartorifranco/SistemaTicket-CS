const express = require('express');
const router = express.Router();
const { 
    getUsers, 
    createUser, 
    getUserById, 
    updateUser, 
    deleteUser, 
    getUserActiveTickets,
    getAgents // <--- Importado
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(protect);

// --- RUTAS ESPECÍFICAS (Importante: Deben ir ANTES de /:id) ---

// 1. Obtener lista de agentes (Evita que "agents" se tome como ID)
router.get('/agents', authorize('admin', 'agent'), getAgents);

// 2. Ruta para obtener tickets activos de un usuario (Dashboard)
router.get('/:id/active-tickets', authorize('admin', 'agent', 'client'), getUserActiveTickets);


// --- RUTAS GENERALES ---
router.route('/')
    .get(authorize('admin', 'agent'), getUsers)
    .post(authorize('admin'), createUser);

// --- RUTAS POR ID ---
router.route('/:id')
    .get(authorize('admin', 'agent', 'client'), getUserById)
    .put(authorize('admin'), updateUser)
    .delete(authorize('admin'), deleteUser);

module.exports = router;