const express = require('express');
const router = express.Router();
const { getSections, createSection, updateSection, deleteSection } = require('../controllers/resourceSectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Público para clientes (para mostrar el menú)
router.get('/', getSections);

// Admin, Supervisor y Agent
router.post('/', authorize('admin', 'supervisor', 'agent'), createSection);
router.put('/:id', authorize('admin', 'supervisor', 'agent'), updateSection);
router.delete('/:id', authorize('admin', 'supervisor', 'agent'), deleteSection);

module.exports = router;
