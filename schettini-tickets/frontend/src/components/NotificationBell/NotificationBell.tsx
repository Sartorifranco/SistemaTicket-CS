import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { FaBell } from 'react-icons/fa';

const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useNotification();
    const navigate = useNavigate();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.id) return; // Evitar error undefined

        if (!notification.is_read) {
            markNotificationAsRead(notification.id);
        }

        if (notification.related_type === 'ticket' && notification.related_id) {
            const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'agent' ? '/agent' : '/client';
            navigate(`${basePath}/tickets/${notification.related_id}`);
        } else if (notification.related_type === 'payment') {
            navigate('/admin/payments'); // O ruta correspondiente
        }
        setIsDropdownOpen(false);
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative p-2 text-gray-500 hover:text-blue-600 transition focus:outline-none"
            >
                <FaBell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 max-h-96 overflow-y-auto animate-fade-in-up">
                    <div className="flex justify-between items-center px-4 py-2 text-sm text-gray-700 border-b bg-gray-50">
                        <span className="font-bold">Notificaciones</span>
                        {unreadCount > 0 && (
                            <button onClick={markAllNotificationsAsRead} className="text-blue-600 hover:underline text-xs">
                                Marcar todo leído
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            <p>No tienes notificaciones nuevas.</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id || Math.random()} // ✅ KEY ÚNICA (Fallback random si id falla temporalmente)
                                className={`block px-4 py-3 text-sm border-b cursor-pointer transition ${
                                    notification.is_read ? 'bg-white text-gray-600 hover:bg-gray-50' : 'bg-blue-50 text-gray-800 font-medium hover:bg-blue-100'
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <p className="leading-tight">{notification.message}</p>
                                <span className="text-xs text-gray-400 block mt-1">
                                    {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Reciente'}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;