const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// --- CONTROLADORES PARA CATEGORÍAS ---

const getAllProblemsAndCategories = asyncHandler(async (req, res) => {
    const [categories] = await pool.execute('SELECT * FROM ticket_categories ORDER BY name ASC');
    const [problems] = await pool.execute('SELECT * FROM predefined_problems ORDER BY title ASC');
    res.status(200).json({ success: true, data: { categories, problems } });
});

const createCategory = asyncHandler(async (req, res) => {
    const { name, company_id } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('El nombre de la categoría es requerido.');
    }
    const sql = 'INSERT INTO ticket_categories (name, company_id) VALUES (?, ?)';
    await pool.execute(sql, [name, company_id || null]);
    res.status(201).json({ success: true, message: 'Categoría creada' });
});

const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, company_id } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('El nombre no puede estar vacío.');
    }
    const sql = 'UPDATE ticket_categories SET name = ?, company_id = ? WHERE id = ?';
    await pool.execute(sql, [name, company_id === '' ? null : company_id, id]);
    res.status(200).json({ success: true, message: 'Categoría actualizada' });
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM predefined_problems WHERE category_id = ?', [id]);
    await pool.execute('DELETE FROM ticket_categories WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Categoría eliminada' });
});


// --- CONTROLADORES PARA PROBLEMAS PREDEFINIDOS ---

const createProblem = asyncHandler(async (req, res) => {
    const { title, description, category_id, department_id } = req.body;
    if (!title || !category_id || !department_id) {
        res.status(400);
        throw new Error('Título, categoría y departamento son requeridos.');
    }
    const sql = 'INSERT INTO predefined_problems (title, description, category_id, department_id) VALUES (?, ?, ?, ?)';
    await pool.execute(sql, [title, description, category_id, department_id]);
    res.status(201).json({ success: true, message: 'Problema creado' });
});

const updateProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, department_id } = req.body;
    if (!title || !department_id) {
        res.status(400);
        throw new Error('Título y departamento son requeridos.');
    }
    const sql = 'UPDATE predefined_problems SET title = ?, description = ?, department_id = ? WHERE id = ?';
    await pool.execute(sql, [title, description, department_id, id]);
    res.status(200).json({ success: true, message: 'Problema actualizado' });
});

const deleteProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM predefined_problems WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Problema eliminado' });
});


// --- CONTROLADORES PARA UBICACIONES ---

const getAllLocations = asyncHandler(async (req, res) => {
    const [locations] = await pool.execute('SELECT l.*, c.name as company_name FROM locations l LEFT JOIN Companies c ON l.company_id = c.id ORDER BY l.name ASC');
    res.status(200).json({ success: true, data: locations });
});

const createLocation = asyncHandler(async (req, res) => {
    const { name, type, company_id } = req.body;
    if (!name || !type || !company_id) {
        res.status(400);
        throw new Error('Nombre, tipo y ID de compañía son requeridos.');
    }
    const sql = 'INSERT INTO locations (name, type, company_id) VALUES (?, ?, ?)';
    await pool.execute(sql, [name, type, company_id]);
    res.status(201).json({ success: true, message: 'Ubicación creada' });
});

const updateLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, type, company_id } = req.body;
    if (!name || !type || !company_id) {
        res.status(400);
        throw new Error('Nombre, tipo y ID de compañía son requeridos.');
    }
    const sql = 'UPDATE locations SET name = ?, type = ?, company_id = ? WHERE id = ?';
    await pool.execute(sql, [name, type, company_id, id]);
    res.status(200).json({ success: true, message: 'Ubicación actualizada' });
});

const deleteLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM locations WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Ubicación eliminada' });
});


// ✅ --- FUNCIÓN DE REPORTES CON LA NUEVA MÉTRICA DE TIEMPO ---
const getReports = asyncHandler(async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(400);
            throw new Error("Las fechas de inicio y fin son requeridas.");
        }

        const startOfDay = `${startDate} 00:00:00`;
        const endOfDay = `${endDate} 23:59:59`;

        // --- Métrica 1: Tiempo Promedio de Resolución por Agente ---
        const [agentResolutionTimeRows] = await connection.execute(`
            SELECT
                u.username AS agentName,
                COUNT(t.id) AS resolvedTickets,
                AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) AS avgResolutionTimeHours
            FROM Users u
            JOIN Tickets t ON u.id = t.assigned_to_user_id
            WHERE u.role IN ('agent', 'admin')
              AND t.status IN ('resolved', 'closed')
              AND t.closed_at IS NOT NULL
              AND t.closed_at BETWEEN ? AND ?
            GROUP BY u.id, u.username
            ORDER BY resolvedTickets DESC;
        `, [startOfDay, endOfDay]);

        const agentResolutionTimes = agentResolutionTimeRows.map(row => ({
            agentName: row.agentName,
            resolvedTickets: row.resolvedTickets || 0,
            avgResolutionTimeHours: row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours.toFixed(2)) : null
        }));
        
        // Aquí puedes agregar el resto de tus métricas de reportes si las necesitas
        // Por ejemplo: Tickets por estado, por prioridad, etc.

        res.json({
            success: true,
            data: {
                agentResolutionTimes,
                // Agrega aquí otras métricas si las tienes
            }
        });

    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500);
        throw new Error('Error interno del servidor al obtener reportes.');
    } finally {
        if (connection) connection.release();
    }
});


module.exports = {
    getAllProblemsAndCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createProblem,
    updateProblem,
    deleteProblem,
    getAllLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getReports // ✅ Se exporta la nueva función
};