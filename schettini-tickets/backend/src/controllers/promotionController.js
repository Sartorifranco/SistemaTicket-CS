const pool = require('../config/db');

// Obtener promociones (público para usuarios logueados)
const getPromotions = async (req, res) => {
    try {
        // Si pasan ?type=banner, filtra. Si no, trae todo.
        const { type } = req.query;
        let query = 'SELECT * FROM promotions WHERE active = true';
        const params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener promociones' });
    }
};

// Crear promoción (Solo Admin)
const createPromotion = async (req, res) => {
    try {
        // Console logs para depuración (puedes borrarlos luego)
        console.log("Body recibido:", req.body);
        console.log("Archivo recibido:", req.file);

        const { title, description, type } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'La imagen es obligatoria' });
        }

        // Construimos la URL de la imagen
        const imageUrl = `/uploads/${file.filename}`;

        // Insertamos en la base de datos
        await pool.query(
            'INSERT INTO promotions (title, description, image_url, type) VALUES (?, ?, ?, ?)',
            [title, description || '', imageUrl, type || 'offer']
        );

        res.json({ success: true, message: 'Promoción creada correctamente' });
    } catch (error) {
        console.error("Error en createPromotion:", error);
        res.status(500).json({ message: 'Error al crear promoción' });
    }
};

// Borrar promoción (Solo Admin)
const deletePromotion = async (req, res) => {
    try {
        await pool.query('DELETE FROM promotions WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

module.exports = { getPromotions, createPromotion, deletePromotion };