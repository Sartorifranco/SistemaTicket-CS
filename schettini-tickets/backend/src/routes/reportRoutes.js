const express = require('express');
const router = express.Router();
const { getReports, getResolutionMetrics } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Proteger todas las rutas
router.use(protect);
router.use(authorize('admin')); // Solo admins ven reportes

// GET /api/reports (Reporte completo con gráficos)
router.get('/', getReports);

// GET /api/reports/metrics/resolution-time (Métrica rápida simple)
router.get('/metrics/resolution-time', getResolutionMetrics);

module.exports = router;