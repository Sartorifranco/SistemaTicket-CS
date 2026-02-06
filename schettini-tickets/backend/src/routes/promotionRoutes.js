const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getPromotions, createPromotion, deletePromotion, registerInterest } = require('../controllers/promotionController');

// Config de subida
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `promo-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

router.use(protect);

router.get('/', getPromotions);
router.post('/', authorize('admin'), upload.single('image'), createPromotion);
router.delete('/:id', authorize('admin'), deletePromotion);
// Nueva ruta para el botón "Me interesa"
router.post('/:id/interest', registerInterest);

module.exports = router;