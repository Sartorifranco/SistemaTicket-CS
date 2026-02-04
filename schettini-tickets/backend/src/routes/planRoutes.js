const express = require('express');
const router = express.Router();
const { getPlans, createPlan, updatePlan, deletePlan } = require('../controllers/planController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getPlans);
router.post('/', authorize('admin'), createPlan);
router.put('/:id', authorize('admin'), updatePlan); // <--- NUEVA RUTA DE EDICIÓN
router.delete('/:id', authorize('admin'), deletePlan);

module.exports = router;