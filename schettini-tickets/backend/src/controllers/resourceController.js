const pool = require('../config/db');
const { logActivity } = require('../services/activityLogService');

const getResources = async (req, res) => {
    try {
        const { section_id, system_id } = req.query;
        let sql = `
            SELECT kb.*, rs.name as section_name, ts.name as system_name
            FROM knowledge_base kb
            LEFT JOIN resource_sections rs ON kb.section_id = rs.id
            LEFT JOIN ticket_systems ts ON kb.system_id = ts.id
            ORDER BY rs.sort_order, kb.folder_name ASC, kb.created_at DESC
        `;
        const params = [];
        const conditions = [];
        if (section_id) { conditions.push('kb.section_id = ?'); params.push(section_id); }
        if (system_id) { conditions.push('kb.system_id = ?'); params.push(system_id); }
        if (conditions.length) {
            sql = sql.replace('ORDER BY', 'WHERE ' + conditions.join(' AND ') + ' ORDER BY rs.sort_order, kb.folder_name ASC, kb.created_at DESC');
        }
        let rows;
        try {
            [rows] = await pool.query(sql, params);
        } catch (e) {
            if (e.message && (e.message.includes('resource_sections') || e.message.includes('section_id') || e.message.includes('folder_name'))) {
                [rows] = await pool.query('SELECT * FROM knowledge_base ORDER BY created_at DESC');
            } else throw e;
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener recursos' });
    }
};

const getFileFromRequest = (req) => {
    if (req.file) return req.file;
    if (req.files && req.files.file && req.files.file[0]) return req.files.file[0];
    return null;
};
const getImageFromRequest = (req) => {
    if (req.files && req.files.image && req.files.image[0]) return req.files.image[0];
    return null;
};

const createResource = async (req, res) => {
    try {
        const { title, type, content, category, section_id, system_id, description, folder_name } = req.body;
        let finalContent = content || '';
        const file = getFileFromRequest(req);
        const imageFile = getImageFromRequest(req);

        if (type === 'video' || type === 'image') {
            if (!file) {
                return res.status(400).json({ message: 'Debes subir un archivo para este tipo de recurso' });
            }
            finalContent = `/uploads/${file.filename}`;
        } else if (file) {
            finalContent = `/uploads/${file.filename}`;
        }

        const finalFolder = (folder_name && String(folder_name).trim()) ? String(folder_name).trim() : 'General';
        let imageUrl = null;
        if (imageFile) imageUrl = `/uploads/${imageFile.filename}`;

        if (!title) {
            return res.status(400).json({ message: 'El título es obligatorio' });
        }

        const secId = section_id ? parseInt(section_id) : null;
        const sysId = system_id ? parseInt(system_id) : null;
        try {
            await pool.query(
                'INSERT INTO knowledge_base (title, type, content, category, section_id, system_id, description, folder_name, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [title, type, finalContent, category || 'General', secId, sysId, description || null, finalFolder, imageUrl]
            );
        } catch (e) {
            if (e.message && (e.message.includes('section_id') || e.message.includes('folder_name') || e.message.includes('image_url') || e.message.includes('Unknown column'))) {
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
        const { section_id, system_id, title, type, content, category, description, folder_name } = req.body;
        const file = getFileFromRequest(req);
        const imageFile = getImageFromRequest(req);

        const parseId = (v) => {
            if (v == null || v === '') return null;
            const n = parseInt(v);
            return isNaN(n) ? null : n;
        };

        const [rows] = await pool.query('SELECT id, content, image_url FROM knowledge_base WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Recurso no encontrado' });

        const updates = [];
        const values = [];

        const secId = parseId(section_id);
        const sysId = parseId(system_id);
        updates.push('section_id = ?', 'system_id = ?');
        values.push(secId, sysId);

        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (type !== undefined) { updates.push('type = ?'); values.push(type); }
        if (category !== undefined) { updates.push('category = ?'); values.push(category || 'General'); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
        if (folder_name !== undefined) { updates.push('folder_name = ?'); values.push((folder_name && String(folder_name).trim()) ? String(folder_name).trim() : 'General'); }

        if (file) {
            updates.push('content = ?');
            values.push(`/uploads/${file.filename}`);
        }
        if (imageFile) {
            updates.push('image_url = ?');
            values.push(`/uploads/${imageFile.filename}`);
        }

        values.push(id);
        try {
            await pool.query(
                `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = ?`,
                values
            );
        } catch (e) {
            if (e.message && (e.message.includes('section_id') || e.message.includes('folder_name') || e.message.includes('image_url') || e.message.includes('Unknown column'))) {
                await pool.query(
                    'UPDATE knowledge_base SET section_id = ?, system_id = ? WHERE id = ?',
                    [secId, sysId, id]
                );
            } else throw e;
        }
        res.json({ success: true, message: 'Recurso actualizado' });
    } catch (error) {
        console.error('updateResource error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};

const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT id, title, type FROM knowledge_base WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Recurso no encontrado' });
        }
        const { title, type } = rows[0];
        const tipoLabel = type === 'video' ? 'video' : type === 'article' ? 'artículo' : 'recurso';
        await pool.query('DELETE FROM knowledge_base WHERE id = ?', [id]);
        const userName = req.user?.username || `ID ${req.user?.id || '?'}`;
        await logActivity(
            req.user?.id || null,
            req.user?.username || 'Sistema',
            req.user?.role || null,
            'resource_delete',
            `El usuario ${userName} eliminó el ${tipoLabel} "${title || '(sin título)'}"`,
            'knowledge_base',
            parseInt(id, 10),
            { title, type },
            null
        );
        res.json({ success: true, message: 'Recurso eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
};

module.exports = { getResources, createResource, updateResource, deleteResource };