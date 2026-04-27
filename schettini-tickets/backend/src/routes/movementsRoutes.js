const express = require('express');
const router = express.Router();
const { protect, authorizeByPermission, authorize } = require('../middleware/authMiddleware');
const { getMovements, deleteMovement } = require('../controllers/movementsController');

router.use(protect);
router.delete('/:id', authorize('admin'), deleteMovement);
router.get('/', authorizeByPermission('repairs_view', 'movements_view'), getMovements);

module.exports = router;
