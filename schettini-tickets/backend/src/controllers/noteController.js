const pool = require('../config/db');
const asyncHandler = require('express-async-handler');

// @desc     Obtener todas las notas del agente logueado
// @route    GET /api/notes
// @access   Private (Agent/Admin)
const getNotes = asyncHandler(async (req, res) => {
    const agentId = req.user.id;
    const [notes] = await pool.execute(
        'SELECT * FROM agent_notes WHERE agent_id = ? ORDER BY created_at DESC',
        [agentId]
    );
    res.status(200).json({ success: true, data: notes });
});

// @desc     Crear una nueva nota
// @route    POST /api/notes
// @access   Private (Agent/Admin)
const createNote = asyncHandler(async (req, res) => {
    const agentId = req.user.id;
    const { content } = req.body;

    if (!content) {
        res.status(400);
        throw new Error('El contenido de la nota no puede estar vacío.');
    }

    const [result] = await pool.execute(
        'INSERT INTO agent_notes (agent_id, content) VALUES (?, ?)',
        [agentId, content]
    );

    res.status(201).json({ success: true, message: 'Nota creada exitosamente.', noteId: result.insertId });
});

// @desc     Actualizar una nota existente
// @route    PUT /api/notes/:id
// @access   Private (Agent/Admin)
const updateNote = asyncHandler(async (req, res) => {
    const { id: noteId } = req.params;
    const agentId = req.user.id;
    const { content } = req.body;

    if (!content) {
        res.status(400);
        throw new Error('El contenido de la nota no puede estar vacío.');
    }

    // Verificamos que la nota exista y pertenezca al agente antes de actualizar
    const [result] = await pool.execute(
        'UPDATE agent_notes SET content = ? WHERE id = ? AND agent_id = ?',
        [content, noteId, agentId]
    );

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Nota no encontrada o no tienes permiso para editarla.');
    }

    res.status(200).json({ success: true, message: 'Nota actualizada exitosamente.' });
});

// @desc     Eliminar una nota
// @route    DELETE /api/notes/:id
// @access   Private (Agent/Admin)
const deleteNote = asyncHandler(async (req, res) => {
    const { id: noteId } = req.params;
    const agentId = req.user.id;

    // Verificamos que la nota exista y pertenezca al agente antes de eliminarla
    const [result] = await pool.execute(
        'DELETE FROM agent_notes WHERE id = ? AND agent_id = ?',
        [noteId, agentId]
    );

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Nota no encontrada o no tienes permiso para eliminarla.');
    }

    res.status(200).json({ success: true, message: 'Nota eliminada exitosamente.' });
});

module.exports = {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
};