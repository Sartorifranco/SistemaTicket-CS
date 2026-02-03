const express = require('express');
const router = express.Router();
const { 
    getPredefinedProblems, 
    createPredefinedProblem, 
    updatePredefinedProblem, 
    deletePredefinedProblem,
    
    // Control total de Categorías
    getAllCategories,
    createCategory,
    deleteCategory,

    // Control total de Departamentos
    getAllDepartments,
    createDepartment,
    deleteDepartment
} = require('../controllers/problemAdminController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Middleware de seguridad: Solo Admin entra aquí
router.use(protect);
router.use(authorize('admin'));

// --- GESTIÓN DE PROBLEMAS PREDEFINIDOS ---
// Arreglo del Error 404: El frontend llama a 'problems-all'
router.get('/problems-all', getPredefinedProblems); 
router.post('/problems', createPredefinedProblem);
router.put('/problems/:id', updatePredefinedProblem);
router.delete('/problems/:id', deletePredefinedProblem);

// --- GESTIÓN DE CATEGORÍAS (Hacer y Deshacer) ---
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

// --- GESTIÓN DE DEPARTAMENTOS (Hacer y Deshacer) ---
router.get('/departments', getAllDepartments);
router.post('/departments', createDepartment);
router.delete('/departments/:id', deleteDepartment);

module.exports = router;