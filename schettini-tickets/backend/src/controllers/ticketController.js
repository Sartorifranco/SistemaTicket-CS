const pool = require('../config/db');
const path = require('path');
const { createActivityLog } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationManager');
const { sendTicketEmail } = require('../utils/mailer');

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
        const { description, priority, department_id, title, user_id } = req.body;
        const user = req.user;
        const files = req.files || [];
        // Admin/agente puede crear ticket en nombre de un cliente; si no, usa el usuario logueado
        const effectiveUserId = (user.role === 'admin' || user.role === 'agent') && user_id
            ? parseInt(user_id, 10) : user.id;

        const [result] = await pool.query(
            `INSERT INTO Tickets (user_id, title, description, priority, status, department_id, created_at) 
             VALUES (?, ?, ?, ?, 'open', ?, NOW())`,
            [effectiveUserId, (title || '').trim() || 'Nuevo Ticket', description, priority || 'medium', department_id || null]
        );
        const ticketId = result.insertId;

        if (files.length > 0) {
            const attachments = files.map(f => [ticketId, f.filename, `/uploads/${f.filename}`, f.mimetype]);
            await pool.query(`INSERT INTO ticket_attachments (ticket_id, file_name, file_url, file_type) VALUES ?`, [attachments]);
        }

        // Notificar a admins/agentes (socket ya existente)
        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: 'Nuevo ticket creado' });
        }
        // Trigger notificaciones en DB para admin y agentes: nuevo trabajo ingresado
        const [staff] = await pool.query("SELECT id FROM Users WHERE role IN ('admin', 'agent', 'supervisor') AND (is_active = 1 OR is_active IS NULL)");
        const finalTitle = (title || '').trim() || 'Nuevo Ticket';
        for (const row of staff) {
            if (row.id !== user.id) {
                await createNotification(row.id, 'Nuevo ticket', `Se creó un nuevo ticket: "${finalTitle}".`, 'info', req.io || null, ticketId, 'ticket');
            }
        }

        // Email de notificación de nuevo ticket (no bloqueante).
        // Destinatarios configurables desde Admin → Configuración Central → ticket_notification_emails.
        // Si no hay configuración, cae por default a posventa@casaschettini.com.
        try {
            const [clientRow] = await pool.query('SELECT COALESCE(full_name, username, email) AS client_name FROM Users WHERE id = ?', [effectiveUserId]);
            const clientName = (clientRow[0] && clientRow[0].client_name) ? String(clientRow[0].client_name) : 'Un cliente';

            let configuredEmails = null;
            try {
                const [cfg] = await pool.query('SELECT ticket_notification_emails FROM company_settings WHERE id = 1 LIMIT 1');
                configuredEmails = cfg[0]?.ticket_notification_emails || null;
            } catch (cfgErr) {
                // columna puede no existir todavía en BD viejas (antes de migrar)
                configuredEmails = null;
            }

            let recipients = [];
            if (configuredEmails && typeof configuredEmails === 'string') {
                recipients = configuredEmails
                    .split(/[,\n;]+/)
                    .map((e) => e.trim())
                    .filter((e) => e && /\S+@\S+\.\S+/.test(e));
            }
            if (recipients.length === 0) {
                // Fallback al destinatario por defecto
                recipients = ['posventa@casaschettini.com'];
            }

            const subject = `Nuevo ticket #${ticketId}: ${finalTitle}`;
            const htmlBody = `<p>Se ha creado un nuevo ticket.</p><p><strong>Ticket #${ticketId}</strong>: ${finalTitle}</p><p>Cliente: ${clientName}</p><p>Revisá el panel para asignarlo y responder.</p>`;
            recipients.forEach((to) => {
                sendTicketEmail(to, subject, htmlBody).catch(() => {});
            });
        } catch (mailErr) {
            console.error('[createTicket] email notification error:', mailErr.message);
        }

        await createActivityLog(user.id, 'ticket', 'created', `Ticket #${ticketId} creado: "${finalTitle}"`, ticketId, null, { title: finalTitle, status: 'abierto' });

        res.status(201).json({ success: true, message: 'Ticket creado', data: { id: ticketId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al crear ticket' });
    }
};

// --- Obtener Tickets (Con Filtros de Agente) ---
const getTickets = async (req, res) => {
    try {
        const { view, status, priority, agentId, exclude_planilla } = req.query;
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

        if (status) {
            const statuses = Array.isArray(status) ? status : [status];
            if (statuses.length === 1) {
                query += ' AND t.status = ?';
                params.push(statuses[0]);
            } else if (statuses.length > 1) {
                query += ' AND t.status IN (' + statuses.map(() => '?').join(',') + ')';
                params.push(...statuses);
            }
        }
        if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
        if (agentId) { query += ' AND t.assigned_to_user_id = ?'; params.push(agentId); }
        if (exclude_planilla === '1' || exclude_planilla === 'true') {
            query += " AND t.title NOT LIKE 'Alta de Sistema - Factura%'";
        }
        
        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, params);
        res.json({ success: true, data: tickets });

    } catch (error) {
        console.error("Error getTickets:", error.message);
        res.status(500).json({ success: false, message: 'Error al obtener tickets' });
    }
};

// --- Obtener Ticket ID ---
const getTicketById = async (req, res) => {
    try {
        const [tickets] = await pool.query(`
            SELECT t.*,
                   u.username AS client_name,
                   u.full_name AS client_full_name,
                   u.business_name,
                   u.email AS client_email,
                   u.phone AS client_phone,
                   a.username AS agent_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN Users a ON t.assigned_to_user_id = a.id
            WHERE t.id = ?`, [req.params.id]);

        if (tickets.length === 0) return res.status(404).json({ success: false, message: 'No encontrado' });
        
        const ticket = tickets[0];
        if (req.user.role === 'client' && ticket.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const [comments] = await pool.query('SELECT c.*, u.username as username FROM comments c JOIN Users u ON c.user_id = u.id WHERE ticket_id = ? ORDER BY created_at ASC', [req.params.id]);
        const [attachments] = await pool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [req.params.id]);

        const [activations] = await pool.query(
            'SELECT id, form_type, form_data, invoice_number FROM activations WHERE ticket_id = ? LIMIT 1',
            [req.params.id]
        );
        let activation_data = null;
        if (activations.length > 0) {
            const act = activations[0];
            let formData = act.form_data;
            if (typeof formData === 'string') {
                try { formData = JSON.parse(formData); } catch (e) { formData = {}; }
            }
            activation_data = {
                id: act.id,
                form_type: act.form_type,
                invoice_number: act.invoice_number,
                form_data: formData || {}
            };
        }

        res.json({ success: true, data: { ...ticket, comments, attachments, activation_data } });
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

        // Validar que el destino exista y sea personal (nunca un cliente/viewer)
        const [targetUser] = await pool.query('SELECT role FROM Users WHERE id = ?', [newAgentId]);
        if (targetUser.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        const allowedRoles = ['admin', 'supervisor', 'agent'];
        if (!allowedRoles.includes(targetUser[0].role)) {
            return res.status(403).json({ message: 'Solo se puede asignar tickets a agentes, supervisores o admins.' });
        }

        // Restricciones adicionales por rol del solicitante:
        // - Solo un admin puede asignar tickets a otro admin.
        if (req.user.role !== 'admin' && targetUser[0].role === 'admin') {
            return res.status(403).json({ message: 'No se puede reasignar tickets a administradores.' });
        }

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

        // Obtener user_id y assigned_to_user_id del ticket para notificaciones y email
        const [ticketRows] = await pool.query('SELECT user_id, assigned_to_user_id, title FROM Tickets WHERE id = ?', [ticketId]);
        const clientId = ticketRows.length > 0 ? ticketRows[0].user_id : null;
        const assignedAgentId = ticketRows.length > 0 ? ticketRows[0].assigned_to_user_id : null;
        const ticketTitle = ticketRows.length > 0 ? (ticketRows[0].title || `#${ticketId}`) : `#${ticketId}`;

        await pool.query('INSERT INTO comments (ticket_id, user_id, comment_text, is_internal, created_at) VALUES (?, ?, ?, ?, NOW())',
            [ticketId, req.user.id, comment_text, internal]);
        await createActivityLog(req.user.id, 'ticket', 'comment_added', `Comentario agregado al ticket #${ticketId}`, parseInt(ticketId), null, { preview: (comment_text || '').substring(0, 50) });

        // DOC1.7: guardar archivos multimedia adjuntos al comentario como attachments del ticket.
        // Reutiliza ticket_attachments para que se rendericen en la sección "Archivos Adjuntos" del detalle.
        if (Array.isArray(req.files) && req.files.length > 0) {
            try {
                const rows = req.files.map((f) => [
                    ticketId,
                    f.originalname,
                    `/uploads/${f.filename}`,
                    f.mimetype || null,
                ]);
                await pool.query(
                    'INSERT INTO ticket_attachments (ticket_id, file_name, file_url, file_type) VALUES ?',
                    [rows]
                );
            } catch (attErr) {
                console.error('[addCommentToTicket] error guardando adjuntos:', attErr.message);
            }
        }

        // Si quien responde es admin, agente o supervisor, notificar al cliente (salvo que sea nota interna)
        const commenterRole = req.user.role;
        const isStaff = commenterRole === 'admin' || commenterRole === 'agent' || commenterRole === 'supervisor';
        if (isStaff && !internal && clientId && clientId !== req.user.id) {
            const message = `Tienes una nueva respuesta en tu ticket #${ticketId}.`;
            await createNotification(clientId, 'Nueva respuesta en tu ticket', message, 'info', req.io || null, parseInt(ticketId, 10), 'ticket');
        }

        // Email (no bloqueante): staff comenta -> email al cliente; cliente comenta -> email al agente asignado
        try {
            const preview = (comment_text || '').trim().substring(0, 200);
            const escapedPreview = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (isStaff && !internal && clientId && clientId !== req.user.id) {
                const [clientUser] = await pool.query('SELECT email FROM Users WHERE id = ?', [clientId]);
                if (clientUser.length > 0 && clientUser[0].email) {
                    const subject = `Nuevo mensaje en tu ticket #${ticketId}`;
                    const htmlBody = `<p>Tenés una nueva respuesta en tu ticket <strong>#${ticketId}: ${ticketTitle}</strong>.</p><p>Mensaje:</p><p>${escapedPreview}${preview.length >= 200 ? '...' : ''}</p><p>Revisá el panel de tickets para ver el mensaje completo.</p>`;
                    sendTicketEmail(clientUser[0].email, subject, htmlBody).catch(() => {});
                }
            } else if (commenterRole === 'client' && assignedAgentId && assignedAgentId !== req.user.id) {
                const [agentUser] = await pool.query('SELECT email FROM Users WHERE id = ?', [assignedAgentId]);
                if (agentUser.length > 0 && agentUser[0].email) {
                    const subject = `Nuevo mensaje en ticket #${ticketId}`;
                    const htmlBody = `<p>El cliente respondió en el ticket <strong>#${ticketId}: ${ticketTitle}</strong>.</p><p>Mensaje:</p><p>${escapedPreview}${preview.length >= 200 ? '...' : ''}</p><p>Revisá el panel de tickets para responder.</p>`;
                    sendTicketEmail(agentUser[0].email, subject, htmlBody).catch(() => {});
                }
            }
        } catch (mailErr) {
            console.error('[addCommentToTicket] email notification error:', mailErr.message);
        }

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