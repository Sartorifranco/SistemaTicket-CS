const pool = require('../config/db');
const { createActivityLog } = require('../utils/activityLogger');

const STATUS_OPTIONS = ['pendiente_reparacion', 'reparado_listo_venta', 'vendido'];

function parsePhotos(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p : [];
        } catch {
            return [];
        }
    }
    return [];
}

// GET /api/refurbished-equipments
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, equipment_type, brand, model, serial_number, accessories, observations, status, photos, is_active, created_at, updated_at
            FROM refurbished_equipments
            ORDER BY updated_at DESC, id DESC
        `);
        const data = rows.map(r => ({
            ...r,
            photos: parsePhotos(r.photos),
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('refurbished getAll:', error);
        res.status(500).json({ message: 'Error al listar equipos reacondicionados' });
    }
};

// GET /api/refurbished-equipments/:id
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM refurbished_equipments WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Equipo no encontrado' });
        const r = rows[0];
        res.json({ success: true, data: { ...r, photos: parsePhotos(r.photos) } });
    } catch (error) {
        console.error('refurbished getById:', error);
        res.status(500).json({ message: 'Error al obtener equipo' });
    }
};

// POST /api/refurbished-equipments (multer photos)
const create = async (req, res) => {
    try {
        const { equipment_type, brand, model, serial_number, accessories, observations, status } = req.body;
        const photos = (req.files || []).map(f => `/uploads/${f.filename}`);
        const photosJson = JSON.stringify(photos);
        const finalStatus = STATUS_OPTIONS.includes(status) ? status : STATUS_OPTIONS[0];

        const [result] = await pool.query(
            `INSERT INTO refurbished_equipments (equipment_type, brand, model, serial_number, accessories, observations, status, photos, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                (equipment_type || '').trim() || null,
                (brand || '').trim() || null,
                (model || '').trim() || null,
                (serial_number || '').trim() || null,
                (accessories || '').trim() || null,
                (observations || '').trim() || null,
                finalStatus,
                photosJson,
            ]
        );
        const id = result.insertId;
        if (req.user?.id) {
            createActivityLog(req.user.id, 'refurbished_equipment', 'created', `Equipo reacondicionado creado #${id} (${model || serial_number || id})`, id, null, { equipment_type, brand, model, serial_number, status: finalStatus });
        }
        res.status(201).json({ success: true, data: { id }, message: 'Equipo creado correctamente' });
    } catch (error) {
        console.error('refurbished create:', error);
        res.status(500).json({ message: error.message || 'Error al crear equipo' });
    }
};

// PUT /api/refurbished-equipments/:id (multer photos - existing_photos en body para listado final a mantener)
const update = async (req, res) => {
    try {
        const id = req.params.id;
        const { equipment_type, brand, model, serial_number, accessories, observations, status, existing_photos } = req.body;
        const newPhotos = (req.files || []).map(f => `/uploads/${f.filename}`);

        const [existing] = await pool.query('SELECT photos FROM refurbished_equipments WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Equipo no encontrado' });

        let currentPhotos = parsePhotos(existing[0].photos);
        if (existing_photos) {
            try {
                const parsed = typeof existing_photos === 'string' ? JSON.parse(existing_photos) : existing_photos;
                currentPhotos = Array.isArray(parsed) ? parsed : currentPhotos;
            } catch (_) { /* keep currentPhotos */ }
        }
        const mergedPhotos = [...currentPhotos, ...newPhotos].slice(0, 6);
        const photosJson = JSON.stringify(mergedPhotos);

        const finalStatus = STATUS_OPTIONS.includes(status) ? status : existing[0].status;

        await pool.query(
            `UPDATE refurbished_equipments SET equipment_type = ?, brand = ?, model = ?, serial_number = ?, accessories = ?, observations = ?, status = ?, photos = ?, updated_at = NOW() WHERE id = ?`,
            [
                (equipment_type || '').trim() || null,
                (brand || '').trim() || null,
                (model || '').trim() || null,
                (serial_number || '').trim() || null,
                (accessories || '').trim() || null,
                (observations || '').trim() || null,
                finalStatus,
                photosJson,
                id,
            ]
        );
        if (req.user?.id) {
            createActivityLog(req.user.id, 'refurbished_equipment', 'updated', `Equipo reacondicionado actualizado #${id}`, id, null, { equipment_type, brand, model, status: finalStatus });
        }
        res.json({ success: true, message: 'Equipo actualizado correctamente' });
    } catch (error) {
        console.error('refurbished update:', error);
        res.status(500).json({ message: error.message || 'Error al actualizar' });
    }
};

// DELETE /api/refurbished-equipments/:id
const remove = async (req, res) => {
    if (req.user?.role === 'agent') {
        return res.status(403).json({ message: 'No tenés permiso para eliminar equipos reacondicionados.' });
    }
    try {
        const id = req.params.id;
        const [result] = await pool.query('DELETE FROM refurbished_equipments WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Equipo no encontrado' });
        if (req.user?.id) {
            createActivityLog(req.user.id, 'refurbished_equipment', 'deleted', `Equipo reacondicionado eliminado #${id}`, id, null, null);
        }
        res.json({ success: true, message: 'Equipo eliminado correctamente' });
    } catch (error) {
        console.error('refurbished remove:', error);
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

// PATCH /api/refurbished-equipments/:id/active - desactivar (is_active = 0)
const setActive = async (req, res) => {
    if (req.user?.role === 'agent') {
        return res.status(403).json({ message: 'No tenés permiso para desactivar equipos reacondicionados.' });
    }
    try {
        const id = req.params.id;
        const isActive = req.body.is_active !== false && req.body.is_active !== 0 ? 1 : 0;
        const [result] = await pool.query('UPDATE refurbished_equipments SET is_active = ?, updated_at = NOW() WHERE id = ?', [isActive, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Equipo no encontrado' });
        if (req.user?.id) {
            createActivityLog(req.user.id, 'refurbished_equipment', 'updated', `Equipo reacondicionado #${id} ${isActive ? 'activado' : 'desactivado'}`, id, null, { is_active: isActive });
        }
        res.json({ success: true, message: isActive ? 'Equipo activado' : 'Equipo desactivado' });
    } catch (error) {
        console.error('refurbished setActive:', error);
        res.status(500).json({ message: 'Error al actualizar estado' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    setActive,
};
