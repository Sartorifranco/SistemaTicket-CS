const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAll, getCategories, create, update, remove } = require('../controllers/systemOptionsController');

router.use(protect);
router.get('/', getAll);
router.get('/categories', getCategories);
router.post('/', authorize('admin', 'supervisor', 'agent'), create);
router.put('/:id', authorize('admin', 'supervisor', 'agent'), update);
router.delete('/:id', authorize('admin', 'supervisor', 'agent'), remove);

module.exports = router;
