const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler'); // Importar asyncHandler
const pool = require('../config/db');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Middleware de autenticación y autorización para todas las rutas de admin
router.use(protect);
router.use(authorizeRoles('admin'));

/**
 * @route GET /api/admin/reports
 * @description Obtiene métricas y datos para reportes avanzados.
 * @access Private (Admin only)
 * @queryParam {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @queryParam {string} endDate - Fecha de fin (YYYY-MM-DD)
 */
router.get('/reports', asyncHandler(async (req, res) => { // Envuelto en asyncHandler
    let connection;
    try {
        connection = await pool.getConnection();
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(400); // Establecer status antes de lanzar el error
            throw new Error("Las fechas de inicio y fin son requeridas.");
        }

        const startOfDay = `${startDate} 00:00:00`;
        const endOfDay = `${endDate} 23:59:59`;

        // Tickets por Estado a lo largo del tiempo
        const [ticketsByStatusOverTimeRows] = await connection.execute(`
            SELECT
                DATE(created_at) AS date,
                status,
                COUNT(*) AS count
            FROM tickets
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at), status
            ORDER BY date ASC, status;
        `, [startOfDay, endOfDay]);

        // Rellenar fechas faltantes para el gráfico
        const dailyStatusMap = new Map();
        let currentDate = new Date(startDate);
        const end = new Date(endDate);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyStatusMap.set(dateStr, { date: dateStr, open: 0, 'in-progress': 0, resolved: 0, closed: 0, reopened: 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        ticketsByStatusOverTimeRows.forEach(row => {
            const entry = dailyStatusMap.get(row.date.toISOString().split('T')[0]); // Asegurar formato de fecha consistente
            if (entry) {
                // Usar el nombre de la propiedad directamente como en el enum
                if (row.status === 'open') entry.open = row.count;
                else if (row.status === 'in-progress') entry['in-progress'] = row.count;
                else if (row.status === 'resolved') entry.resolved = row.count;
                else if (row.status === 'closed') entry.closed = row.count;
                else if (row.status === 'reopened') entry.reopened = row.count;
            }
        });
        const ticketsByStatusOverTime = Array.from(dailyStatusMap.values());


        // Tickets por Prioridad a lo largo del tiempo
        const [ticketsByPriorityOverTimeRows] = await connection.execute(`
            SELECT
                DATE(created_at) AS date,
                priority,
                COUNT(*) AS count
            FROM tickets
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at), priority
            ORDER BY date ASC, priority;
        `, [startOfDay, endOfDay]);

        const dailyPriorityMap = new Map();
        currentDate = new Date(startDate);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyPriorityMap.set(dateStr, { date: dateStr, low: 0, medium: 0, high: 0, urgent: 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        ticketsByPriorityOverTimeRows.forEach(row => {
            const entry = dailyPriorityMap.get(row.date.toISOString().split('T')[0]); // Asegurar formato de fecha consistente
            if (entry) {
                if (row.priority === 'low') entry.low = row.count;
                else if (row.priority === 'medium') entry.medium = row.count;
                else if (row.priority === 'high') entry.high = row.count;
                else if (row.priority === 'urgent') entry.urgent = row.count;
            }
        });
        const ticketsByPriorityOverTime = Array.from(dailyPriorityMap.values());


        // Rendimiento de Agentes
        const [agentPerformanceRows] = await connection.execute(`
            SELECT
                u.username AS agentName,
                COUNT(t.id) AS resolvedTickets,
                AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) AS avgResolutionTimeHours
            FROM users u
            LEFT JOIN tickets t ON u.id = t.assigned_to_user_id AND (t.status = 'resolved' OR t.status = 'closed') AND t.closed_at BETWEEN ? AND ?
            WHERE u.role = 'agent'
            GROUP BY u.id, u.username
            ORDER BY resolvedTickets DESC;
        `, [startOfDay, endOfDay]); // Filtrar por fecha de cierre para tickets resueltos/cerrados
        const agentPerformance = agentPerformanceRows.map(row => {
            const avgTime = row.avgResolutionTimeHours;
            const formattedAvgTime = (typeof avgTime === 'number' && !isNaN(avgTime)) ? parseFloat(avgTime.toFixed(2)) : null;
            return {
                agentName: row.agentName,
                resolvedTickets: row.resolvedTickets || 0,
                avgResolutionTimeHours: formattedAvgTime
            };
        });


        // Rendimiento de Departamentos
        const [departmentPerformanceRows] = await connection.execute(`
            SELECT
                d.name AS departmentName,
                COUNT(t.id) AS totalTickets,
                AVG(CASE WHEN t.status = 'resolved' THEN TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at) ELSE NULL END) AS avgResolutionTimeHours
            FROM departments d
            LEFT JOIN tickets t ON d.id = t.department_id AND t.created_at BETWEEN ? AND ?
            GROUP BY d.id, d.name
            ORDER BY totalTickets DESC;
        `, [startOfDay, endOfDay]);
        const departmentPerformance = departmentPerformanceRows.map(row => {
            const avgTime = row.avgResolutionTimeHours;
            const formattedAvgTime = (typeof avgTime === 'number' && !isNaN(avgTime)) ? parseFloat(avgTime.toFixed(2)) : null;
            return {
                departmentName: row.departmentName,
                totalTickets: row.totalTickets || 0,
                avgResolutionTimeHours: formattedAvgTime
            };
        });

        res.json({
            ticketsByStatusOverTime,
            ticketsByPriorityOverTime,
            agentPerformance,
            departmentPerformance,
        });

    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500); // Establecer status antes de lanzar el error
        throw new Error('Error interno del servidor al obtener reportes.');
    } finally {
        if (connection) connection.release();
    }
}));

// REMOVIDO: La ruta /activity-logs ha sido eliminada de aquí
// porque ya existe un controlador y una ruta dedicados para ella en activityLogRoutes.js.

module.exports = router;
