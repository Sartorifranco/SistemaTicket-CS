import React, { useState, useEffect, useRef } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import io from 'socket.io-client';
import { FaUserCircle, FaPaperPlane, FaSearch, FaCircle, FaExclamationTriangle, FaBell, FaBellSlash, FaCheckCircle } from 'react-icons/fa';

interface Conversation {
    id: number;
    username: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
}

interface Message {
    id: number;
    sender_role: 'client' | 'admin' | 'agent' | 'system';
    message: string;
    created_at: string;
    is_archived?: number; // ✅ AGREGADO: Para detectar si el chat está cerrado
}

const AdminChatPage: React.FC = () => {
    const { token } = useAuth();
    const { setUnreadChatCount, toggleMuteUser, isUserMuted } = useNotification(); 
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [socket, setSocket] = useState<any>(null);
    const [isCurrentChatClosed, setIsCurrentChatClosed] = useState(false);

    useEffect(() => {
        setUnreadChatCount(0);
    }, [setUnreadChatCount]);

    useEffect(() => {
        setIsCurrentChatClosed(false);
        if (selectedUser) fetchMessages(selectedUser.id);
    }, [selectedUser]);

    useEffect(() => {
        if (token) {
            const currentHost = window.location.hostname;
            const newSocket = io(`http://${currentHost}:5050`, { auth: { token } });
            setSocket(newSocket);

            newSocket.on('support_message_received', (msg: any) => {
                fetchConversations();
                if (selectedUser && msg.user_id === selectedUser.id) {
                    setMessages(prev => [...prev, msg]);
                    // Si el cliente escribe, el chat se reactiva
                    if (msg.sender_role === 'client') setIsCurrentChatClosed(false);
                }
            });

            newSocket.on('chat_closed', (data: any) => {
                if (selectedUser && selectedUser.id === data.userId) {
                    setIsCurrentChatClosed(true);
                    setMessages(prev => [...prev, {
                        id: Date.now(),
                        sender_role: 'system',
                        message: data.message,
                        created_at: new Date().toISOString(),
                        is_archived: 1
                    }]);
                }
            });

            return () => { newSocket.disconnect(); };
        }
    }, [token, selectedUser]);

    useEffect(() => { fetchConversations(); }, []);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/api/chat/conversations');
            setConversations(res.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchMessages = async (userId: number) => {
        try {
            const res = await api.get(`/api/chat/${userId}`);
            const msgs: Message[] = res.data.data;
            setMessages(msgs);
            setConversations(prev => prev.map(c => c.id === userId ? { ...c, unread_count: 0 } : c));
            
            // ✅ CORRECCIÓN CLAVE: Verificar el estado del último mensaje
            if (msgs.length > 0) {
                const lastMsg = msgs[msgs.length - 1];
                // Si el último mensaje está archivado, el chat se considera cerrado visualmente
                if (lastMsg.is_archived === 1) {
                    setIsCurrentChatClosed(true);
                } else {
                    setIsCurrentChatClosed(false);
                }
            } else {
                setIsCurrentChatClosed(false);
            }

        } catch (error) { console.error(error); }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            const res = await api.post('/api/chat', { 
                message: newMessage, 
                targetUserId: selectedUser.id 
            });
            setMessages([...messages, res.data.data]);
            setNewMessage('');
            // Al enviar un mensaje, se reactiva el chat
            setIsCurrentChatClosed(false);
            fetchConversations();
        } catch (error) { console.error(error); }
    };

    // ADMIN CIERRA CHAT
    const handleAdminCloseChat = async () => {
        if (!selectedUser) return;
        if (!window.confirm(`¿Finalizar conversación con ${selectedUser.username}?`)) return;

        try {
            await api.post('/api/chat/admin/close', { userId: selectedUser.id });
            // Agregamos mensaje localmente para feedback inmediato
            const sysMsg: Message = {
                id: Date.now(),
                sender_role: 'system',
                message: "Has finalizado esta conversación.",
                created_at: new Date().toISOString(),
                is_archived: 1
            };
            setMessages(prev => [...prev, sysMsg]);
            setIsCurrentChatClosed(true);
        } catch (error) { console.error(error); alert("Error al cerrar chat"); }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* SIDEBAR */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Chats Activos</h2>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input type="text" placeholder="Buscar..." className="w-full pl-9 p-2 rounded-lg border border-gray-300 focus:outline-none text-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.map(conv => {
                        const muted = isUserMuted(conv.id);
                        return (
                            <div key={conv.id} onClick={() => setSelectedUser(conv)} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition flex items-center justify-between ${selectedUser?.id === conv.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-gray-300 text-gray-600 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 relative">
                                        <FaUserCircle size={24} />
                                        {muted && <FaBellSlash className="absolute -bottom-1 -right-1 text-gray-500 bg-white rounded-full text-xs p-0.5 border border-gray-200"/>}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-gray-800 truncate">{conv.username}</h4>
                                        <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] text-gray-400 mb-1">{new Date(conv.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    {conv.unread_count > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{conv.unread_count}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <FaUserCircle size={32} className="text-gray-400" />
                                <div>
                                    <h3 className="font-bold text-gray-800">{selectedUser.username}</h3>
                                    {isCurrentChatClosed ? (
                                        <span className="text-xs text-red-500 flex items-center gap-1 font-bold">● Finalizado</span>
                                    ) : (
                                        <span className="text-xs text-green-600 flex items-center gap-1"><FaCircle size={8}/> En línea</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleMuteUser(selectedUser.id)} className={`p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${isUserMuted(selectedUser.id) ? 'bg-gray-200 text-gray-600' : 'bg-white border text-gray-500 hover:text-indigo-600'}`} title="Silenciar">
                                    {isUserMuted(selectedUser.id) ? <FaBellSlash /> : <FaBell />}
                                </button>
                                {!isCurrentChatClosed && (
                                    <button onClick={handleAdminCloseChat} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-2 rounded-lg text-sm font-medium flex items-center gap-2" title="Finalizar">
                                        <FaCheckCircle /><span className="hidden md:inline">Finalizar</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                            {messages.map((msg) => {
                                if (msg.sender_role === 'system') {
                                    return <div key={msg.id} className="flex justify-center my-4"><div className="bg-gray-200 text-gray-600 text-xs px-4 py-1 rounded-full font-semibold flex items-center gap-2"><FaExclamationTriangle /> {msg.message}</div></div>;
                                }
                                const isMe = msg.sender_role !== 'client';
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-4 rounded-xl shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <span className={`text-[10px] block mt-2 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t border-gray-200">
                            {isCurrentChatClosed && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-center mb-2 text-red-600 text-xs font-semibold">
                                    Chat finalizado. Escribe para reabrir.
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className={`flex gap-2 ${isCurrentChatClosed ? 'opacity-70' : ''}`}>
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe una respuesta..." className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition" disabled={isCurrentChatClosed} />
                                <button type="submit" className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition shadow-md" disabled={isCurrentChatClosed}><FaPaperPlane /></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FaUserCircle size={64} className="mb-4 opacity-20" />
                        <p className="text-lg">Selecciona un chat</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatPage;