import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
// ✅ MODIFICACIÓN: Se importa TicketPriority
import { TicketData, Comment as TicketComment, TicketStatus, User, Attachment, TicketPriority } from '../types';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import { formatLocalDate } from '../utils/dateFormatter';
import CommentForm from '../components/Common/CommentForm';
import SectionCard from '../components/Common/SectionCard';

// ✅ AÑADIDO: Icono de Archivo Genérico
const FileIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
    <svg className={`${className} mx-auto text-gray-400 mb-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);

// Componente Badge local para simplicidad visual.
const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>
        {children}
    </span>
);

const AgentTicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [agents, setAgents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

    // Carga todos los datos necesarios para la página (ticket y agentes) en una sola llamada.
    const fetchAllData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [ticketResponse, agentsResponse] = await Promise.all([
                api.get(`/api/tickets/${id}`),
                api.get('/api/users/agents')
            ]);
            setTicket(ticketResponse.data.data);
            setAgents(agentsResponse.data.data || []);
        } catch (error) {
            toast.error("Error al cargar los datos de la página.");
            console.error("Fetch All Data Error:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Maneja la confirmación para reasignar el ticket a un nuevo agente.
    const handleConfirmReassign = async () => {
        if (!selectedAgentId || !ticket) {
            toast.warn("Por favor, selecciona un agente.");
            return;
        }
        try {
            await api.put(`/api/tickets/${ticket.id}/reassign`, { newAgentId: selectedAgentId });
            toast.success("¡Ticket reasignado exitosamente!");
            setSelectedAgentId('');
            await fetchAllData(); 
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Error al reasignar el ticket.");
        } finally {
            setIsReassignModalOpen(false);
        }
    };

    // Maneja el envío de un nuevo comentario.
    const handleAddComment = async (commentText: string, isInternal: boolean) => {
        if (!commentText.trim() || !ticket) return;
        try {
            await api.post(`/api/tickets/${ticket.id}/comments`, {
                comment_text: commentText,
                is_internal: isInternal
            });
            toast.success(isInternal ? "Nota interna añadida." : "Comentario añadido.");
            await fetchAllData();
        } catch (err) {
            toast.error("Error al añadir comentario.");
        }
    };

    // ✅ AÑADIDO: Función para cambiar la prioridad (para Agente)
    const handlePriorityChange = async (newPriority: TicketPriority) => {
        if (!ticket) return;
        try {
            await api.put(`/api/tickets/${ticket.id}`, { priority: newPriority });
            toast.success(`La prioridad del ticket se actualizó a "${ticketPriorityTranslations[newPriority] || newPriority}".`);
            fetchAllData(); // Recargamos los datos del ticket
        } catch (error) {
            toast.error("No se pudo actualizar la prioridad del ticket.");
        }
    };
    // FIN MODIFICACIÓN
    
    // Funciones auxiliares para estilos...
    const getStatusBadgeColor = (status: TicketStatus) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800';
            case 'in-progress': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'closed': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center text-lg">Cargando detalles del ticket...</div>;
    if (!ticket) return <div className="p-8 text-center text-lg">Ticket no encontrado.</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ticket #{ticket.id}: {ticket.title}</h1>
                <button onClick={() => navigate(-1)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Volver</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Sección de Detalles del Ticket */}
                    <SectionCard title="Detalles del Ticket">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <strong className="block text-sm text-gray-500">Cliente</strong>
                                <p className="text-lg">{ticket.client_name}</p>
                            </div>
                            <div>
                                <strong className="block text-sm text-gray-500">Departamento</strong>
                                <p className="text-lg">{ticket.ticket_department_name || ticket.department_id}</p>
                            </div>
                            <div>
                                <strong className="block text-sm text-gray-500">Creado</strong>
                                <p className="text-lg">{formatLocalDate(ticket.created_at)}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <strong className="block text-sm text-gray-500">Descripción</strong>
                                <p className="whitespace-pre-wrap mt-1 p-3 bg-gray-50 rounded-md border">{ticket.description}</p>
                            </div>
                        </div>
                    </SectionCard>
                    
                    {/* Sección de Archivos Adjuntos */}
                    {ticket.attachments && ticket.attachments.length > 0 && (
                        <SectionCard title="Archivos Adjuntos">
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
                        </SectionCard>
                    )}
                    
                    {/* Sección de Conversación */}
                    <SectionCard title="Conversación">
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {ticket.comments && ticket.comments.length > 0 ? (
                                ticket.comments.map(comment => (
                                    <div key={comment.id} className={`p-3 rounded-lg shadow-sm border ${comment.is_internal ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-sm font-semibold text-gray-800">{comment.username}</p>
                                            {comment.is_internal && (
                                                <span className="text-xs font-bold bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">NOTA INTERNA</span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                                        <p className="text-xs text-gray-500 text-right mt-2">{formatLocalDate(comment.created_at)}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-8">No hay comentarios aún.</p>
                            )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                            {user && <CommentForm onAddComment={handleAddComment} userRole={user.role} />}
                        </div>
                    </SectionCard>
                </div>

                {/* Columna Lateral de Acciones */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard title="Estado y Prioridad">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Estado Actual</label>
                                <div className="mt-1">
                                    <Badge color={getStatusBadgeColor(ticket.status)}>
                                        {ticketStatusTranslations[ticket.status] || ticket.status}
                                    </Badge>
                                </div>
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
                    </SectionCard>
                    
                    <SectionCard title="Agente Asignado">
                        <p className="text-lg font-medium">{ticket.agent_name || 'No asignado'}</p>
                    </SectionCard>
                    {(user?.role === 'admin' || user?.role === 'agent') && (
                        <SectionCard title="Reasignar Ticket">
                            <div className="flex flex-col gap-3">
                                <select 
                                    value={selectedAgentId} 
                                    onChange={(e) => setSelectedAgentId(e.target.value)} 
                                    className="w-full p-2 border rounded-md bg-white"
                                >
                                    <option value="">-- Selecciona un agente --</option>
                                    {(user?.role === 'agent' ? agents.filter((a: User) => a.role === 'agent') : agents).map((agent: User) => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.first_name && agent.last_name ? `${agent.first_name} ${agent.last_name}` : agent.username}
                                        </option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => setIsReassignModalOpen(true)} 
                                    disabled={!selectedAgentId} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400"
                                >
                                    Reasignar
                                </button>
                            </div>
                        </SectionCard>
                    )}
                </div>
            </div>

            {/* Modal de Confirmación para Reasignar */}
            {isReassignModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        <h3 className="text-lg font-bold">Confirmar Reasignación</h3>
                        <p className="my-4">¿Estás seguro de que quieres reasignar este ticket?</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setIsReassignModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg">Cancelar</button>
                            <button onClick={handleConfirmReassign} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentTicketDetailPage;

