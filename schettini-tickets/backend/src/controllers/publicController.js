const pool = require('../config/db');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Obtener todos los datos necesarios para el formulario de registro
 * @route   GET /api/public/registration-data
 * @access  Público
 */
const getRegistrationData = asyncHandler(async (req, res) => {
    // 1. Obtener todas las empresas
    const [companies] = await pool.execute('SELECT id, name FROM Companies ORDER BY name ASC');

    // 2. Obtener todos los departamentos
    const [departments] = await pool.execute('SELECT id, name, company_id FROM Departments ORDER BY name ASC');

    // 3. Estructurar los datos anidando los departamentos dentro de cada empresa
    const registrationData = companies.map(company => {
        return {
            ...company,
            departments: departments.filter(dept => dept.company_id === company.id)
        };
    });

    res.status(200).json(registrationData);
});

module.exports = {
    getRegistrationData,
};
