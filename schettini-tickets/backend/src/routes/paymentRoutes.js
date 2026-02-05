const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    getPaymentInfo, reportPayment, updateBillingDetails, 
    getAdminClientPayments, updatePaymentStatus, updateUserPlan 
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Configuración Multer para subir comprobantes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `payment-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Proteger todas las rutas
router.use(protect);

// ========================
// RUTAS CLIENTE
// ========================
router.get('/', getPaymentInfo); // Obtener mis pagos
router.post('/report', upload.single('receipt'), reportPayment); // Informar pago
router.post('/billing', updateBillingDetails); // Actualizar mis datos fiscales

// ========================
// RUTAS ADMINISTRADOR
// ========================
// Ver info completa de un cliente específico
router.get('/admin/:userId', authorize('admin'), getAdminClientPayments);

// Aprobar o rechazar un pago
router.put('/admin/status/:paymentId', authorize('admin'), updatePaymentStatus);

// Modificar plan y vencimiento manualmente
router.put('/admin/plan/:userId', authorize('admin'), updateUserPlan);

module.exports = router;