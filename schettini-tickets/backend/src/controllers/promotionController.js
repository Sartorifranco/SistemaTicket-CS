const pool = require('../config/db');
const { sendOfferLeadEmail } = require('../services/emailService');

async function getSalesNotificationRecipient() {
    try {
        const [rows] = await pool.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'sales_notification_email' LIMIT 1"
        );
        const v = rows[0]?.setting_value?.trim();
        if (v) return v;
    } catch (e) {
        console.warn('[promotionController] getSalesNotificationRecipient DB:', e.message);
    }
    if (process.env.SALES_NOTIFICATION_EMAIL?.trim()) return process.env.SALES_NOTIFICATION_EMAIL.trim();
    if (process.env.SALES_LEAD_EMAIL?.trim()) return process.env.SALES_LEAD_EMAIL.trim();
    return (process.env.EMAIL_USER || '').trim() || null;
}

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
        const [clients] = await pool.query("SELECT id FROM Users WHERE role = 'client'");
        
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

// Registrar "Me Interesa" (persistencia en promotion_interests = modelo OfferLeads: cliente + oferta + fecha)
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

        // 2. Registrar interés (created_at si existe en BD — migración add-promotion-interests-created-at.js)
        try {
            await pool.query(
                'INSERT INTO promotion_interests (promotion_id, user_id, created_at) VALUES (?, ?, NOW())',
                [id, userId]
            );
        } catch (insErr) {
            if (insErr.code === 'ER_BAD_FIELD_ERROR' && insErr.sqlMessage?.includes('created_at')) {
                await pool.query(
                    'INSERT INTO promotion_interests (promotion_id, user_id) VALUES (?, ?)',
                    [id, userId]
                );
            } else {
                throw insErr;
            }
        }

        // 3. Datos para notificar al admin y al correo de ventas
        const [promo] = await pool.query('SELECT title FROM promotions WHERE id = ?', [id]);
        const [userRows] = await pool.query(
            'SELECT id, username, full_name, email, phone FROM Users WHERE id = ?',
            [userId]
        );
        const u = userRows[0];
        const promoTitle = promo[0]?.title || 'Oferta';
        const clientLabel = (u?.full_name && String(u.full_name).trim()) || u?.username || `Usuario #${userId}`;

        // 4. 🔔 NOTIFICAR A LOS ADMINS (in-app)
        const [admins] = await pool.query("SELECT id FROM Users WHERE role = 'admin'");
        if (admins.length > 0 && u) {
            const adminNotifs = admins.map(admin => [
                admin.id,
                `📢 LEAD: ${u.username} está interesado en "${promoTitle}"`,
                'success',
                'interest',
                id
            ]);
            await pool.query(
                'INSERT INTO notifications (user_id, message, type, related_type, related_id) VALUES ?',
                [adminNotifs]
            );
        }

        // 5. 📧 Email al destino configurable (system_settings → env)
        const notifyTo = await getSalesNotificationRecipient();
        const leadAtStr = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        if (notifyTo) {
            await sendOfferLeadEmail(notifyTo, clientLabel, promoTitle, {
                email: u?.email,
                phone: u?.phone,
                leadAt: leadAtStr,
            });
        } else {
            console.warn('[promotionController] registerInterest: no hay email destino (sales_notification_email ni EMAIL_USER).');
        }

        res.json({ success: true, message: 'Interés registrado. Un asesor te contactará.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar interés' });
    }
};

/** Lista leads (promotion_interests + usuario + oferta) para Marketing */
const getOfferLeads = async (req, res) => {
    try {
        let rows;
        try {
            [rows] = await pool.query(`
                SELECT
                    pi.id,
                    pi.promotion_id AS offer_id,
                    pi.user_id AS client_id,
                    pi.created_at AS interest_date,
                    u.username,
                    u.full_name,
                    u.email,
                    u.phone,
                    p.title AS offer_title
                FROM promotion_interests pi
                INNER JOIN Users u ON u.id = pi.user_id
                INNER JOIN promotions p ON p.id = pi.promotion_id
                ORDER BY pi.created_at DESC, pi.id DESC
            `);
        } catch (qErr) {
            if (qErr.code === 'ER_BAD_FIELD_ERROR' && qErr.sqlMessage?.includes('created_at')) {
                [rows] = await pool.query(`
                    SELECT
                        pi.id,
                        pi.promotion_id AS offer_id,
                        pi.user_id AS client_id,
                        NULL AS interest_date,
                        u.username,
                        u.full_name,
                        u.email,
                        u.phone,
                        p.title AS offer_title
                    FROM promotion_interests pi
                    INNER JOIN Users u ON u.id = pi.user_id
                    INNER JOIN promotions p ON p.id = pi.promotion_id
                    ORDER BY pi.id DESC
                `);
            } else {
                throw qErr;
            }
        }
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener leads de ofertas' });
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

module.exports = { getPromotions, createPromotion, deletePromotion, registerInterest, getOfferLeads };