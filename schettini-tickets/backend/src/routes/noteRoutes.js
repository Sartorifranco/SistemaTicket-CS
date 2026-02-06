const express = require('express');
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');
// ✅ Usamos 'protect' para mantener consistencia con dashboardRoutes
const { protect, authorize } = require('../middleware/authMiddleware'); 

// GET todas las notas y CREAR nueva nota
router.route('/')
    .get(protect, authorize('agent', 'admin'), getNotes)
    .post(protect, authorize('agent', 'admin'), createNote);

// ACTUALIZAR y BORRAR nota específica
router.route('/:id')
    .put(protect, authorize('agent', 'admin'), updateNote)
    .delete(protect, authorize('agent', 'admin'), deleteNote);

module.exports = router;