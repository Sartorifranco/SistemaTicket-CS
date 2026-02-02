import React, { useState, useMemo, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { formatLocalDate } from '../../utils/dateFormatter';

const NotificationCenter: React.FC = () => {
    const {
        notifications: contextNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
    } = useNotification();

    const [filter, setFilter] = useState<'all' | 'unread'>('unread');

    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') {
            return contextNotifications.filter(n => !n.is_read);
        }
        return contextNotifications;
    }, [contextNotifications, filter]);

    const handleDeleteNotification = useCallback(async (notificationId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta notificación?')) {
            await deleteNotification(notificationId);
        }
    }, [deleteNotification]);

    const handleMarkAllAsRead = useCallback(async () => {
        if (window.confirm('¿Estás seguro de que quieres marcar todas las notificaciones como leídas?')) {
            await markAllNotificationsAsRead();
        }
    }, [markAllNotificationsAsRead]);

    return (
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
                    Centro de Notificaciones
                </h2>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 text-sm sm:text-base ${
                                filter === 'unread' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                        >
                            No Leídas
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 text-sm sm:text-base ${
                                filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                        >
                            Todas
                        </button>
                    </div>
                    <button
                        onClick={handleMarkAllAsRead}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base self-start sm:self-center"
                        disabled={contextNotifications.filter(n => !n.is_read).length === 0 }
                    >
                        Marcar todas como leídas
                    </button>
                </div>

                {filteredNotifications.length === 0 ? (
                    <p className="text-center py-8 text-gray-600">No hay notificaciones {filter === 'unread' ? 'no leídas' : ''} disponibles.</p>
                ) : (
                    <div className="space-y-4">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg shadow-sm border gap-4 ${
                                    notification.is_read ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-blue-50 border-blue-200 text-gray-800 font-semibold'
                                }`}
                            >
                                <div className="flex-1">
                                    <p className="text-sm md:text-base">{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatLocalDate(notification.created_at)}
                                        {!notification.is_read && <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">Nueva</span>}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markNotificationAsRead(notification.id)}
                                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-sm"
                                            title="Marcar como leída"
                                        >
                                            Marcar Leída
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteNotification(notification.id)}
                                        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100"
                                        title="Eliminar notificación"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;