const pool = require('../config/db');

// --- CLIENTE: Obtener mi historial ACTIVO (No archivado) ---
const getMyChat = async (req, res) => {
    try {
        const userId = req.user.id;
        // Solo trae mensajes que NO han sido finalizados
        const [messages] = await pool.query(
            'SELECT * FROM support_messages WHERE user_id = ? AND is_archived = 0 ORDER BY created_at ASC',
            [userId]
        );
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error("Error en getMyChat:", error);
        res.status(500).json({ success: false, message: 'Error al cargar chat' });
    }
};

// --- CLIENTE: Finalizar/Archivar Su Propio Chat ---
const closeChat = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await pool.query(
            'UPDATE support_messages SET is_archived = 1 WHERE user_id = ?',
            [userId]
        );
        
        if (req.io) {
            req.io.to('admin').to('agent').emit('dashboard_update', { message: `El cliente ${req.user.username} ha finalizado su chat.` });
            
            // Avisar a admins que este chat específico se cerró
            req.io.to('admin').to('agent').emit('chat_closed', { 
                userId: userId, 
                username: req.user.username,
                message: "⚠️ El cliente ha finalizado esta conversación."
            });
        }

        res.json({ success: true, message: 'Chat finalizado correctamente' });
    } catch (error) {
        console.error("Error en closeChat:", error);
        res.status(500).json({ success: false, message: 'Error al finalizar chat' });
    }
};

// --- ADMIN: Cerrar el chat de un cliente específico ---
const closeClientChat = async (req, res) => {
    try {
        const { userId } = req.body; 
        const adminName = req.user.username;

        if (!userId) return res.status(400).json({ message: 'Falta el ID del cliente' });

        // 1. Archivar mensajes de ese usuario
        await pool.query(
            'UPDATE support_messages SET is_archived = 1 WHERE user_id = ?',
            [userId]
        );

        // 2. Notificar al Cliente y a otros Admins
        if (req.io) {
            // Al cliente
            req.io.to(`user-${userId}`).emit('chat_closed', {
                userId: userId,
                message: `El agente ${adminName} ha finalizado la conversación.`
            });

            // A otros admins
            req.io.to('admin').to('agent').emit('chat_closed', {
                userId: userId,
                message: `El agente ${adminName} ha cerrado este chat.`
            });
        }

        res.json({ success: true, message: 'Chat finalizado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al cerrar chat' });
    }
};

// --- ADMIN/AGENT: Obtener lista de conversaciones ---
const getAllConversations = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.username, u.email, u.company_id,
                (SELECT message FROM support_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM support_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                (SELECT COUNT(*) FROM support_messages WHERE user_id = u.id AND sender_role = 'client' AND is_read = 0) as unread_count
            FROM Users u
            WHERE EXISTS (SELECT 1 FROM support_messages WHERE user_id = u.id)
            ORDER BY last_message_time DESC
        `;
        const [users] = await pool.query(query);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error("Error en getAllConversations:", error);
        res.status(500).json({ success: false, message: 'Error al obtener conversaciones' });
    }
};

// --- ADMIN/AGENT: Obtener chat de un usuario específico ---
const getChatByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        
        await pool.query(
            "UPDATE support_messages SET is_read = 1 WHERE user_id = ? AND sender_role = 'client'",
            [userId]
        );

        // El admin ve TODO (incluso archivados para contexto)
        const [messages] = await pool.query(
            'SELECT * FROM support_messages WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error("Error en getChatByUserId:", error);
        res.status(500).json({ success: false, message: 'Error al cargar conversación' });
    }
};

// --- GENERAL: Enviar mensaje ---
const sendMessage = async (req, res) => {
    try {
        const { message, targetUserId } = req.body; 
        const senderId = req.user.id;
        const role = req.user.role; 

        if (!message) return res.status(400).json({ message: 'El mensaje no puede estar vacío' });

        let chatOwnerId = senderId; 

        // Lógica Admin/Agent
        if (role === 'admin' || role === 'agent') {
            if (targetUserId) {
                chatOwnerId = targetUserId;
            } else {
                chatOwnerId = senderId; // Auto-chat pruebas
            }
        }

        // Insertar mensaje y des-archivar (is_archived = 0) para reactivar la charla
        const [result] = await pool.query(
            'INSERT INTO support_messages (user_id, sender_role, message, is_read, is_archived) VALUES (?, ?, ?, ?, 0)',
            [chatOwnerId, role, message, role === 'client' ? 0 : 1] 
        );

        const newMessage = {
            id: result.insertId,
            user_id: chatOwnerId,
            sender_role: role,
            message,
            created_at: new Date()
        };

        if (req.io) {
            if (chatOwnerId === senderId) {
                req.io.to('admin').to('agent').emit('support_message_received', { 
                    ...newMessage, 
                    username: req.user.username 
                });
            } else {
                req.io.to(`user-${chatOwnerId}`).emit('support_message_received', newMessage);
            }
        }

        res.json({ success: true, data: newMessage });
    } catch (error) {
        console.error("Error en sendMessage:", error);
        res.status(500).json({ success: false, message: 'Error al enviar mensaje' });
    }
};

module.exports = { 
    getMyChat, 
    getAllConversations, 
    getChatByUserId, 
    sendMessage, 
    closeChat, 
    closeClientChat 
};