import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
// ✅ 1. Se renombra 'Comment' a 'TicketComment' para evitar conflictos de tipos con React
import { TicketData, Comment as TicketComment, User, Department, TicketStatus, TicketPriority } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import { formatLocalDate } from '../../utils/dateFormatter'; // Asegúrate de tener este helper

interface TicketDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: TicketData;
    onSave: (updatedTicket: Partial<TicketData>) => Promise<void>;
    departments: Department[];
    users: User[];
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ isOpen, onClose, ticket, onSave, departments, users }) => {
    const { token, user: currentUser } = useAuth();
    const { addNotification } = useNotification();

    const [editedTitle, setEditedTitle] = useState(ticket.title);
    const [editedDescription, setEditedDescription] = useState(ticket.description);
    const [editedStatus, setEditedStatus] = useState<TicketStatus>(ticket.status);
    const [editedPriority, setEditedPriority] = useState<TicketPriority>(ticket.priority);
    const [editedDepartmentId, setEditedDepartmentId] = useState<number | null>(ticket.department_id);
    const [editedAgentId, setEditedAgentId] = useState<number | null>(ticket.assigned_to_user_id);
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const isAgent = currentUser?.role === 'agent';
    const canEditTicket = isAdmin || (isAgent && ticket.assigned_to_user_id === currentUser?.id);

    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        try {
            const response = await api.get(`/api/tickets/${ticket.id}/comments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setComments(response.data || []);
        } catch (err: unknown) {
            addNotification('Error al cargar comentarios.', 'error');
        } finally {
            setLoadingComments(false);
        }
    }, [ticket.id, token, addNotification]);

    useEffect(() => {
        if (isOpen) {
            // Reiniciar estado al abrir el modal
            setEditedTitle(ticket.title);
            setEditedDescription(ticket.description);
            setEditedStatus(ticket.status);
            setEditedPriority(ticket.priority);
            setEditedDepartmentId(ticket.department_id);
            setEditedAgentId(ticket.assigned_to_user_id);
            fetchComments();
        }
    }, [isOpen, ticket, fetchComments]);

    const handleSave = async () => {
        const updatedFields: Partial<TicketData> = {};
        if (editedTitle !== ticket.title) updatedFields.title = editedTitle;
        if (editedDescription !== ticket.description) updatedFields.description = editedDescription;
        if (editedStatus !== ticket.status) updatedFields.status = editedStatus;
        if (editedPriority !== ticket.priority) updatedFields.priority = editedPriority;
        if (editedDepartmentId !== ticket.department_id) updatedFields.department_id = editedDepartmentId;
        if (editedAgentId !== ticket.assigned_to_user_id) updatedFields.assigned_to_user_id = editedAgentId;

        if (Object.keys(updatedFields).length > 0) {
            await onSave(updatedFields);
        }
        onClose();
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;
        try {
            await api.post(`/api/tickets/${ticket.id}/comments`, { comment_text: newCommentText }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Comentario añadido.', 'success');
            setNewCommentText('');
            fetchComments();
        } catch (err: unknown) {
            addNotification('Error al añadir comentario.', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Detalles del Ticket #{ticket.id}</h2>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Título:</label>
                            <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="w-full p-2 border rounded mt-1" disabled={!canEditTicket} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Estado:</label>
                            <select value={editedStatus} onChange={(e) => setEditedStatus(e.target.value as TicketStatus)} className="w-full p-2 border rounded mt-1" disabled={!canEditTicket}>
                                {Object.entries(ticketStatusTranslations).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prioridad:</label>
                            <select value={editedPriority} onChange={(e) => setEditedPriority(e.target.value as TicketPriority)} className="w-full p-2 border rounded mt-1" disabled={!canEditTicket}>
                                {Object.entries(ticketPriorityTranslations).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Departamento:</label>
                            <select value={editedDepartmentId || ''} onChange={(e) => setEditedDepartmentId(Number(e.target.value))} className="w-full p-2 border rounded mt-1" disabled={!canEditTicket}>
                                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Asignado a:</label>
                            <select value={editedAgentId || ''} onChange={(e) => setEditedAgentId(Number(e.target.value))} className="w-full p-2 border rounded mt-1" disabled={!isAdmin}>
                                <option value="">Sin Asignar</option>
                                {users.filter(u => u.role === 'agent' || u.role === 'admin').map(agent => <option key={agent.id} value={agent.id}>{agent.username}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Creado por:</label>
                            <p className="py-2 px-3 bg-gray-100 rounded text-gray-700 mt-1">{ticket.user_username}</p>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Descripción:</label>
                        <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="w-full p-2 border rounded mt-1 h-24" disabled={!canEditTicket}></textarea>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-2 mt-6 border-t pt-4">Comentarios</h3>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-gray-50 space-y-2">
                        {loadingComments ? <p>Cargando...</p> : comments.map((comment: TicketComment) => (
                            <div key={comment.id} className="p-2 bg-white rounded shadow-sm">
                                <p className="text-sm font-semibold">{comment.user_username} <span className="text-gray-500 text-xs">- {formatLocalDate(comment.created_at)}</span></p>
                                <p className="text-gray-800 mt-1">{comment.comment_text}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddComment} className="mt-4">
                        <textarea className="w-full p-2 border rounded" placeholder="Añadir un comentario..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} required />
                        <div className="flex justify-end mt-2">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Añadir Comentario</button>
                        </div>
                    </form>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Cerrar</button>
                    <button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" disabled={!canEditTicket}>Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailModal;