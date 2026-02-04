const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getSettings); // Todos pueden ver precios
router.post('/', authorize('admin'), updateSettings); // Solo admin edita

module.exports = router;