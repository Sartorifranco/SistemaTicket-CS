const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { 
    getUsers, 
    createUser, 
    getUserById, 
    updateUser, 
    deleteUser, 
    getUserActiveTickets,
    getAgents,
    getTechnicians,
    getUserDocuments,
    uploadUserDocument
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Multer para documentos de usuario (PDF, JPG)
const docStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `userdoc-${Date.now()}${path.extname(file.originalname) || '.bin'}`)
});
const docUpload = multer({
    storage: docStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname) || ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype);
        cb(null, !!allowed);
    }
});

// Todas las rutas requieren autenticación
router.use(protect);

// --- RUTAS ESPECÍFICAS (Importante: Deben ir ANTES de /:id) ---

// 1. Obtener lista de agentes/supervisores (Evita que "agents" se tome como ID)
router.get('/agents', authorize('admin', 'agent', 'supervisor'), getAgents);

// 2. Técnicos asignables a órdenes de reparación (solo agent con permiso taller, excluye admin)
router.get('/technicians', authorize('admin', 'agent', 'supervisor'), getTechnicians);

// 3. Ruta para obtener tickets activos de un usuario (Dashboard)
router.get('/:id/active-tickets', authorize('admin', 'agent', 'supervisor', 'client'), getUserActiveTickets);

// 4. Documentos del usuario (planillas, contratos)
router.get('/:id/documents', authorize('admin', 'supervisor', 'agent'), getUserDocuments);
router.post('/:id/documents', authorize('admin', 'supervisor', 'agent'), docUpload.single('document'), uploadUserDocument);


// --- RUTAS GENERALES ---
router.route('/')
    .get(authorize('admin', 'agent', 'supervisor'), getUsers)
    .post(authorize('admin', 'supervisor', 'agent'), createUser);

// --- RUTAS POR ID ---
router.route('/:id')
    .get(authorize('admin', 'agent', 'supervisor', 'client'), getUserById)
    .put(authorize('admin', 'supervisor', 'agent'), updateUser)
    .delete(authorize('admin', 'supervisor', 'agent'), deleteUser);

module.exports = router;