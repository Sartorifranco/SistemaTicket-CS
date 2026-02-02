// backend/src/controllers/commentController.js
const asyncHandler = require('express-async-handler'); // Asegúrate de que este middleware esté instalado
const pool = require('../config/db'); // Importa tu pool de conexión a la base de datos
const { logActivity } = require('../services/activityLogService'); // Importar el servicio de log

// @desc    Añadir un comentario a un ticket
// @route   POST /api/tickets/:ticketId/comments
// @access  Private (Client, Agent, Admin)
const addCommentToTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { message } = req.body; // MODIFICADO: Esperar 'message' en lugar de 'comment_text'
    const userId = req.user.id; // User making the comment
    const username = req.user.username; // Obtener el username del usuario autenticado
    const userRole = req.user.role;
    const userSocketId = req.user.socketId; // Asumiendo que guardamos el socketId en req.user

    if (!message || message.trim() === '') {
        res.status(400);
        throw new Error('El texto del comentario es requerido.');
    }

    // Verificar si el ticket existe
    const [tickets] = await pool.execute('SELECT id, user_id, assigned_to_user_id, department_id, title FROM tickets WHERE id = ?', [ticketId]); // MODIFICADO: Añadir department_id, title
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    const ticket = tickets[0];

    // Lógica de permisos para comentar:
    // Admin siempre puede comentar.
    // Cliente solo puede comentar en sus propios tickets.
    // Agente puede comentar en tickets asignados a él, o tickets en su departamento.
    if (userRole === 'client' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }
    if (userRole === 'agent' && ticket.assigned_to_user_id !== userId && ticket.department_id !== req.user.department_id) { // MODIFICADO: Añadir chequeo de departamento
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }

    const [result] = await pool.execute(
        'INSERT INTO comments (ticket_id, user_id, comment_text) VALUES (?, ?, ?)',
        [ticketId, userId, message.trim()] // Usar 'message' aquí
    );

    const newCommentId = result.insertId;
    const [newCommentRows] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text AS message, c.created_at ' + // MODIFICADO: Alias 'comment_text' a 'message'
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
        [newCommentId]
    );

    // Log activity
    console.log(`[CommentController] Llamando logActivity para añadir comentario a ticket ${ticketId} por usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'comment_added',     // action_type (más específico)
        `Comentario añadido al ticket "${ticket.title}" (ID: ${ticketId}) por ${username}.`, // description
        'comment',           // target_type
        newCommentId,        // target_id
        null,                // old_value
        { ticket_id: parseInt(ticketId), comment_text: message.substring(0, 50) + '...' } // new_value
    );

    // Emit socket event
    if (req.app.get('io')) {
        const io = req.app.get('io');
        const ticketIdNum = parseInt(ticketId);

        const commentMessage = `Nuevo comentario en ticket #${ticketIdNum} por ${username}.`;
        const clientCommentMessage = `Nuevo comentario en tu ticket #${ticketIdNum}.`;
        const agentCommentMessage = `Nuevo comentario en tu ticket asignado #${ticketIdNum}.`;

        // 1. Notificar a la sala del ticket (todos los que lo están viendo, excluyendo al comentador)
        io.to(`ticket-${ticketIdNum}`).except(userSocketId).emit('newComment', {
            message: commentMessage,
            ticketId: ticketIdNum,
            commentBy: userId,
            commentByRole: userRole,
        });

        // 2. Notificar al creador del ticket (cliente) si no es el comentador
        if (ticket.user_id && ticket.user_id !== userId) {
            io.to(`user-${ticket.user_id}`).emit('newNotification', {
                type: 'new_comment',
                message: clientCommentMessage,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }

        // 3. Notificar al agente asignado si no es el comentador
        if (ticket.assigned_to_user_id && ticket.assigned_to_user_id !== userId) {
            io.to(`user-${ticket.assigned_to_user_id}`).emit('newNotification', {
                type: 'new_comment',
                message: agentCommentMessage,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }

        // 4. Notificar a administradores (excluyendo al comentador si es admin)
        if (userRole !== 'admin') { // Solo notificar a admins si el comentador no es admin
            io.to('admin').emit('newNotification', {
                type: 'new_comment',
                message: `Nuevo comentario de ${username} en ticket #${ticketIdNum}.`,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }

        // 5. Notificar a agentes del departamento del ticket (excluyendo al comentador si es agente de ese depto)
        if (ticket.department_id && (userRole !== 'agent' || req.user.department_id !== ticket.department_id)) { 
            // Notificar si el comentador no es un agente O si es un agente pero no del departamento del ticket
            io.to(`department-${ticket.department_id}`).except(userSocketId).emit('newNotification', {
                type: 'new_comment',
                message: `Nuevo comentario en ticket #${ticketIdNum} del departamento.`,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }
    }

    res.status(201).json({
        success: true,
        message: 'Comentario añadido exitosamente',
        comment: newCommentRows[0], // Devuelve el comentario creado
    });
});

// @desc    Obtener comentarios de un ticket
// @route   GET /api/tickets/:ticketId/comments
// @access  Private (Client, Agent, Admin)
const getCommentsForTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Verificar si el ticket existe y si el usuario tiene permiso para verlo
    const [tickets] = await pool.execute('SELECT id, user_id, assigned_to_user_id, department_id FROM tickets WHERE id = ?', [ticketId]); // MODIFICADO: Añadir department_id
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    const ticket = tickets[0];
    // Lógica de permisos para ver comentarios:
    // Admin y Agente pueden ver cualquier comentario.
    // Cliente solo puede ver comentarios de sus propios tickets.
    if (userRole === 'client' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para ver los comentarios de este ticket.');
    }
    if (userRole === 'agent' && ticket.assigned_to_user_id !== userId && ticket.department_id !== req.user.department_id) { // MODIFICADO: Añadir chequeo de departamento
        res.status(403);
        throw new Error('No tienes permiso para ver los comentarios de este ticket.');
    }

    const [rows] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text AS message, c.created_at ' + // MODIFICADO: Alias 'comment_text' a 'message'
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.created_at ASC',
        [ticketId]
    );

    res.status(200).json({ success: true, count: rows.length, comments: rows });
});

// @desc    Eliminar un comentario
// @route   DELETE /api/comments/:commentId
// @access  Private (Admin, or the user who made the comment)
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const username = req.user.username; // Asegurarse de tener el username
    const userRole = req.user.role;
    const userSocketId = req.user.socketId; // Asumiendo que guardamos el socketId en req.user

    const [commentRows] = await pool.execute('SELECT user_id, ticket_id FROM comments WHERE id = ?', [commentId]); // MODIFICADO: Añadir ticket_id
    if (commentRows.length === 0) {
        res.status(404);
        throw new Error('Comentario no encontrado');
    }

    const comment = commentRows[0];
    // Obtener datos del ticket para notificaciones
    const [ticketRows] = await pool.execute('SELECT user_id, assigned_to_user_id, department_id, title FROM tickets WHERE id = ?', [comment.ticket_id]);
    const ticket = ticketRows[0];

    // Solo el administrador o el usuario que creó el comentario pueden eliminarlo
    if (userRole !== 'admin' && comment.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para eliminar este comentario');
    }

    const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Comentario no encontrado');
    }

    // Log activity
    console.log(`[CommentController] Llamando logActivity para eliminación de comentario ${commentId} por usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'comment_deleted',   // action_type (más específico)
        `Comentario (ID: ${commentId}) eliminado del ticket (ID: ${comment.ticket_id}) por ${username}.`, // description
        'comment',           // target_type
        parseInt(commentId), // target_id
        comment,             // old_value
        null                 // new_value
    );

    // Emit socket event
    if (req.app.get('io')) {
        const io = req.app.get('io');
        const ticketIdNum = parseInt(comment.ticket_id);
        const commentMessage = `Un comentario ha sido eliminado del ticket #${ticketIdNum} por ${username}.`;

        // 1. Notificar a la sala del ticket (todos los que lo están viendo, excluyendo al que eliminó)
        io.to(`ticket-${ticketIdNum}`).except(userSocketId).emit('commentDeleted', {
            message: commentMessage,
            commentId: parseInt(commentId),
            ticketId: ticketIdNum,
            deletedBy: userId,
            deletedByRole: userRole,
        });

        // 2. Notificar al creador del ticket (cliente) si no es el que eliminó
        if (ticket.user_id && ticket.user_id !== userId) {
            io.to(`user-${ticket.user_id}`).emit('newNotification', {
                type: 'comment_deleted',
                message: `Un comentario en tu ticket #${ticketIdNum} ha sido eliminado.`,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }

        // 3. Notificar al agente asignado si no es el que eliminó
        if (ticket.assigned_to_user_id && ticket.assigned_to_user_id !== userId) {
            io.to(`user-${ticket.assigned_to_user_id}`).emit('newNotification', {
                type: 'comment_deleted',
                message: `Un comentario en tu ticket asignado #${ticketIdNum} ha sido eliminado.`,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }

        // 4. Notificar a administradores (excluyendo al que eliminó si es admin)
        if (userRole !== 'admin') {
            io.to('admin').emit('newNotification', {
                type: 'comment_deleted',
                message: `Un comentario en ticket #${ticketIdNum} ha sido eliminado por ${username}.`,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }

        // 5. Notificar a agentes del departamento del ticket (excluyendo al que eliminó si es agente de ese depto)
        if (ticket.department_id && (userRole !== 'agent' || req.user.department_id !== ticket.department_id)) {
            io.to(`department-${ticket.department_id}`).except(userSocketId).emit('newNotification', {
                type: 'comment_deleted',
                message: `Un comentario en ticket #${ticketIdNum} del departamento ha sido eliminado.`,
                ticketId: ticketIdNum,
                relatedType: 'comment',
            });
        }
    }

    res.status(200).json({ success: true, message: 'Comentario eliminado exitosamente' });
});

module.exports = {
    addCommentToTicket,
    getCommentsForTicket,
    deleteComment,
};
