import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, User, Department, Company, TicketStatus } from '../types';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import StatusBadge from '../components/Tickets/StatusBadge';
import { formatLocalDate } from '../utils/dateFormatter';
import { FaSync, FaFilter } from 'react-icons/fa';

// Interfaces para los datos de los filtros
interface FilterData {
    companies: Company[];
    agents: User[];
}

const AdminTicketsPage: React.FC = () => {
    const { user } = useAuth();
    
    // --- ESTADOS DE DATOS ---
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
        priority: '',
        startDate: '',
        endDate: '',
    });

    // --- 1. CARGA INICIAL DE DATOS (Se ejecuta UNA sola vez) ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // Hacemos todas las peticiones en paralelo
            const [companiesRes, agentsRes, usersRes, deptsRes, ticketsRes] = await Promise.all([
                api.get('/api/companies'),
                api.get('/api/users/agents'),
                api.get('/api/users'),
                api.get('/api/departments'),
                api.get('/api/tickets') // Traemos TODOS los tickets de una vez
            ]);

            setFilterData({
                companies: companiesRes.data.data || [],
                agents: agentsRes.data.data || [],
            });
            setAllUsers(usersRes.data.data || []);
            setDepartments(deptsRes.data.data || []);
            setTickets(ticketsRes.data.data || []);

        } catch (error) {
            console.error(error);
            toast.error("Error al cargar los datos del sistema.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Array vacío = Carga solo al montar el componente (Sin bucles)

    // --- 2. LÓGICA DE FILTRADO (Instantánea en memoria) ---
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // 1. Filtro por Empresa (Usamos allUsers para cruzar datos si el ticket no tiene company_id directo)
            if (filters.companyId) {
                const ticketUser = allUsers.find(u => u.id === ticket.user_id);
                // Verificamos si el usuario del ticket pertenece a la empresa seleccionada
                if (ticketUser?.company_id !== Number(filters.companyId)) return false;
            }

            // 2. Filtro por Agente
            if (filters.agentId) {
                if (filters.agentId === 'unassigned') {
                    if (ticket.assigned_to_user_id !== null) return false;
                } else {
                    if (ticket.assigned_to_user_id !== Number(filters.agentId)) return false;
                }
            }

            // 3. Filtro por Estado
            if (filters.status && ticket.status !== filters.status) return false;

            // 4. Filtro por Prioridad
            if (filters.priority && ticket.priority !== filters.priority) return false;

            // 5. Filtro por Fechas
            if (filters.startDate || filters.endDate) {
                const ticketDate = new Date(ticket.created_at).getTime();
                if (filters.startDate) {
                    const start = new Date(filters.startDate).getTime();
                    if (ticketDate < start) return false;
                }
                if (filters.endDate) {
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999); // Final del día
                    if (ticketDate > end.getTime()) return false;
                }
            }

            return true;
        });
    }, [tickets, filters, allUsers]);

    // --- HANDLERS ---
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const clearFilters = () => {
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
            fetchData(); // Recargamos la lista
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al guardar el ticket.');
        }
    };

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Panel de Tickets</h1>
                    <div className="flex gap-2">
                         <button 
                            onClick={fetchData} 
                            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition shadow-sm"
                            title="Recargar datos"
                        >
                            <FaSync className={loading ? "animate-spin text-blue-600" : "text-gray-600"} />
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition">
                            Crear Nuevo Ticket
                        </button>
                    </div>
                </div>

                {/* --- BARRA DE FILTROS --- */}
                <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-gray-100">
                    <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold border-b pb-2">
                        <FaFilter /> Filtros Avanzados
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                        <select name="companyId" value={filters.companyId} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-200 outline-none">
                            <option value="">Todas las Empresas</option>
                            {filterData.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        
                        <select name="agentId" value={filters.agentId} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-200 outline-none">
                            <option value="">Todos los Agentes</option>
                            <option value="unassigned">Sin Asignar</option>
                            {filterData.agents.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.username}
                                </option>
                            ))}
                        </select>
                        
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-200 outline-none">
                            <option value="">Todos los Estados</option>
                            <option value="open">Abierto</option>
                            <option value="in-progress">En Progreso</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
                        </select>
                        
                        <select name="priority" value={filters.priority} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-200 outline-none">
                            <option value="">Todas las Prioridades</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                        
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm" />
                        
                        <button onClick={clearFilters} className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 text-sm transition">Limpiar</button>
                    </div>
                </div>

                {/* --- TABLA DE RESULTADOS --- */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                            <p className="text-gray-500 font-medium">Cargando tickets...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center text-gray-500 py-12 flex flex-col items-center">
                            <p className="text-lg">No se encontraron tickets con los filtros seleccionados.</p>
                            <button onClick={clearFilters} className="mt-2 text-red-600 hover:underline">Borrar filtros</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTickets.map(ticket => (
                                        <tr key={ticket.id} className="hover:bg-gray-50 transition duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{ticket.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.client_name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{ticket.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {ticket.agent_name ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {ticket.agent_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin Asignar</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatLocalDate(ticket.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={ticket.status as TicketStatus} />
                                                <div className="mt-1">
                                                     <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                                                        ticket.priority === 'urgent' ? 'bg-red-100 text-red-800 font-bold' :
                                                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {ticket.priority}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link to={`/admin/tickets/${ticket.id}`} className="text-indigo-600 hover:text-indigo-900 font-bold hover:underline">
                                                    Gestionar
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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