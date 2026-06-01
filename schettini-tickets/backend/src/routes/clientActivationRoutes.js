const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadsDir = require('../utils/uploadsDir');
const { protect } = require('../middleware/authMiddleware');
const { submitClientPlanilla } = require('../controllers/activationController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `activation-planilla-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (ext === 'pdf' || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

router.use(protect);

/** POST /api/client/activations — PDF de planilla completada (cliente autenticado) */
router.post('/', upload.single('attachment'), submitClientPlanilla);

module.exports = router;
