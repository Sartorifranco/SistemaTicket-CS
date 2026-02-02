// En src/routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const { getResolutionTimeMetrics } = require('../controllers/metricsController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

router.get('/resolution-time', authenticateToken, authorize(['admin', 'agent']), getResolutionTimeMetrics);

module.exports = router;