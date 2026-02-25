const express = require('express');
const router = express.Router();
const { getDashboard, getReports, getResolutionMetrics } = require('../controllers/reportController');
const { protect, authorize, authorizeReports } = require('../middleware/authMiddleware');

// Proteger todas las rutas
router.use(protect);

// GET /api/reports/dashboard - Solo admin o agent/supervisor con reports_view
router.get('/dashboard', authorizeReports, getDashboard);

// Rutas existentes: admin, supervisor y agent (sin permiso granular)
router.use(authorize('admin', 'agent', 'supervisor'));

// GET /api/reports (Reporte completo)
router.get('/', getReports);

// GET /api/reports/metrics/resolution-time (Métrica rápida)
router.get('/metrics/resolution-time', getResolutionMetrics);

module.exports = router;