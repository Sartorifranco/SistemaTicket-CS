const express = require('express');
const router = express.Router();
const { getSections, createSection, updateSection, deleteSection } = require('../controllers/resourceSectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Público para clientes (para mostrar el menú)
router.get('/', getSections);

// Solo admin
router.post('/', authorize('admin'), createSection);
router.put('/:id', authorize('admin'), updateSection);
router.delete('/:id', authorize('admin'), deleteSection);

module.exports = router;
