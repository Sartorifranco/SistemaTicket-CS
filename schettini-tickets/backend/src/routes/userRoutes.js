const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const uploadsDir = require('../utils/uploadsDir');
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
    uploadUserDocument,
    changePassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Multer para documentos de usuario (PDF, JPG)
const docStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
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
router.get('/agents', authorize('admin', 'agent', 'supervisor', 'viewer'), getAgents);

// 2. Técnicos asignables a órdenes de reparación (solo agent con permiso taller, excluye admin)
router.get('/technicians', authorize('admin', 'agent', 'supervisor', 'viewer'), getTechnicians);

// 3. Cambio de contraseña (cualquier usuario autenticado puede cambiar la suya)
router.put('/change-password', changePassword);

// 3. Ruta para obtener tickets activos de un usuario (Dashboard)
router.get('/:id/active-tickets', authorize('admin', 'agent', 'supervisor', 'client'), getUserActiveTickets);

// 4. Documentos del usuario (planillas, contratos). Cliente solo puede acceder a sus propios documentos (:id = su user id).
const ensureClientSelfDocuments = (req, res, next) => {
    if (req.user?.role === 'client' && parseInt(req.params.id, 10) !== req.user.id) {
        return res.status(403).json({ message: 'Solo podés acceder a tus propios documentos.' });
    }
    next();
};
router.get('/:id/documents', authorize('admin', 'supervisor', 'agent', 'client'), ensureClientSelfDocuments, getUserDocuments);
router.post('/:id/documents', authorize('admin', 'supervisor', 'agent', 'client'), ensureClientSelfDocuments, docUpload.single('document'), uploadUserDocument);


// --- RUTAS GENERALES ---
router.route('/')
    .get(authorize('admin', 'agent', 'supervisor', 'viewer'), getUsers)
    .post(authorize('admin', 'supervisor', 'agent'), createUser);

// --- RUTAS POR ID ---
router.route('/:id')
    .get(authorize('admin', 'agent', 'supervisor', 'client', 'viewer'), getUserById)
    .put(authorize('admin', 'supervisor', 'agent'), updateUser)
    .delete(authorize('admin', 'supervisor', 'agent'), deleteUser);

module.exports = router;