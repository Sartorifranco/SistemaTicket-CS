import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { ActivityLog } from '../types';
import { formatLocalDate } from '../utils/dateFormatter'; // Asegúrate de tener este helper

const AdminActivityLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/activity-logs');
            setLogs(response.data.data || []);
        } catch (err) {
            setError('No se pudieron cargar los registros de actividad.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    if (loading) return <div className="p-8 text-center">Cargando registros...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Registros de Actividad</h1>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
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
                                        <td className="px-6 py-4 whitespace-nowrap font-medium capitalize">{log.action_type.replace(/_/g, ' ')}</td>
                                        <td className="px-6 py-4">{log.description}</td>
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
                                        <p><strong className="capitalize">{log.action_type.replace(/_/g, ' ')}</strong></p>
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

export default AdminActivityLogsPage;