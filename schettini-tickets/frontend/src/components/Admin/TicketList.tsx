import React, { useState, useEffect, useCallback } from 'react';
import ticketService from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { TicketData } from '../../types'; // Ensure this is the correct, full type for a ticket
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import { formatLocalDate } from '../../utils/dateFormatter';

interface TicketListProps {
    onSelectTicket: (ticketId: number) => void;
}

const TicketList: React.FC<TicketListProps> = ({ onSelectTicket }) => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('Not authorized. Please log in again.', 'error');
                setLoading(false);
                return;
            }
            const data = await ticketService.getAllTickets(token);

            const statusOrder: { [key: string]: number } = {
                'open': 1, 'assigned': 2, 'in-progress': 3,
                'resolved': 4, 'closed': 5,
            };

            const sortedTickets = data.sort((a, b) => {
                const statusA = statusOrder[a.status as keyof typeof statusOrder] || 99;
                const statusB = statusOrder[b.status as keyof typeof statusOrder] || 99;
                if (statusA !== statusB) return statusA - statusB;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            
            // ✅ **CORRECTION:** Ensure the data from the service is cast to the correct type.
            setTickets(sortedTickets as unknown as TicketData[]);
        } catch (err: unknown) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error loading tickets.' : 'An unexpected error occurred.';
            setError(message);
            addNotification(`Error loading tickets: ${message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    if (loading) return <p className="p-8 text-center text-gray-600">Loading tickets...</p>;
    if (error) return <p className="p-8 text-center text-red-500">Error: {error}</p>;

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Ticket List</h3>
            {tickets.length === 0 ? (
                <p className="text-gray-600 py-8 text-center">No tickets to display.</p>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id}>
                                    <td className="px-6 py-4">{ticket.id}</td>
                                    <td className="px-6 py-4">{ticket.title}</td>
                                    <td className="px-6 py-4">{ticketStatusTranslations[ticket.status] || ticket.status}</td>
                                    <td className="px-6 py-4">{ticketPriorityTranslations[ticket.priority] || ticket.priority}</td>
                                    <td className="px-6 py-4">{ticket.user_username || 'N/A'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onSelectTicket(ticket.id)} className="text-indigo-600 hover:underline">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {tickets.map((ticket) => (
                            <div key={ticket.id} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-gray-800 break-all pr-2">#{ticket.id} - {ticket.title}</span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-shrink-0">{ticketStatusTranslations[ticket.status]}</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-2 space-y-1">
                                    <p><strong>Client:</strong> {ticket.user_username || 'N/A'}</p>
                                    <p><strong>Priority:</strong> {ticketPriorityTranslations[ticket.priority]}</p>
                                </div>
                                <div className="mt-4 pt-2 border-t text-right">
                                    <button onClick={() => onSelectTicket(ticket.id)} className="text-indigo-600 font-semibold hover:underline">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default TicketList;