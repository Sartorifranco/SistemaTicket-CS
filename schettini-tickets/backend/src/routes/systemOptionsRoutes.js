const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAll, getCategories, create, update, remove } = require('../controllers/systemOptionsController');

router.get('/', getAll);
router.get('/categories', getCategories);
router.post('/', protect, authorize('admin'), create);
router.put('/:id', protect, authorize('admin'), update);
router.delete('/:id', protect, authorize('admin'), remove);

module.exports = router;
