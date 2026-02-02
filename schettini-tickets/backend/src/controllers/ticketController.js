const pool = require('../config/db');

// --- Crear Ticket ---
const createTicket = async (req, res) => {
    try {
        const { title, description, priority, category_id, department_id, location_id, depositario_id, user_id: clientUserId } = req.body;
        const loggedInUser = req.user;

        // Determinar quién es el dueño del ticket
        let finalUserId = loggedInUser.id;
        if ((loggedInUser.role === 'admin' || loggedInUser.role === 'agent') && clientUserId) {
            finalUserId = clientUserId;
        }

        if (!title || !description || !priority) {
            return res.status(400).json({ message: 'Título, descripción y prioridad son obligatorios.' });
        }

        // Insertar Ticket
        // Nota: Si no tienes las columnas location_id o depositario_id en la BD, elimínalas de esta query
        const [result] = await pool.query(
            `INSERT INTO Tickets 
            (user_id, title, description, priority, category_id, department_id, status, location_id, depositario_id) 
            VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
            [finalUserId, title, description, priority, category_id || null, department_id || null, location_id || null, depositario_id || null]
        );
        
        const newTicketId = result.insertId;

        // Notificación por Socket
        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: `Nuevo ticket creado #${newTicketId}` });
        }

        res.status(201).json({ success: true, message: 'Ticket creado exitosamente.', data: { id: newTicketId } });

    } catch (error) {
        console.error("Error en createTicket:", error);
        res.status(500).json({ message: 'Error al crear el ticket.' });
    }
};

// --- Obtener Tickets (Lista) ---
const getTickets = async (req, res) => {
    try {
        let query = `
            SELECT t.*, u.username as creator_name, c.name as category_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN ticket_categories c ON t.category_id = c.id
        `;
        const params = [];

        // Si es cliente, solo ve los suyos
        if (req.user.role === 'client') {
            query += ' WHERE t.user_id = ?'; 
            params.push(req.user.id);
        }

        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, params);
        res.json(tickets);
    } catch (error) {
        console.error("Error en getTickets:", error);
        res.status(500).json({ message: 'Error al obtener tickets' });
    }
};

// --- Obtener Ticket por ID ---
const getTicketById = async (req, res) => {
    try {
        // CORRECCIÓN: Usamos 'username' porque first_name no existe
        const query = `
            SELECT t.*, t.closure_reason,
                u.username AS client_name,
                a.username AS agent_name,
                c.name as ticket_category_name,
                d.name as ticket_department_name
            FROM Tickets t
            LEFT JOIN Users u ON t.user_id = u.id
            LEFT JOIN Users a ON t.assigned_to_user_id = a.id
            LEFT JOIN ticket_categories c ON t.category_id = c.id
            LEFT JOIN Departments d ON t.department_id = d.id
            WHERE t.id = ?
        `;
        
        const [tickets] = await pool.query(query, [req.params.id]);

        if (tickets.length === 0) return res.status(404).json({ message: 'Ticket no encontrado' });

        const ticket = tickets[0];

        // Seguridad
        if (req.user.role === 'client' && ticket.user_id !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso para ver este ticket.' });
        }

        // Obtener Comentarios
        const [comments] = await pool.query(`
            SELECT c.*, u.username 
            FROM comments c
            LEFT JOIN Users u ON c.user_id = u.id
            WHERE c.ticket_id = ?
            ${req.user.role === 'client' ? ' AND c.is_internal = false' : ''}
            ORDER BY c.created_at ASC
        `, [req.params.id]);

        // Obtener Adjuntos (Si existe la tabla)
        let attachments = [];
        try {
            const [att] = await pool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [req.params.id]);
            attachments = att;
        } catch (e) {
            // Ignorar si la tabla no existe aún
        }

        res.json({ success: true, data: { ...ticket, comments, attachments } });

    } catch (error) {
        console.error("Error en getTicketById:", error);
        res.status(500).json({ message: 'Error al obtener detalles del ticket' });
    }
};

// --- Actualizar Ticket (Edición General) ---
const updateTicket = async (req, res) => {
    try {
        const { title, description, priority, category_id, status, closure_reason, assigned_to_user_id } = req.body;
        const ticketId = req.params.id;

        let query = 'UPDATE Tickets SET ';
        const params = [];
        const updates = [];

        if (title) { updates.push('title = ?'); params.push(title); }
        if (description) { updates.push('description = ?'); params.push(description); }
        if (priority) { updates.push('priority = ?'); params.push(priority); }
        if (category_id) { updates.push('category_id = ?'); params.push(category_id); }
        
        // Manejo especial para status y fecha de cierre
        if (status) { 
            updates.push('status = ?'); params.push(status);
            if (status === 'closed' || status === 'resolved') {
                updates.push('closed_at = NOW()');
            }
        }
        if (closure_reason) { updates.push('closure_reason = ?'); params.push(closure_reason); }
        if (assigned_to_user_id) { updates.push('assigned_to_user_id = ?'); params.push(assigned_to_user_id); }

        if (updates.length === 0) return res.status(400).json({ message: 'Nada que actualizar' });

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(ticketId);

        await pool.query(query, params);
        res.json({ success: true, message: 'Ticket actualizado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar ticket' });
    }
};

// --- Actualizar Solo Estado (Ruta específica) ---
const updateTicketStatus = async (req, res) => {
    try {
        const { status: newStatus } = req.body;
        const ticketId = req.params.id;

        let query = 'UPDATE Tickets SET status = ?';
        if (newStatus === 'resolved' || newStatus === 'closed') {
            query += ', closed_at = NOW()';
        }
        query += ' WHERE id = ?';

        await pool.query(query, [newStatus, ticketId]);

        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: `Estado del ticket #${ticketId} actualizado` });
        }

        res.json({ success: true, message: `Estado actualizado a ${newStatus}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al cambiar estado' });
    }
};

// --- Asignar a mí mismo ---
const assignTicketToSelf = async (req, res) => {
    try {
        const ticketId = req.params.id;
        const agentId = req.user.id;

        await pool.query(
            "UPDATE Tickets SET assigned_to_user_id = ?, status = 'in_progress' WHERE id = ?",
            [agentId, ticketId]
        );

        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: `Ticket #${ticketId} asignado` });
        }

        res.json({ success: true, message: 'Ticket asignado a tu usuario.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al asignar ticket' });
    }
};

// --- Reasignar Ticket ---
const reassignTicket = async (req, res) => {
    try {
        const { newAgentId } = req.body;
        await pool.query('UPDATE Tickets SET assigned_to_user_id = ? WHERE id = ?', [newAgentId, req.params.id]);
        res.json({ success: true, message: 'Ticket reasignado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al reasignar' });
    }
};

// --- Agregar Comentario ---
const addCommentToTicket = async (req, res) => {
    try {
        const { comment_text, is_internal } = req.body;
        const ticketId = req.params.id;
        
        // Validar si es interno
        const finalIsInternal = req.user.role !== 'client' && (is_internal === true || is_internal === 'true');

        await pool.query(
            'INSERT INTO comments (ticket_id, user_id, comment_text, is_internal) VALUES (?, ?, ?, ?)',
            [ticketId, req.user.id, comment_text, finalIsInternal]
        );

        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: `Nuevo comentario en ticket #${ticketId}` });
        }

        res.status(201).json({ success: true, message: 'Comentario añadido.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al agregar comentario' });
    }
};

// --- Borrar Ticket ---
const deleteTicket = async (req, res) => {
    try {
        await pool.query('DELETE FROM comments WHERE ticket_id = ?', [req.params.id]);
        await pool.query('DELETE FROM Tickets WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Ticket eliminado.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

// --- Obtener Categorías (Necesario para Reportes) ---
const getTicketCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM ticket_categories');
        res.json(categories); // Devolver array directo o {data: categories} según prefiera tu front
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
};

// --- Obtener Departamentos ---
const getDepartments = async (req, res) => {
    try {
        const [departments] = await pool.query('SELECT * FROM Departments');
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener departamentos' });
    }
};

// --- Obtener Comentarios (Ruta separada) ---
const getTicketComments = async (req, res) => {
    try {
        const [comments] = await pool.query(`
            SELECT c.*, u.username 
            FROM comments c
            LEFT JOIN Users u ON c.user_id = u.id
            WHERE c.ticket_id = ?
            ORDER BY c.created_at ASC
        `, [req.params.id]);
        res.json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener comentarios' });
    }
};

module.exports = {
    createTicket,
    getTickets,
    getTicketById,
    updateTicket,
    updateTicketStatus,
    assignTicketToSelf,
    reassignTicket,
    addCommentToTicket,
    deleteTicket,
    getTicketCategories,
    getDepartments,
    getTicketComments
};