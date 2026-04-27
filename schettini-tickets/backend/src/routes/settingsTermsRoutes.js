const express = require('express');
const router = express.Router();
const { getTerms, putTerms } = require('../controllers/settingsTermsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/terms', protect, getTerms);
router.put('/terms', protect, authorize('admin'), putTerms);

module.exports = router;
