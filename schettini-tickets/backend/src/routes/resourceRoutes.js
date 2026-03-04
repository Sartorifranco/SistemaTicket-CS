const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getResources, createResource, updateResource, deleteResource } = require('../controllers/resourceController');
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

// ✅ RUTAS DE ADMIN, SUPERVISOR Y AGENT (Crear, editar y borrar)
router.post('/', authorize('admin', 'supervisor', 'agent'), upload.single('file'), createResource);
router.put('/:id', authorize('admin', 'supervisor', 'agent'), updateResource);
router.delete('/:id', authorize('admin', 'supervisor', 'agent'), deleteResource);

module.exports = router;