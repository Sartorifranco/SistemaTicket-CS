const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createFactoryShipment,
  getFactoryShipments,
  getFactoryShipmentById,
  updateFactoryShipment,
  deleteFactoryShipment,
  getDashboard
} = require('../controllers/factoryShipmentController');

router.use(protect);
router.use(authorize('admin', 'agent', 'supervisor'));

router.get('/dashboard', getDashboard);
router.get('/', getFactoryShipments);
router.get('/:id', getFactoryShipmentById);
router.post('/', createFactoryShipment);
router.put('/:id', updateFactoryShipment);
router.delete('/:id', deleteFactoryShipment);

module.exports = router;
