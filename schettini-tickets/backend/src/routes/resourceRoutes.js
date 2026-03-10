const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getResources, getExplorer, createResource, updateResource, deleteResource, moveResource } = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB para videos
});

const uploadFields = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]);

// Aplicar protección general (Token requerido)
router.use(protect);

// ✅ RUTA PÚBLICA (Para Admin, Agente y Cliente)
router.get('/', getResources);
router.get('/explorer', getExplorer);

// ✅ RUTAS DE ADMIN, SUPERVISOR Y AGENT (Crear, editar y borrar). POST acepta file + image; PUT acepta opcional file + image.
router.post('/', authorize('admin', 'supervisor', 'agent'), uploadFields, createResource);
router.patch('/:id/move', authorize('admin', 'supervisor', 'agent'), moveResource);
router.put('/:id', authorize('admin', 'supervisor', 'agent'), uploadFields, updateResource);
router.delete('/:id', authorize('admin', 'supervisor', 'agent'), deleteResource);

module.exports = router;