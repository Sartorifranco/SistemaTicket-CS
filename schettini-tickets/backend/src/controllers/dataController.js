const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// @desc    Obtener categorías disponibles para una empresa (o Globales)
// @route   GET /api/problems/categories/:id (El ID es el companyId)
const getCategoriesForCompany = asyncHandler(async (req, res) => {
    const { id } = req.params; // ID de la empresa seleccionada

    try {
        // Trae categorías que sean GLOBALES (company_id NULL) 
        // O específicas de la empresa solicitada
        const query = `
            SELECT * FROM ticket_categories 
            WHERE company_id IS NULL OR company_id = ? 
            ORDER BY name ASC
        `;
        const [rows] = await pool.execute(query, [id]);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error buscando categorías:", error);
        res.status(500).json({ success: false, message: 'Error obteniendo categorías' });
    }
});

// @desc    Obtener ubicaciones (Depositarios) de una empresa
// @route   GET /api/locations/:id (El ID es el companyId)
const getLocationsForCompany = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        // Busca equipos activos que pertenezcan a esa empresa
        const query = `
            SELECT id, alias, serial_number, address 
            FROM depositarios 
            WHERE company_id = ? AND is_active = 1 
            ORDER BY alias ASC
        `;
        const [rows] = await pool.execute(query, [id]);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error buscando ubicaciones:", error);
        res.status(500).json({ success: false, message: 'Error obteniendo ubicaciones' });
    }
});

// @desc    Obtener problemas predefinidos de una categoría
// @route   GET /api/problems/predefined/:categoryId
const getProblemsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM predefined_problems WHERE category_id = ? ORDER BY title ASC', 
            [categoryId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error obteniendo problemas' });
    }
});

module.exports = {
    getCategoriesForCompany,
    getLocationsForCompany,
    getProblemsByCategory
};