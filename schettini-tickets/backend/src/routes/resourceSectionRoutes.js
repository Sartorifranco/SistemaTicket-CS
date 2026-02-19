const express = require('express');
const router = express.Router();
const { getSections, createSection, updateSection, deleteSection } = require('../controllers/resourceSectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Público para clientes (para mostrar el menú)
router.get('/', getSections);

// Admin y Supervisor
router.post('/', authorize('admin', 'supervisor'), createSection);
router.put('/:id', authorize('admin', 'supervisor'), updateSection);
router.delete('/:id', authorize('admin', 'supervisor'), deleteSection);

module.exports = router;
