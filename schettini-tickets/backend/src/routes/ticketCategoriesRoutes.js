const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAll, create, remove } = require('../controllers/ticketCategoriesController');

router.get('/', getAll);
router.post('/', protect, authorize('admin'), create);
router.delete('/:id', protect, authorize('admin'), remove);

module.exports = router;
