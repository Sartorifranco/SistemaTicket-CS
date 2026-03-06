const express = require('express');
const router = express.Router();
const { 
    getAdminDashboardData, 
    getClientDashboardData,
    getAgentDashboardData,   // ✅ IMPORTANTE: Agregar esto
    getDepositariosMetrics   // ✅ IMPORTANTE: Agregar esto
} = require('../controllers/dashboardController');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');

// --- RUTAS DE DASHBOARD ---

// 1. Dashboard Admin (Solo Admins)
router.get('/admin', protect, authorize('admin'), getAdminDashboardData);

// 2. Dashboard Cliente (Solo Clientes)
router.get('/client', protect, authorize('client'), getClientDashboardData);

// 3. Dashboard Agente / Supervisor / Viewer (según permiso tickets_view)
router.get('/agent', protect, authorizeByPermission('tickets_view'), getAgentDashboardData);

// 4. Métricas Depositarios
router.get('/depositarios/metrics', protect, authorizeByPermission('tickets_view'), getDepositariosMetrics);

module.exports = router;