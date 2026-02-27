const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { search, getAll, bulkCreate } = require('../controllers/sparePartsCatalogController');

router.use(protect);
router.get('/search', search);
router.get('/', getAll);
router.post('/bulk', authorize('admin'), bulkCreate);

module.exports = router;
