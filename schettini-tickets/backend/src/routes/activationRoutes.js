const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize, authorizeByPermission } = require('../middleware/authMiddleware');
const {
  requestActivation,
  validateActivation,
  submitForm,
  getActivations,
  getClientActivations,
  getActivationById,
  updateActivationStatus
} = require('../controllers/activationController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `activation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/i;
    const ext = path.extname(file.originalname).slice(1);
    if (allowed.test(ext) || file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (logo) y PDF'));
    }
  }
});

router.use(protect);

router.post('/request', requestActivation);
router.get('/client', getClientActivations);
router.get('/', authorizeByPermission('repairs_view'), getActivations);
router.get('/:id', getActivationById);
router.put('/:id/validate', authorizeByPermission('repairs_edit'), validateActivation);
router.put('/:id', authorizeByPermission('repairs_edit'), updateActivationStatus);
router.post('/:id/submit-form', upload.any(), submitForm);

module.exports = router;
