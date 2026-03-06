const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getMovements } = require('../controllers/movementsController');

router.use(protect);
router.get('/', authorize('admin', 'supervisor', 'agent'), getMovements);

module.exports = router;
