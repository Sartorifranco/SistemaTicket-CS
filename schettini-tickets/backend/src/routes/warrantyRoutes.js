const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getWarrantyStats, getWarranties } = require('../controllers/warrantyController');

router.use(protect);

router.get('/stats', authorize('admin', 'supervisor', 'agent'), getWarrantyStats);
router.get('/', authorize('admin', 'supervisor', 'agent'), getWarranties);

module.exports = router;
