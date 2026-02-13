const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getResources, createResource, deleteResource } = require('../controllers/resourceController');
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

// Aplicar protección general (Token requerido)
router.use(protect);

// ✅ RUTA PÚBLICA (Para Admin, Agente y Cliente)
// Esta es la ruta que da el error si tiene authorize('admin')
router.get('/', getResources);

// ✅ RUTAS DE ADMINISTRADOR (Crear y Borrar)
router.post('/', authorize('admin'), upload.single('file'), createResource);
router.delete('/:id', authorize('admin'), deleteResource);

module.exports = router;