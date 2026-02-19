const pool = require('../config/db');

/**
 * Obtener tareas:
 * - Si assignedToMe=true (agente/supervisor): solo las asignadas al usuario
 * - Si es admin/supervisor sin filtro: puede ver todas o filtrar por assigned_to
 * - Admin puede ver todas; Supervisor puede ver las que asignó o las asignadas a su equipo
 */
const getTasks = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }
        const { assignedToMe, assigned_to, status, from_date, to_date } = req.query;
        const userId = req.user.id;
        const role = req.user.role;

        let sql = `
            SELECT t.*, 
                assignee.username as assignee_username, 
                assignee.username as assignee_name,
                assigner.username as assigner_username,
                assigner.username as assigner_name,
                assignee.role as assignee_role
            FROM agent_tasks t
            LEFT JOIN Users assignee ON t.assigned_to_user_id = assignee.id
            LEFT JOIN Users assigner ON t.assigned_by_user_id = assigner.id
            WHERE 1=1
        `;
        const params = [];

        // Agente: solo sus tareas
        if (role === 'agent' || assignedToMe === 'true') {
            sql += ' AND t.assigned_to_user_id = ?';
            params.push(userId);
        }
        // Admin/Supervisor filtrando por asignado
        else if (assigned_to) {
            sql += ' AND t.assigned_to_user_id = ?';
            params.push(assigned_to);
        }
        // Supervisor sin filtro: ve tareas que asignó + tareas asignadas a él
        else if (role === 'supervisor') {
            sql += ' AND (t.assigned_by_user_id = ? OR t.assigned_to_user_id = ?)';
            params.push(userId, userId);
        }
        // Admin sin filtro: ve todas (no agregamos WHERE extra)

        if (status) {
            sql += ' AND t.status = ?';
            params.push(status);
        }
        if (from_date) {
            sql += ' AND (t.due_date >= ? OR t.due_date IS NULL)';
            params.push(from_date);
        }
        if (to_date) {
            sql += ' AND (t.due_date <= ? OR t.due_date IS NULL)';
            params.push(to_date);
        }

        sql += ' ORDER BY t.due_date ASC, t.created_at DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getTasks error:', error.message);
        // Si la tabla no existe, devolver array vacío (migración pendiente)
        if (error.message && error.message.includes("doesn't exist")) {
            return res.json({ success: true, data: [] });
        }
        res.status(500).json({ success: false, message: 'Error al obtener tareas' });
    }
};

/**
 * Crear tarea. Admin puede asignar a supervisor o agente. Supervisor solo a agentes.
 */
const createTask = async (req, res) => {
    try {
        const { title, description, assigned_to_user_id, due_date, due_time, priority } = req.body;
        const assignerId = req.user.id;
        const role = req.user.role;

        if (!title || !assigned_to_user_id) {
            return res.status(400).json({ message: 'Título y responsable son obligatorios' });
        }

        // Validar que el asignador puede asignar al destinatario
        const [targetUser] = await pool.query('SELECT role FROM Users WHERE id = ? AND status = ?', [assigned_to_user_id, 'active']);
        if (targetUser.length === 0) {
            return res.status(404).json({ message: 'Usuario asignado no encontrado' });
        }
        const targetRole = targetUser[0].role;

        if (role === 'supervisor') {
            if (targetRole === 'admin') {
                return res.status(403).json({ message: 'El supervisor no puede asignar tareas al administrador.' });
            }
            // Supervisor puede asignar a agentes y a otros supervisores
        }
        if (role === 'agent') {
            return res.status(403).json({ message: 'Los agentes no pueden crear tareas.' });
        }

        await pool.query(
            `INSERT INTO agent_tasks (title, description, assigned_to_user_id, assigned_by_user_id, due_date, due_time, priority)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description || null, assigned_to_user_id, assignerId, due_date || null, due_time || null, priority || 'medium']
        );
        res.json({ success: true, message: 'Tarea creada correctamente' });
    } catch (error) {
        console.error('createTask error:', error);
        res.status(500).json({ success: false, message: 'Error al crear tarea' });
    }
};

/**
 * Actualizar tarea (estado, etc.)
 * - El asignado puede marcar completada o cambiar estado
 * - El asignador (admin/supervisor) puede editar todo
 */
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, due_date, due_time, priority } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        const [task] = await pool.query('SELECT * FROM agent_tasks WHERE id = ?', [id]);
        if (task.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
        const t = task[0];

        const isAssignedTo = t.assigned_to_user_id === userId;
        const isAssigner = t.assigned_by_user_id === userId;
        const isAdmin = role === 'admin';
        const fullEdit = isAdmin || isAssigner;

        // El asignado solo puede cambiar el estado (marcar completada, etc.)
        if (!fullEdit && isAssignedTo && status !== undefined) {
            const allowedStatuses = ['pending', 'in_progress', 'completed'];
            if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Estado no válido' });
            await pool.query(
                'UPDATE agent_tasks SET status = ?, completed_at = ? WHERE id = ? AND assigned_to_user_id = ?',
                [status, status === 'completed' ? new Date() : null, id, userId]
            );
            return res.json({ success: true, message: 'Tarea actualizada' });
        }
        if (!fullEdit) {
            return res.status(403).json({ message: 'No tienes permiso para editar esta tarea' });
        }

        const updates = [];
        const values = [];
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (status === 'completed') { updates.push('completed_at = NOW()'); }
        if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
        if (due_time !== undefined) { updates.push('due_time = ?'); values.push(due_time); }
        if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }

        if (updates.length === 0) return res.status(400).json({ message: 'No hay campos para actualizar' });

        values.push(id);
        await pool.query(`UPDATE agent_tasks SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, message: 'Tarea actualizada' });
    } catch (error) {
        console.error('updateTask error:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar tarea' });
    }
};

const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const [task] = await pool.query('SELECT assigned_by_user_id FROM agent_tasks WHERE id = ?', [id]);
        if (task.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });

        const canDelete = task[0].assigned_by_user_id === userId || role === 'admin';
        if (!canDelete) return res.status(403).json({ message: 'No puedes eliminar esta tarea' });

        await pool.query('DELETE FROM agent_tasks WHERE id = ?', [id]);
        res.json({ success: true, message: 'Tarea eliminada' });
    } catch (error) {
        console.error('deleteTask error:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar tarea' });
    }
};

/**
 * Obtener usuarios asignables: Admin ve todos (supervisor+agente), Supervisor solo agentes
 */
const getAssignableUsers = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'No autenticado' });
        const role = req.user.role;
        let sql = `SELECT id, username, email, username as full_name, role FROM Users 
            WHERE status = 'active' AND role IN (`;
        if (role === 'admin') {
            sql += `'supervisor','agent') ORDER BY username ASC`;
        } else if (role === 'supervisor') {
            sql += `'agent') ORDER BY username ASC`;
        } else {
            return res.status(403).json({ success: false, message: 'Sin permiso' });
        }

        const [rows] = await pool.query(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getAssignableUsers error:', error.message);
        res.status(500).json({ success: false, message: 'Error' });
    }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, getAssignableUsers };
