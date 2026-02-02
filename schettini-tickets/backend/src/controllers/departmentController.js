const pool = require('../config/db');

// Obtener todos los departamentos (Simplificado para Schettini)
const getDepartments = async (req, res) => {
    try {
        // Consulta directa a la tabla Departments, sin uniones raras
        const [departments] = await pool.query('SELECT * FROM Departments');
        
        res.json(departments);
    } catch (error) {
        console.error("Error al obtener departamentos:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener departamentos' });
    }
};

module.exports = {
    getDepartments
};