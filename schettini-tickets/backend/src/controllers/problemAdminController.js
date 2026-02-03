const pool = require('../config/db');

// ==========================================
// 1. GESTIÓN DE PROBLEMAS PREDEFINIDOS
// ==========================================

const getPredefinedProblems = async (req, res) => {
    try {
        const [problems] = await pool.query(`
            SELECT p.*, c.name as category_name, d.name as department_name 
            FROM predefined_problems p 
            LEFT JOIN ticket_categories c ON p.category_id = c.id 
            LEFT JOIN Departments d ON p.department_id = d.id
            ORDER BY p.id DESC
        `);
        res.json({ success: true, data: problems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener problemas' });
    }
};

const createPredefinedProblem = async (req, res) => {
    try {
        const { title, description, priority, category_id, department_id } = req.body;
        if (!title) return res.status(400).json({ message: 'El título es obligatorio' });

        const [result] = await pool.query(
            'INSERT INTO predefined_problems (title, description, priority, category_id, department_id) VALUES (?, ?, ?, ?, ?)',
            [title, description || '', priority || 'medium', category_id || null, department_id || null]
        );
        res.status(201).json({ success: true, message: 'Problema creado', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear problema' });
    }
};

const updatePredefinedProblem = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, category_id, department_id } = req.body;

        await pool.query(
            'UPDATE predefined_problems SET title = ?, description = ?, priority = ?, category_id = ?, department_id = ? WHERE id = ?',
            [title, description || '', priority || 'medium', category_id || null, department_id || null, id]
        );
        res.json({ success: true, message: 'Problema actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar problema' });
    }
};

const deletePredefinedProblem = async (req, res) => {
    try {
        await pool.query('DELETE FROM predefined_problems WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Problema eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar problema' });
    }
};

// ==========================================
// 2. GESTIÓN DE CATEGORÍAS (Hacer y Deshacer)
// ==========================================

const getAllCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM ticket_categories ORDER BY id DESC');
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });
        
        await pool.query('INSERT INTO ticket_categories (name) VALUES (?)', [name]);
        res.status(201).json({ success: true, message: 'Categoría creada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear categoría' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        // Opcional: Verificar si está en uso antes de borrar, o dejar que la FK falle
        await pool.query('DELETE FROM ticket_categories WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Categoría eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'No se puede eliminar: Está en uso por tickets activos.' });
    }
};

// ==========================================
// 3. GESTIÓN DE DEPARTAMENTOS (Hacer y Deshacer)
// ==========================================

const getAllDepartments = async (req, res) => {
    try {
        const [departments] = await pool.query('SELECT * FROM Departments ORDER BY id DESC');
        res.json({ success: true, data: departments });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener departamentos' });
    }
};

const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

        await pool.query('INSERT INTO Departments (name, description) VALUES (?, ?)', [name, description || '']);
        res.status(201).json({ success: true, message: 'Departamento creado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear departamento' });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        await pool.query('DELETE FROM Departments WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Departamento eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'No se puede eliminar: Hay usuarios o tickets asignados.' });
    }
};

module.exports = {
    getPredefinedProblems,
    createPredefinedProblem,
    updatePredefinedProblem,
    deletePredefinedProblem,
    
    getAllCategories,
    createCategory,
    deleteCategory,

    getAllDepartments,
    createDepartment,
    deleteDepartment
};