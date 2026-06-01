const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadsDir = require('../utils/uploadsDir');
const { getResources, getExplorer, createResource, updateResource, deleteResource, moveResource } = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const MAX_VIDEO_MB = 500;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const raw = path.basename(file.originalname || 'archivo');
        const safe = raw.replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ]/gi, '_').replace(/\s+/g, '_') || 'archivo';
        cb(null, `${Date.now()}-${safe}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 }
});

const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]);

const handleResourceUpload = (req, res, next) => {
    uploadFields(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `El archivo supera el límite de ${MAX_VIDEO_MB} MB. Comprimí el video o subí una versión más liviana.`
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || 'No se pudo procesar el archivo subido.'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message || 'No se pudo procesar el archivo subido.'
        });
    });
};

router.use(protect);

router.get('/', getResources);
router.get('/explorer', getExplorer);

router.post('/', authorize('admin', 'supervisor', 'agent'), handleResourceUpload, createResource);
router.patch('/:id/move', authorize('admin', 'supervisor', 'agent'), moveResource);
router.put('/:id', authorize('admin', 'supervisor', 'agent'), handleResourceUpload, updateResource);
router.delete('/:id', authorize('admin', 'supervisor', 'agent'), deleteResource);

module.exports = router;
