const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, getAssignableUsers } = require('../controllers/taskController');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');

router.use(protect);

// Ver y actualizar tareas: quien tenga permiso tickets_view (admin siempre)
router.get('/', authorizeByPermission('tickets_view'), getTasks);
router.get('/assignable-users', authorize('admin', 'supervisor'), getAssignableUsers);

// Crear: solo Admin y Supervisor
router.post('/', authorize('admin', 'supervisor'), createTask);

// Actualizar: quien tenga tickets_view; eliminar: solo Admin y Supervisor
router.put('/:id', authorizeByPermission('tickets_view'), updateTask);
router.delete('/:id', authorize('admin', 'supervisor'), deleteTask);

module.exports = router;
