const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { search, getAll, bulkCreate, importFromExcel } = require('../controllers/sparePartsCatalogController');

router.use(protect);
router.get('/search', search);
router.get('/', getAll);
router.post('/bulk', authorize('admin'), bulkCreate);
router.post('/import', importFromExcel);

module.exports = router;
