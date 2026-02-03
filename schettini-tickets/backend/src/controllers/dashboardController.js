const pool = require('../config/db');

// --- Dashboard Admin ---
const getAdminDashboardData = async (req, res) => {
    try {
        // 1. Estadísticas Generales
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalTickets,
                SUM(CASE WHEN status IN ('open', 'in_progress', 'in-progress') THEN 1 ELSE 0 END) as activeTickets,
                (SELECT COUNT(*) FROM Users WHERE role != 'admin') as totalUsers
            FROM Tickets
        `);

        // 2. Conteo por Departamento (Para los botones de colores)
        const [deptCounts] = await pool.query(`
            SELECT d.name, COUNT(t.id) as count
            FROM Tickets t
            JOIN Departments d ON t.department_id = d.id
            WHERE t.status IN ('open', 'in_progress', 'in-progress')
            GROUP BY d.name
        `);

        // Convertir array [{name: 'Soporte - IT', count: 5}] a objeto {'Soporte - IT': 5}
        const departmentCounts = {};
        deptCounts.forEach(row => {
            departmentCounts[row.name] = row.count;
        });

        // 3. Carga de Trabajo de Agentes
        const [workload] = await pool.query(`
            SELECT u.id as agentId, u.username as agentName, COUNT(t.id) as assignedTickets
            FROM Users u
            LEFT JOIN Tickets t ON u.id = t.assigned_to_user_id AND t.status IN ('open', 'in_progress', 'in-progress')
            WHERE u.role = 'agent' AND u.status = 'active'
            GROUP BY u.id
        `);

        // 4. Actividad Reciente (Adaptado para que coincida con activity_logs)
        let recentActivity = [];
        try {
            const [logs] = await pool.query(`
                SELECT al.id, al.user_id, al.action as action_type, al.description, al.created_at, u.username
                FROM activity_logs al
                LEFT JOIN Users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT 10
            `);
            recentActivity = logs;
        } catch (e) {
            console.warn("Tabla activity_logs no encontrada");
        }

        res.json({
            success: true,
            data: {
                totalTickets: stats[0].totalTickets,
                activeTickets: stats[0].activeTickets,
                totalUsers: stats[0].totalUsers,
                departmentCounts,
                agentWorkload: workload,
                recentActivity
            }
        });

    } catch (error) {
        console.error("Error en Admin Dashboard:", error);
        res.status(500).json({ success: false, message: 'Error al obtener datos del dashboard' });
    }
};

// --- Dashboard Cliente ---
const getClientDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;

        // Estadísticas solo del usuario
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
            FROM Tickets
            WHERE user_id = ?
        `, [userId]);

        // Últimos tickets del usuario
        const [recentTickets] = await pool.query(`
            SELECT id, title, status, created_at 
            FROM Tickets 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [userId]);

        res.json({
            success: true,
            data: {
                stats: stats[0] || { total: 0, open: 0, resolved: 0 },
                recentTickets
            }
        });
    } catch (error) {
        console.error("Error en Client Dashboard:", error);
        res.status(500).json({ success: false, message: 'Error al obtener datos del cliente' });
    }
};

module.exports = {
    getAdminDashboardData,
    getClientDashboardData
};