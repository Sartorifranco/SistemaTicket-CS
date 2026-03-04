const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAfipByCuit } = require('../controllers/clientController');

router.use(protect);

// IMPORTANTE: /afip/:cuit debe ir ANTES de cualquier ruta genérica /:id (si se agrega en el futuro)
router.get('/afip/:cuit', authorize('admin', 'agent', 'supervisor'), asyncHandler(getAfipByCuit));

module.exports = router;
