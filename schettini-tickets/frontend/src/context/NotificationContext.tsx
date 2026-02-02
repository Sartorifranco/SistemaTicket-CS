import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'react-toastify';
// 🛑 Importamos 'io' y el namespace completo para los tipos
import io, * as SocketIOClient from 'socket.io-client'; 
import api from '../config/axiosConfig'; 
import { useAuth } from './AuthContext'; 

// 1. DEFINICIÓN DE TIPOS CLAVE
interface Notification {
    id: number;
    user_id: number;
    message: string;
    type: string;
    related_id: number;
    related_type: string;
    is_read: boolean;
    created_at: string;
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface NotificationContextType {
    // ✅ CRÍTICO: Exponemos el socket aquí para que AdminDashboard lo pueda usar
    socket: SocketIOClient.Socket | null; 
    notifications: Notification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    markNotificationAsRead: (id: number) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
    deleteAllNotifications: () => Promise<void>;
    addNotification: (message: string, type: ToastType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 2. COMPONENTE PROVIDER
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]); 
    const [unreadCount, setUnreadCount] = useState<number>(0);
    // ✅ Usamos el tipo Socket explícitamente
    const [socket, setSocket] = useState<SocketIOClient.Socket | null>(null); 
    const { isAuthenticated, user } = useAuth(); 

    const addNotification = useCallback((message: string, type: ToastType) => {
        if (toast[type]) {
            (toast[type] as any)(message); 
        } else {
            toast.info(message); 
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (isAuthenticated) {
            try {
                const res = await api.get('/api/notifications');
                const data: Notification[] = res.data.data || []; 
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        }
    }, [isAuthenticated]);

    // --- Lógica de Conexión de Socket.IO ---
    useEffect(() => {
        if (isAuthenticated && user) {
            const token = localStorage.getItem('token'); 
            
            // ✅ CORRECCIÓN: Usar variable de entorno o localhost
            const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5050';
            
            console.log(`[Frontend Socket] Intentando conectar a: ${socketUrl}`);

            // ✅ Conexión al socket
            const newSocket: SocketIOClient.Socket = io(socketUrl, { 
                auth: {
                    token: token, 
                },
                transports: ['websocket', 'polling'], // Priorizar websocket
                reconnectionAttempts: 5
            });

            setSocket(newSocket); 

            newSocket.on("connect_error", (err: Error) => {
                console.error(`[Frontend Socket] Error de conexión: ${err.message}`);
            });
            
            newSocket.on('connect', () => {
                console.log(`[Frontend Socket] Conectado. ID: ${newSocket.id}`);
            });

            return () => {
                newSocket.disconnect();
                setSocket(null);
                console.log(`[Frontend Socket] Desconectado.`);
            };
        } else {
            // Si se desloguea, desconectar
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user]); 

    // --- Lógica de Escucha de Eventos (Real-time) ---
    useEffect(() => {
        if (socket) { 
            const handleNewNotification = (notification: Notification) => {
                toast.info(`🔔 ${notification.message}`);
                
                setNotifications((prev: Notification[]) => [notification, ...prev]); 
                setUnreadCount((prev) => prev + 1);
            };

            const handleDashboardUpdate = (data: { message: string }) => {
                console.log("Evento dashboard_update recibido:", data.message);
            };

            socket.on('new_notification', handleNewNotification);
            socket.on('dashboard_update', handleDashboardUpdate); 

            return () => {
                socket.off('new_notification', handleNewNotification);
                socket.off('dashboard_update', handleDashboardUpdate);
            };
        }
    }, [socket]); 

    // --- Polling y Carga Inicial ---
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchNotifications();

        // Polling cada 2 minutos como respaldo
        const intervalId = setInterval(() => {
            fetchNotifications();
        }, 120000); 

        return () => clearInterval(intervalId);
    }, [isAuthenticated, fetchNotifications]);

    // --- Funciones CRUD ---
    const markNotificationAsRead = useCallback(async (id: number) => {
        try {
            await api.put(`/api/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error(error);
        }
    }, [fetchNotifications]);

    const markAllNotificationsAsRead = useCallback(async () => {
        try {
            await api.put('/api/notifications');
            addNotification('Todas las notificaciones marcadas como leídas.', 'success');
            fetchNotifications();
        } catch (error) {
            addNotification('Error al marcar notificaciones.', 'error');
        }
    }, [fetchNotifications, addNotification]);

    const deleteNotification = useCallback(async (id: number) => {
        try {
            await api.delete(`/api/notifications/${id}`);
            addNotification('Notificación eliminada.', 'success');
            fetchNotifications();
        } catch (error) {
            addNotification('Error al eliminar notificación.', 'error');
        }
    }, [fetchNotifications, addNotification]);

    const deleteAllNotifications = useCallback(async () => {
        try {
            await api.delete('/api/notifications/delete-all');
            addNotification('Todas las notificaciones eliminadas.', 'success');
            fetchNotifications();
        } catch (error) {
            addNotification('Error al eliminar notificaciones.', 'error');
        }
    }, [fetchNotifications, addNotification]);

    // 3. OBJETO VALUE
    const value: NotificationContextType = { 
        socket, 
        notifications,
        unreadCount,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        deleteAllNotifications,
        addNotification,
    };

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// 4. HOOK CUSTOM
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationProvider; // Exportación por defecto opcional si se necesita