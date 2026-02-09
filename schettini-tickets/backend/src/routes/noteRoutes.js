const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');

// Todas las rutas protegidas
router.use(protect);

router.get('/', getNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;