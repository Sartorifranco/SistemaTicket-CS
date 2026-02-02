const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

/**
 * @desc    Obtener las ubicaciones (áreas, peajes, etc.) de la empresa del usuario
 * @route   GET /api/locations
 * @access  Private (client, admin)
 */
const getLocationsByCompany = asyncHandler(async (req, res) => {
    // Se obtiene el company_id del token del usuario autenticado para seguridad
    const { company_id } = req.user;

    if (!company_id) {
        res.status(400);
        throw new Error('El usuario no está asociado a ninguna empresa.');
    }

    const [locations] = await pool.execute(
        'SELECT id, name, type FROM locations WHERE company_id = ? ORDER BY name ASC',
        [company_id]
    );

    res.status(200).json({ success: true, data: locations });
});

const getLocationsForAdmin = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const [locations] = await pool.execute(
        'SELECT id, name, type FROM locations WHERE company_id = ? ORDER BY name ASC',
        [companyId]
    );
    res.status(200).json({ success: true, data: locations });
});

module.exports = {
    getLocationsByCompany,
    getLocationsForAdmin,
};

