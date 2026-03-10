const express = require('express');
const router = express.Router();
const { getFolders, getFoldersList, getBreadcrumbs, createFolder, updateFolder, deleteFolder } = require('../controllers/kbFolderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getFolders);
router.get('/list', getFoldersList);
router.get('/breadcrumbs', getBreadcrumbs);

router.post('/', authorize('admin', 'supervisor', 'agent'), createFolder);
router.put('/:id', authorize('admin', 'supervisor', 'agent'), updateFolder);
router.delete('/:id', authorize('admin', 'supervisor', 'agent'), deleteFolder);

module.exports = router;
