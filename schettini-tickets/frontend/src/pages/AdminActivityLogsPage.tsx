import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { ActivityLog } from '../types';
import { formatLocalDate } from '../utils/dateFormatter';
import { translateActionType, translateDescription } from '../utils/activityTranslations';
import { FaSearch } from 'react-icons/fa';
import SectionCard from '../components/Common/SectionCard';

interface AdminActivityLogsPageProps {
    title?: string;
}

const AdminActivityLogsPage: React.FC<AdminActivityLogsPageProps> = ({ title = 'Registros de Actividad' }) => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({ user_id: '', ticket_id: '', date_from: '', date_to: '' });

    const fetchUsers = useCallback(async () => {
        if (user?.role !== 'admin') return;
        try {
            const res = await api.get('/api/users');
            setUsers(res.data.data?.map((u: any) => ({ id: u.id, username: u.username })) || []);
        } catch (e) { console.error(e); }
    }, [user?.role]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters.user_id) params.append('user_id', filters.user_id);
            if (filters.ticket_id) params.append('ticket_id', filters.ticket_id);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            const response = await api.get(`/api/activity-logs?${params.toString()}`);
            setLogs(response.data.data || []);
        } catch (err) {
            setError('No se pudieron cargar los registros de actividad.');
        } finally {
            setLoading(false);
        }
    }, [filters.user_id, filters.ticket_id, filters.date_from, filters.date_to]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    if (loading) return <div className="p-8 text-center">Cargando registros...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">{title}</h1>

            {/* Filtros */}
            <SectionCard title="Filtros" className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {user?.role === 'admin' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Usuario / Cliente</label>
                            <select value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))} className="w-full p-2 border rounded-lg text-sm">
                                <option value="">Todos</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ticket #</label>
                        <input type="number" placeholder="Ej: 5" value={filters.ticket_id} onChange={e => setFilters(f => ({ ...f, ticket_id: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" min="1" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                </div>
                <button onClick={() => fetchLogs()} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                    <FaSearch /> Buscar
                </button>
            </SectionCard>

            <SectionCard title="Registros de Actividad">
                {logs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay actividad registrada.</p>
                ) : (
                    <>
                        {/* VISTA DE TABLA PARA ESCRITORIO */}
                        <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{log.username || 'Sistema'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{translateActionType(log.action_type || '')}</td>
                                        <td className="px-6 py-4">{translateDescription(log.description || '')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{formatLocalDate(log.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* VISTA DE TARJETAS PARA MÓVILES */}
                        <div className="md:hidden space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="bg-gray-50 p-4 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-800">{log.username || 'Sistema'}</p>
                                        <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatLocalDate(log.created_at)}</p>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                                        <p><strong>{translateActionType(log.action_type || '')}</strong></p>
                                        <p>{translateDescription(log.description || '')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </SectionCard>
        </div>
    );
};

export default AdminActivityLogsPage;