import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, User, Department, TicketStatus, TicketPriority } from '../types';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import { formatLocalDate } from '../utils/dateFormatter';

const TabButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            isActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
    >
        {label}
    </button>
);

const AgentTicketsPage: React.FC = () => {
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [agents, setAgents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    const [view, setView] = useState<'assigned' | 'unassigned' | 'all'>('assigned');
    
    const [filters, setFilters] = useState({
        status: '',
        startDate: '',
        endDate: '',
        agentId: '',
        priority: '',
    });

    // ✅ MODIFICACIÓN: Se quita el filtro de estado por defecto al cambiar de vista
    const handleViewChange = (newView: 'assigned' | 'unassigned' | 'all') => {
        setView(newView);
        setFilters(prev => ({
            ...prev,
            status: '', // Se resetea el estado
            agentId: '', // Se resetea el agente
            priority: '', // Se resetea la prioridad
            // Dejamos las fechas
        }));
    };

    const getStatusSelectClasses = (status: TicketStatus): string => {
        const baseClasses = "w-full p-1 border rounded-md text-sm transition-colors duration-200";
        switch (status) {
            case 'open':        return `${baseClasses} bg-blue-100 text-blue-800 border-blue-200`;
            case 'in-progress': return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200`;
            case 'resolved':    return `${baseClasses} bg-cyan-100 text-cyan-800 border-cyan-200`;
            case 'closed':      return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
            default:            return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
        }
    };

    const fetchPageData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('view', view);
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.agentId) params.append('agentId', filters.agentId);
            if (filters.priority) params.append('priority', filters.priority); 

            const [ticketsResponse, agentsResponse, usersResponse, deptsResponse] = await Promise.all([
                api.get(`/api/tickets?${params.toString()}`),
                api.get('/api/users/agents'),
                api.get('/api/users'),
                api.get('/api/departments')
            ]);
            setTickets(ticketsResponse.data.data || []);
            setAgents(agentsResponse.data.data || []);
            setAllUsers(usersResponse.data.data || []);
            setDepartments(deptsResponse.data.data || []);
        } catch (err) {
            const errorMessage = "No se pudieron cargar los datos.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [user, view, filters]); 

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);
    
    const handleSaveTicket = async (ticketData: Partial<TicketData>, attachments: File[]) => {
        try {
            const formData = new FormData();
            Object.entries(ticketData).forEach(([key, value]) => {
                if (value) formData.append(key, String(value));
            });
            attachments.forEach(file => formData.append('attachments', file));
            await api.post('/api/tickets', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('¡Ticket creado exitosamente!');
            setIsModalOpen(false);
            await fetchPageData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al guardar el ticket.');
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    // ✅ MODIFICACIÓN: Se limpia todo
    const clearFilters = () => {
        setFilters({ 
            status: '', 
            startDate: '', 
            endDate: '', 
            agentId: '', 
            priority: '' 
        });
    };

    const handleTakeTicket = async (ticketId: number) => {
        try {
            await api.put(`/api/tickets/${ticketId}/assign`);
            toast.success(`¡Has tomado el ticket #${ticketId}!`);
            fetchPageData();
        } catch (error) {
            toast.error("No se pudo tomar el ticket.");
        }
    };

    const handleReassign = async (ticketId: number, agentId: string) => {
       if (!agentId) {
            toast.warn("Por favor, selecciona un agente.");
            return;
        }
        try {
            await api.put(`/api/tickets/${ticketId}/reassign`, { newAgentId: agentId });
            toast.success(`Ticket #${ticketId} reasignado exitosamente.`);
            setTickets(prev => prev.filter(t => t.id !== ticketId));
        } catch (error) {
            toast.error("Error al reasignar el ticket.");
        }
    };

    const handleStatusChange = async (ticketId: number, newStatus: TicketStatus) => {
        try {
            await api.put(`/api/tickets/${ticketId}/status`, { status: newStatus });
            toast.success("Estado actualizado.");
            setTickets(prevTickets => prevTickets.map(t => 
                t.id === ticketId ? { ...t, status: newStatus } : t
            ));
        } catch (error) {
            toast.error("No se pudo actualizar el estado.");
        }
    };

    const handlePriorityChange = async (ticketId: number, newPriority: TicketPriority) => {
        try {
            await api.put(`/api/tickets/${ticketId}`, { priority: newPriority });
            toast.info("Prioridad actualizada.");
             setTickets(prevTickets => prevTickets.map(t => 
                t.id === ticketId ? { ...t, priority: newPriority } : t
            ));
        } catch (error) {
            toast.error("No se pudo actualizar la prioridad.");
        }
    };


    if (loading) return <div className="p-8 text-center text-lg">Cargando tickets...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Agente</h1>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Crear Nuevo Ticket
                    </button>
                </div>

                <div className="flex space-x-2 mb-6 p-1 bg-gray-200 rounded-lg">
                    <TabButton label="Mis Tickets Asignados" isActive={view === 'assigned'} onClick={() => handleViewChange('assigned')} />
                    <TabButton label="Tickets Sin Asignar" isActive={view === 'unassigned'} onClick={() => handleViewChange('unassigned')} />
                    <TabButton label="Todos los Tickets" isActive={view === 'all'} onClick={() => handleViewChange('all')} />
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <h3 className="font-semibold mb-2 text-gray-700">Filtrar Tickets</h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${view === 'all' ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4 items-end`}>
                        {view === 'all' && (
                             <select name="agentId" value={filters.agentId} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                                <option value="">Todos los Agentes</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.first_name && agent.last_name ? `${agent.first_name} ${agent.last_name}` : agent.username}
                                    </option>
                                ))}
                            </select>
                        )}
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todos los Estados</option>
                            <option value="open">Abierto</option>
                            <option value="in-progress">En Progreso</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
                        </select>
                        <select name="priority" value={filters.priority} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todas las Prioridades</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
                        <button onClick={clearFilters} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 text-sm">Limpiar Filtros</button>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
                    {tickets.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <p className="text-lg">No hay tickets en esta vista.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    {view === 'all' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agente Asignado</th>}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Creación</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tickets.map(ticket => (
                                    <tr key={ticket.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{ticket.id}</td>
                                        <td className="px-6 py-4 font-medium">{ticket.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ticket.client_name}</td>
                                        {view === 'all' && <td className="px-6 py-4 whitespace-nowrap">{ticket.agent_name || 'N/A'}</td>}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatLocalDate(ticket.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select 
                                                value={ticket.status} 
                                                onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                                                className={getStatusSelectClasses(ticket.status as TicketStatus)}
                                            >
                                                {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                                                    <option key={key} value={key}>{value}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select 
                                                value={ticket.priority} 
                                                onChange={(e) => handlePriorityChange(ticket.id, e.target.value as TicketPriority)}
                                                className="w-full p-1 border rounded-md text-sm bg-white"
                                            >
                                                {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                                                    <option key={key} value={key}>{value}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {view === 'assigned' && (
                                                <Link to={`/agent/tickets/${ticket.id}`} className="text-indigo-600 hover:underline font-semibold">Gestionar</Link>
                                            )}
                                            {view === 'unassigned' && (
                                                <div className="flex gap-4 justify-end items-center">
                                                    <Link 
                                                        to={`/agent/tickets/${ticket.id}`}
                                                        className="text-indigo-600 hover:underline font-semibold"
                                                    >
                                                        Ver
                                                    </Link>
                                                    <button onClick={() => handleTakeTicket(ticket.id)} className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600">Tomar</button>
                                                </div>
                                            )}
                                            {view === 'all' && (
                                                 <Link to={`/agent/tickets/${ticket.id}`} className="text-indigo-600 hover:underline font-semibold">Ver</Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && user && (
                <TicketFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTicket}
                    initialData={null}
                    departments={departments}
                    users={allUsers}
                    currentUserRole={user.role}
                />
            )}
        </>
    );
};

export default AgentTicketsPage;

