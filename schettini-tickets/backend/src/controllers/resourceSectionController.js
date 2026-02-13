const pool = require('../config/db');

const getSections = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM resource_sections ORDER BY sort_order ASC, name ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        if (error.message && error.message.includes('resource_sections')) {
            return res.json({ success: true, data: [] });
        }
        res.status(500).json({ success: false, message: 'Error al obtener secciones' });
    }
};

const createSection = async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

        const [maxSort] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM resource_sections');
        const sortOrder = maxSort[0]?.next || 1;

        await pool.query(
            'INSERT INTO resource_sections (name, icon, sort_order, description) VALUES (?, ?, ?, ?)',
            [name.trim(), icon || null, sortOrder, description || null]
        );
        res.json({ success: true, message: 'Sección creada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear sección' });
    }
};

const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon, sort_order, description } = req.body;

        const updates = [];
        const values = [];
        if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
        if (icon !== undefined) { updates.push('icon = ?'); values.push(icon || null); }
        if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }

        if (updates.length === 0) return res.status(400).json({ message: 'Nada que actualizar' });
        values.push(id);

        await pool.query(`UPDATE resource_sections SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, message: 'Sección actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};

const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE knowledge_base SET section_id = NULL WHERE section_id = ?', [id]);
        await pool.query('DELETE FROM resource_sections WHERE id = ?', [id]);
        res.json({ success: true, message: 'Sección eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
};

module.exports = { getSections, createSection, updateSection, deleteSection };
