const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAfipByCuit } = require('../controllers/clientController');

router.use(protect);

router.get('/afip/:cuit', authorize('admin', 'agent', 'supervisor'), getAfipByCuit);

module.exports = router;
