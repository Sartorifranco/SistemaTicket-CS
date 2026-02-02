const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

const { 
    getCategoriesForCompany,
    getLocationsForCompany,
    getProblemsByCategory
} = require('../controllers/dataController');

// Seguridad: Requiere estar logueado (sirve para Admin, Agente y Cliente)
router.use(authenticateToken);

// --- ESTAS SON LAS RUTAS QUE FALTABAN (404) ---

// 1. Categorías para una empresa específica
// Frontend llama a: /api/problems/categories/1
router.get('/problems/categories/:id', getCategoriesForCompany);

// 2. Ubicaciones (Equipos) de una empresa
// Frontend llama a: /api/locations/1
router.get('/locations/:id', getLocationsForCompany);

// 3. Problemas según la categoría seleccionada
// Frontend llama a: /api/problems/predefined/5
router.get('/problems/predefined/:categoryId', getProblemsByCategory);

module.exports = router;