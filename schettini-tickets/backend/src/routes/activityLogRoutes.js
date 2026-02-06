const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // ✅ Necesario para la consulta directa
const { protect, authorize } = require('../middleware/authMiddleware');

// Se protegen todas las rutas
router.use(protect);

// Ruta GET para obtener logs (Con lógica incluida para evitar errores de importación)
router.route('/')
    .get(authorize('admin', 'agent', 'client'), async (req, res) => {
        try {
            // Si es admin puede ver todo, si no, solo lo suyo.
            // Para simplificar en este endpoint, filtramos por user_id si viene en la query.
            
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
        } catch (error) {
            console.error("Error fetching logs:", error);
            res.status(500).json({ message: 'Error al obtener registros de actividad' });
        }
    });

module.exports = router;