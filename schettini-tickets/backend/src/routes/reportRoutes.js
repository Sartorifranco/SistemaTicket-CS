const express = require('express');
const router = express.Router();
const { getDashboard, getReports, getResolutionMetrics } = require('../controllers/reportController');
const { getDebtsTaller, getDebtsRemoto, getDebtsTotals } = require('../controllers/techReportsController');
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

// GET /api/reports/debts/* - Deudas de clientes (Taller y Remoto)
router.get('/debts/taller', getDebtsTaller);
router.get('/debts/remoto', getDebtsRemoto);
router.get('/debts/totals', getDebtsTotals);

module.exports = router;