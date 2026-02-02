// backend/src/routes/feedbackRoutes.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken } = require('../middleware/authMiddleware'); // <-- ¡VERIFICA ESTA LÍNEA!

// Logs de depuración para verificar las importaciones
console.log('feedbackController en feedbackRoutes:', feedbackController);
console.log('feedbackController.submitFeedback en feedbackRoutes:', feedbackController.submitFeedback);
console.log('authenticateToken en feedbackRoutes:', authenticateToken); // <-- NUEVO LOG DE DEPURACIÓN

// La función authenticateToken y feedbackController.submitFeedback deben ser funciones
router.post('/', authenticateToken, feedbackController.submitFeedback);

module.exports = router;
