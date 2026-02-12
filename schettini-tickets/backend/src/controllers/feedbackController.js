const pool = require('../config/db');
const asyncHandler = require('express-async-handler');
const { logActivity } = require('../services/activityLogService');
const { notifyAdminsAndAgents } = require('../utils/notificationManager');

const submitFeedback = asyncHandler(async (req, res) => {
    const { ticket_id, rating, comment } = req.body;
    const { id: userId, username, role: userRole } = req.user;

    if (!ticket_id || !rating) {
        res.status(400);
        throw new Error('El ID del ticket y la calificación son obligatorios.');
    }
    if (rating < 1 || rating > 5) {
        res.status(400);
        throw new Error('La calificación debe ser un número entre 1 y 5.');
    }

    const [ticketRows] = await pool.execute(
        'SELECT id, status, user_id FROM Tickets WHERE id = ?',
        [ticket_id]
    );

    if (ticketRows.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    const ticket = ticketRows[0];
    if (ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No autorizado para dejar feedback en este ticket.');
    }
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        res.status(400);
        throw new Error('Solo se puede calificar tickets resueltos o cerrados.');
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO ticket_feedback (ticket_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
            [ticket_id, userId, rating, comment || null]
        );
        const newFeedbackId = result.insertId;

        await logActivity(
            userId, username, userRole, 'feedback_submitted',
            `Feedback enviado para el ticket #${ticket_id} por ${username} (Calificación: ${rating}/5).`,
            'feedback', newFeedbackId, null,
            { ticket_id, rating, comment }
        );

        // --- ¡NUEVA LÓGICA DE NOTIFICACIÓN! ---
        // Se llama al gestor de notificaciones para avisar a los perfiles correctos.
        await notifyAdminsAndAgents(req, {
            message: `Nuevo feedback de ${username} para el ticket #${ticket_id} (Calificación: ${rating}/5).`,
            type: 'new_feedback',
            ticketId: ticket_id
        });

        res.status(201).json({ 
            success: true, 
            message: 'Feedback enviado exitosamente.', 
            feedbackId: newFeedbackId 
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409);
            throw new Error('Ya has calificado este ticket.');
        }
        throw error;
    }
});

module.exports = {
    submitFeedback,
};
