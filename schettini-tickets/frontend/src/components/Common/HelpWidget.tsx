import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axiosConfig';
import { FaCommentDots, FaVideo, FaDownload, FaTimes, FaPaperPlane, FaChevronLeft, FaHeadset, FaQuestion, FaBook, FaLink, FaFileAlt, FaCheckCircle } from 'react-icons/fa';
import io from 'socket.io-client';

const NOTIFICATION_SOUND = '/assets/sounds/notification.mp3';

interface Message {
    id: number;
    sender_role: 'client' | 'agent' | 'admin';
    message: string;
    created_at: string;
}

interface Resource {
    id: number;
    title: string;
    type: 'video' | 'article' | 'link' | 'download';
    content: string;
    category: string;
}

const HelpWidget: React.FC = () => {
    const { user, token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'home' | 'chat'>('home');
    const [unreadCount, setUnreadCount] = useState(0);
    
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [socket, setSocket] = useState<any>(null);

    const [resources, setResources] = useState<Resource[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    const playSound = () => {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.play().catch(e => console.log("Audio block (browser policy)"));
    };

    // --- SOCKETS ---
    useEffect(() => {
        if (token) {
            const currentHost = window.location.hostname;
            const newSocket = io(`http://${currentHost}:5050`, { auth: { token } });
            setSocket(newSocket);

            newSocket.on('support_message_received', (msg: Message) => {
                if (msg.sender_role !== 'client') { 
                    setMessages(prev => [...prev, msg]);
                    if (!isOpen || view !== 'chat') {
                        setUnreadCount(prev => prev + 1);
                        playSound();
                    }
                }
            });
            return () => { newSocket.disconnect(); };
        }
    }, [token, isOpen, view]);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, view, isOpen]);

    // Limpiar badge al ver el chat
    useEffect(() => {
        if (isOpen && view === 'chat') setUnreadCount(0);
    }, [isOpen, view]);

    // Cargar Chat
    const handleOpenChat = async () => {
        setView('chat');
        setUnreadCount(0);
        setLoadingChat(true);
        try {
            const res = await api.get('/api/chat');
            setMessages(res.data.data);
        } catch (error) { console.error(error); } finally { setLoadingChat(false); }
    };

    // Cargar Recursos
    useEffect(() => {
        const fetchResources = async () => {
            setLoadingResources(true);
            try {
                const res = await api.get('/api/resources');
                setResources(res.data.data);
            } catch (error) { console.error(error); } finally { setLoadingResources(false); }
        };
        if (isOpen && view === 'home') fetchResources();
    }, [isOpen, view]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const tempMsg = newMessage;
        setNewMessage(''); 
        try {
            const res = await api.post('/api/chat', { message: tempMsg });
            setMessages(prev => [...prev, res.data.data]);
        } catch (error) { console.error(error); }
    };

    // ✅ FUNCIÓN PARA FINALIZAR CHAT
    const handleFinishChat = async () => {
        if (!window.confirm("¿Deseas finalizar esta conversación? El historial se archivará.")) return;
        
        try {
            await api.post('/api/chat/close');
            setMessages([]); // Limpiar vista local
            setView('home'); // Volver al menú
            setUnreadCount(0);
        } catch (error) {
            console.error("Error al finalizar chat", error);
        }
    };

    const getResourceLink = (content: string) => content.startsWith('/') ? `http://${window.location.hostname}:5050${content}` : content;
    
    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'video': return <div className="bg-purple-100 text-purple-600 p-2 rounded-md"><FaVideo /></div>;
            case 'download': return <div className="bg-red-100 text-red-600 p-2 rounded-md"><FaDownload /></div>;
            case 'article': return <div className="bg-green-100 text-green-600 p-2 rounded-md"><FaFileAlt /></div>;
            default: return <div className="bg-blue-100 text-blue-600 p-2 rounded-md"><FaLink /></div>;
        }
    };

    const isPlanFree = user?.plan_name?.toLowerCase().includes('free') || !user?.plan_name;

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            
            {isOpen && (
                <div className="bg-white w-80 md:w-96 rounded-2xl shadow-2xl border border-gray-200 mb-4 overflow-hidden flex flex-col animate-fade-in-up transition-all" style={{ height: '550px' }}>
                    
                    {/* CABECERA (flex-shrink-0 EVITA QUE SE ENCOJA) */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white flex justify-between items-center shadow-md z-10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full cursor-pointer hover:bg-white/30 transition">
                                {view === 'home' ? <FaHeadset size={20}/> : <button onClick={() => setView('home')}><FaChevronLeft size={20}/></button>}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">Hola {user.username} 👋</h3>
                                <p className="text-xs text-orange-100 opacity-90 font-medium">
                                    {view === 'home' ? 'Centro de Ayuda' : 'Chat en Vivo'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* ✅ BOTÓN CHECK PARA FINALIZAR */}
                            {view === 'chat' && (
                                <button onClick={handleFinishChat} className="text-white/80 hover:text-white bg-white/10 p-1.5 rounded-full hover:bg-white/20 transition" title="Finalizar conversación">
                                    <FaCheckCircle size={18}/>
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition"><FaTimes size={18}/></button>
                        </div>
                    </div>

                    {/* VISTA HOME */}
                    {view === 'home' && (
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-5 text-center">
                                <p className="text-gray-600 text-sm mb-3 font-medium">¿Necesitas asistencia técnica?</p>
                                <button onClick={handleOpenChat} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2 shadow-md relative">
                                    <FaCommentDots /> Hablar con un Agente
                                    {unreadCount > 0 && <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 w-3 h-3 rounded-full animate-ping"></span>}
                                </button>
                                {isPlanFree && <p className="text-[10px] text-gray-500 mt-2 bg-yellow-50 p-1.5 rounded border border-yellow-100">⏱️ Demora estimada: 24hs (Plan Free)</p>}
                            </div>
                            
                            {/* LINKS FIJOS (TeamViewer / AnyDesk) */}
                            <div className="space-y-2 mb-4">
                                <p className="text-xs font-bold text-gray-400 uppercase ml-1">Herramientas</p>
                                <a href="https://download.teamviewer.com/download/TeamViewer_Setup.exe" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition">
                                    <div className="bg-blue-100 text-blue-600 p-2 rounded-md"><FaDownload /></div>
                                    <div className="text-sm font-medium text-gray-700">Descargar TeamViewer</div>
                                </a>
                                <a href="https://anydesk.com/es/downloads" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition">
                                    <div className="bg-red-100 text-red-600 p-2 rounded-md"><FaDownload /></div>
                                    <div className="text-sm font-medium text-gray-700">Descargar AnyDesk</div>
                                </a>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase ml-1 tracking-wider">Recursos y Tutoriales</p>
                                {loadingResources ? <p className="text-center text-xs text-gray-400 py-4">Cargando...</p> : 
                                    resources.length === 0 ? <p className="text-center text-xs text-gray-400 py-4">No hay recursos.</p> :
                                    resources.slice(0, 5).map((res) => (
                                        <a key={res.id} href={getResourceLink(res.content)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition group text-left cursor-pointer">
                                            {getResourceIcon(res.type)}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-gray-700 group-hover:text-orange-600 truncate">{res.title}</div>
                                                <div className="text-[10px] text-gray-400">{res.category}</div>
                                            </div>
                                        </a>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* VISTA CHAT (ESTRUCTURA CORREGIDA PARA INPUT VISIBLE) */}
                    {view === 'chat' && (
                        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
                            
                            {/* AREA MENSAJES (OCUPA TODO EL ESPACIO RESTANTE) */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 min-h-0">
                                {loadingChat && <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div></div>}
                                
                                {messages.length === 0 && !loadingChat && (
                                    <div className="text-center mt-12 opacity-60">
                                        <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-4"><FaCommentDots size={40} /></div>
                                        <p className="text-gray-600 font-medium">¡Bienvenido!</p>
                                        <p className="text-gray-400 text-sm mt-1">Escribe tu consulta.</p>
                                    </div>
                                )}

                                {messages.map((msg) => {
                                    const isMe = msg.sender_role === 'client';
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                                                <p className="leading-relaxed">{msg.message}</p>
                                                <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* INPUT (FLEX-SHRINK-0 PARA QUE NO DESAPAREZCA) */}
                            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center flex-shrink-0 z-20">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none text-sm transition-all" />
                                <button type="submit" className={`p-3 rounded-full text-white shadow-md transition-all ${newMessage.trim() ? 'bg-orange-500 hover:bg-orange-600 transform hover:scale-105' : 'bg-gray-300 cursor-not-allowed'}`} disabled={!newMessage.trim()}><FaPaperPlane size={16} /></button>
                            </form>
                        </div>
                    )}

                    {/* Footer Nav solo en Home */}
                    {view === 'home' && (
                        <div className="bg-white p-3 border-t border-gray-200 flex justify-around text-xs text-gray-500 flex-shrink-0">
                            <button className="flex flex-col items-center text-orange-600 font-bold transition"><FaHeadset size={20} className="mb-1"/> Inicio</button>
                            <button onClick={handleOpenChat} className="flex flex-col items-center hover:text-orange-600 transition relative">
                                <FaCommentDots size={20} className="mb-1"/> Chat
                                {unreadCount > 0 && <span className="absolute top-0 right-3 bg-red-500 w-2 h-2 rounded-full animate-pulse"></span>}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* BOTÓN FLOTANTE */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center z-[9999] relative"
                style={{ width: '64px', height: '64px' }}
            >
                {isOpen ? <FaTimes size={28}/> : <FaQuestion size={28}/>}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-md">
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default HelpWidget;