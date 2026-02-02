const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// ==========================================
// 1. GESTIÓN DE PROBLEMÁTICAS
// ==========================================

// @desc    Obtener todas las categorías y problemas (Admin)
// @route   GET /api/admin/problems-all
const getAllProblemsAdmin = asyncHandler(async (req, res) => {
    try {
        const [categories] = await pool.execute('SELECT * FROM ticket_categories ORDER BY id DESC');
        
        const [problems] = await pool.execute(`
            SELECT p.*, c.name as category_name 
            FROM predefined_problems p 
            LEFT JOIN ticket_categories c ON p.category_id = c.id 
            ORDER BY p.id DESC
        `);

        res.json({ 
            success: true, 
            data: { categories, problems } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo datos' });
    }
});

// --- CRUD CATEGORÍAS ---
const createCategory = asyncHandler(async (req, res) => {
    const { name, company_id } = req.body;
    await pool.execute('INSERT INTO ticket_categories (name, company_id) VALUES (?, ?)', [name, company_id || null]);
    res.json({ success: true, message: 'Categoría creada' });
});

const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, company_id } = req.body;
    await pool.execute('UPDATE ticket_categories SET name=?, company_id=? WHERE id=?', [name, company_id || null, id]);
    res.json({ success: true, message: 'Categoría actualizada' });
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM predefined_problems WHERE category_id = ?', [id]);
    await pool.execute('DELETE FROM ticket_categories WHERE id = ?', [id]);
    res.json({ success: true, message: 'Categoría eliminada' });
});

// --- CRUD PROBLEMAS ---
const createProblem = asyncHandler(async (req, res) => {
    const { title, description, category_id, department_id } = req.body;
    await pool.execute('INSERT INTO predefined_problems (title, description, category_id, department_id) VALUES (?, ?, ?, ?)', [title, description, category_id, department_id || 2]);
    res.json({ success: true, message: 'Problema creado' });
});

const updateProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, category_id, department_id } = req.body;
    await pool.execute('UPDATE predefined_problems SET title=?, description=?, category_id=?, department_id=? WHERE id=?', [title, description, category_id, department_id, id]);
    res.json({ success: true, message: 'Problema actualizado' });
});

const deleteProblem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM predefined_problems WHERE id=?', [id]);
    res.json({ success: true, message: 'Problema eliminado' });
});


// ==========================================
// 2. GESTIÓN DE UBICACIONES
// ==========================================

// @desc    Obtener todas las ubicaciones (Admin)
// @route   GET /api/admin/locations
const getAllLocationsAdmin = asyncHandler(async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM locations ORDER BY name ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Error leyendo locations (probablemente tabla no existe):", error.message);
        res.json({ success: true, data: [] });
    }
});

const createLocation = asyncHandler(async (req, res) => {
    const { name, address } = req.body;
    await pool.execute('INSERT INTO locations (name, address) VALUES (?, ?)', [name, address]);
    res.json({ success: true, message: 'Ubicación creada' });
});

const updateLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, address } = req.body;
    await pool.execute('UPDATE locations SET name=?, address=? WHERE id=?', [name, address, id]);
    res.json({ success: true, message: 'Ubicación actualizada' });
});

const deleteLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.execute('DELETE FROM locations WHERE id=?', [id]);
    res.json({ success: true, message: 'Ubicación eliminada' });
});

module.exports = {
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
};