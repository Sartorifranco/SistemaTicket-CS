const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadsDir = require('../utils/uploadsDir');
const { 
    getPaymentInfo, reportPayment, updateBillingDetails, 
    listPendingPaymentsAdmin, getPaymentByIdForAdmin,
    getAdminClientPayments, updatePaymentStatus, updateUserPlan 
} = require('../controllers/paymentController');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');

// Configuración Multer para subir comprobantes
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
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
// Bandeja de pagos informados (pendientes) — permiso payments_review (admin siempre)
router.get('/admin/pending', authorizeByPermission('payments_review'), listPendingPaymentsAdmin);
router.get('/admin/payment/:paymentId', authorizeByPermission('payments_review'), getPaymentByIdForAdmin);

// Ver info completa de un cliente específico
router.get('/admin/:userId', authorize('admin'), getAdminClientPayments);

// Aprobar o rechazar un pago
router.put('/admin/status/:paymentId', authorizeByPermission('payments_review'), updatePaymentStatus);

// Modificar plan y vencimiento manualmente
router.put('/admin/plan/:userId', authorize('admin'), updateUserPlan);

module.exports = router;