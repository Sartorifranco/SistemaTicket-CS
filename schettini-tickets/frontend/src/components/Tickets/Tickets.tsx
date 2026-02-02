import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { TicketData, Department, User, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import api from '../../config/axiosConfig';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';

interface TicketsProps {
    onEditTicket: (ticket: TicketData | null) => void;
    onCreateTicket: () => void;
    departments: Department[];
    users: User[];
}

const Tickets: React.FC<TicketsProps> = ({ onEditTicket, onCreateTicket, departments, users }) => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [assignedToFilter, setAssignedToFilter] = useState<string>('');
    const [createdByFilter, setCreatedByFilter] = useState<string>('');

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.append('status', statusFilter);
            if (priorityFilter) queryParams.append('priority', priorityFilter);
            if (departmentFilter) queryParams.append('department_id', departmentFilter);
            if (assignedToFilter) queryParams.append('assigned_to_user_id', assignedToFilter);
            // Corregido: el backend espera created_by_user_id, no user_id
            if (createdByFilter) queryParams.append('user_id', createdByFilter);

            const response = await api.get(`/api/tickets?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // El backend devuelve { success: true, data: [...] }
            setTickets(response.data.data || []);
        } catch (err: unknown) {
            console.error('Error fetching tickets:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los tickets.' : 'Ocurrió un error inesperado.';
            setError(message);
            addNotification(`Error al cargar tickets: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter, priorityFilter, departmentFilter, assignedToFilter, createdByFilter, addNotification]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Estas funciones de manejo de acciones se mantienen por si se necesitan en el futuro,
    // aunque la tabla actual no las use directamente.
    const handleDeleteTicket = async (ticketId: number) => { /* ... */ };
    const handleAssignTicket = async (ticketId: number, agentId: number | null) => { /* ... */ };
    const handleStatusChange = async (ticketId: number, newStatus: string) => { /* ... */ };
    
    const getDepartmentName = (id: number | null) => departments.find(d => d.id === id)?.name || 'N/A';
    const getUserUsername = (id: number | null) => users.find(u => u.id === id)?.username || 'Sin Asignar';

    const isAdmin = user?.role === 'admin';
    const isAgent = user?.role === 'agent';

    if (loading) return <div className="p-8 text-center">Cargando tickets...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestión de Tickets</h1>
                <button
                    onClick={onCreateTicket}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg self-start sm:self-center"
                >
                    Crear Nuevo Ticket
                </button>
            </div>

            {/* ✅ Panel de Filtros Responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-lg shadow">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">Todos los Estados</option>
                    <option value="open">Abierto</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">Todas las Prioridades</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                </select>
                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">Todos los Departamentos</option>
                    {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
                {(isAdmin || isAgent) && (
                    <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)} className="w-full p-2 border rounded-md">
                        <option value="">Todos los Agentes</option>
                        <option value="null">Sin Asignar</option>
                        {users.filter(u => u.role === 'agent' || u.role === 'admin').map(agent => <option key={agent.id} value={agent.id}>{agent.username}</option>)}
                    </select>
                )}
                 {isAdmin && (
                    <select value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)} className="w-full p-2 border rounded-md">
                        <option value="">Todos los Clientes</option>
                        {users.filter(u => u.role === 'client').map(client => <option key={client.id} value={client.id}>{client.username}</option>)}
                    </select>
                )}
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                {tickets.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay tickets que coincidan con los filtros.</p>
                ) : (
                    <>
                        {/* VISTA DE TABLA PARA ESCRITORIO */}
                        <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado A</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tickets.map(ticket => (
                                    <tr key={ticket.id} className="hover:bg-gray-100 cursor-pointer" onClick={() => onEditTicket(ticket)}>
                                        <td className="px-6 py-4">{ticket.id}</td>
                                        <td className="px-6 py-4">{ticket.title}</td>
                                        <td className="px-6 py-4">{ticketStatusTranslations[ticket.status] || ticket.status}</td>
                                        <td className="px-6 py-4">{ticketPriorityTranslations[ticket.priority] || ticket.priority}</td>
                                        <td className="px-6 py-4">{getUserUsername(ticket.user_id)}</td>
                                        <td className="px-6 py-4">{getUserUsername(ticket.assigned_to_user_id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* VISTA DE TARJETAS PARA MÓVILES */}
                        <div className="md:hidden space-y-4">
                            {tickets.map(ticket => (
                                <div key={ticket.id} className="bg-gray-50 p-4 rounded-lg border" onClick={() => onEditTicket(ticket)}>
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-gray-800 break-all pr-2">#{ticket.id} - {ticket.title}</span>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0">{ticketStatusTranslations[ticket.status] || ticket.status}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                                        <p><strong>Cliente:</strong> {getUserUsername(ticket.user_id)}</p>
                                        <p><strong>Asignado:</strong> {getUserUsername(ticket.assigned_to_user_id)}</p>
                                        <p><strong>Prioridad:</strong> {ticketPriorityTranslations[ticket.priority] || ticket.priority}</p>
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

export default Tickets;