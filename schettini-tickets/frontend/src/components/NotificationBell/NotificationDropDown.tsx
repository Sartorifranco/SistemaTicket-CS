import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { formatLocalDate } from '../../utils/dateFormatter';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();
    const { markNotificationAsRead, fetchNotifications: fetchUnreadCount } = useNotification();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotificationsData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await api.get('/api/notifications');
            setNotifications(response.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isOpen) fetchNotificationsData();
    }, [isOpen, fetchNotificationsData]);

    const handleMarkAsRead = async (id: number) => {
        await markNotificationAsRead(id);
        fetchNotificationsData();
        fetchUnreadCount();
    };

    // ✅ FUNCIÓN DE LIMPIEZA: Quita el separador ||| para la vista de lista
    const formatMessage = (msg: string) => {
        if (msg.includes('|||')) {
            const [title, body] = msg.split('|||');
            return (
                <span>
                    <strong className="block text-gray-900 dark:text-gray-100">{title}</strong>
                    {body}
                </span>
            );
        }
        return msg;
    };

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
                        <div key={notification.id} className={`flex items-start justify-between px-4 py-3 border-b border-gray-100 ${!notification.is_read ? 'bg-red-50' : ''}`}>
                            <div className="flex-1 pr-2">
                                <div className="text-sm text-gray-700 leading-snug">
                                    {formatMessage(notification.message)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatLocalDate(notification.created_at)}
                                </p>
                            </div>
                            {!notification.is_read && (
                                <button onClick={() => handleMarkAsRead(notification.id)} className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                    Leída
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="px-4 py-2 border-t border-gray-200">
                <button onClick={onClose} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-md">
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;