const express = require('express');
const router = express.Router();
const { protect, authorizeByPermission } = require('../middleware/authMiddleware');
const { getMovements } = require('../controllers/movementsController');

router.use(protect);
router.get('/', authorizeByPermission('repairs_view'), getMovements);

module.exports = router;
