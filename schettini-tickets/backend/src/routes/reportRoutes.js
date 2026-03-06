const express = require('express');
const router = express.Router();
const { getDashboard, getReports, getResolutionMetrics } = require('../controllers/reportController');
const { getDebtsTaller, getDebtsRemoto, getDebtsTotals } = require('../controllers/techReportsController');
const { protect, authorize, authorizeByPermission, authorizeReports, authorizeTechFinances } = require('../middleware/authMiddleware');

// Proteger todas las rutas
router.use(protect);

// GET /api/reports/dashboard - admin o quien tenga reports_view
router.get('/dashboard', authorizeReports, getDashboard);

// Reportes: admin o quien tenga reports_view (configurable desde Admin > Usuarios > Permisos)
router.use(authorizeByPermission('reports_view'));

// GET /api/reports (Reporte completo)
router.get('/', getReports);

// GET /api/reports/metrics/resolution-time (Métrica rápida)
router.get('/metrics/resolution-time', getResolutionMetrics);

// GET /api/reports/debts/* - Finanzas Técnicas: admin o agent con can_manage_tech_finances
router.get('/debts/taller', authorizeTechFinances, getDebtsTaller);
router.get('/debts/remoto', authorizeTechFinances, getDebtsRemoto);
router.get('/debts/totals', authorizeTechFinances, getDebtsTotals);

module.exports = router;