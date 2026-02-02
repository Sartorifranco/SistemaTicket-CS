import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Notification } from '../../types';

const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useNotification();
    const navigate = useNavigate();
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleBellClick = () => {
        setIsDropdownOpen(prev => !prev);
    };

    const handleNotificationClick = (notification: Notification) => {
        // Marcar como leída si no lo está
        if (!notification.is_read) {
            markNotificationAsRead(notification.id);
        }
        // Navegar a la página relacionada si existe
        if (notification.related_type === 'ticket' && notification.related_id) {
            const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'agent' ? '/agent' : '/client';
            navigate(`${basePath}/tickets/${notification.related_id}`);
        }
        setIsDropdownOpen(false);
    };

    // Si el usuario no está autenticado, no se muestra nada.
    if (!user) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Notificaciones"
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.001 2.001 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 py-1 z-50 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                        <span className="font-semibold">Notificaciones</span>
                        {/* Solo mostrar el botón si hay notificaciones no leídas */}
                        {unreadCount > 0 && (
                            <button onClick={markAllNotificationsAsRead} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            <p>✨</p>
                            <p className="mt-2">No tienes notificaciones nuevas.</p>
                        </div>
                    ) : (
                        notifications.slice(0, 10).map((notification) => (
                            <div
                                key={notification.id}
                                className={`block px-4 py-3 text-sm border-b dark:border-gray-700 cursor-pointer transition-colors duration-150 ${
                                    notification.is_read
                                        ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        : 'text-gray-800 dark:text-gray-200 font-medium bg-blue-50 dark:bg-gray-900 hover:bg-blue-100 dark:hover:bg-gray-700'
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <p className="leading-tight">{notification.message}</p>
                                <span className="text-xs text-gray-400 dark:text-gray-500 block mt-1">
                                    {new Date(notification.created_at).toLocaleString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
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