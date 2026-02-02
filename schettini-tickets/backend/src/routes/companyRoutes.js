const express = require('express');
const router = express.Router();
const { 
    getCompanies, 
    createCompany, 
    updateCompany, 
    deleteCompany 
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Rutas base: /api/companies
router.route('/')
    .get(protect, getCompanies)
    .post(protect, authorize('admin'), createCompany); // ¡Ahora sí acepta POST!

// Rutas por ID: /api/companies/:id
router.route('/:id')
    .put(protect, authorize('admin'), updateCompany)
    .delete(protect, authorize('admin'), deleteCompany);

module.exports = router;