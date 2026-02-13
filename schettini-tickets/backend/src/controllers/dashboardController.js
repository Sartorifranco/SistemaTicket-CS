const pool = require('../config/db');

// --- Dashboard Admin ---
const getAdminDashboardData = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalTickets,
                SUM(CASE WHEN status IN ('open', 'in_progress', 'in-progress', 'Abierto', 'En Progreso') THEN 1 ELSE 0 END) as activeTickets,
                (SELECT COUNT(*) FROM Users WHERE role != 'admin') as totalUsers
            FROM Tickets
        `);

        const [deptCounts] = await pool.query(`
            SELECT d.name, COUNT(t.id) as count
            FROM Tickets t JOIN Departments d ON t.department_id = d.id
            WHERE t.status IN ('open', 'in_progress', 'in-progress') GROUP BY d.name
        `);
        const departmentCounts = {};
        deptCounts.forEach(row => { departmentCounts[row.name] = Number(row.count); });

        const [workload] = await pool.query(`
            SELECT u.id as agentId, u.username as agentName, COUNT(t.id) as assignedTickets
            FROM Users u
            LEFT JOIN Tickets t ON u.id = t.assigned_to_user_id AND t.status IN ('open', 'in_progress', 'in-progress')
            WHERE u.role = 'agent' AND u.status = 'active' GROUP BY u.id
        `);

        let recentActivity = [];
        try {
            const [logs] = await pool.query(`SELECT al.id, al.user_id, COALESCE(al.action_type, al.action) as action_type, al.description, al.created_at, u.username FROM activity_logs al LEFT JOIN Users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 10`);
            recentActivity = logs;
        } catch (e) {
            try {
                const [logs] = await pool.query(`SELECT al.id, al.user_id, u.username, al.action as action_type, al.description, al.created_at FROM activity_logs al LEFT JOIN Users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 10`);
                recentActivity = logs;
            } catch (_) {}
        }

        res.json({ success: true, data: { totalTickets: stats[0].totalTickets, activeTickets: stats[0].activeTickets, totalUsers: stats[0].totalUsers, departmentCounts, agentWorkload: workload, recentActivity } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en dashboard admin' });
    }
};

// --- Dashboard Cliente (CORREGIDO ERROR SQL) ---
const getClientDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Tickets
        const [ticketGroups] = await pool.query(
            `SELECT status, COUNT(*) as count FROM Tickets WHERE user_id = ? GROUP BY status`,
            [userId]
        );

        const counters = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
        ticketGroups.forEach(row => {
            const s = (row.status || '').toLowerCase();
            const c = Number(row.count);
            if (s.includes('open') || s.includes('abierto')) counters.open += c;
            else if (s.includes('progress') || s.includes('proceso')) counters.inProgress += c;
            else if (s.includes('resol') || s.includes('resuelto')) counters.resolved += c;
            else if (s.includes('clos') || s.includes('cerrado')) counters.closed += c;
        });

        // 2. DETECCIÓN DE PLAN 
        // CORRECCIÓN AQUÍ: Quitamos 'plan_type' de la query porque no existe en tu DB
        const [users] = await pool.query('SELECT plan FROM Users WHERE id = ?', [userId]);
        const userDB = users[0] || {};
        
        let finalPlan = userDB.plan || 'Free';

        // Lógica de respaldo: Si dice Free, miramos si hay pagos
        if (String(finalPlan).toLowerCase() === 'free') {
            try {
                const [payments] = await pool.query(`
                    SELECT * FROM payments 
                    WHERE user_id = ? AND status = 'approved' 
                    ORDER BY id DESC LIMIT 1
                `, [userId]);

                if (payments.length > 0) {
                    const p = payments[0];
                    const paidPlan = p.plan_name || p.title || '';
                    if (paidPlan.toLowerCase().includes('pro')) finalPlan = 'Pro';
                    if (paidPlan.toLowerCase().includes('enterprise')) finalPlan = 'Enterprise';
                }
            } catch (e) { /* Ignorar error de pagos */ }
        }

        res.json({ 
            success: true, 
            data: { 
                open: counters.open, 
                inProgress: counters.inProgress, 
                resolved: counters.resolved, 
                closed: counters.closed,
                plan: finalPlan 
            } 
        });

    } catch (error) {
        console.error("Error Dashboard Cliente:", error); // Verás el error real si falla
        res.status(500).json({ success: false, message: 'Error en dashboard cliente' });
    }
};

// --- ✅ Dashboard Agente (NUEVO) ---
const getAgentDashboardData = async (req, res) => {
    try {
        const agentId = req.user.id;

        // 1. Tickets Asignados (Abiertos o En Progreso)
        const [assigned] = await pool.query(
            "SELECT COUNT(*) as c FROM Tickets WHERE assigned_to_user_id = ? AND status IN ('open', 'in-progress')", 
            [agentId]
        );

        // 2. Tickets Sin Asignar (Disponibles para tomar)
        const [unassigned] = await pool.query(
            "SELECT COUNT(*) as c FROM Tickets WHERE assigned_to_user_id IS NULL AND status = 'open'"
        );

        // 3. Tickets Resueltos por Mí (Histórico)
        const [resolved] = await pool.query(
            "SELECT COUNT(*) as c FROM Tickets WHERE assigned_to_user_id = ? AND status = 'resolved'", 
            [agentId]
        );
        
        res.json({ 
            success: true, 
            data: { 
                assignedTickets: assigned[0].c, 
                unassignedTickets: unassigned[0].c, 
                resolvedByMe: resolved[0].c 
            } 
        });
    } catch (error) {
        console.error("Error Dashboard Agente:", error);
        res.status(500).json({ message: 'Error al cargar dashboard de agente' });
    }
};

// --- ✅ Métricas Depositarios (NUEVO) ---
const getDepositariosMetrics = async (req, res) => {
    try {
        // Aquí iría la consulta real a tu tabla de depositarios si existiera.
        // Por ahora devolvemos datos dummy para que el widget no falle con 404.
        
        // Ejemplo de query real futura:
        // const [data] = await pool.query("SELECT COUNT(*) as total, SUM(alert) as alertas FROM depositarios");
        
        res.json({ 
            success: true, 
            data: { 
                total: 0, 
                activos: 0, 
                alertas: 0 
            } 
        });
    } catch (error) {
        console.error("Error Métricas Depositarios:", error);
        res.status(500).json({ message: 'Error al cargar métricas de depositarios' });
    }
};

module.exports = { 
    getAdminDashboardData, 
    getClientDashboardData,
    getAgentDashboardData,     // Exportado
    getDepositariosMetrics     // Exportado
};