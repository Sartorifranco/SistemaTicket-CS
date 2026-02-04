const express = require('express');
const router = express.Router();
const { getResources, createResource, deleteResource } = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getResources); // Todos ven
router.post('/', authorize('admin'), createResource); // Solo admin crea
router.delete('/:id', authorize('admin'), deleteResource); // Solo admin borra

module.exports = router;