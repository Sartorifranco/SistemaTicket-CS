const express = require('express');
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/noteController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// GET all notes and CREATE a new note
router.route('/')
    .get(authenticateToken, authorize(['agent', 'admin']), getNotes)
    .post(authenticateToken, authorize(['agent', 'admin']), createNote);

// UPDATE and DELETE a specific note by ID
router.route('/:id')
    .put(authenticateToken, authorize(['agent', 'admin']), updateNote)
    .delete(authenticateToken, authorize(['agent', 'admin']), deleteNote);

module.exports = router;