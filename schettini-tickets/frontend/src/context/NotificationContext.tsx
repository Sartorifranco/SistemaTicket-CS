import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { Notification } from '../types';
import { SocketInstance } from '../App';
import { useAuth } from './AuthContext'; // ✅ IMPORTANTE: Para verificar sesión

const NOTIFICATION_SOUND = '/assets/sounds/notification.mp3';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    
    // ✅ Funciones de Mute
    toggleMuteUser: (userId: number) => void;
    isUserMuted: (userId: number) => boolean;

    fetchNotifications: () => void;
    markNotificationAsRead: (id: number) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
    addNotification: (message: string, type: 'success'|'error'|'info'|'warning') => void;
    socket: SocketInstance | null;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification debe usarse dentro de NotificationProvider');
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode; socket: SocketInstance | null }> = ({ children, socket }) => {
    // ✅ 1. OBTENER ESTADO DE AUTENTICACIÓN
    const { user, token, isAuthenticated } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // ✅ Estado de usuarios silenciados (Persistente)
    const [mutedUsers, setMutedUsers] = useState<number[]>(() => {
        const saved = localStorage.getItem('muted_chat_users');
        return saved ? JSON.parse(saved) : [];
    });

    const toggleMuteUser = (userId: number) => {
        setMutedUsers(prev => {
            const newMuted = prev.includes(userId) 
                ? prev.filter(id => id !== userId) // Quitar
                : [...prev, userId]; // Agregar
            
            localStorage.setItem('muted_chat_users', JSON.stringify(newMuted));
            return newMuted;
        });
    };

    const isUserMuted = (userId: number) => mutedUsers.includes(userId);

    const playSound = () => {
        const audio = new Audio(NOTIFICATION_SOUND);
        audio.play().catch(err => console.log("Audio bloqueado:", err));
    };

    // ✅ 2. FETCH PROTEGIDO (Solución al error 401)
    const fetchNotifications = useCallback(async () => {
        // Si no hay sesión válida, NO llamamos a la API
        if (!token || !isAuthenticated || !user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        try {
            const res = await api.get('/api/notifications');
            if(res.data && Array.isArray(res.data.data)) {
                setNotifications(res.data.data);
                const count = res.data.data.filter((n: Notification) => !n.is_read).length;
                setUnreadCount(count);
            }
        } catch (error) { 
            console.error("Error fetching notifications:", error); 
        }
    }, [token, isAuthenticated, user]);

    // ✅ 3. SOCKET LISTENERS (Protegidos)
    useEffect(() => {
        if (!isAuthenticated || !socket) return;

        // Casting a any para evitar error TS
        (socket as any).onAny((event: string, ...args: any[]) => console.log(`📡 ${event}`, args));

        socket.on('notification', (newNotification: Notification) => {
            playSound();
            
            let msg = newNotification.message;
            if(msg && msg.includes('|||')) msg = msg.split('|||')[1];
            toast.info(`🔔 ${msg}`, { position: "top-right", autoClose: 5000 });
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            socket?.off('notification');
            if(socket && (socket as any).offAny) (socket as any).offAny();
        };
    }, [socket, mutedUsers, isAuthenticated]); // Se ejecuta cuando cambia auth o mute

    useEffect(() => { 
        fetchNotifications(); 
    }, [fetchNotifications]);

    // Helpers
    const markNotificationAsRead = async (id: number) => { 
        try{ await api.put(`/api/notifications/${id}/read`); setNotifications(prev=>prev.map(n=>n.id===id?{...n,is_read:true}:n)); setUnreadCount(p=>Math.max(0,p-1)); }catch(e){} 
    };
    
    const markAllNotificationsAsRead = async () => { 
        try{ 
            // Usualmente es mejor un endpoint especifico como /read-all, ajusta si tu backend es diferente
            await api.put('/api/notifications/read-all'); 
            setNotifications(prev=>prev.map(n=>({...n,is_read:true}))); 
            setUnreadCount(0); 
        }catch(e){} 
    };

    const deleteNotification = async (id: number) => { 
        try{ await api.delete(`/api/notifications/${id}`); setNotifications(prev=>prev.filter(n=>n.id!==id)); }catch(e){} 
    };

    const addNotification = (message: string, type: 'success'|'error'|'info'|'warning') => { 
        if(type==='success') toast.success(message); 
        else if(type==='error') toast.error(message); 
        else toast.info(message); 
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            toggleMuteUser,
            isUserMuted,
            fetchNotifications,
            markNotificationAsRead,
            markAllNotificationsAsRead,
            deleteNotification,
            addNotification,
            socket
        }}>
            {children}
        </NotificationContext.Provider>
    );
};