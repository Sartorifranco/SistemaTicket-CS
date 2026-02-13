const pool = require('../config/db');
const path = require('path');
const { createActivityLog } = require('../utils/activityLogger');

const STATUS_ES = { open: 'abierto', 'in-progress': 'en progreso', in_progress: 'en progreso', resolved: 'resuelto', closed: 'cerrado', reopened: 'reabierto' };
const tr = (s) => STATUS_ES[s] || s;

// --- Función Auxiliar para Notificar ---
const notifyUser = async (io, userId, message, relatedId, relatedType = 'ticket') => {
    try {
        const [res] = await pool.query(
            `INSERT INTO notifications (user_id, type, message, related_id, related_type, is_read, created_at) VALUES (?, 'info', ?, ?, ?, 0, NOW())`,
            [userId, message, relatedId, relatedType]
        );
        if (io) {
            io.to(`user-${userId}`).emit('notification', {
                id: res.insertId, type: 'info', message, related_id: relatedId, related_type: relatedType, is_read: false, created_at: new Date()
            });
        }
    } catch (e) { console.error(e); }
};

// --- Crear Ticket ---
const createTicket = async (req, res) => {
    try {
        const { description, priority, department_id, title } = req.body;
        const user = req.user;
        const files = req.files || [];

        const [result] = await pool.query(
            `INSERT INTO Tickets (user_id, title, description, priority, status, department_id, created_at) 
             VALUES (?, ?, ?, ?, 'open', ?, NOW())`,
            [user.id, title || 'Nuevo Ticket', description, priority || 'medium', department_id || null]
        );
        const ticketId = result.insertId;

        if (files.length > 0) {
            const attachments = files.map(f => [ticketId, f.filename, `/uploads/${f.filename}`, f.mimetype]);
            await pool.query(`INSERT INTO ticket_attachments (ticket_id, file_name, file_url, file_type) VALUES ?`, [attachments]);
        }

        // Notificar a admins/agentes
        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: 'Nuevo ticket creado' });
        }

        await createActivityLog(user.id, 'ticket', 'created', `Ticket #${ticketId} creado: "${title || 'Nuevo Ticket'}"`, ticketId, null, { title, status: 'abierto' });

        res.status(201).json({ success: true, message: 'Ticket creado', data: { id: ticketId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear ticket' });
    }
};

// --- Obtener Tickets (Con Filtros de Agente) ---
const getTickets = async (req, res) => {
    try {
        const { view, status, priority, agentId } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = `
            SELECT t.*, 
                   u.username as client_name, 
                   u.business_name,
                   a.username as agent_name,
                   d.name as ticket_department_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN Users a ON t.assigned_to_user_id = a.id
            LEFT JOIN Departments d ON t.department_id = d.id
            WHERE 1=1
        `;
        
        const params = [];

        if (userRole === 'client') {
            query += ' AND t.user_id = ?';
            params.push(userId);
        } else {
            // Lógica Agente/Admin
            if (view === 'assigned') {
                query += ' AND t.assigned_to_user_id = ?';
                params.push(userId);
            } else if (view === 'unassigned') {
                query += ' AND t.assigned_to_user_id IS NULL';
            } else if (view === 'resolved') {
                query += ' AND t.assigned_to_user_id = ? AND t.status IN ("resolved", "closed")';
                params.push(userId);
            }
        }

        if (status) { query += ' AND t.status = ?'; params.push(status); }
        if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
        if (agentId) { query += ' AND t.assigned_to_user_id = ?'; params.push(agentId); }
        
        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, params);
        res.json({ success: true, data: tickets });

    } catch (error) {
        console.error("Error getTickets:", error);
        res.status(500).json({ success: false, message: 'Error al obtener tickets' });
    }
};

// --- Obtener Ticket ID ---
const getTicketById = async (req, res) => {
    try {
        const [tickets] = await pool.query(`
            SELECT t.*, u.username as client_name, u.business_name, a.username as agent_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN Users a ON t.assigned_to_user_id = a.id
            WHERE t.id = ?`, [req.params.id]);

        if (tickets.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });
        
        const ticket = tickets[0];
        if (req.user.role === 'client' && ticket.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const [comments] = await pool.query('SELECT c.*, u.username FROM comments c JOIN Users u ON c.user_id = u.id WHERE ticket_id = ? ORDER BY created_at ASC', [req.params.id]);
        const [attachments] = await pool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [req.params.id]);

        res.json({ success: true, data: { ...ticket, comments, attachments } });
    } catch (error) { res.status(500).json({ message: 'Error server' }); }
};

// --- Actualizar Estado ---
const updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const ticketId = req.params.id;
        const [rows] = await pool.query('SELECT status FROM Tickets WHERE id = ?', [ticketId]);
        const oldStatus = rows[0]?.status;
        await pool.query('UPDATE Tickets SET status = ? WHERE id = ?', [status, ticketId]);
        await createActivityLog(req.user.id, 'ticket', 'status_updated', `Estado del ticket #${ticketId} cambiado de "${tr(oldStatus)}" a "${tr(status)}"`, parseInt(ticketId), { status: oldStatus }, { status });
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
};

// --- ✅ NUEVO: Asignar Ticket (Tomar Ticket) ---
// El agente logueado se asigna el ticket a sí mismo
const assignTicket = async (req, res) => {
    try {
        const ticketId = req.params.id;
        const agentId = req.user.id; 
        
        await pool.query('UPDATE Tickets SET assigned_to_user_id = ?, status = "in-progress" WHERE id = ?', [agentId, ticketId]);
        await createActivityLog(agentId, 'ticket', 'assigned', `Agente tomó el ticket #${ticketId}`, parseInt(ticketId), null, { assigned_to: agentId, status: 'in-progress' });
        
        res.json({ success: true, message: 'Has tomado el ticket correctamente.' });
    } catch (error) {
        console.error("Error assignTicket:", error);
        res.status(500).json({ message: 'Error al tomar el ticket' });
    }
};

// --- ✅ NUEVO: Reasignar Ticket (Admin/Agente a otro) ---
// Se asigna a un ID específico recibido en el body
const reassignTicket = async (req, res) => {
    try {
        const { newAgentId } = req.body;
        const ticketId = req.params.id;

        if (!newAgentId) return res.status(400).json({ message: 'Se requiere el ID del agente.' });

        await pool.query('UPDATE Tickets SET assigned_to_user_id = ? WHERE id = ?', [newAgentId, ticketId]);
        await createActivityLog(req.user.id, 'ticket', 'reassigned', `Ticket #${ticketId} reasignado al agente ID ${newAgentId}`, parseInt(ticketId), null, { assigned_to: newAgentId });
        
        if (req.io) {
            await notifyUser(req.io, newAgentId, `Se te ha asignado el Ticket #${ticketId}`, ticketId);
        }
        res.json({ success: true, message: 'Ticket reasignado correctamente.' });
    } catch (error) { 
        console.error("Error reassignTicket:", error);
        res.status(500).json({ message: 'Error al reasignar' }); 
    }
};

// --- Agregar Comentario ---
const addCommentToTicket = async (req, res) => {
    try {
        const { comment_text, is_internal } = req.body;
        const internal = req.user.role !== 'client' && is_internal ? 1 : 0;
        const ticketId = req.params.id;
        await pool.query('INSERT INTO comments (ticket_id, user_id, comment_text, is_internal, created_at) VALUES (?, ?, ?, ?, NOW())', 
            [ticketId, req.user.id, comment_text, internal]);
        await createActivityLog(req.user.id, 'ticket', 'comment_added', `Comentario agregado al ticket #${ticketId}`, parseInt(ticketId), null, { preview: (comment_text || '').substring(0, 50) });
        res.json({ success: true, message: 'Comentario agregado' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
};

// --- Borrar Ticket ---
const deleteTicket = async (req, res) => {
    try {
        const id = req.params.id;
        await createActivityLog(req.user.id, 'ticket', 'deleted', `Ticket #${id} eliminado`, parseInt(id), null, null);
        await pool.query('DELETE FROM comments WHERE ticket_id = ?', [id]);
        await pool.query('DELETE FROM ticket_attachments WHERE ticket_id = ?', [id]);
        await pool.query('DELETE FROM Tickets WHERE id = ?', [id]);
        res.json({ success: true, message: 'Eliminado' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
};

// Helpers
const getTicketCategories = async (req, res) => {
    const [d] = await pool.query('SELECT * FROM problem_categories');
    res.json({ success: true, data: d });
};
const getDepartments = async (req, res) => {
    const [d] = await pool.query('SELECT * FROM Departments');
    res.json({ success: true, data: d });
};
const getTicketComments = async (req, res) => { /* Placeholder */ };
const updateTicket = async (req, res) => { /* Placeholder */ };

module.exports = {
    createTicket, getTickets, getTicketById, 
    updateTicketStatus, 
    assignTicket,   // ✅ Exportado
    reassignTicket, // ✅ Exportado
    addCommentToTicket, deleteTicket,
    getTicketCategories, getDepartments, getTicketComments, updateTicket
};