import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, User, Department, Company, TicketStatus } from '../types';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import StatusBadge from '../components/Tickets/StatusBadge';
import { formatLocalDate } from '../utils/dateFormatter'; // Importar formateador de fecha

// Interfaces para los datos de los filtros
interface FilterData {
    companies: Company[];
    agents: User[];
}

const AdminTicketsPage: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para el modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    // Estados para los filtros
    const [filterData, setFilterData] = useState<FilterData>({ companies: [], agents: [] });
    const [filters, setFilters] = useState({
        companyId: '',
        agentId: '',
        status: '',
        priority: '', // ✅ AÑADIDO: Estado para el filtro de prioridad
        startDate: '',
        endDate: '',
    });

    // Carga los datos para los dropdowns de los filtros y el modal
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [companiesRes, agentsRes, usersRes, deptsRes] = await Promise.all([
                    api.get('/api/companies'),
                    api.get('/api/users/agents'), // Asumimos que esto devuelve first_name y last_name
                    api.get('/api/users'),
                    api.get('/api/departments')
                ]);
                setFilterData({
                    companies: companiesRes.data.data || [],
                    agents: agentsRes.data.data || [],
                });
                setAllUsers(usersRes.data.data || []);
                setDepartments(deptsRes.data.data || []);
            } catch (error) {
                toast.error("No se pudieron cargar las opciones de filtro.");
            }
        };
        fetchInitialData();
    }, []);

    // Carga los tickets
    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.companyId) params.append('companyId', filters.companyId);
            
            if (filters.agentId === 'unassigned') {
                params.append('unassigned', 'true');
            } else if (filters.agentId) {
                params.append('agentId', filters.agentId);
            }
            
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority); // ✅ AÑADIDO: Enviar filtro al backend
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const response = await api.get(`/api/tickets?${params.toString()}`);
            setTickets(response.data.data || []);
        } catch (err) {
            toast.error("No se pudieron cargar los tickets.");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const clearFilters = () => {
        // ✅ MODIFICACIÓN: Resetear también prioridad
        setFilters({ companyId: '', agentId: '', status: '', priority: '', startDate: '', endDate: '' });
    };
    
    const handleSaveTicket = async (ticketData: Partial<TicketData>, attachments: File[]) => {
        try {
            const formData = new FormData();
            Object.entries(ticketData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, String(value));
                }
            });
            attachments.forEach(file => formData.append('attachments', file));
    
            await api.post('/api/tickets', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            
            toast.success('¡Ticket creado exitosamente!');
            setIsModalOpen(false);
            fetchTickets();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al guardar el ticket.');
        }
    };

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Tickets</h1>
                    <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                        Crear Nuevo Ticket
                    </button>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <h3 className="font-semibold mb-2">Filtrar Tickets</h3>
                    {/* ✅ MODIFICACIÓN: Se cambia lg:grid-cols-6 a lg:grid-cols-7 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                        <select name="companyId" value={filters.companyId} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todas las Empresas</option>
                            {filterData.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select name="agentId" value={filters.agentId} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todos los Agentes</option>
                            <option value="unassigned">Sin Asignar</option>
                            {filterData.agents.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.username}
                                </option>
                            ))}
                        </select>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todos los Estados</option>
                            <option value="open">Abierto</option>
                            <option value="in-progress">En Progreso</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
                        </select>
                        {/* ✅ AÑADIDO: Dropdown de Prioridad */}
                        <select name="priority" value={filters.priority} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todas las Prioridades</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
                        <button onClick={clearFilters} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 text-sm">Limpiar</button>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-8">Cargando tickets...</div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No se encontraron tickets con los filtros seleccionados.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agente Asignado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Creación</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tickets.map(ticket => (
                                    <tr key={ticket.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">{ticket.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ticket.client_name}</td>
                                        <td className="px-6 py-4 font-medium">{ticket.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{ticket.agent_name || 'Sin Asignar'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatLocalDate(ticket.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={ticket.status as TicketStatus} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link to={`/admin/tickets/${ticket.id}`} className="text-indigo-600 hover:underline font-semibold">Gestionar</Link>
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

export default AdminTicketsPage;