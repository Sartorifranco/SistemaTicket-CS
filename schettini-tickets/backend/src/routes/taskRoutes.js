const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, updateTaskStatus, deleteTask, getAssignableUsers } = require('../controllers/taskController');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');

router.use(protect);

// Ver tareas: quien tenga permiso tickets_view (admin siempre)
router.get('/', authorizeByPermission('tickets_view', 'tasks_view'), getTasks);
router.get('/assignable-users', authorize('admin', 'supervisor'), getAssignableUsers);

// Crear: solo Admin y Supervisor
router.post('/', authorize('admin', 'supervisor'), createTask);

// Editar tarea (title, description, priority, dueDate): solo Admin y Supervisor
router.put('/:id', authorize('admin', 'supervisor'), updateTask);
// Cambiar estado (Completar / En progreso): asignado, admin o supervisor
router.patch('/:id/status', authorizeByPermission('tickets_view', 'tasks_view'), updateTaskStatus);

router.delete('/:id', authorize('admin', 'supervisor'), deleteTask);

module.exports = router;
