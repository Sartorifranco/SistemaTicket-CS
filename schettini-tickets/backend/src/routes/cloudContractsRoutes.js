const express = require('express');
const path = require('path');
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  listCloudContracts,
  uploadCloudContract,
  deleteCloudContract,
  ensureTemplatesDir
} = require('../controllers/cloudContractsController');

const router = express.Router();
const templatesDir = path.join(__dirname, '..', '..', 'uploads', 'templates');

const fs = require('fs');
try { fs.mkdirSync(templatesDir, { recursive: true }); } catch (e) { /* ignore */ }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, templatesDir),
  filename: (req, file, cb) => {
    const base = (file.originalname || 'contrato').replace(/\.pdf$/i, '');
    const safe = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    cb(null, `${safe}-${Date.now()}.pdf`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = (file.mimetype === 'application/pdf') || (path.extname(file.originalname || '').toLowerCase() === '.pdf');
    if (isPdf) cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF.'));
  }
});

// GET lista (público o con auth según quieras; aquí permitimos a clientes descargar, así que GET sin auth o con protect)
router.get('/', listCloudContracts);

// POST y DELETE solo admin
router.post('/', protect, authorize('admin'), upload.single('file'), uploadCloudContract);
router.delete('/:filename', protect, authorize('admin'), deleteCloudContract);

module.exports = router;
