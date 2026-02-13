const pool = require('../config/db');

const getResources = async (req, res) => {
    try {
        const { section_id, system_id } = req.query;
        let sql = `
            SELECT kb.*, rs.name as section_name, ts.name as system_name
            FROM knowledge_base kb
            LEFT JOIN resource_sections rs ON kb.section_id = rs.id
            LEFT JOIN ticket_systems ts ON kb.system_id = ts.id
            ORDER BY rs.sort_order, kb.created_at DESC
        `;
        const params = [];
        const conditions = [];
        if (section_id) { conditions.push('kb.section_id = ?'); params.push(section_id); }
        if (system_id) { conditions.push('kb.system_id = ?'); params.push(system_id); }
        if (conditions.length) {
            sql = sql.replace('ORDER BY', 'WHERE ' + conditions.join(' AND ') + ' ORDER BY');
        }
        let rows;
        try {
            [rows] = await pool.query(sql, params);
        } catch (e) {
            if (e.message && (e.message.includes('resource_sections') || e.message.includes('section_id'))) {
                [rows] = await pool.query('SELECT * FROM knowledge_base ORDER BY created_at DESC');
            } else throw e;
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener recursos' });
    }
};

const createResource = async (req, res) => {
    try {
        const { title, type, content, category, section_id, system_id, description } = req.body;
        let finalContent = content || '';

        // Para video e image: archivo obligatorio. Para link: content obligatorio.
        if (type === 'video' || type === 'image') {
            if (!req.file) {
                return res.status(400).json({ message: 'Debes subir un archivo para este tipo de recurso' });
            }
            finalContent = `/uploads/${req.file.filename}`;
        } else if (req.file) {
            finalContent = `/uploads/${req.file.filename}`;
        }

        if (!title) {
            return res.status(400).json({ message: 'El título es obligatorio' });
        }

        const secId = section_id ? parseInt(section_id) : null;
        const sysId = system_id ? parseInt(system_id) : null;
        try {
            await pool.query(
                'INSERT INTO knowledge_base (title, type, content, category, section_id, system_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [title, type, finalContent, category || 'General', secId, sysId, description || null]
            );
        } catch (e) {
            if (e.message && (e.message.includes('section_id') || e.message.includes('Unknown column'))) {
                await pool.query(
                    'INSERT INTO knowledge_base (title, type, content, category) VALUES (?, ?, ?, ?)',
                    [title, type, finalContent, category || 'General']
                );
            } else throw e;
        }
        res.json({ success: true, message: 'Recurso creado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear recurso' });
    }
};

const updateResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { section_id, system_id } = req.body;
        const secId = section_id !== undefined && section_id !== '' ? parseInt(section_id) : null;
        const sysId = system_id !== undefined && system_id !== '' ? parseInt(system_id) : null;
        try {
            await pool.query(
                'UPDATE knowledge_base SET section_id = ?, system_id = ? WHERE id = ?',
                [secId, sysId, id]
            );
        } catch (e) {
            if (e.message && (e.message.includes('section_id') || e.message.includes('Unknown column'))) {
                return res.status(400).json({ message: 'La base de datos no tiene las columnas section_id/system_id. Ejecutá la migración.' });
            }
            throw e;
        }
        res.json({ success: true, message: 'Recurso actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar' });
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

module.exports = { getResources, createResource, updateResource, deleteResource };