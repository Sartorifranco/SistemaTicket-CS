const pool = require('../config/db');

// Obtener promociones
const getPromotions = async (req, res) => {
    try {
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

// Crear promoción (Con Notificación Masiva y Popup)
const createPromotion = async (req, res) => {
    try {
        const { title, description, type, is_popup } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ message: 'La imagen es obligatoria' });

        const imageUrl = `/uploads/${file.filename}`;
        // Convertir "true" (string) a 1 (boolean sql)
        const isPopupValue = (is_popup === 'true' || is_popup === true) ? 1 : 0;

        // 1. Guardar Promo
        const [result] = await pool.query(
            'INSERT INTO promotions (title, description, image_url, type, is_popup) VALUES (?, ?, ?, ?, ?)',
            [title, description || '', imageUrl, type || 'offer', isPopupValue]
        );

        // 2. 🔔 NOTIFICACIÓN MASIVA A CLIENTES
        const [clients] = await pool.query("SELECT id FROM users WHERE role = 'client'");
        
        if (clients.length > 0) {
            const notifValues = clients.map(client => [
                client.id, 
                `🔥 Nueva Oferta Disponible: ${title}`, 
                'info', 
                'offer', // related_type
                result.insertId // related_id
            ]);

            await pool.query(
                'INSERT INTO notifications (user_id, message, type, related_type, related_id) VALUES ?',
                [notifValues]
            );
        }

        res.json({ success: true, message: 'Promoción creada y clientes notificados' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear promoción' });
    }
};

// Registrar "Me Interesa"
const registerInterest = async (req, res) => {
    try {
        const { id } = req.params; // ID de la promo
        const userId = req.user.id; // ID del cliente

        // 1. Verificar si ya le dio click antes
        const [exists] = await pool.query(
            'SELECT id FROM promotion_interests WHERE promotion_id = ? AND user_id = ?',
            [id, userId]
        );

        if (exists.length > 0) {
            return res.status(400).json({ message: 'Ya registraste interés en esta oferta' });
        }

        // 2. Registrar interés
        await pool.query('INSERT INTO promotion_interests (promotion_id, user_id) VALUES (?, ?)', [id, userId]);

        // 3. Datos para notificar al admin
        const [promo] = await pool.query('SELECT title FROM promotions WHERE id = ?', [id]);
        const [user] = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);

        // 4. 🔔 NOTIFICAR A LOS ADMINS
        const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        if (admins.length > 0) {
            const adminNotifs = admins.map(admin => [
                admin.id,
                `📢 LEAD: ${user[0].username} está interesado en "${promo[0].title}"`,
                'success',
                'interest',
                id
            ]);
            await pool.query(
                'INSERT INTO notifications (user_id, message, type, related_type, related_id) VALUES ?',
                [adminNotifs]
            );
        }

        res.json({ success: true, message: 'Interés registrado. Un asesor te contactará.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar interés' });
    }
};

// Borrar
const deletePromotion = async (req, res) => {
    try {
        await pool.query('DELETE FROM promotions WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

module.exports = { getPromotions, createPromotion, deletePromotion, registerInterest };