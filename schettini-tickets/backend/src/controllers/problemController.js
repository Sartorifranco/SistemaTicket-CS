const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

/**
 * @desc    Obtener categorías de problemas por company_id
 * @route   GET /api/problems/categories/:companyId
 * @access  Private
 */
const getCategoriesByCompany = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    
    // ✅ CORRECCIÓN FINAL: Esta consulta es más inteligente.
    // Si existen categorías para el companyId específico, devuelve solo esas.
    // Si no existen, entonces devuelve las categorías genéricas (company_id IS NULL).
    const query = `
        SELECT id, name FROM ticket_categories
        WHERE 
            CASE
                WHEN (SELECT COUNT(*) FROM ticket_categories WHERE company_id = ?) > 0
                THEN company_id = ?
                ELSE company_id IS NULL
            END
        ORDER BY name ASC;
    `;
    
    // El companyId se pasa dos veces: una para la sub-consulta y otra para la consulta principal.
    const [categories] = await pool.execute(query, [companyId, companyId]);

    res.status(200).json({ success: true, data: categories });
});

/**
 * @desc    Obtener problemas predefinidos por category_id
 * @route   GET /api/problems/predefined/:categoryId
 * @access  Private
 */
const getPredefinedProblemsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    
    const query = 'SELECT id, title, description, department_id FROM predefined_problems WHERE category_id = ? ORDER BY title ASC';
    const [problems] = await pool.execute(query, [categoryId]);
    
    res.status(200).json({ success: true, data: problems });
});

module.exports = {
    getCategoriesByCompany,
    getPredefinedProblemsByCategory,
};