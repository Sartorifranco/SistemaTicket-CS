import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TicketData, Department, User, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';

const AdminTicketsListPage: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification, socket } = useNotification();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTicket, setCurrentTicket] = useState<TicketData | null>(null);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);

    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterAssignedTo, setFilterAssignedTo] = useState('all');
    const [filterCreatedBy, setFilterCreatedBy] = useState('all');
    const [filterTitle, setFilterTitle] = useState('');

    const fetchTickets = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterDepartment !== 'all') params.append('department_id', filterDepartment);
            if (filterAssignedTo !== 'all') params.append('assigned_to_user_id', filterAssignedTo);
            if (filterCreatedBy !== 'all') params.append('user_id', filterCreatedBy);
            if (filterTitle) params.append('title', filterTitle);

            const response = await api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?${params.toString()}`);
            setTickets(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err: unknown) {
            const apiError = err as ApiResponseError;
            setError(apiError?.message || 'Error al cargar los tickets.');
            addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, filterStatus, filterPriority, filterDepartment, filterAssignedTo, filterCreatedBy, filterTitle]);

    const fetchInitialData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [deptsRes, usersRes] = await Promise.all([
                api.get<Department[]>('/api/departments'),
                api.get<{ data: User[] }>('/api/users')
            ]);
            setAllDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
            setAllUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
            setInitialDataLoaded(true);
        } catch (err) {
            setError('Error al cargar datos iniciales.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (user && token && user.role === 'admin') {
            fetchInitialData().then(() => fetchTickets());
        }
    }, [user, token, fetchInitialData, fetchTickets]);

    useEffect(() => {
        if (socket && user && user.role === 'admin') {
            const handleUpdate = () => fetchTickets();
            const events = ['newTicket', 'ticketUpdated', 'ticketDeleted'];
            events.forEach(event => socket.on(event, handleUpdate));
            return () => {
                events.forEach(event => socket.off(event, handleUpdate));
            };
        }
    }, [socket, user, fetchTickets]);

    const handleCreateTicket = () => {
        setCurrentTicket(null);
        setIsModalOpen(true);
    };

    const handleEditTicket = (ticket: TicketData) => {
        setCurrentTicket(ticket);
        setIsModalOpen(true);
    };

    const handleSaveTicket = async (ticketData: any) => {
        try {
            if (currentTicket) {
                await api.put(`/api/tickets/${currentTicket.id}`, ticketData);
                addNotification('Ticket actualizado.', 'success');
            } else {
                await api.post('/api/tickets', { ...ticketData, user_id: user?.id });
                addNotification('Ticket creado.', 'success');
            }
            setIsModalOpen(false);
            fetchTickets();
        } catch (err: unknown) {
            const apiError = err as ApiResponseError;
            addNotification(`Error al guardar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
        }
    };

    const handleDeleteTicket = async (ticketId: number) => {
        if (!window.confirm('¿Eliminar este ticket?')) return;
        try {
            await api.delete(`/api/tickets/${ticketId}`);
            addNotification('Ticket eliminado.', 'success');
            fetchTickets();
        } catch (err: unknown) {
            const apiError = err as ApiResponseError;
            addNotification(`Error al eliminar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Gestión de Tickets</h1>
                    <button onClick={handleCreateTicket} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                        Crear Nuevo Ticket
                    </button>
                </div>
                {/* Aquí irían los filtros */}
                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado Por</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado A</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id}>
                                    <td className="px-6 py-4">{ticket.id}</td>
                                    <td className="px-6 py-4">{ticket.title}</td>
                                    <td className="px-6 py-4">{ticketStatusTranslations[ticket.status] || ticket.status}</td>
                                    <td className="px-6 py-4">{ticketPriorityTranslations[ticket.priority] || ticket.priority}</td>
                                    <td className="px-6 py-4">{ticket.user_username}</td>
                                    <td className="px-6 py-4">{ticket.agent_name || 'Sin Asignar'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => navigate(`/admin/tickets/${ticket.id}`)} className="text-indigo-600 hover:underline mr-4">Ver</button>
                                        <button onClick={() => handleEditTicket(ticket)} className="text-blue-600 hover:underline mr-4">Editar</button>
                                        <button onClick={() => handleDeleteTicket(ticket.id)} className="text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && (
                <TicketFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTicket}
                    initialData={currentTicket}
                    departments={allDepartments}
                    users={allUsers} currentUserRole={'admin'}                />
            )}
        </>
    );
};

export default AdminTicketsListPage;
