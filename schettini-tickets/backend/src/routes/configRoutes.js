const express = require('express');
const router = express.Router();
const { getPublicConfig, getAdminConfig, updateConfig } = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Ruta pública (Login y Clientes la usan)
router.get('/public', getPublicConfig);

// Ruta pública general (Para evitar 404 si el frontend llama a /api/config a secas)
router.get('/', getPublicConfig);

// Configuración completa para panel admin (incluye emails internos)
router.get('/admin', protect, authorize('admin'), getAdminConfig);

// Ruta protegida (Solo Admin edita)
router.post('/', protect, authorize('admin'), updateConfig); 
router.put('/', protect, authorize('admin'), updateConfig); // Soportar ambos métodos

module.exports = router;