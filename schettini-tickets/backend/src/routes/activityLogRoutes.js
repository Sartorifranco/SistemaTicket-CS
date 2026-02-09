const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        
        const [logs] = await pool.query(
            `SELECT al.id, al.description, al.created_at, u.username 
             FROM activity_logs al 
             JOIN Users u ON al.user_id = u.id 
             WHERE al.user_id = ? 
             ORDER BY al.created_at DESC LIMIT ?`, 
            [userId, limit]
        );
        res.json({ success: true, data: logs });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error obteniendo logs' });
    }
});

module.exports = router;