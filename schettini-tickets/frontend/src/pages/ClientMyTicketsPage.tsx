// ClientTicketsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, Department, User, TicketStatus } from '../types';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import StatusBadge from '../components/Tickets/StatusBadge'; // <-- 1. IMPORTAMOS EL NUEVO COMPONENTE

const ClientTicketsPage: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);

    const [filters, setFilters] = useState({
        status: '',
        startDate: '',
        endDate: '',
    });

    const fetchPageData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const [ticketsRes, deptsRes] = await Promise.all([
                api.get(`/api/tickets?${params.toString()}`),
                api.get('/api/departments')
            ]);
            
            setTickets(ticketsRes.data.data || []);
            setDepartments(deptsRes.data.data || []);
        } catch (err) {
            toast.error("No se pudieron cargar los datos.");
        } finally {
            setLoading(false);
        }
    }, [user, filters]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters({ status: '', startDate: '', endDate: '' });
    };

    const handleSaveTicket = async (ticketData: Partial<TicketData>, attachments: File[]) => {
        try {
            const formData = new FormData();
            Object.entries(ticketData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) formData.append(key, String(value));
            });
            attachments.forEach(file => formData.append('attachments', file));
            
            await api.post('/api/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('¡Ticket creado exitosamente!');
            setIsModalOpen(false);
            fetchPageData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al guardar el ticket.');
        }
    };

    if (loading && tickets.length === 0) return <div className="p-8 text-center">Cargando tus tickets...</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mis Tickets</h1>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg self-start sm:self-center"
                    >
                        Crear Nuevo Ticket
                    </button>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                     <h3 className="font-semibold mb-2 text-gray-700">Filtrar Mis Tickets</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-md text-sm">
                            <option value="">Todos los Estados</option>
                            <option value="open">Abierto</option>
                            <option value="in-progress">En Progreso</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
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
                        <div className="text-center text-gray-500 py-8">
                            <p className="text-lg">No has creado ningún ticket todavía o no hay tickets que coincidan con los filtros.</p>
                        </div>
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
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tickets.map(ticket => (
                                        <tr key={ticket.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{ticket.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{ticket.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {/* <-- 2. USAMOS EL COMPONENTE StatusBadge EN LA TABLA */}
                                                <StatusBadge status={ticket.status as TicketStatus} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{ticketPriorityTranslations[ticket.priority] || ticket.priority}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link to={`/client/tickets/${ticket.id}`} className="text-indigo-600 hover:text-indigo-900">Ver Detalles</Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* VISTA DE TARJETAS PARA MÓVIL */}
                            <div className="md:hidden space-y-4">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800 break-all pr-2">#{ticket.id} - {ticket.title}</span>
                                            <div className="flex-shrink-0">
                                                {/* <-- 3. USAMOS EL COMPONENTE StatusBadge TAMBIÉN EN LA VISTA MÓVIL */}
                                                <StatusBadge status={ticket.status as TicketStatus} />
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2">
                                            <p><strong>Prioridad:</strong> {ticketPriorityTranslations[ticket.priority] || ticket.priority}</p>
                                        </div>
                                        <div className="mt-4 pt-2 border-t text-right">
                                            <Link to={`/client/tickets/${ticket.id}`} className="text-indigo-600 font-semibold hover:underline">Ver Detalles</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
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
                    users={user ? [user] : []} 
                    currentUserRole={user.role}
                />
            )}
        </>
    );
};

export default ClientTicketsPage;