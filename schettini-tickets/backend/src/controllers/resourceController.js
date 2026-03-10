const pool = require('../config/db');
const { logActivity } = require('../services/activityLogService');

const getResources = async (req, res) => {
    try {
        const { section_id, system_id, folder_id } = req.query;
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
        if (folder_id !== undefined && folder_id !== '') {
            const fid = parseInt(folder_id, 10);
            if (!isNaN(fid)) { conditions.push('kb.folder_id = ?'); params.push(fid); }
            else { conditions.push('(kb.folder_id IS NULL OR kb.folder_id = 0)'); }
        } else if (folder_id === '') {
            conditions.push('(kb.folder_id IS NULL OR kb.folder_id = 0)');
        }
        if (conditions.length) {
            sql = sql.replace('ORDER BY', 'WHERE ' + conditions.join(' AND ') + ' ORDER BY rs.sort_order, kb.folder_name ASC, kb.created_at DESC');
        }
        let rows;
        try {
            [rows] = await pool.query(sql, params);
        } catch (e) {
            if (e.message && (e.message.includes('resource_sections') || e.message.includes('section_id') || e.message.includes('folder_name') || e.message.includes('folder_id'))) {
                [rows] = await pool.query('SELECT * FROM knowledge_base ORDER BY created_at DESC');
            } else throw e;
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener recursos' });
    }
};

/** GET /api/resources/explorer?folder_id= → { folders, resources, breadcrumbs } para vista tipo Drive */
const getExplorer = async (req, res) => {
    try {
        const rawFolderId = req.query.folder_id;
        const folderId = (rawFolderId === undefined || rawFolderId === '') ? null : parseInt(rawFolderId, 10);
        const breadcrumbs = [{ id: null, name: 'Inicio' }];
        let folders = [];
        let resources = [];

        try {
            const [foldRows] = await pool.query(
                'SELECT id, name, parent_id, sort_order FROM kb_folders WHERE (parent_id IS NULL AND ? IS NULL) OR parent_id = ? ORDER BY sort_order ASC, name ASC',
                [folderId, folderId]
            );
            folders = foldRows;
        } catch (e) {
            if (!e.message || !e.message.includes('kb_folders')) throw e;
        }

        const kbCondition = folderId === null || isNaN(folderId) ? '(kb.folder_id IS NULL OR kb.folder_id = 0)' : 'kb.folder_id = ?';
        const kbParams = (folderId !== null && !isNaN(folderId)) ? [folderId] : [];
        let sql = `
            SELECT kb.*, rs.name as section_name, ts.name as system_name
            FROM knowledge_base kb
            LEFT JOIN resource_sections rs ON kb.section_id = rs.id
            LEFT JOIN ticket_systems ts ON kb.system_id = ts.id
            WHERE ${kbCondition}
            ORDER BY kb.created_at DESC
        `;
        try {
            const [resRows] = await pool.query(sql, kbParams);
            resources = resRows;
        } catch (e) {
            if (e.message && (e.message.includes('folder_id') || e.message.includes('Unknown column'))) {
                const [allRows] = await pool.query('SELECT kb.*, rs.name as section_name, ts.name as system_name FROM knowledge_base kb LEFT JOIN resource_sections rs ON kb.section_id = rs.id LEFT JOIN ticket_systems ts ON kb.system_id = ts.id ORDER BY kb.created_at DESC');
                resources = folderId === null ? allRows : [];
            } else throw e;
        }

        if (folderId !== null && !isNaN(folderId)) {
            let currentId = folderId;
            const seen = new Set();
            const path = [];
            while (currentId && !seen.has(currentId)) {
                seen.add(currentId);
                const [rows] = await pool.query('SELECT id, name, parent_id FROM kb_folders WHERE id = ?', [currentId]);
                if (rows.length === 0) break;
                path.unshift(rows[0]);
                currentId = rows[0].parent_id;
            }
            path.forEach(f => breadcrumbs.push({ id: f.id, name: f.name }));
        }

        res.json({ success: true, data: { folders, resources, breadcrumbs } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener explorador' });
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
const getThumbnailFromRequest = (req) => {
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) return req.files.thumbnail[0];
    return null;
};

const createResource = async (req, res) => {
    try {
        const { title, type, content, category, section_id, system_id, description, folder_name, folder_id } = req.body;
        let finalContent = content || '';
        const file = getFileFromRequest(req);
        const imageFile = getImageFromRequest(req);
        const thumbnailFile = getThumbnailFromRequest(req);

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
        if (thumbnailFile) imageUrl = `/uploads/${thumbnailFile.filename}`;
        else if (imageFile) imageUrl = `/uploads/${imageFile.filename}`;

        if (!title) {
            return res.status(400).json({ message: 'El título es obligatorio' });
        }

        const secId = section_id ? parseInt(section_id) : null;
        const sysId = system_id ? parseInt(system_id) : null;
        const folderId = (folder_id !== undefined && folder_id !== '' && folder_id !== null) ? parseInt(folder_id, 10) : null;
        const effectiveFolderId = (folderId !== null && !isNaN(folderId)) ? folderId : null;
        try {
            await pool.query(
                'INSERT INTO knowledge_base (title, type, content, category, section_id, system_id, description, folder_name, image_url, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [title, type, finalContent, category || 'General', secId, sysId, description || null, finalFolder, imageUrl, effectiveFolderId]
            );
        } catch (e) {
            if (e.message && (e.message.includes('section_id') || e.message.includes('folder_name') || e.message.includes('image_url') || e.message.includes('folder_id') || e.message.includes('Unknown column'))) {
                try {
                    await pool.query(
                        'INSERT INTO knowledge_base (title, type, content, category, section_id, system_id, description, folder_name, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [title, type, finalContent, category || 'General', secId, sysId, description || null, finalFolder, imageUrl]
                    );
                } catch (e2) {
                    await pool.query(
                        'INSERT INTO knowledge_base (title, type, content, category) VALUES (?, ?, ?, ?)',
                        [title, type, finalContent, category || 'General']
                    );
                }
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
        const { section_id, system_id, title, type, content, category, description, folder_name, folder_id } = req.body;
        const file = getFileFromRequest(req);
        const imageFile = getImageFromRequest(req);
        const thumbnailFile = getThumbnailFromRequest(req);

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
        if (folder_id !== undefined) {
            const fid = (folder_id === '' || folder_id === null) ? null : parseInt(folder_id, 10);
            updates.push('folder_id = ?');
            values.push((fid !== null && !isNaN(fid)) ? fid : null);
        }

        if (file) {
            updates.push('content = ?');
            values.push(`/uploads/${file.filename}`);
        }
        if (thumbnailFile) {
            updates.push('image_url = ?');
            values.push(`/uploads/${thumbnailFile.filename}`);
        } else if (imageFile) {
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
            if (e.message && (e.message.includes('section_id') || e.message.includes('folder_name') || e.message.includes('image_url') || e.message.includes('folder_id') || e.message.includes('Unknown column'))) {
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

/** PATCH /api/resources/:id/move — solo actualiza folder_id para reubicar el recurso */
const moveResource = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'ID de recurso inválido' });
        const { folder_id } = req.body;
        const folderId = (folder_id === undefined || folder_id === '' || folder_id === null) ? null : parseInt(folder_id, 10);
        const effectiveFolderId = (folderId !== null && !isNaN(folderId)) ? folderId : null;

        const [rows] = await pool.query('SELECT id FROM knowledge_base WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Recurso no encontrado' });

        try {
            await pool.query('UPDATE knowledge_base SET folder_id = ? WHERE id = ?', [effectiveFolderId, id]);
        } catch (e) {
            if (e.message && (e.message.includes('folder_id') || e.message.includes('Unknown column'))) {
                return res.status(400).json({ message: 'El sistema de carpetas no está disponible. Ejecutá la migración migrate-kb-folders.js' });
            }
            throw e;
        }
        res.json({ success: true, message: 'Recurso movido' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al mover recurso' });
    }
};

module.exports = { getResources, getExplorer, createResource, updateResource, deleteResource, moveResource };