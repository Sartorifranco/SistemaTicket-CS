const pool = require('../config/db');

// --- Dashboard de Reportes (Taller + Tickets) ---
const getDashboard = async (req, res) => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const [
            [kpiRecaudado],
            [kpiCalle],
            [kpiEquipos],
            [statusRows],
            [techRows],
            [trendRows],
            // --- Tickets ---
            [ticketsCreadosMes],
            [ticketsAbiertos],
            [ticketsCerradosMes],
            [ticketsByStatusRows],
            [ticketsByAgentRows]
        ] = await Promise.all([
            // --- WORKSHOP ---
            // 1. Total recaudado este mes (entregado, mes actual)
            pool.query(`
                SELECT COALESCE(SUM(total_cost), 0) as total
                FROM repair_orders
                WHERE status = 'entregado'
                  AND YEAR(COALESCE(delivered_date, updated_at, created_at)) = ?
                  AND MONTH(COALESCE(delivered_date, updated_at, created_at)) = ?
            `, [currentYear, currentMonth]),
            // 2. Dinero en la calle (listo: total_cost - deposit_paid)
            pool.query(`
                SELECT COALESCE(SUM(COALESCE(total_cost, 0) - COALESCE(deposit_paid, 0)), 0) as total
                FROM repair_orders
                WHERE status = 'listo'
            `),
            // 3. Equipos en taller (no entregado ni entregado_sin_reparacion)
            pool.query(`
                SELECT COUNT(*) as total
                FROM repair_orders
                WHERE status NOT IN ('entregado', 'entregado_sin_reparacion')
            `),
            // 4. Distribución por estado
            pool.query(`
                SELECT status, COUNT(*) as count
                FROM repair_orders
                GROUP BY status
                ORDER BY count DESC
            `),
            // 5. Rendimiento por técnico (mes actual: entregados + labor_cost)
            pool.query(`
                SELECT
                    ro.technician_id,
                    COALESCE(u.full_name, u.username) as technician_name,
                    COUNT(*) as equipos_entregados,
                    COALESCE(SUM(ro.labor_cost), 0) as total_mano_obra
                FROM repair_orders ro
                LEFT JOIN Users u ON ro.technician_id = u.id
                WHERE ro.status = 'entregado'
                  AND YEAR(COALESCE(ro.delivered_date, ro.updated_at, ro.created_at)) = ?
                  AND MONTH(COALESCE(ro.delivered_date, ro.updated_at, ro.created_at)) = ?
                GROUP BY ro.technician_id, u.full_name, u.username
                ORDER BY equipos_entregados DESC
            `, [currentYear, currentMonth]),
            // 6. Tendencia financiera últimos 6 meses
            pool.query(`
                SELECT
                    YEAR(COALESCE(delivered_date, updated_at, created_at)) as year,
                    MONTH(COALESCE(delivered_date, updated_at, created_at)) as month,
                    COALESCE(SUM(total_cost), 0) as total
                FROM repair_orders
                WHERE status = 'entregado'
                  AND COALESCE(delivered_date, updated_at, created_at) >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
                GROUP BY year, month
                ORDER BY year ASC, month ASC
            `),
            // --- TICKETS ---
            // 7. Total tickets creados este mes
            pool.query(`
                SELECT COUNT(*) as total
                FROM Tickets
                WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
            `, [currentYear, currentMonth]),
            // 8. Tickets abiertos (status 'open')
            pool.query(`
                SELECT COUNT(*) as total
                FROM Tickets
                WHERE status = 'open'
            `),
            // 9. Tickets cerrados este mes (resolved/closed con closed_at en mes actual)
            pool.query(`
                SELECT COUNT(*) as total
                FROM Tickets
                WHERE status IN ('resolved', 'closed')
                  AND closed_at IS NOT NULL
                  AND YEAR(closed_at) = ? AND MONTH(closed_at) = ?
            `, [currentYear, currentMonth]),
            // 10. Distribución de tickets por estado
            pool.query(`
                SELECT status, COUNT(*) as count
                FROM Tickets
                GROUP BY status
                ORDER BY count DESC
            `),
            // 11. Tickets resueltos/cerrados por agente (quién atiende más)
            pool.query(`
                SELECT
                    t.assigned_to_user_id as agent_id,
                    COALESCE(u.full_name, u.username) as agent_name,
                    COUNT(*) as tickets_resueltos
                FROM Tickets t
                LEFT JOIN Users u ON t.assigned_to_user_id = u.id
                WHERE t.status IN ('resolved', 'closed')
                GROUP BY t.assigned_to_user_id, u.full_name, u.username
                ORDER BY tickets_resueltos DESC
            `)
        ]);

        // --- Workshop ---
        const statusDistribution = (statusRows || []).map((r) => ({
            status: r.status,
            count: Number(r.count)
        }));

        const technicianPerformance = (techRows || []).map((r) => ({
            technicianId: r.technician_id,
            technicianName: r.technician_name || 'Sin asignar',
            equiposEntregados: Number(r.equipos_entregados),
            totalManoObra: parseFloat(r.total_mano_obra) || 0
        }));

        const financialTrend = (trendRows || []).map((r) => ({
            year: Number(r.year),
            month: Number(r.month),
            total: parseFloat(r.total) || 0,
            label: `${r.month}/${r.year}`
        }));

        // --- Tickets ---
        const ticketsByStatus = (ticketsByStatusRows || []).map((r) => ({
            status: r.status,
            count: Number(r.count)
        }));

        const ticketsByAgent = (ticketsByAgentRows || []).map((r) => ({
            agentId: r.agent_id,
            agentName: r.agent_name || 'Sin asignar',
            ticketsResueltos: Number(r.tickets_resueltos)
        }));

        res.json({
            success: true,
            data: {
                workshop: {
                    kpis: {
                        totalRecaudadoMes: parseFloat(kpiRecaudado?.[0]?.total || 0),
                        dineroEnLaCalle: parseFloat(kpiCalle?.[0]?.total || 0),
                        equiposEnTaller: Number(kpiEquipos?.[0]?.total || 0)
                    },
                    statusDistribution,
                    technicianPerformance,
                    financialTrend
                },
                tickets: {
                    kpis: {
                        totalCreadosMes: Number(ticketsCreadosMes?.[0]?.total || 0),
                        ticketsAbiertos: Number(ticketsAbiertos?.[0]?.total || 0),
                        ticketsCerradosMes: Number(ticketsCerradosMes?.[0]?.total || 0)
                    },
                    ticketsByStatus,
                    ticketsByAgent
                }
            }
        });
    } catch (error) {
        console.error('❌ [Reportes Dashboard] Error:', error);
        res.status(500).json({ success: false, message: 'Error al cargar el dashboard de reportes' });
    }
};

// --- Obtener Reportes Avanzados (OPTIMIZADO: Paralelo + Logs) ---
const getReports = async (req, res) => {
    

    try {
        const { startDate, endDate, agentId, companyId, departmentId, categoryId, clientId } = req.query;

        // 1. Definir rango de fechas
        const start = startDate ? startDate + ' 00:00:00' : '2020-01-01 00:00:00';
        const end = endDate ? endDate + ' 23:59:59' : new Date().toISOString().slice(0, 19).replace('T', ' ');
        const queryParams = [start, end];

        // 2. Construir cláusula WHERE base
        let whereClause = 'WHERE t.created_at >= ? AND t.created_at <= ?';

        // 3. Agregar filtros extra dinámicamente
        if (agentId) { whereClause += ' AND t.assigned_to_user_id = ?'; queryParams.push(agentId); }
        if (clientId) { whereClause += ' AND t.user_id = ?'; queryParams.push(clientId); }
        if (departmentId) { whereClause += ' AND t.department_id = ?'; queryParams.push(departmentId); }
        if (categoryId) { whereClause += ' AND t.category_id = ?'; queryParams.push(categoryId); }
        
        // Filtro complejo para company
        if (companyId) { 
            whereClause += ' AND t.user_id IN (SELECT id FROM Users WHERE company_id = ?)'; 
            queryParams.push(companyId); 
        }

       

        // --- 4. EJECUCIÓN PARALELA (LA CLAVE DE LA VELOCIDAD) ---
        // Lanzamos todas las peticiones a la BD juntas
        const [
            [ticketsByStatus],
            [ticketsByPriority],
            [ticketsByDepartment],
            [agentPerformance],
            [agentResolutionTimes],
            [ticketsByCategory],
            [topClients],
            [ticketsByHour]
        ] = await Promise.all([
            pool.query(`SELECT t.status, COUNT(*) as count FROM Tickets t ${whereClause} GROUP BY t.status`, queryParams),
            pool.query(`SELECT t.priority, COUNT(*) as count FROM Tickets t ${whereClause} GROUP BY t.priority`, queryParams),
            pool.query(`SELECT d.name as departmentName, d.id as departmentId, COUNT(t.id) as count FROM Tickets t LEFT JOIN Departments d ON t.department_id = d.id ${whereClause} GROUP BY d.id, d.name`, queryParams),
            pool.query(`SELECT u.username as agentName, u.id as agentId, COUNT(t.id) as assignedTickets, SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as closedTickets FROM Tickets t JOIN Users u ON t.assigned_to_user_id = u.id ${whereClause} GROUP BY u.id, u.username`, queryParams),
            pool.query(`SELECT u.username as agentName, u.id as agentId, COUNT(t.id) as resolvedTickets, AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) as avgResolutionTimeHours FROM Tickets t JOIN Users u ON t.assigned_to_user_id = u.id ${whereClause} AND t.status IN ('resolved', 'closed') AND t.closed_at IS NOT NULL GROUP BY u.id, u.username`, queryParams),
            pool.query(`SELECT c.name as categoryName, c.id as categoryId, COUNT(t.id) as count FROM Tickets t LEFT JOIN ticket_categories c ON t.category_id = c.id ${whereClause} GROUP BY c.id, c.name LIMIT 10`, queryParams),
            pool.query(`SELECT u.username as clientName, u.id as clientId, COUNT(t.id) as count FROM Tickets t JOIN Users u ON t.user_id = u.id ${whereClause} GROUP BY u.id, u.username ORDER BY count DESC LIMIT 10`, queryParams),
            pool.query(`SELECT HOUR(t.created_at) as hour, COUNT(*) as count FROM Tickets t ${whereClause} GROUP BY HOUR(t.created_at) ORDER BY hour ASC`, queryParams)
        ]);

        

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
        console.error("❌ [Reportes] Error FATAL:", error);
        res.status(500).json({ success: false, message: 'Error al generar reportes' });
    }
};

// --- Métricas de Resolución ---
const getResolutionMetrics = async (req, res) => {
    try {
        const [result] = await pool.query(`SELECT COUNT(*) as r, AVG(TIMESTAMPDIFF(HOUR, created_at, closed_at)) as avg FROM Tickets WHERE status IN ('resolved', 'closed') AND closed_at IS NOT NULL`);
        res.json({ success: true, data: { resolvedTicketsCount: result[0].r, averageResolutionTimeFormatted: `${parseFloat(result[0].avg || 0).toFixed(2)} horas` } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error métricas' });
    }
};

module.exports = { getDashboard, getReports, getResolutionMetrics };