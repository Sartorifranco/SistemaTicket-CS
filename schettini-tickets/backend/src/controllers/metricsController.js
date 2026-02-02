// En src/controllers/metricsController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// Función auxiliar para formatear segundos
const formatSeconds = (seconds) => {
    if (isNaN(seconds) || seconds === null) return "N/A";

    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    const dDisplay = d > 0 ? d + (d === 1 ? " día, " : " días, ") : "";
    const hDisplay = h > 0 ? h + (h === 1 ? " hora, " : " horas, ") : "";
    const mDisplay = m > 0 ? m + (m === 1 ? " minuto" : " minutos") : "";

    let result = (dDisplay + hDisplay + mDisplay).trim();
    if (result.endsWith(',')) {
        result = result.slice(0, -1);
    }
    return result || "Menos de un minuto";
};

/**
 * @desc    Obtener métricas de tiempo de resolución
 * @route   GET /api/metrics/resolution-time
 * @access  Private (Admin, Agent)
 */
const getResolutionTimeMetrics = asyncHandler(async (req, res) => {
    const query = `
        SELECT
            COUNT(*) as resolvedTicketsCount,
            AVG(TIMESTAMPDIFF(SECOND, created_at, resolved_at)) as averageResolutionTimeInSeconds
        FROM tickets
        WHERE resolved_at IS NOT NULL AND status IN ('resolved', 'closed');
    `;
    const [rows] = await pool.execute(query);
    const metrics = rows[0];

    res.status(200).json({
        success: true,
        data: {
            resolvedTicketsCount: metrics.resolvedTicketsCount,
            averageResolutionTimeInSeconds: Math.round(metrics.averageResolutionTimeInSeconds),
            averageResolutionTimeFormatted: formatSeconds(metrics.averageResolutionTimeInSeconds)
        }
    });
});

module.exports = { getResolutionTimeMetrics };