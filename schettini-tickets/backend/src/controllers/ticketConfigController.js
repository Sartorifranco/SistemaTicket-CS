const pool = require('../config/db');

// Obtener todas las opciones para los selectores del frontend
const getTicketOptions = async (req, res) => {
    try {
        const [systems] = await pool.query('SELECT * FROM ticket_systems');
        const [equipment] = await pool.query('SELECT * FROM ticket_equipment');
        const [categories] = await pool.query('SELECT * FROM problem_categories');
        const [problems] = await pool.query('SELECT * FROM specific_problems');

        res.json({
            success: true,
            data: { systems, equipment, categories, problems }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener opciones' });
    }
};

// Crear opciones (Genérico para todas las tablas de config)
const createOption = async (req, res) => {
    const { table, name, category_id } = req.body;
    const validTables = ['ticket_systems', 'ticket_equipment', 'problem_categories', 'specific_problems'];

    if (!validTables.includes(table)) return res.status(400).json({ message: 'Tabla inválida' });

    try {
        if (table === 'specific_problems') {
            await pool.query(`INSERT INTO ${table} (name, category_id) VALUES (?, ?)`, [name, category_id]);
        } else {
            await pool.query(`INSERT INTO ${table} (name) VALUES (?)`, [name]);
        }
        res.json({ success: true, message: 'Opción creada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear opción' });
    }
};

// Eliminar opción
const deleteOption = async (req, res) => {
    const { table, id } = req.params;
    const validTables = ['ticket_systems', 'ticket_equipment', 'problem_categories', 'specific_problems'];
    
    if (!validTables.includes(table)) return res.status(400).json({ message: 'Tabla inválida' });

    try {
        await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Opción eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

module.exports = { getTicketOptions, createOption, deleteOption };