const express = require('express');
const router = express.Router();
const { 
    getCategoriesByCompany,
    getPredefinedProblemsByCategory
} = require('../controllers/problemController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Protege todas las rutas de este archivo
router.use(authenticateToken);

// ✅ CORRECCIÓN: Se añade el rol 'agent' a la lista de roles autorizados.
// Ahora, los agentes también podrán obtener las categorías al crear un ticket.
router.get('/categories/:companyId', authorize(['client', 'admin', 'agent']), getCategoriesByCompany);

// ✅ CORRECCIÓN: Los agentes también necesitan acceso a esta ruta para poblar el formulario.
router.get('/predefined/:categoryId', authorize(['client', 'admin', 'agent']), getPredefinedProblemsByCategory);

module.exports = router;

