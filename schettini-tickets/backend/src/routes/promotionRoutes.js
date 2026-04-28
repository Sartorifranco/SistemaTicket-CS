const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadsDir = require('../utils/uploadsDir');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');
const { getPromotions, createPromotion, deletePromotion, registerInterest, getOfferLeads } = require('../controllers/promotionController');

// Config de subida
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `promo-${Date.now()}${path.extname(file.originalname)}`)
});

const PROMO_IMAGE_MAX_BYTES = 200 * 1024 * 1024;
const PROMO_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
    storage,
    limits: { fileSize: PROMO_IMAGE_MAX_BYTES },
    fileFilter: (req, file, cb) => {
        if (PROMO_ALLOWED_MIMES.includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Formato no permitido. Solo JPG, PNG o WEBP.'));
    }
});

router.use(protect);

router.get(
    '/leads',
    authorize('admin', 'agent', 'supervisor'),
    authorizeByPermission('marketing_promotions'),
    getOfferLeads
);

router.get('/', getPromotions);

router.post(
    '/',
    authorize('admin', 'agent', 'supervisor'),
    authorizeByPermission('marketing_promotions'),
    (req, res, next) => {
        upload.single('image')(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'La imagen supera el límite de 200MB. Por favor, comprímela antes de subirla.'
                    });
                }
                const msg =
                    typeof err.message === 'string' && err.message.trim()
                        ? err.message
                        : 'No se pudo procesar el archivo.';
                return res.status(400).json({ success: false, message: msg });
            }
            createPromotion(req, res).catch(next);
        });
    }
);
router.delete(
    '/:id',
    authorize('admin', 'agent', 'supervisor'),
    authorizeByPermission('marketing_promotions'),
    deletePromotion
);
// Nueva ruta para el botón "Me interesa"
router.post('/:id/interest', registerInterest);

module.exports = router;