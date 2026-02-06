const express = require('express');
const router = express.Router();
const { 
    getAdminDashboardData, 
    getClientDashboardData,
    getAgentDashboardData,   // ✅ IMPORTANTE: Agregar esto
    getDepositariosMetrics   // ✅ IMPORTANTE: Agregar esto
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- RUTAS DE DASHBOARD ---

// 1. Dashboard Admin (Solo Admins)
router.get('/admin', protect, authorize('admin'), getAdminDashboardData);

// 2. Dashboard Cliente (Solo Clientes)
router.get('/client', protect, authorize('client'), getClientDashboardData);

// 3. Dashboard Agente (✅ CORREGIDO: Apunta al controlador específico de agente)
router.get('/agent', protect, authorize('agent'), getAgentDashboardData);

// 4. Métricas Depositarios (✅ NUEVO: Para evitar el error 404 en el widget)
router.get('/depositarios/metrics', protect, authorize('agent', 'admin'), getDepositariosMetrics);

module.exports = router;