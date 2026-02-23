import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, Comment as TicketComment, TicketStatus, Attachment } from '../types';
import { ticketStatusTranslations } from '../utils/traslations';
import { toast } from 'react-toastify';
import { formatLocalDate } from '../utils/dateFormatter';
import { getImageUrl } from '../utils/imageUrl';
import CommentForm from '../components/Common/CommentForm';
import SectionCard from '../components/Common/SectionCard';

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>
        {children}
    </span>
);

const FileIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
    <svg className={`${className} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);

const ClientTicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTicketDetails = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const response = await api.get(`/api/tickets/${id}`);
            setTicket(response.data.data);
        } catch (err) {
            setError('No se pudo cargar el ticket o no tienes permiso para verlo.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTicketDetails();
    }, [fetchTicketDetails]);

    const handleAddComment = async (commentText: string) => {
        if (!commentText.trim() || !ticket) return;
        
        const newStatus = ticket.status === 'resolved' ? 'open' : ticket.status;
        try {
            if (newStatus === 'open' && ticket.status === 'resolved') {
                await api.put(`/api/tickets/${ticket.id}/status`, { status: 'open' });
            }
            
            await api.post(`/api/tickets/${ticket.id}/comments`, {
                comment_text: commentText,
                is_internal: false
            });
            
            toast.success("Comentario añadido.");
            if (newStatus === 'open' && ticket.status === 'resolved') {
                toast.info("El ticket ha sido reabierto.");
            }
            
            fetchTicketDetails();
        } catch (err) {
            toast.error("Error al añadir comentario.");
        }
    };

    const handleCloseTicket = async () => {
        if (!ticket) return;
        if (window.confirm("¿Estás seguro de que quieres cerrar este ticket como solucionado?")) {
            try {
                await api.put(`/api/tickets/${ticket.id}/status`, { status: 'closed' });
                toast.success("¡Gracias por tu confirmación! El ticket ha sido cerrado.");
                fetchTicketDetails();
            } catch (error) {
                toast.error("No se pudo cerrar el ticket.");
            }
        }
    };

    const getStatusBadgeColor = (status: TicketStatus) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800';
            case 'in-progress': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'closed': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando ticket...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!ticket) return <div className="p-8 text-center">Ticket no encontrado.</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-800 break-all">Ticket #{ticket.id}: {ticket.title}</h1>
                <button onClick={() => navigate(-1)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg self-start sm:self-center">Volver</button>
            </div>

            {/* ✅ CORRECCIÓN: Se añade el nuevo cartel para tickets cerrados automáticamente */}
            {ticket.status === 'closed' && ticket.closure_reason === 'AUTO_INACTIVITY' && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4 rounded-md shadow-md" role="alert">
                    <p className="font-bold">Ticket Cerrado por Inactividad</p>
                    <p>Este ticket fue cerrado automáticamente por falta de respuesta durante más de 48 horas.</p>
                    <p className="mt-2 text-sm">Si tu problema persiste, por favor, crea un nuevo ticket.</p>
                </div>
            )}

            {ticket.status === 'resolved' && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg shadow-md mb-6" role="alert">
                    <p className="font-bold">¡Ticket Solucionado!</p>
                    <p className="text-sm">Nuestro equipo ha marcado este ticket como resuelto. Por favor, confirma si el problema se ha solucionado.</p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <button onClick={handleCloseTicket} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                            Sí, cerrar el ticket
                        </button>
                        <p className="text-sm self-center">O, si el problema persiste, simplemente <strong>añade un nuevo comentario</strong> abajo y el ticket se reabrirá automáticamente.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SectionCard title="Descripción" className="lg:col-span-2">
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </SectionCard>

                <SectionCard title="Información" className="lg:col-span-1">
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="font-semibold text-gray-600">Estado:</span>
                            <Badge color={getStatusBadgeColor(ticket.status)}>
                                {ticketStatusTranslations[ticket.status] || ticket.status}
                            </Badge>
                        </div>
                    </div>
                </SectionCard>

                {ticket.attachments && ticket.attachments.length > 0 && (
                    <SectionCard title="Archivos Adjuntos" className="lg:col-span-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {ticket.attachments.map((att: Attachment) => {
                                const rawPath = att.file_path ?? att.file_url ?? '';
                                if (!rawPath) return null;
                                const fileUrl = getImageUrl(rawPath);
                                const isImage = att.file_type?.startsWith('image/');
                                const isVideo = att.file_type?.startsWith('video/');
                                return (
                                    <a key={att.id} href={fileUrl} target="_blank" rel="noopener noreferrer"
                                        className="border rounded-lg p-2 text-center hover:bg-gray-50 transition-colors block">
                                        {isImage ? (
                                            <img src={fileUrl} alt="" className="w-full h-24 object-cover rounded-md mb-2"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const ph = e.currentTarget.nextElementSibling as HTMLElement;
                                                    if (ph) ph.classList.remove('hidden');
                                                }} />
                                        ) : null}
                                        {isImage && (
                                            <div className="hidden w-full h-24 bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                                                <FileIcon className="w-10 h-10 shrink-0" />
                                            </div>
                                        )}
                                        {isVideo ? (
                                            <div className="w-full h-24 bg-black rounded-md mb-2 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-white opacity-75" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                            </div>
                                        ) : !isImage ? <FileIcon className="w-full h-24" /> : null}
                                        <p className="text-sm text-gray-700 truncate">{att.file_name}</p>
                                    </a>
                                );
                            })}
                        </div>
                    </SectionCard>
                )}

                <SectionCard title="Conversación" className="lg:col-span-3">
                    <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2">
                        {ticket.comments &&
                            ticket.comments
                                .filter(comment => !comment.is_internal)
                                .map(comment => (
                                    <div key={comment.id} className={`flex flex-col ${comment.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-lg max-w-lg ${comment.user_id === user?.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <p className="text-sm font-bold">{comment.username}</p>
                                            <p className="text-gray-800">{comment.comment_text}</p>
                                            <p className="text-xs text-gray-500 mt-1 text-right">{formatLocalDate(comment.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                    </div>
                    
                    {ticket.status !== 'closed' && user && <CommentForm onAddComment={handleAddComment} userRole={user.role} />}
                    {ticket.status === 'closed' && !ticket.closure_reason && (
                        <div className="text-center p-4 bg-gray-100 rounded-md">
                            <p className="text-gray-600 font-semibold">Este ticket está cerrado.</p>
                            <p className="text-sm text-gray-500">Para un nuevo problema, por favor crea un nuevo ticket.</p>
                        </div>
                    )}
                </SectionCard>
            </div>
        </div>
    );
};

export default ClientTicketDetailPage;