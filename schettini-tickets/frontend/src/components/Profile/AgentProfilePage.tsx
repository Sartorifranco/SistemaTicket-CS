import React, {useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axiosConfig';
import { AgentMetrics } from '../../types';

const AgentProfilePage: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<AgentMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAgentStats = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await api.get(`/api/users/${user.id}/stats`);
            setStats(response.data);
        } catch (error) {
            console.error("Error al cargar estadísticas del agente:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchAgentStats();
        }
    }, [user, fetchAgentStats]);

    if (!user) {
        return <div className="p-8 text-center">Cargando perfil...</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div>
                {/* ✅ Títulos responsivos */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Perfil de Agente</h1>
                <p className="text-md sm:text-lg text-gray-500">Aquí tienes un resumen de tu actividad, {user.username}.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Información Personal</h2>
                {/* ✅ Grilla responsiva para los detalles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                    <p><strong>Nombre de Usuario:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Rol:</strong> <span className="font-semibold text-green-600 capitalize">{user.role}</span></p>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center">Cargando estadísticas...</div>
            ) : stats ? (
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-6">Tus Estadísticas de Tickets</h2>
                    {/* ✅ Grilla responsiva para las tarjetas de métricas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                        <div className="bg-gray-100 p-6 rounded-lg">
                            <p className="text-3xl sm:text-4xl font-bold text-gray-800">{stats.totalTicketsAssigned}</p>
                            <p className="text-md text-gray-600 mt-1">Total Asignados</p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <p className="text-3xl sm:text-4xl font-bold text-blue-600">{stats.openTickets}</p>
                            <p className="text-md text-blue-800 mt-1">Abiertos</p>
                        </div>
                        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                            <p className="text-3xl sm:text-4xl font-bold text-yellow-600">{stats.inProgressTickets}</p>
                            <p className="text-md text-yellow-800 mt-1">En Progreso</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                            <p className="text-3xl sm:text-4xl font-bold text-green-600">{stats.resolvedTickets + stats.closedTickets}</p>
                            <p className="text-md text-green-800 mt-1">Resueltos / Cerrados</p>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="p-8 text-center text-gray-600">No se pudieron cargar las estadísticas.</p>
            )}
        </div>
    );
};

export default AgentProfilePage;