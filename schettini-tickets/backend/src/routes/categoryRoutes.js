const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, getCategories);

module.exports = router;