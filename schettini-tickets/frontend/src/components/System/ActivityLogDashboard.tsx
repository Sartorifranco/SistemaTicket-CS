import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ActivityLog, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { formatLocalDate } from '../../utils/dateFormatter'; // Asegúrate de tener este helper

const ActivityLogs: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();

    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        user_username: '',
        action_type: 'all',
        target_type: 'all',
        start_date: '',
        end_date: ''
    });

    const fetchActivityLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Limpiamos los filtros vacíos antes de crear los parámetros
            const activeFilters: { [key: string]: string } = {};
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'all') {
                    activeFilters[key] = value;
                }
            });

            const queryParams = new URLSearchParams(activeFilters).toString();
            const response = await api.get(`/api/activity-logs?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // El backend devuelve { success: true, data: [...] }
            setActivityLogs(response.data.data || []);
        } catch (err: unknown) {
            console.error('Error fetching activity logs:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los logs.' : 'Ocurrió un error inesperado.';
            setError(message);
            addNotification(`Error al cargar logs: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, filters, addNotification]);

    useEffect(() => {
        fetchActivityLogs();
    }, [fetchActivityLogs]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };

    const handleApplyFilters = () => {
        fetchActivityLogs();
    };
    
    // Función para capitalizar y formatear el tipo de acción
    const formatActionType = (action: string) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    };

    if (loading) return <div className="p-8 text-center">Cargando registros de actividad...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Registro de Actividad</h1>

            {/* ✅ Panel de Filtros Responsivo */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" name="user_username" value={filters.user_username} onChange={handleFilterChange} placeholder="Buscar por usuario..." className="w-full p-2 border rounded-md" />
                    <select name="action_type" value={filters.action_type} onChange={handleFilterChange} className="w-full p-2 border rounded-md">
                        <option value="all">Todas las Acciones</option>
                        <option value="user_logged_in">Inicio de Sesión</option>
                        <option value="ticket_created">Ticket Creado</option>
                        <option value="comment_added">Comentario Añadido</option>
                        {/* ...Añadir más opciones si es necesario... */}
                    </select>
                     <select name="target_type" value={filters.target_type} onChange={handleFilterChange} className="w-full p-2 border rounded-md">
                        <option value="all">Todas las Entidades</option>
                        <option value="user">Usuario</option>
                        <option value="ticket">Ticket</option>
                        <option value="department">Departamento</option>
                    </select>
                    <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className="w-full p-2 border rounded-md" />
                    <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} className="w-full p-2 border rounded-md" />
                </div>
                <div className="mt-4 text-right">
                    <button onClick={handleApplyFilters} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-md">
                        Filtrar
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                {activityLogs.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No hay registros que coincidan con los filtros.</p>
                ) : (
                    <>
                        {/* ✅ VISTA DE TABLA PARA ESCRITORIO */}
                        <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {activityLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{log.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{formatActionType(log.action_type)}</td>
                                        <td className="px-6 py-4">{log.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{formatLocalDate(log.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* ✅ VISTA DE TARJETAS PARA MÓVILES */}
                        <div className="md:hidden space-y-4">
                            {activityLogs.map((log) => (
                                <div key={log.id} className="bg-gray-50 p-4 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-800">{log.username || 'Sistema'}</p>
                                        <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatLocalDate(log.created_at)}</p>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                                        <p><strong>{formatActionType(log.action_type)}</strong></p>
                                        <p>{log.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;