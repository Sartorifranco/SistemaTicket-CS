const pool = require('../config/db');

/** GET /api/kb-folders?parent_id= → carpetas hijas de parent_id (null = raíz) */
const getFolders = async (req, res) => {
    try {
        const parentId = req.query.parent_id === undefined || req.query.parent_id === '' ? null : parseInt(req.query.parent_id, 10);
        if (parentId !== null && isNaN(parentId)) {
            return res.status(400).json({ success: false, message: 'parent_id inválido' });
        }
        const [rows] = await pool.query(
            'SELECT id, name, parent_id, sort_order, created_at FROM kb_folders WHERE (parent_id IS NULL AND ? IS NULL) OR parent_id = ? ORDER BY sort_order ASC, name ASC',
            [parentId, parentId]
        );
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('kb_folders')) {
            return res.json({ success: true, data: [] });
        }
        res.status(500).json({ success: false, message: 'Error al obtener carpetas' });
    }
};

/** GET /api/kb-folders/list → todas las carpetas (id, name, parent_id) para selectores */
const getFoldersList = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, parent_id FROM kb_folders ORDER BY name ASC'
        );
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('kb_folders')) {
            return res.json({ success: true, data: [] });
        }
        res.status(500).json({ success: false, message: 'Error al listar carpetas' });
    }
};

/** GET /api/kb-folders/breadcrumbs?folder_id= → [{ id, name }, ...] desde raíz hasta folder_id */
const getBreadcrumbs = async (req, res) => {
    try {
        const folderId = req.query.folder_id === undefined || req.query.folder_id === '' ? null : parseInt(req.query.folder_id, 10);
        const breadcrumbs = [{ id: null, name: 'Inicio' }];
        if (folderId === null || isNaN(folderId)) {
            return res.json({ success: true, data: breadcrumbs });
        }
        let currentId = folderId;
        const path = [];
        const seen = new Set();
        while (currentId && !seen.has(currentId)) {
            seen.add(currentId);
            const [rows] = await pool.query('SELECT id, name, parent_id FROM kb_folders WHERE id = ?', [currentId]);
            if (rows.length === 0) break;
            path.unshift(rows[0]);
            currentId = rows[0].parent_id;
        }
        path.forEach(f => breadcrumbs.push({ id: f.id, name: f.name }));
        res.json({ success: true, data: breadcrumbs });
    } catch (e) {
        if (e.message && e.message.includes('kb_folders')) {
            return res.json({ success: true, data: [{ id: null, name: 'Inicio' }] });
        }
        res.status(500).json({ success: false, message: 'Error al obtener breadcrumbs' });
    }
};

/** POST /api/kb-folders { name, parent_id? } */
const createFolder = async (req, res) => {
    try {
        const { name, parent_id } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: 'El nombre de la carpeta es obligatorio' });
        }
        const parentId = parent_id === undefined || parent_id === '' || parent_id === null ? null : parseInt(parent_id, 10);
        if (parentId !== null && isNaN(parentId)) {
            return res.status(400).json({ message: 'parent_id inválido' });
        }
        const [maxSort] = await pool.query(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM kb_folders WHERE (parent_id IS NULL AND ? IS NULL) OR parent_id = ?',
            [parentId, parentId]
        );
        const sortOrder = maxSort[0]?.next ?? 1;
        const [result] = await pool.query(
            'INSERT INTO kb_folders (name, parent_id, sort_order) VALUES (?, ?, ?)',
            [String(name).trim(), parentId, sortOrder]
        );
        res.status(201).json({ success: true, id: result.insertId, message: 'Carpeta creada' });
    } catch (e) {
        if (e.message && e.message.includes('kb_folders')) {
            return res.status(500).json({ success: false, message: 'Ejecutá la migración migrate-kb-folders.js' });
        }
        res.status(500).json({ success: false, message: 'Error al crear carpeta' });
    }
};

/** PUT /api/kb-folders/:id { name?, parent_id? } */
const updateFolder = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });
        const { name, parent_id } = req.body;
        const updates = [];
        const values = [];
        if (name !== undefined) {
            if (!String(name).trim()) return res.status(400).json({ message: 'El nombre no puede estar vacío' });
            updates.push('name = ?');
            values.push(String(name).trim());
        }
        if (parent_id !== undefined) {
            const parentId = parent_id === '' || parent_id === null ? null : parseInt(parent_id, 10);
            if (parentId !== null && isNaN(parentId)) return res.status(400).json({ message: 'parent_id inválido' });
            if (parentId === id) return res.status(400).json({ message: 'Una carpeta no puede ser su propio padre' });
            updates.push('parent_id = ?');
            values.push(parentId);
        }
        if (updates.length === 0) return res.status(400).json({ message: 'Nada que actualizar' });
        values.push(id);
        const [result] = await pool.query(`UPDATE kb_folders SET ${updates.join(', ')} WHERE id = ?`, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Carpeta no encontrada' });
        res.json({ success: true, message: 'Carpeta actualizada' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};

/** DELETE /api/kb-folders/:id — pone en NULL parent_id de hijos y folder_id de recursos */
const deleteFolder = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });
        const [folder] = await pool.query('SELECT id FROM kb_folders WHERE id = ?', [id]);
        if (folder.length === 0) return res.status(404).json({ message: 'Carpeta no encontrada' });
        await pool.query('UPDATE kb_folders SET parent_id = NULL WHERE parent_id = ?', [id]);
        await pool.query('UPDATE knowledge_base SET folder_id = NULL WHERE folder_id = ?', [id]);
        await pool.query('DELETE FROM kb_folders WHERE id = ?', [id]);
        res.json({ success: true, message: 'Carpeta eliminada' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
};

module.exports = { getFolders, getFoldersList, getBreadcrumbs, createFolder, updateFolder, deleteFolder };
