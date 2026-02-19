const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, getAssignableUsers } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Agente, Supervisor y Admin pueden ver tareas (cada uno según su rol)
router.get('/', authorize('admin', 'supervisor', 'agent'), getTasks);
router.get('/assignable-users', authorize('admin', 'supervisor'), getAssignableUsers);

// Crear: solo Admin y Supervisor
router.post('/', authorize('admin', 'supervisor'), createTask);

// Actualizar y eliminar
router.put('/:id', authorize('admin', 'supervisor', 'agent'), updateTask);
router.delete('/:id', authorize('admin', 'supervisor'), deleteTask);

module.exports = router;
