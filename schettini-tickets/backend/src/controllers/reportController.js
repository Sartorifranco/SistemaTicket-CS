const pool = require('../config/db');

// --- Generar Reporte General ---
const getReports = async (req, res) => {
    try {
        const { startDate, endDate, status, userId } = req.query;

        let query = `
            SELECT 
                t.id, 
                t.title, 
                t.status, 
                t.priority, 
                t.created_at, 
                t.closed_at,
                t.closure_reason,
                u.username as creator_name,
                a.username as agent_name,
                cat.name as category_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN Users a ON t.assigned_to_user_id = a.id
            LEFT JOIN ticket_categories cat ON t.category_id = cat.id
            WHERE 1=1
        `;
        
        const params = [];

        if (startDate && endDate) {
            query += ' AND t.created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        // Ordenar por fecha
        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, params);

        res.json(tickets);

    } catch (error) {
        console.error("Error en getReports:", error);
        res.status(500).json({ message: 'Error al generar el reporte' });
    }
};

// --- Obtener estadísticas para gráficos ---
const getReportStats = async (req, res) => {
    try {
        // Estadísticas por Estado
        const [statusStats] = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM Tickets 
            GROUP BY status
        `);

        // Estadísticas por Prioridad
        const [priorityStats] = await pool.query(`
            SELECT priority, COUNT(*) as count 
            FROM Tickets 
            GROUP BY priority
        `);

        // Estadísticas por Agente (Top 5) - Usando 'username'
        const [agentStats] = await pool.query(`
            SELECT u.username as name, COUNT(t.id) as tickets_solved
            FROM Tickets t
            JOIN Users u ON t.assigned_to_user_id = u.id
            WHERE t.status = 'closed' OR t.status = 'resolved'
            GROUP BY u.id
            ORDER BY tickets_solved DESC
            LIMIT 5
        `);

        res.json({
            statusStats,
            priorityStats,
            agentStats
        });

    } catch (error) {
        console.error("Error en getReportStats:", error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};

module.exports = {
    getReports,
    getReportStats
};