const pool = require('../config/db');
const path = require('path');

// --- Función Auxiliar para Notificar (Reutilizable) ---
const notifyUser = async (io, userId, message, relatedId, relatedType = 'ticket') => {
    try {
        // 1. Guardar en BD para tener ID persistente
        const [res] = await pool.query(
            `INSERT INTO notifications (user_id, type, message, related_id, related_type, is_read, created_at) 
             VALUES (?, 'info', ?, ?, ?, 0, NOW())`,
            [userId, message, relatedId, relatedType]
        );

        // 2. Emitir Socket con el ID REAL de la BD
        if (io) {
            io.to(`user-${userId}`).emit('notification', {
                id: res.insertId, // ✅ ID real de la base de datos
                type: 'info',
                message,
                related_id: relatedId,
                related_type: relatedType,
                is_read: false,
                created_at: new Date()
            });
        }
    } catch (e) {
        console.error("Error enviando notificación:", e);
    }
};

// --- Notificar a todo el Staff (Admins y Agentes) ---
const notifyStaff = async (io, message, relatedId) => {
    try {
        const [staff] = await pool.query("SELECT id FROM Users WHERE role IN ('admin', 'agent')");
        for (const user of staff) {
            await notifyUser(io, user.id, message, relatedId, 'ticket');
        }
        // Actualizar contadores del dashboard
        io.to('admin').to('agent').emit('dashboard_update', { message });
    } catch (e) {
        console.error("Error notificando staff:", e);
    }
};

// --- Crear Ticket ---
const createTicket = async (req, res) => {
    try {
        const { 
            description, priority, 
            system_id, custom_system,
            equipment_id, custom_equipment,
            problem_category_id, 
            specific_problem_id, custom_problem,
            user_id: clientUserId 
        } = req.body;

        const loggedInUser = req.user;
        const files = req.files; 

        let finalUserId = loggedInUser.id;
        if ((loggedInUser.role === 'admin' || loggedInUser.role === 'agent') && clientUserId) {
            finalUserId = clientUserId;
        }

        if (!description || !problem_category_id || !specific_problem_id) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
        }

        if (files && files.length > 0) {
            const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
            for (const file of files) {
                const ext = path.extname(file.originalname).toLowerCase();
                if (!allowedExts.includes(ext)) {
                    return res.status(400).json({ success: false, message: 'Solo imágenes y PDF.' });
                }
            }
        }

        // Título Automático
        let autoTitle = "Soporte Técnico";
        const [catRows] = await pool.query('SELECT name FROM problem_categories WHERE id = ?', [problem_category_id]);
        const [probRows] = await pool.query('SELECT name FROM specific_problems WHERE id = ?', [specific_problem_id]);

        if (catRows.length > 0 && probRows.length > 0) {
            const catName = catRows[0].name;
            let probName = probRows[0].name;
            if (['otro', 'otros'].includes(probName.toLowerCase())) {
                probName = custom_problem || 'General';
            }
            autoTitle = `${catName} - ${probName}`;
        }

        // Insertar Ticket
        const [result] = await pool.query(
            `INSERT INTO Tickets (
                user_id, title, description, priority, status,
                system_id, custom_system, equipment_id, custom_equipment,
                problem_category_id, specific_problem_id, custom_problem,
                created_at
            ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                finalUserId, autoTitle, description, priority || 'medium',
                system_id || null, custom_system || '',
                equipment_id || null, custom_equipment || '',
                problem_category_id, specific_problem_id, custom_problem || ''
            ]
        );
        
        const newTicketId = result.insertId;

        // Guardar Adjuntos
        if (files && files.length > 0) {
            const attachmentValues = files.map(file => [newTicketId, file.filename, `/uploads/${file.filename}`, file.mimetype]);
            await pool.query(`INSERT INTO ticket_attachments (ticket_id, file_name, file_url, file_type) VALUES ?`, [attachmentValues]);
        }

        // ✅ NOTIFICACIONES PERSISTENTES
        if (req.io) {
            await notifyStaff(req.io, `Nuevo Ticket #${newTicketId}: ${autoTitle}`, newTicketId);
        }

        res.status(201).json({ success: true, message: 'Ticket creado exitosamente.', data: { id: newTicketId } });

    } catch (error) {
        console.error("Error en createTicket:", error);
        res.status(500).json({ success: false, message: 'Error interno al crear el ticket.' });
    }
};

// --- Obtener Tickets (Lista) ---
const getTickets = async (req, res) => {
    try {
        let query = `
            SELECT t.id, t.title, t.priority, t.status, t.created_at, t.user_id,
                   u.username as creator_name, u.business_name,
                   pc.name as category_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN problem_categories pc ON t.problem_category_id = pc.id
        `;
        const params = [];
        if (req.user.role === 'client') {
            query += ' WHERE t.user_id = ?'; 
            params.push(req.user.id);
        }
        query += ' ORDER BY t.created_at DESC';
        const [tickets] = await pool.query(query, params);
        res.json({ success: true, data: tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener tickets' });
    }
};

// --- Obtener Ticket Detalle ---
const getTicketById = async (req, res) => {
    try {
        const query = `
            SELECT t.*,
                u.username AS client_name, u.email as client_email, u.phone as client_phone, u.business_name,
                a.username AS agent_name,
                pc.name as category_name, sp.name as problem_name,
                ts.name as system_name, te.name as equipment_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN Users a ON t.assigned_to_user_id = a.id
            LEFT JOIN problem_categories pc ON t.problem_category_id = pc.id
            LEFT JOIN specific_problems sp ON t.specific_problem_id = sp.id
            LEFT JOIN ticket_systems ts ON t.system_id = ts.id
            LEFT JOIN ticket_equipment te ON t.equipment_id = te.id
            WHERE t.id = ?
        `;
        
        const [tickets] = await pool.query(query, [req.params.id]);
        if (tickets.length === 0) return res.status(404).json({ success: false, message: 'Ticket no encontrado' });

        const ticket = tickets[0];
        if (req.user.role === 'client' && ticket.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Acceso denegado.' });
        }

        const [comments] = await pool.query(`
            SELECT c.*, u.username, u.role as user_role
            FROM comments c
            LEFT JOIN Users u ON c.user_id = u.id
            WHERE c.ticket_id = ?
            ${req.user.role === 'client' ? ' AND c.is_internal = false' : ''}
            ORDER BY c.created_at ASC
        `, [req.params.id]);

        const [attachments] = await pool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [req.params.id]);

        // Ajustar nombres "Otros"
        if (ticket.system_name && ['otro', 'otros'].includes(ticket.system_name.toLowerCase())) ticket.system_name = ticket.custom_system || ticket.system_name;
        if (ticket.equipment_name && ['otro', 'otros'].includes(ticket.equipment_name.toLowerCase())) ticket.equipment_name = ticket.custom_equipment || ticket.equipment_name;
        if (ticket.problem_name && ['otro', 'otros'].includes(ticket.problem_name.toLowerCase())) ticket.problem_name = ticket.custom_problem || ticket.problem_name;

        res.json({ success: true, data: { ...ticket, comments, attachments } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener detalles' });
    }
};

// --- Actualizar Estado ---
const updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const ticketId = req.params.id;
        let query = 'UPDATE Tickets SET status = ?';
        if (status === 'resolved' || status === 'closed') query += ', closed_at = NOW()';
        query += ' WHERE id = ?';
        await pool.query(query, [status, ticketId]);

        // ✅ Notificar al dueño con persistencia
        const [t] = await pool.query('SELECT user_id, title FROM Tickets WHERE id = ?', [ticketId]);
        if (t.length > 0 && req.io) {
            await notifyUser(req.io, t[0].user_id, `Tu ticket "${t[0].title}" cambió a: ${status}`, ticketId);
        }
        res.json({ success: true, message: `Estado actualizado` });
    } catch (error) { res.status(500).json({ message: 'Error al actualizar estado' }); }
};

// --- Asignar Ticket ---
const reassignTicket = async (req, res) => {
    try {
        const { newAgentId } = req.body;
        const ticketId = req.params.id;
        await pool.query('UPDATE Tickets SET assigned_to_user_id = ? WHERE id = ?', [newAgentId, ticketId]);
        
        // ✅ Notificar al agente con persistencia
        if (req.io) {
            await notifyUser(req.io, newAgentId, `Se te ha asignado el Ticket #${ticketId}`, ticketId);
        }
        res.json({ success: true, message: 'Asignado correctamente.' });
    } catch (error) { res.status(500).json({ message: 'Error al asignar' }); }
};

// --- Agregar Comentario ---
const addCommentToTicket = async (req, res) => {
    try {
        const { comment_text, is_internal } = req.body;
        const ticketId = req.params.id;
        const finalIsInternal = req.user.role !== 'client' && (is_internal === true || is_internal === 'true');

        await pool.query('INSERT INTO comments (ticket_id, user_id, comment_text, is_internal) VALUES (?, ?, ?, ?)', [ticketId, req.user.id, comment_text, finalIsInternal]);

        // ✅ Notificaciones Cruzadas Persistentes
        if (req.io) {
            const [t] = await pool.query('SELECT user_id, title FROM Tickets WHERE id = ?', [ticketId]);
            if (t.length > 0) {
                if (req.user.role === 'client') {
                    await notifyStaff(req.io, `Respuesta en Ticket #${ticketId} de ${req.user.username}`, ticketId);
                } else if (!finalIsInternal) {
                    await notifyUser(req.io, t[0].user_id, `Nueva respuesta en Ticket #${ticketId}`, ticketId);
                }
            }
        }
        res.status(201).json({ success: true, message: 'Comentario agregado.' });
    } catch (error) { res.status(500).json({ message: 'Error al comentar' }); }
};

// --- Borrar Ticket ---
const deleteTicket = async (req, res) => {
    try {
        await pool.query('DELETE FROM comments WHERE ticket_id = ?', [req.params.id]);
        await pool.query('DELETE FROM ticket_attachments WHERE ticket_id = ?', [req.params.id]);
        await pool.query('DELETE FROM Tickets WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Ticket eliminado.' });
    } catch (error) { res.status(500).json({ message: 'Error al eliminar ticket' }); }
};

// --- Funciones Auxiliares ---
const getTicketCategories = async (req, res) => {
    try { const [d] = await pool.query('SELECT * FROM problem_categories'); res.json({ success: true, data: d }); } catch (e) { res.status(500).json({ message: 'Error' }); }
};
const getDepartments = async (req, res) => {
    try { const [d] = await pool.query('SELECT * FROM Departments'); res.json({ success: true, data: d }); } catch (e) { res.status(500).json({ message: 'Error' }); }
};
const getTicketComments = async (req, res) => {
    try { const [c] = await pool.query('SELECT * FROM comments WHERE ticket_id = ?', [req.params.id]); res.json({ success: true, data: c }); } catch (e) { res.status(500).json({ message: 'Error' }); }
};
const updateTicket = async (req, res) => { 
    res.json({ success: true, message: 'Usar endpoints específicos' }); 
};

module.exports = {
    createTicket, getTickets, getTicketById, updateTicketStatus, reassignTicket, addCommentToTicket, deleteTicket,
    getTicketCategories, getDepartments, getTicketComments, updateTicket
};