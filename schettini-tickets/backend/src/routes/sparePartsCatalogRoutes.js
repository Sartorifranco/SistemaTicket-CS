const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { search, getAll, bulkCreate, importFromExcel, clearCatalog } = require('../controllers/sparePartsCatalogController');

router.use(protect);
router.get('/search', search);
router.get('/', getAll);
router.post('/bulk', authorize('admin'), bulkCreate);
router.post('/import', importFromExcel);
router.delete('/clear', authorize('admin'), clearCatalog);

module.exports = router;
