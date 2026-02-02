import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { TicketData, ApiResponseError, Department, User } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import TicketDetailModal from './TicketDetailModal'; 
import { formatLocalDate } from '../../utils/dateFormatter';

const MyTicketsList: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);

    const fetchClientTickets = useCallback(async () => {
        if (!token || !user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/tickets');
            setTickets(response.data.data || []);
        } catch (err: unknown) {
            console.error('Error fetching client tickets:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar tus tickets.' : 'Ocurrió un error inesperado.';
            setError(message);
            addNotification(`Error al cargar tickets: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, user, addNotification]);

    useEffect(() => {
        fetchClientTickets();
    }, [fetchClientTickets]);

    const handleViewDetails = (ticket: TicketData) => {
        setSelectedTicket(ticket);
        setIsDetailModalOpen(true);
    };

    const handleSaveTicketChanges = async (updatedFields: Partial<TicketData>) => {
        if (!selectedTicket || !token) return;
        try {
            await api.put(`/api/tickets/${selectedTicket.id}`, updatedFields, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket actualizado exitosamente.', 'success');
            fetchClientTickets();
        } catch (err: unknown) {
            console.error('Error saving ticket changes:', err);
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al actualizar ticket.' : 'Ocurrió un error inesperado.';
            addNotification(`Error al actualizar ticket: ${message}`, 'error');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando tus tickets...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Mis Tickets</h1>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                    {tickets.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No tienes tickets registrados.</p>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado En</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticketStatusTranslations[ticket.status]}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticketPriorityTranslations[ticket.priority]}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatLocalDate(ticket.created_at)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewDetails(ticket)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Ver Detalles"
                                                >
                                                    Ver Detalles
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800 break-all pr-2">#{ticket.id} - {ticket.title}</span>
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0">{ticketStatusTranslations[ticket.status]}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                                            <p><strong>Prioridad:</strong> {ticketPriorityTranslations[ticket.priority]}</p>
                                            <p><strong>Creado:</strong> {formatLocalDate(ticket.created_at)}</p>
                                        </div>
                                        <div className="mt-4 pt-2 border-t text-right">
                                            <button onClick={() => handleViewDetails(ticket)} className="text-indigo-600 font-semibold hover:underline">
                                                Ver Detalles
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* ✅ --- CORRECCIÓN ---
                Se eliminó el paréntesis ')' extra que causaba el error de cierre.
            */}
            {isDetailModalOpen && selectedTicket && (
                <TicketDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    ticket={selectedTicket}
                    onSave={handleSaveTicketChanges}
                    departments={[]}
                    users={[]}
                />
            )}
        </>
    );
};

export default MyTicketsList;