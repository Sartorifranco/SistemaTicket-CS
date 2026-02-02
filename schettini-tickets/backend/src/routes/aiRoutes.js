const express = require('express');
const router = express.Router();
const { predictCategory } = require('../controllers/aiController');

// POST /api/ai/predict
router.post('/predict', predictCategory);

module.exports = router;