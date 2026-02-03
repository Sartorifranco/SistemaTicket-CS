const pool = require('../config/db');

// --- Obtener Reportes Avanzados (Gráficos y Tablas) ---
const getReports = async (req, res) => {
    try {
        const { startDate, endDate, agentId, companyId, departmentId, categoryId, clientId } = req.query;

        // 1. Definir rango de fechas (con prefijo 't.' para evitar ambigüedad)
        const start = startDate ? startDate + ' 00:00:00' : '2020-01-01 00:00:00';
        const end = endDate ? endDate + ' 23:59:59' : new Date().toISOString().slice(0, 19).replace('T', ' ');
        const queryParams = [start, end];

        // 2. Construir cláusula WHERE base (Siempre usando 't.' para la tabla Tickets)
        let whereClause = 'WHERE t.created_at >= ? AND t.created_at <= ?';

        // 3. Agregar filtros extra dinámicamente
        if (agentId) { whereClause += ' AND t.assigned_to_user_id = ?'; queryParams.push(agentId); }
        if (clientId) { whereClause += ' AND t.user_id = ?'; queryParams.push(clientId); }
        if (departmentId) { whereClause += ' AND t.department_id = ?'; queryParams.push(departmentId); }
        if (categoryId) { whereClause += ' AND t.category_id = ?'; queryParams.push(categoryId); }
        
        // Filtro complejo para company (requiere subconsulta)
        if (companyId) { 
            whereClause += ' AND t.user_id IN (SELECT id FROM Users WHERE company_id = ?)'; 
            queryParams.push(companyId); 
        }

        // --- EJECUCIÓN DE CONSULTAS ---
        // Nota: En TODAS las consultas usamos "FROM Tickets t" para que el alias coincida

        // 1. Tickets por Estado
        const [ticketsByStatus] = await pool.query(`
            SELECT t.status, COUNT(*) as count 
            FROM Tickets t 
            ${whereClause} 
            GROUP BY t.status
        `, queryParams);

        // 2. Tickets por Prioridad
        const [ticketsByPriority] = await pool.query(`
            SELECT t.priority, COUNT(*) as count 
            FROM Tickets t 
            ${whereClause} 
            GROUP BY t.priority
        `, queryParams);

        // 3. Tickets por Departamento
        const [ticketsByDepartment] = await pool.query(`
            SELECT d.name as departmentName, d.id as departmentId, COUNT(t.id) as count
            FROM Tickets t
            LEFT JOIN Departments d ON t.department_id = d.id
            ${whereClause}
            GROUP BY d.id, d.name
        `, queryParams);

        // 4. Rendimiento de Agentes (Aquí fallaba antes por el JOIN con Users)
        const [agentPerformance] = await pool.query(`
            SELECT u.username as agentName, u.id as agentId,
                COUNT(t.id) as assignedTickets,
                SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as closedTickets
            FROM Tickets t
            JOIN Users u ON t.assigned_to_user_id = u.id
            ${whereClause}
            GROUP BY u.id, u.username
        `, queryParams);

        // 5. Tiempos de Resolución
        const [agentResolutionTimes] = await pool.query(`
            SELECT u.username as agentName, u.id as agentId,
                COUNT(t.id) as resolvedTickets,
                AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) as avgResolutionTimeHours
            FROM Tickets t
            JOIN Users u ON t.assigned_to_user_id = u.id
            ${whereClause}
            AND t.status IN ('resolved', 'closed') AND t.closed_at IS NOT NULL
            GROUP BY u.id, u.username
        `, queryParams);

        // 6. Tickets por Categoría
        const [ticketsByCategory] = await pool.query(`
            SELECT c.name as categoryName, c.id as categoryId, COUNT(t.id) as count
            FROM Tickets t
            LEFT JOIN ticket_categories c ON t.category_id = c.id
            ${whereClause}
            GROUP BY c.id, c.name
            LIMIT 10
        `, queryParams);

        // 7. Top Clientes
        const [topClients] = await pool.query(`
            SELECT u.username as clientName, u.id as clientId, COUNT(t.id) as count
            FROM Tickets t
            JOIN Users u ON t.user_id = u.id
            ${whereClause}
            GROUP BY u.id, u.username
            ORDER BY count DESC
            LIMIT 10
        `, queryParams);

        // 8. Tickets por Hora
        const [ticketsByHour] = await pool.query(`
            SELECT HOUR(t.created_at) as hour, COUNT(*) as count
            FROM Tickets t
            ${whereClause}
            GROUP BY HOUR(t.created_at)
            ORDER BY hour ASC
        `, queryParams);

        res.json({
            success: true,
            data: {
                ticketsByStatus,
                ticketsByPriority,
                ticketsByDepartment,
                agentPerformance,
                agentResolutionTimes,
                ticketsByCategory,
                topClients,
                ticketsByHour
            }
        });

    } catch (error) {
        console.error("Error en Reportes:", error);
        res.status(500).json({ success: false, message: 'Error al generar reportes' });
    }
};

// --- Métricas de Resolución (Endpoint simple) ---
const getResolutionMetrics = async (req, res) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                COUNT(*) as resolvedTicketsCount,
                AVG(TIMESTAMPDIFF(HOUR, created_at, closed_at)) as avgHours
            FROM Tickets
            WHERE status IN ('resolved', 'closed') AND closed_at IS NOT NULL
        `);
        
        const avg = result[0].avgHours || 0;
        const formatted = `${parseFloat(avg).toFixed(2)} horas`;

        res.json({
            success: true,
            data: {
                resolvedTicketsCount: result[0].resolvedTicketsCount,
                averageResolutionTimeFormatted: formatted
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error métricas' });
    }
};

module.exports = { getReports, getResolutionMetrics };