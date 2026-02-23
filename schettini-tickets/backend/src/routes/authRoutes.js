// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
// Importa las funciones del controlador de autenticación desde el archivo correcto
const { registerUser, loginUser, getMe, activateAccount, forgotPassword, resetPassword } = require('../controllers/authController');
// Importa el middleware de protección de rutas, ahora como 'authenticateToken'
const { authenticateToken, optionalProtect } = require('../middleware/authMiddleware');

// Rutas de autenticación (públicas)
// POST a /api/auth/register - optionalProtect para eximir acuerdo cuando admin crea usuario
router.post('/register', optionalProtect, registerUser);
// POST a /api/auth/login para iniciar sesión
router.post('/login', loginUser);

router.post('/activate', activateAccount);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Ruta de perfil del usuario logueado (protegida)
// GET a /api/auth/me para obtener los datos del usuario autenticado
// Esta ruta requiere que el usuario esté autenticado, por eso usa el middleware 'authenticateToken'
router.get('/me', authenticateToken, getMe); // <-- ¡CAMBIO AQUÍ!

router.get('/me', authenticateToken, getMe);

// Exporta el router para que pueda ser utilizado en app.js
module.exports = router;
