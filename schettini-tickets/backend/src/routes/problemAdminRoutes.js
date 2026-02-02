const express = require('express');
const router = express.Router();

// 1. IMPORTAR MIDDLEWARES DE SEGURIDAD
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// 2. IMPORTAR CONTROLADORES (Nombres deben coincidir con problemAdminController.js)
const {
    getAllProblemsAdmin,
    createCategory,
    updateCategory,
    deleteCategory,
    createProblem,
    updateProblem,
    deleteProblem,
    getAllLocationsAdmin,
    createLocation,
    updateLocation,
    deleteLocation
} = require('../controllers/problemAdminController');

// 3. APLICAR SEGURIDAD
router.use(authenticateToken);
router.use(authorize('admin'));

// --- RUTAS DE CATEGORÍAS Y PROBLEMAS ---
router.get('/problems-all', getAllProblemsAdmin);

// Categorías
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Problemas
router.post('/problems', createProblem);
router.put('/problems/:id', updateProblem);
router.delete('/problems/:id', deleteProblem);

// --- RUTAS DE UBICACIONES ---
router.get('/locations', getAllLocationsAdmin);
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

module.exports = router;