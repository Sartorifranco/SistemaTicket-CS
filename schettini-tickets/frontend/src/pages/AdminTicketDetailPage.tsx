import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, TicketStatus, User, Attachment, TicketPriority } from '../types';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import { formatLocalDate } from '../utils/dateFormatter';
import CommentForm from '../components/Common/CommentForm';

type DetailedTicketData = TicketData & {
    ticket_category_name?: string;
    ticket_department_name?: string;
    attachments?: Attachment[];
};

const FileIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
    <svg className={`${className} mx-auto text-gray-400 mb-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);

const AdminTicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState<DetailedTicketData | null>(null);
    const [agents, setAgents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ✅ AÑADIDO: Estado para el modal de confirmación de borrado
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchTicketDetails = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [ticketRes, agentsRes] = await Promise.all([
                api.get(`/api/tickets/${id}`),
                api.get('/api/users/agents')
            ]);
            setTicket(ticketRes.data.data); 
            setAgents(agentsRes.data.data);
        } catch (err) {
            setError('No se pudo cargar el ticket o no tienes permiso para verlo.');
            toast.error('Error al cargar los datos del ticket.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTicketDetails();
    }, [fetchTicketDetails]);

    const handleAddComment = async (commentText: string, isInternal: boolean) => {
        if (!commentText.trim() || !ticket) return;
        try {
            await api.post(`/api/tickets/${ticket.id}/comments`, {
                comment_text: commentText,
                is_internal: isInternal
            });
            toast.success("Comentario añadido exitosamente.");
            fetchTicketDetails();
        } catch (err) {
            toast.error("Error al añadir el comentario.");
        }
    };
    
    const handleStatusChange = async (newStatus: TicketStatus) => {
        if (!ticket) return;
        try {
            await api.put(`/api/tickets/${ticket.id}/status`, { status: newStatus });
            toast.success(`El estado del ticket se actualizó a "${ticketStatusTranslations[newStatus] || newStatus}".`);
            fetchTicketDetails();
        } catch (error) {
            toast.error("No se pudo actualizar el estado del ticket.");
        }
    };

    const handlePriorityChange = async (newPriority: TicketPriority) => {
        if (!ticket) return;
        try {
            await api.put(`/api/tickets/${ticket.id}`, { priority: newPriority });
            toast.success(`La prioridad del ticket se actualizó a "${ticketPriorityTranslations[newPriority] || newPriority}".`);
            fetchTicketDetails();
        } catch (error) {
            toast.error("No se pudo actualizar la prioridad del ticket.");
        }
    };

    const handleReassignTicket = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newAgentId = formData.get('agentId');
        if (!newAgentId || !ticket) return;

        try {
            await api.put(`/api/tickets/${ticket.id}/reassign`, { newAgentId });
            toast.success('Ticket reasignado exitosamente.');
            fetchTicketDetails();
        } catch (error) {
            toast.error('Error al reasignar el ticket.');
        }
    };

    // ✅ AÑADIDO: Función para eliminar el ticket
    const handleDeleteTicket = async () => {
        if (!ticket) return;
        try {
            await api.delete(`/api/tickets/${ticket.id}`);
            toast.success('Ticket eliminado exitosamente.');
            setIsDeleteModalOpen(false);
            navigate('/admin/tickets'); // Redirigir a la lista de tickets
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al eliminar el ticket.');
            setIsDeleteModalOpen(false);
        }
    };
    // FIN MODIFICACIÓN

    if (loading) return <div className="p-8 text-center">Cargando ticket...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    
    if (!ticket) return <div className="p-8 text-center">Ticket no encontrado.</div>;

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Ticket #{ticket.id}: {ticket.title}</h1>
                    <button onClick={() => navigate(-1)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Volver</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda: Detalles y Conversación */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detalles del Ticket</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><strong className="block text-gray-500">Cliente:</strong> {ticket.client_name}</div>
                                <div><strong className="block text-gray-500">Departamento:</strong> {ticket.ticket_department_name ? `${ticket.ticket_department_name} (${ticket.department_id})` : ticket.department_id}</div>
                                <div><strong className="block text-gray-500">Categoría:</strong> {ticket.ticket_category_name || 'N/A'}</div>
                                <div><strong className="block text-gray-500">Creado:</strong> {formatLocalDate(ticket.created_at)}</div>
                            </div>
                            <h3 className="text-lg font-semibold mt-6 mb-2">Descripción</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                        </div>

                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Archivos Adjuntos</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {ticket.attachments.map(att => (
                                        <a 
                                            key={att.id}
                                            href={`/${att.file_path.replace(/\\/g, '/')}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="border rounded-lg p-2 text-center hover:bg-gray-50 transition-colors group"
                                            title={`Ver: ${att.file_name}`}
                                        >
                                            {att.file_type && att.file_type.startsWith('image/') ? (
                                                <img src={`/${att.file_path.replace(/\\/g, '/')}`} alt={att.file_name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                            ) : att.file_type && att.file_type.startsWith('video/') ? (
                                                <div className="w-full h-24 bg-black rounded-md mb-2 flex items-center justify-center">
                                                    <svg className="w-10 h-10 text-white opacity-75" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <FileIcon className="w-full h-24" />
                                            )}
                                            <p className="text-sm text-gray-700 truncate group-hover:underline">
                                                {att.file_name}
                                            </p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Conversación</h2>
                            <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                                {ticket.comments?.map(comment => (
                                    <div key={comment.id} className={`p-4 rounded-lg ${comment.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span className="font-bold">{comment.username || 'Sistema'}</span>
                                            <span>{formatLocalDate(comment.created_at)}</span>
                                        </div>
                                        <p className="text-gray-800 mt-2">{comment.comment_text}</p>
                                        {comment.is_internal && <span className="text-xs font-bold text-yellow-600 mt-2 block">NOTA INTERNA</span>}
                                    </div>
                                ))}
                            </div>
                            {ticket.status !== 'closed' && user && <CommentForm onAddComment={handleAddComment} userRole={user.role} />}
                        </div>
                    </div>

                    {/* Columna Derecha: Acciones */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Estado y Prioridad</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Estado Actual</label>
                                    <select 
                                        value={ticket.status}
                                        onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        disabled={ticket.status === 'closed'}
                                    >
                                        <option value="open">Abierto</option>
                                        <option value="in-progress">En Progreso</option>
                                        <option value="resolved">Resuelto</option>
                                        <option value="closed">Cerrado</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label htmlFor="priority-select" className="block text-sm font-medium text-gray-700">Prioridad</label>
                                    <select 
                                        id="priority-select"
                                        value={ticket.priority}
                                        onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        disabled={ticket.status === 'closed'}
                                    >
                                        {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                                            <option key={key} value={key}>{value}</option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Agente Asignado</h2>
                            <p className="font-semibold text-lg">{ticket.agent_name || 'Sin asignar'}</p>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Reasignar Ticket</h2>
                            <form onSubmit={handleReassignTicket}>
                                <select name="agentId" className="w-full p-2 border border-gray-300 rounded-md" defaultValue="">
                                    <option value="" disabled>-- Selecciona un agente --</option>
                                    {agents.map(agent => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.first_name && agent.last_name ? `${agent.first_name} ${agent.last_name}` : agent.username}
                                        </option>
                                    ))}
                                </select>
                                <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-md mt-4 hover:bg-red-700">
                                    Reasignar
                                </button>
                            </form>
                        </div>

                        {/* ✅ AÑADIDO: Botón de Eliminar Ticket (Solo para Admin) */}
                        {user?.role === 'admin' && (
                            <div className="bg-white p-6 rounded-lg shadow-md border border-red-200">
                                <h2 className="text-xl font-bold text-red-700 mb-4">Zona de Peligro</h2>
                                <button 
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-md"
                                >
                                    Eliminar Ticket Permanentemente
                                </button>
                                <p className="text-xs text-gray-600 mt-2 text-center">Esta acción no se puede deshacer.</p>
                            </div>
                        )}
                        {/* FIN MODIFICACIÓN */}

                    </div>
                </div>
            </div>

            {/* ✅ AÑADIDO: Modal de Confirmación de Borrado */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-2xl font-bold text-red-700">Confirmar Eliminación</h3>
                        <p className="my-4 text-gray-700">
                            ¿Estás absolutamente seguro de que quieres eliminar el ticket #{ticket.id}?
                            <br />
                            <strong className="font-bold">Esta acción es irreversible</strong> y se borrarán todos los comentarios y adjuntos asociados.
                        </p>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded-lg">
                                Cancelar
                            </button>
                            <button onClick={handleDeleteTicket} className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg">
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminTicketDetailPage;

