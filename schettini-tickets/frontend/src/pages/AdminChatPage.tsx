import React, { useState, useEffect, useRef } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { FaUserCircle, FaPaperPlane, FaSearch, FaCircle } from 'react-icons/fa';

interface Conversation {
    id: number;
    username: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
}

interface Message {
    id: number;
    sender_role: 'client' | 'admin' | 'agent';
    message: string;
    created_at: string;
}

const AdminChatPage: React.FC = () => {
    const { token } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [socket, setSocket] = useState<any>(null);

    // Conectar Socket
    useEffect(() => {
        if (token) {
            const currentHost = window.location.hostname;
            const newSocket = io(`http://${currentHost}:5050`, { auth: { token } });
            setSocket(newSocket);

            newSocket.on('support_message_received', (msg: any) => {
                // Actualizar lista de conversaciones (mover arriba, etc.)
                fetchConversations();
                
                // Si tengo el chat abierto con ese usuario, agregar el mensaje
                if (selectedUser && msg.user_id === selectedUser.id) {
                    setMessages(prev => [...prev, msg]);
                }
            });

            return () => { newSocket.disconnect(); };
        }
    }, [token, selectedUser]); // Dependencia selectedUser para refrescar lógica socket

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser.id);
        }
    }, [selectedUser]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/api/chat/conversations');
            setConversations(res.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchMessages = async (userId: number) => {
        try {
            const res = await api.get(`/api/chat/${userId}`);
            setMessages(res.data.data);
            // Al abrir, reseteamos el contador visual localmente
            setConversations(prev => prev.map(c => c.id === userId ? { ...c, unread_count: 0 } : c));
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
            fetchConversations(); // Actualizar último mensaje en sidebar
        } catch (error) { console.error(error); }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* SIDEBAR LISTA DE USUARIOS */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Chats Activos</h2>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input type="text" placeholder="Buscar cliente..." className="w-full pl-9 p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-indigo-500 text-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.map(conv => (
                        <div 
                            key={conv.id}
                            onClick={() => setSelectedUser(conv)}
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition flex items-center justify-between ${selectedUser?.id === conv.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-gray-300 text-gray-600 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                                    <FaUserCircle size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-gray-800 truncate">{conv.username}</h4>
                                    <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[10px] text-gray-400 mb-1">
                                    {new Date(conv.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                                {conv.unread_count > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AREA DE CHAT */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedUser ? (
                    <>
                        {/* HEADER CHAT */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3 shadow-sm">
                            <FaUserCircle size={32} className="text-gray-400" />
                            <div>
                                <h3 className="font-bold text-gray-800">{selectedUser.username}</h3>
                                <span className="text-xs text-green-600 flex items-center gap-1"><FaCircle size={8}/> En línea (Simulado)</span>
                            </div>
                        </div>

                        {/* MENSAJES */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                            {messages.map((msg) => {
                                const isMe = msg.sender_role !== 'client'; // Si no es cliente, soy yo (admin/agent)
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-4 rounded-xl shadow-sm relative ${
                                            isMe 
                                            ? 'bg-indigo-600 text-white rounded-br-none' 
                                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                        }`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <span className={`text-[10px] block mt-2 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isMe && <span className="ml-1">✓</span>}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* INPUT */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe una respuesta..." 
                                    className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                />
                                <button type="submit" className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition shadow-md">
                                    <FaPaperPlane />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FaUserCircle size={64} className="mb-4 opacity-20" />
                        <p className="text-lg">Selecciona un chat para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatPage;