const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const userId = req.query.user_id;
        const ticketId = req.query.ticket_id;
        const dateFrom = req.query.date_from;
        const dateTo = req.query.date_to;
        const isAdmin = req.user.role === 'admin';
        
        const params = [];
        const conditions = [];
        
        if (userId) {
            conditions.push('al.user_id = ?');
            params.push(userId);
        } else if (!isAdmin) {
            conditions.push('al.user_id = ?');
            params.push(req.user.id);
        }
        if (ticketId) {
            conditions.push('al.target_type = ? AND al.target_id = ?');
            params.push('ticket', ticketId);
        }
        if (dateFrom) {
            conditions.push('DATE(al.created_at) >= ?');
            params.push(dateFrom);
        }
        if (dateTo) {
            conditions.push('DATE(al.created_at) <= ?');
            params.push(dateTo);
        }
        
        let query = `SELECT al.id, al.user_id, u.username, COALESCE(al.action_type, al.action) as action_type, al.description, al.target_type, al.target_id, al.created_at 
             FROM activity_logs al
             LEFT JOIN Users u ON al.user_id = u.id`;
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ` ORDER BY al.created_at DESC LIMIT ${limit}`;
        
        let logs;
        try {
            [logs] = await pool.query(query, params);
        } catch (sqlErr) {
            if (sqlErr.code === 'ER_BAD_FIELD_ERROR' || sqlErr.errno === 1054) {
                const safeC = [], safeP = [];
                if (userId || !isAdmin) { safeC.push('al.user_id = ?'); safeP.push(userId || req.user.id); }
                if (dateFrom) { safeC.push('DATE(al.created_at) >= ?'); safeP.push(dateFrom); }
                if (dateTo) { safeC.push('DATE(al.created_at) <= ?'); safeP.push(dateTo); }
                const whereClause = safeC.length > 0 ? ' WHERE ' + safeC.join(' AND ') : '';
                const simpleQueries = [
                    `SELECT al.id, al.user_id, u.username, al.action as action_type, al.description, al.created_at FROM activity_logs al LEFT JOIN Users u ON al.user_id = u.id${whereClause} ORDER BY al.created_at DESC LIMIT ${limit}`,
                    `SELECT al.id, al.user_id, u.username, al.action_type, al.description, al.created_at FROM activity_logs al LEFT JOIN Users u ON al.user_id = u.id${whereClause} ORDER BY al.created_at DESC LIMIT ${limit}`,
                    `SELECT al.id, al.user_id, u.username, 'actividad' as action_type, al.description, al.created_at FROM activity_logs al LEFT JOIN Users u ON al.user_id = u.id${whereClause} ORDER BY al.created_at DESC LIMIT ${limit}`
                ];
                let ok = false;
                for (const q of simpleQueries) {
                    try {
                        [logs] = await pool.query(q, safeP);
                        ok = true;
                        break;
                    } catch (_) {}
                }
                if (!ok) throw sqlErr;
            } else {
                throw sqlErr;
            }
        }
        
        res.json({ success: true, data: logs });
    } catch (e) {
        console.error('[activityLogRoutes]', e);
        res.status(500).json({ success: false, data: [], message: 'Error obteniendo logs. Ejecuta: node scripts/migrate-activity-logs.js' });
    }
});

module.exports = router;