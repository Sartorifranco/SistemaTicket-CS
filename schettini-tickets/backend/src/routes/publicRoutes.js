const express = require('express');
const router = express.Router();

// Importar las funciones PÚBLICAS de los controladores correspondientes
const { getPublicCompanies } = require('../controllers/companyController');
const { getPublicDepartmentsByCompany } = require('../controllers/departmentController');

// --- RUTAS PÚBLICAS (NO REQUIEREN TOKEN) ---

// Ruta para obtener la lista de todas las empresas para el formulario de registro.
// GET /api/public/companies
router.get('/companies', getPublicCompanies);

// Ruta para obtener los departamentos de una empresa específica.
// GET /api/public/departments?company_id=1
router.get('/departments', getPublicDepartmentsByCompany);

module.exports = router;
