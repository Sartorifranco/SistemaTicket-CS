const pool = require('../config/db');

// --- CLIENTE: Obtener mi historial ---
const getMyChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const [messages] = await pool.query(
            'SELECT * FROM support_messages WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al cargar chat' });
    }
};

// --- ADMIN/AGENT: Obtener lista de conversaciones ---
const getAllConversations = async (req, res) => {
    try {
        // Obtener usuarios que tienen mensajes, con el último mensaje y contador de no leídos
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
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al obtener conversaciones' });
    }
};

// --- ADMIN/AGENT: Obtener chat de un usuario específico ---
const getChatByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Marcar como leídos los mensajes del cliente al abrir el chat
        await pool.query(
            "UPDATE support_messages SET is_read = 1 WHERE user_id = ? AND sender_role = 'client'",
            [userId]
        );

        const [messages] = await pool.query(
            'SELECT * FROM support_messages WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al cargar conversación' });
    }
};

// --- GENERAL: Enviar mensaje ---
const sendMessage = async (req, res) => {
    try {
        const { message, targetUserId } = req.body; // targetUserId es necesario si responde un Admin
        const senderId = req.user.id;
        const role = req.user.role; 

        let chatOwnerId = senderId; // Por defecto, el dueño del chat es quien envía (cliente)

        // Si es Admin/Agente, el dueño del chat es el usuario al que le escriben
        if (role === 'admin' || role === 'agent') {
            if (!targetUserId) return res.status(400).json({ message: 'Falta targetUserId' });
            chatOwnerId = targetUserId;
        }

        // Guardar en BD
        const [result] = await pool.query(
            'INSERT INTO support_messages (user_id, sender_role, message, is_read) VALUES (?, ?, ?, ?)',
            [chatOwnerId, role, message, role === 'client' ? 0 : 1] // Si escribe el cliente, no leído. Si escribe admin, ya se asume leído por el sistema.
        );

        const newMessage = {
            id: result.insertId,
            user_id: chatOwnerId,
            sender_role: role,
            message,
            created_at: new Date()
        };

        // Emitir Socket
        if (req.io) {
            // Si escribe el cliente -> Avisar a Admins
            if (role === 'client') {
                req.io.to('admin').to('agent').emit('support_message_received', { ...newMessage, username: req.user.username });
            } 
            // Si escribe Admin -> Avisar al Cliente específico
            else {
                req.io.to(`user-${chatOwnerId}`).emit('support_message_received', newMessage);
            }
        }

        res.json({ success: true, data: newMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar mensaje' });
    }
};

module.exports = { getMyChat, getAllConversations, getChatByUserId, sendMessage };