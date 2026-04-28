const express = require('express');
const router = express.Router();
const { getTerms, putTerms } = require('../controllers/settingsTermsController');
const { updateConfig } = require('../controllers/configController');
const { protect, authorize } = require('../middleware/authMiddleware');

// PUT /api/settings — mismo cuerpo que PUT /api/config (system_settings)
router.put('/', protect, authorize('admin'), updateConfig);

router.get('/terms', protect, getTerms);
router.put('/terms', protect, authorize('admin'), putTerms);

module.exports = router;
