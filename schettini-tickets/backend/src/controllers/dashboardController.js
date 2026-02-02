const pool = require('../config/db');

// --- Dashboard Admin ---
const getAdminDashboardData = async (req, res) => {
    try {
        // 1. Estadísticas de Tickets (Contadores)
        const [ticketStats] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
            FROM Tickets
        `);

        // 2. Últimos Tickets
        const [latestTickets] = await pool.query(`
            SELECT t.id, t.title, t.status, t.priority, t.created_at, u.username as creator
            FROM Tickets t
            JOIN Users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 5
        `);

        // 3. Historial de Actividad
        // CORRECCIÓN: Usamos 'action' en lugar de 'action_type' para coincidir con tu DB
        const [activities] = await pool.query(`
            SELECT al.id, al.action, al.description, al.created_at, u.username
            FROM activity_logs al
            LEFT JOIN Users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 10
        `);

        res.json({
            stats: ticketStats[0],
            latestTickets,
            recentActivity: activities
        });

    } catch (error) {
        console.error("Error en Admin Dashboard:", error);
        res.status(500).json({ message: 'Error al obtener datos del dashboard' });
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
            stats: stats[0],
            recentTickets
        });
    } catch (error) {
        console.error("Error en Client Dashboard:", error);
        res.status(500).json({ message: 'Error al obtener datos del cliente' });
    }
};

module.exports = {
    getAdminDashboardData,
    getClientDashboardData
};