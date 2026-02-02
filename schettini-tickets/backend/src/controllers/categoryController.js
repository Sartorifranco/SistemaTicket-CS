const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

/**
 * @desc    Obtener todas las categorías
 * @route   GET /api/categories
 * @access  Private
 */
const getCategories = asyncHandler(async (req, res) => {
    const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name ASC');
    res.status(200).json({ success: true, data: categories });
});

module.exports = { getCategories };