const pool = require('../config/db');

const getResources = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM knowledge_base ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener recursos' });
    }
};

const createResource = async (req, res) => {
    try {
        const { title, type, content, category } = req.body;
        let finalContent = content;

        // Si subió un archivo, guardamos la ruta
        if (req.file) {
            finalContent = `/uploads/${req.file.filename}`;
        }

        if (!title) {
            return res.status(400).json({ message: 'El título es obligatorio' });
        }

        await pool.query(
            'INSERT INTO knowledge_base (title, type, content, category) VALUES (?, ?, ?, ?)',
            [title, type, finalContent || '', category || 'General']
        );
        res.json({ success: true, message: 'Recurso creado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear recurso' });
    }
};

const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM knowledge_base WHERE id = ?', [id]);
        res.json({ success: true, message: 'Recurso eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
};

module.exports = { getResources, createResource, deleteResource };