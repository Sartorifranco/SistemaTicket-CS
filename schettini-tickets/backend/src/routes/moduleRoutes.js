const express = require('express');
const router = express.Router();
const { getModules, createModule, updateModule, deleteModule } = require('../controllers/moduleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getModules); // Clientes y Admins ven
router.post('/', authorize('admin'), createModule);
router.put('/:id', authorize('admin'), updateModule);
router.delete('/:id', authorize('admin'), deleteModule);

module.exports = router;