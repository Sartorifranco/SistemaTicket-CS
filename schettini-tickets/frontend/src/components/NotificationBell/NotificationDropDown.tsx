import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { format } from 'date-fns';
import { formatLocalDate } from '../../utils/dateFormatter'; // Using the centralized date formatter

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();
    const { addNotification, markNotificationAsRead, fetchNotifications: fetchUnreadNotificationsCount } = useNotification();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotificationsData = useCallback(async () => {
        if (!token) {
            setNotifications([]);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get('/api/notifications');
            setNotifications(response.data.data || []);
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) 
                ? (err.response?.data as ApiResponseError)?.message || 'Error desconocido' 
                : 'Error inesperado.';
            addNotification(`Error al cargar notificaciones: ${message}`, 'error');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (isOpen) {
            fetchNotificationsData();
        }
    }, [isOpen, fetchNotificationsData]);

    const handleMarkAsRead = useCallback(async (notificationId: number) => {
        await markNotificationAsRead(notificationId);
        fetchNotificationsData();
        fetchUnreadNotificationsCount();
    }, [markNotificationAsRead, fetchNotificationsData, fetchUnreadNotificationsCount]);

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-200">
            <div className="px-4 py-2 text-lg font-semibold text-gray-800 border-b border-gray-200">
                Notificaciones
            </div>
            {loading ? (
                <div className="text-center py-4 text-gray-600">Cargando...</div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-4 text-gray-600">No hay notificaciones.</div>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0
                                ${!notification.is_read ? 'bg-red-50 font-medium' : 'text-gray-600'}
                                hover:bg-gray-100 transition-colors duration-150
                            `}
                        >
                            <div className="flex-1 pr-2">
                                <p className="text-sm leading-snug">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatLocalDate(notification.created_at)}
                                </p>
                            </div>
                            {!notification.is_read && (
                                <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-full"
                                    title="Marcar como leída"
                                >
                                    Leída
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="px-4 py-2 border-t border-gray-200">
                <button
                    onClick={onClose}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-md"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;