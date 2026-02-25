const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getCompanySettings, updateCompanySettings } = require('../controllers/companySettingsController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `company-logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname) || '.png'}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/i;
    const ext = path.extname(file.originalname).slice(1);
    if (allowed.test(ext) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes para el logo.'));
    }
  }
});

router.get('/', getCompanySettings);
router.put('/', protect, authorize('admin'), upload.single('logo'), updateCompanySettings);

module.exports = router;
