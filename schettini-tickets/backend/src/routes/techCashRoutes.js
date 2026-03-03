const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createMovement,
  getMovements,
  getMovementById,
  updateMovement,
  deleteMovement
} = require('../controllers/techCashController');

router.use(protect);
router.use(authorize('admin', 'agent', 'supervisor'));

router.get('/', getMovements);
router.get('/:id', getMovementById);
router.post('/', createMovement);
router.put('/:id', updateMovement);
router.delete('/:id', deleteMovement);

module.exports = router;
