const pool = require('../config/db');

// Obtener notas
const getNotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const [notes] = await pool.query('SELECT * FROM agent_notes WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
        res.json({ success: true, data: notes });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener notas' });
    }
};

// Crear nota
const createNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: 'Contenido requerido' });

        await pool.query('INSERT INTO agent_notes (user_id, content) VALUES (?, ?)', [userId, content]);
        res.json({ success: true, message: 'Nota creada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear nota' });
    }
};

// Actualizar nota
const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        await pool.query('UPDATE agent_notes SET content = ? WHERE id = ? AND user_id = ?', [content, id, req.user.id]);
        res.json({ success: true, message: 'Nota actualizada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

// Eliminar nota
const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM agent_notes WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.json({ success: true, message: 'Nota eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

module.exports = { getNotes, createNote, updateNote, deleteNote };