const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getRepairOrders,
  getMyRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateRepairOrder,
  deleteRepairOrder,
  addPhotosToRepairOrder,
  deleteRepairOrderPhoto,
  requestInvoice
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

router.use(protect);

// CRUD (my-orders debe ir ANTES de :id)
router.get('/my-orders', getMyRepairOrders);
router.get('/', getRepairOrders);
router.get('/:id', getRepairOrderById);
router.post(
  '/',
  authorize('admin', 'agent', 'supervisor'),
  upload.array('photos', 10),
  createRepairOrder
);
router.put('/:id', authorize('admin', 'agent', 'supervisor'), updateRepairOrder);
router.delete('/:id', authorize('admin', 'agent', 'supervisor'), deleteRepairOrder);

router.post('/:id/request-invoice', requestInvoice);

// Fotos
router.post(
  '/:id/photos',
  authorize('admin', 'agent', 'supervisor'),
  upload.array('photos', 10),
  addPhotosToRepairOrder
);
router.delete('/:id/photos/:photoId', authorize('admin', 'agent', 'supervisor'), deleteRepairOrderPhoto);

module.exports = router;
