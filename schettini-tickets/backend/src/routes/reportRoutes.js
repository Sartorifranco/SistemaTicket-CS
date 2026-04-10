const express = require('express');
const router = express.Router();
const { getDashboard, getReports, getResolutionMetrics } = require('../controllers/reportController');
const { getDebtsTaller, getDebtsRemoto, getDebtsTotals } = require('../controllers/techReportsController');
const { protect, authorize, authorizeByPermission, authorizeReports, authorizeTechFinances } = require('../middleware/authMiddleware');

// Proteger todas las rutas
router.use(protect);

// GET /api/reports/dashboard - admin o quien tenga reports_view
router.get('/dashboard', authorizeReports, getDashboard);

// GET /api/reports/debts/* - Finanzas Técnicas: admin, supervisor, o agent/viewer con can_manage_tech_finances o tech_finances
router.get('/debts/taller', authorizeTechFinances, getDebtsTaller);
router.get('/debts/remoto', authorizeTechFinances, getDebtsRemoto);
router.get('/debts/totals', authorizeTechFinances, getDebtsTotals);

// GET /api/reports (Reporte completo) - requiere reports_view
router.get('/', authorizeByPermission('reports_view'), getReports);

// GET /api/reports/metrics/resolution-time (Métrica rápida) - requiere reports_view
router.get('/metrics/resolution-time', authorizeByPermission('reports_view'), getResolutionMetrics);

module.exports = router;