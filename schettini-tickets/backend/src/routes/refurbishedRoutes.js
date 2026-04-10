const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadsDir = require('../utils/uploadsDir');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');
const { getAll, getById, create, update, remove, setActive } = require('../controllers/refurbishedController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) =>
        cb(null, `refurbished-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.jpg'}`)
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp/i.test(path.extname(file.originalname).slice(1)) || file.mimetype.startsWith('image/');
        cb(null, !!ok);
    }
});

router.use(protect);

router.get('/', authorizeByPermission('repairs_view', 'refurbished_view'), getAll);
router.get('/:id', authorizeByPermission('repairs_view', 'refurbished_view'), getById);
router.post('/', authorizeByPermission('repairs_create', 'repairs_edit', 'refurbished_create'), upload.array('photos', 6), create);
router.put('/:id', authorizeByPermission('repairs_edit', 'refurbished_edit'), upload.array('photos', 6), update);
router.patch('/:id/active', authorizeByPermission('repairs_edit', 'refurbished_edit'), setActive);
router.delete('/:id', authorizeByPermission('repairs_edit', 'refurbished_edit'), remove);

module.exports = router;
