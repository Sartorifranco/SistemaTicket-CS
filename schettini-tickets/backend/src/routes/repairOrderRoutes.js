const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');
const {
  getRepairOrders,
  getMonitorOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  createExternalRecycledOrder,
  updateRepairOrder,
  updateRepairOrderStatus,
  deleteRepairOrder,
  addPhotosToRepairOrder,
  deleteRepairOrderPhoto,
  requestInvoice,
  processRecyclingToAbandoned,
  updateRecycling
} = require('../controllers/repairOrderController');

// Configuración de subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `repair-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.jpg'}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i;
    const ext = path.extname(file.originalname).slice(1);
    if (allowed.test(ext) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

const uploadRecycling = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').slice(1).toLowerCase();
    const imageOrPdf = /jpeg|jpg|png|gif|webp|pdf/i.test(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (imageOrPdf) cb(null, true);
    else cb(new Error('Solo se permiten imágenes o PDF'));
  }
});

router.use(protect);

// CRUD (my-orders, monitor y external-recycled deben ir ANTES de :id)
router.get('/my-orders', getMyRepairOrders);
router.get('/monitor', authorizeByPermission('repairs_view'), getMonitorOrders);
router.post('/external-recycled', authorizeByPermission('repairs_create', 'repairs_edit'), upload.array('photos', 10), createExternalRecycledOrder);
router.get('/', authorizeByPermission('repairs_view'), getRepairOrders);
router.get('/:id', getRepairOrderById);
router.post(
  '/',
  authorizeByPermission('repairs_create', 'repairs_edit'),
  upload.array('photos', 10),
  createRepairOrder
);
router.put('/:id/status', authorizeByPermission('repairs_edit'), updateRepairOrderStatus);
router.put('/:id', authorizeByPermission('repairs_edit'), updateRepairOrder);
router.delete('/:id', authorizeByPermission('repairs_edit'), deleteRepairOrder);

router.post('/:id/recycling', authorizeByPermission('repairs_edit'), upload.array('photos', 10), processRecyclingToAbandoned);
router.patch('/:id/recycling', authorizeByPermission('repairs_edit'), uploadRecycling.array('photos', 10), updateRecycling);
router.post('/:id/request-invoice', requestInvoice);

// Fotos
router.post(
  '/:id/photos',
  authorizeByPermission('repairs_edit'),
  upload.array('photos', 10),
  addPhotosToRepairOrder
);
router.delete('/:id/photos/:photoId', authorizeByPermission('repairs_edit'), deleteRepairOrderPhoto);

module.exports = router;
