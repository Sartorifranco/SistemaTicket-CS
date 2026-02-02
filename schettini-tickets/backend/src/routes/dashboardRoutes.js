const express = require('express');
const router = express.Router();
const { 
    getAdminDashboardData, 
    getClientDashboardData 
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- RUTAS DE DASHBOARD ---

// 1. Dashboard Admin (Solo Admins)
router.get('/admin', protect, authorize('admin'), getAdminDashboardData);

// 2. Dashboard Cliente (Solo Clientes)
router.get('/client', protect, authorize('client'), getClientDashboardData);

// 3. Dashboard Agente (Usamos la vista de admin o una simplificada)
// Por ahora le damos acceso al de admin, o podrías crear uno específico.
router.get('/agent', protect, authorize('agent'), getAdminDashboardData);

module.exports = router;