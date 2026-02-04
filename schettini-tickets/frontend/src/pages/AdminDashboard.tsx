import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ActivityLog, ApiResponseError, TicketData, User } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { formatLocalDate } from '../utils/dateFormatter';
import { toast } from 'react-toastify';
// ✅ IMPORTAR WIDGET
import InfoWidget from '../components/Common/InfoWidget';

const activityTypeTranslations: { [key: string]: string } = {
    user_registered: 'Usuario Registrado',
    user_logged_in: 'Inicio de Sesión',
    ticket_created: 'Ticket Creado',
    ticket_assigned: 'Ticket Asignado',
    comment_added: 'Comentario Añadido',
    department_created: 'Departamento Creado',
    company_created: 'Empresa Creada',
};

interface DashboardMetrics {
    totalTickets: number;
    activeTickets: number;
    totalUsers: number;
    recentActivity: ActivityLog[];
    agentWorkload: {
        agentId: number;
        agentName: string;
        assignedTickets: number;
    }[];
}

// --- Componente Modal de Detalles ---
const DetailsModal: React.FC<{ title: string; items: any[]; onClose: () => void; renderItem: (item: any, index?: number) => React.ReactNode; loading: boolean }> = ({ title, items, onClose, renderItem, loading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2">{title}</h2>
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-gray-500 py-4">Cargando...</p>
                    ) : items.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {items.map((item, index) => renderItem(item, index))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No hay elementos para mostrar.</p>
                    )}
                </div>
                <button onClick={onClose} className="mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded w-full">Cerrar</button>
            </div>
        </div>
    );
};

// --- Modal de Tickets de Agente ---
const AgentTicketsModal: React.FC<{ agent: { agentId: number, agentName: string } | null, onClose: () => void }> = ({ agent, onClose }) => {
    const [tickets, setTickets] = useState<Partial<TicketData>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (agent) {
            const fetchAgentTickets = async () => {
                setLoading(true);
                try {
                    const response = await api.get(`/api/users/${agent.agentId}/active-tickets`);
                    setTickets(response.data.data);
                } catch (error) {
                    toast.error(`No se pudieron cargar los tickets de ${agent.agentName}.`);
                } finally {
                    setLoading(false);
                }
            };
            fetchAgentTickets();
        }
    }, [agent]);

    if (!agent) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Tickets Activos de {agent.agentName}</h2>
                {loading ? (
                    <p>Cargando tickets...</p>
                ) : (
                    <ul className="space-y-2 max-h-80 overflow-y-auto">
                        {tickets.length > 0 ? tickets.map(ticket => (
                            <li key={ticket.id} className="border p-3 rounded-md flex justify-between items-center hover:bg-gray-50">
                                <span>#{ticket.id} - {ticket.title}</span>
                                <Link to={`/admin/tickets/${ticket.id}`} className="text-red-600 hover:underline text-sm font-semibold">Ver</Link>
                            </li>
                        )) : <p className="text-gray-500">Este agente no tiene tickets activos asignados.</p>}
                    </ul>
                )}
                <button onClick={onClose} className="mt-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded w-full">Cerrar</button>
            </div>
        </div>
    );
};

// --- Dashboard Principal ---
const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const { socket } = useNotification();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados Modales
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; items: any[]; renderItem: (item: any, index?: number) => React.ReactNode } | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<{ agentId: number, agentName: string } | null>(null);

    const fetchMetrics = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/dashboard/admin');
            setMetrics(response.data.data);
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar datos.' : 'Error inesperado.';
            setError(message);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'admin') fetchMetrics(true);
    }, [user, fetchMetrics]);

    useEffect(() => {
        if (socket) {
            const handleDashboardUpdate = () => fetchMetrics(false);
            socket.on('dashboard_update', handleDashboardUpdate);
            return () => { socket.off('dashboard_update', handleDashboardUpdate); };
        }
    }, [socket, fetchMetrics]);

    const handleCardClick = async (type: 'total' | 'active' | 'users') => {
        setModalLoading(true);
        setIsDetailsModalOpen(true);
    
        let title = '';
        let items: any[] = [];
        let renderItem: (item: any, index?: number) => React.ReactNode = () => null;
    
        try {
            if (type === 'users') {
                title = 'Todos los Usuarios';
                const response = await api.get('/api/users');
                items = response.data.data;
                renderItem = (user: User) => (
                    <li key={user.id} className="p-3 hover:bg-gray-50">{user.username} - ({user.role})</li>
                );
            } else {
                const params = new URLSearchParams();
                if (type === 'active') {
                    title = 'Tickets Activos';
                    params.append('status', 'open');
                    params.append('status', 'in-progress');
                } else {
                    title = 'Todos los Tickets';
                }
    
                const response = await api.get(`/api/tickets?${params.toString()}`);
                items = response.data.data;
                renderItem = (ticket: TicketData) => (
                      <li key={ticket.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                        <div>
                            <span className="font-semibold">#{ticket.id} - {ticket.title}</span>
                            <span className="text-gray-500 ml-2">({ticket.client_name})</span>
                        </div>
                        <Link to={`/admin/tickets/${ticket.id}`} className="text-red-600 hover:underline">Ver</Link>
                    </li>
                );
            }
            setModalContent({ title, items, renderItem });
        } catch (error) {
            toast.error('No se pudo cargar la información detallada.');
            setIsDetailsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };

    const handleAgentClick = (agent: { agentId: number, agentName: string }) => {
        setSelectedAgent(agent);
        setIsAgentModalOpen(true);
    };

    if (loading) return <div className="p-8 text-center">Cargando dashboard...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    if (!metrics) return <div className="p-8 text-center">No se encontraron datos.</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                
                {/* ✅ AQUÍ ESTÁ EL WIDGET (Reloj) */}
                <InfoWidget />

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard de Administrador</h1>

                {/* FILA 1: Métricas Principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <button onClick={() => handleCardClick('total')} className="text-left bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-600">Tickets Totales</h3>
                        <p className="text-4xl font-bold text-indigo-600 mt-2">{metrics.totalTickets}</p>
                    </button>
                    <button onClick={() => handleCardClick('active')} className="text-left bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-600">Tickets Activos</h3>
                        <p className="text-4xl font-bold text-green-600 mt-2">{metrics.activeTickets}</p>
                    </button>
                    <button onClick={() => handleCardClick('users')} className="text-left bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-600">Usuarios Totales</h3>
                        <p className="text-4xl font-bold text-blue-600 mt-2">{metrics.totalUsers}</p>
                    </button>
                </div>

                {/* FILA 2: Agentes Activos */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Agentes Atendiendo Tickets</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {metrics.agentWorkload.length > 0 ? metrics.agentWorkload.map(agent => (
                            <button key={agent.agentId} onClick={() => handleAgentClick(agent)} className="flex justify-between items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                        {agent.agentName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-800">{agent.agentName}</span>
                                </div>
                                <span className="font-bold text-white bg-red-600 rounded-full h-8 w-8 flex items-center justify-center text-sm">
                                    {agent.assignedTickets}
                                </span>
                            </button>
                        )) : (
                            <p className="text-gray-500 py-4 col-span-3 text-center">No hay agentes con tickets activos en este momento.</p>
                        )}
                    </div>
                </div>

                {/* FILA 3: Actividad Reciente */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Actividad Reciente</h2>
                    <div className="overflow-x-auto">
                        <ul className="divide-y divide-gray-200">
                            {metrics.recentActivity.length > 0 ? (
                                metrics.recentActivity.map(log => (
                                    <li key={log.id} className="py-4 flex flex-col sm:flex-row justify-between items-start hover:bg-gray-50 px-2 rounded">
                                        <div className="flex-grow">
                                            <p className="text-sm font-semibold text-gray-900">
                                                <span className="text-indigo-600">{log.username || 'Sistema'}</span>
                                                <span className="text-gray-500 mx-2">•</span>
                                                <span className="capitalize">
                                                    {activityTypeTranslations[log.action_type] || log.action_type?.replace(/_/g, ' ')}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                                            {formatLocalDate(log.created_at)}
                                        </p>
                                    </li>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">No hay actividad reciente registrada.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {isAgentModalOpen && <AgentTicketsModal agent={selectedAgent} onClose={() => setIsAgentModalOpen(false)} />}
            {isDetailsModalOpen && <DetailsModal title={modalContent?.title || ''} items={modalContent?.items || []} onClose={() => setIsDetailsModalOpen(false)} renderItem={modalContent?.renderItem || (() => null)} loading={modalLoading} />}
        </>
    );
};

export default AdminDashboard;