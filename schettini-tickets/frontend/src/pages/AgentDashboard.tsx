import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TicketData, ActivityLog, ApiResponseError, AgentMetrics, AgentNote, TicketStatus, TicketPriority } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { toast } from 'react-toastify';
import { formatLocalDate } from '../utils/dateFormatter';
// ✅ IMPORTAR WIDGET
import DepositariosWidget from '../components/Dashboard/DepositariosWidget';

// --- Componente genérico para el Modal de Detalles (DISEÑO MEJORADO) ---
const DetailsModal: React.FC<{ title: string; items: Partial<TicketData>[]; onClose: () => void; loading: boolean; role: 'agent' | 'admin' | 'client' }> = ({ title, items, onClose, loading, role }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4 border-b pb-3">{title}</h2>
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8">Cargando...</p>
                    ) : items.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {items.map((ticket) => (
                                <li key={ticket.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                        <span className="font-semibold">#{ticket.id} - {ticket.title}</span>
                                        <span className="text-gray-500 ml-2">({ticket.client_name})</span>
                                    </div>
                                    <Link to={`/${role}/tickets/${ticket.id}`} className="text-red-600 hover:underline text-sm font-semibold">Ver</Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No hay tickets para mostrar en esta categoría.</p>
                    )}
                </div>
                <button onClick={onClose} className="mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded w-full">Cerrar</button>
            </div>
        </div>
    );
};

// --- Componente interno: TicketList ---
const TicketList: React.FC<{ tickets: TicketData[], title: string, onTicketClick: (id: number) => void }> = ({ tickets, title, onTicketClick }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">{title}</h2>
            {tickets.length === 0 ? (
                 <p className="text-gray-600 flex-grow flex items-center justify-center">No hay tickets recientes.</p>
            ) : (
                <div className="overflow-x-auto flex-grow">
                    <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onTicketClick(ticket.id)}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{ticket.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{ticket.title}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{ticket.priority}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="sm:hidden space-y-3">
                        {tickets.map((ticket) => (
                             <div key={ticket.id} className="bg-gray-50 p-3 rounded-md border" onClick={() => onTicketClick(ticket.id)}>
                                 <p className="font-bold text-gray-800">#{ticket.id} - {ticket.title}</p>
                                 <p className="text-sm text-gray-600 mt-1">Prioridad: {ticket.priority}</p>
                             </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Componente interno: ActivityLogList ---
const ActivityLogList: React.FC<{ logs: ActivityLog[], title: string }> = ({ logs, title }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">{title}</h2>
            {logs.length === 0 ? (
                <p className="text-gray-600 flex-grow flex items-center justify-center">No hay actividad reciente.</p>
            ) : (
                <ul className="space-y-3 text-gray-700 overflow-y-auto flex-grow">
                    {logs.map((log) => (
                        <li key={log.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                            <p className="text-sm font-medium">{log.description}</p>
                            <p className="text-xs text-gray-500">{formatLocalDate(log.created_at)} por {log.username}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- Componente Principal del Dashboard ---
const AgentDashboard: React.FC = () => {
    const { user, token, isAuthenticated, loading: authLoading } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
    const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
    const [recentActivityLogs, setRecentActivityLogs] = useState<ActivityLog[]>([]);
    const [notes, setNotes] = useState<AgentNote[]>([]);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; items: TicketData[] }>({ title: '', items: [] });
    const [modalLoading, setModalLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!token || !user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [metricsRes, ticketsRes, logsRes, notesRes] = await Promise.all([
                api.get(`/api/dashboard/agent`),
                api.get(`/api/tickets?view=assigned&limit=5`),
                api.get(`/api/activity-logs?user_id=${user.id}&limit=5`),
                api.get('/api/notes')
            ]);

            setAgentMetrics(metricsRes.data.data);
            setRecentTickets(ticketsRes.data.data);
            setRecentActivityLogs(logsRes.data.data);
            setNotes(notesRes.data.data || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                toast.error(`Error al cargar datos: ${apiError?.message || 'Error desconocido'}`);
            } else {
                toast.error('Ocurrió un error inesperado al cargar los datos.');
            }
        } finally {
            setLoading(false);
        }
    }, [token, user?.id]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user?.role === 'agent') {
            fetchData();
        } else if (!authLoading && (!isAuthenticated || user?.role !== 'agent')) {
            addNotification('Acceso denegado.', 'error');
            navigate('/login', { replace: true });
        }
    }, [authLoading, isAuthenticated, user, navigate, addNotification, fetchData]);

    const handleCardClick = async (type: 'assigned' | 'unassigned' | 'resolved') => {
        setModalLoading(true);
        setIsModalOpen(true);

        const titleMap = {
            assigned: 'Mis Tickets Asignados',
            unassigned: 'Tickets Sin Asignar',
            resolved: 'Tickets Resueltos por Mí'
        };
        
        const params = new URLSearchParams();
        params.append('view', type);
        
        try {
            const response = await api.get(`/api/tickets?${params.toString()}`);
            setModalContent({ title: titleMap[type], items: response.data.data || [] });
        } catch (error) {
            toast.error('No se pudo cargar la lista de tickets.');
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };
    
    const handleCreateNote = async () => {
        if (!newNoteContent.trim()) return toast.warn("La nota no puede estar vacía.");
        try {
            await api.post('/api/notes', { content: newNoteContent });
            toast.success('Nota creada con éxito.');
            setNewNoteContent('');
            fetchData();
        } catch (error) {
            toast.error('No se pudo crear la nota.');
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
            try {
                await api.delete(`/api/notes/${noteId}`);
                toast.success('Nota eliminada.');
                fetchData();
            } catch (error) {
                toast.error('No se pudo eliminar la nota.');
            }
        }
    };
    
    const handleUpdateNote = async (noteId: number) => {
        if (!editingContent.trim()) return toast.warn("La nota no puede estar vacía.");
        try {
            await api.put(`/api/notes/${noteId}`, { content: editingContent });
            toast.success('Nota actualizada.');
            setEditingNoteId(null);
            fetchData();
        } catch (error) {
            toast.error('No se pudo actualizar la nota.');
        }
    };
    
    const startEditing = (note: AgentNote) => {
        setEditingNoteId(note.id);
        setEditingContent(note.content);
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><span className="text-lg">Cargando Dashboard...</span></div>;
    }

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Dashboard de Agente</h1>

                {/* ✅ GRILA DE MÉTRICAS + WIDGET */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <button onClick={() => handleCardClick('assigned')} className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow text-left cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-600">Tickets Asignados</h3>
                        <p className="text-3xl sm:text-4xl font-bold text-indigo-600 mt-2">{agentMetrics?.assignedTickets ?? 0}</p>
                    </button>
                    <button onClick={() => handleCardClick('unassigned')} className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow text-left cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-600">Tickets Sin Asignar</h3>
                        <p className="text-3xl sm:text-4xl font-bold text-yellow-600 mt-2">{agentMetrics?.unassignedTickets ?? 0}</p>
                    </button>
                    <button onClick={() => handleCardClick('resolved')} className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow text-left cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-600">Tickets Resueltos</h3>
                        <p className="text-3xl sm:text-4xl font-bold text-green-600 mt-2">{agentMetrics?.resolvedByMe ?? 0}</p>
                    </button>

                    {/* ✅ WIDGET AQUI */}
                    <DepositariosWidget />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <TicketList tickets={recentTickets} title="Tickets Asignados Recientes" onTicketClick={(id) => navigate(`/agent/tickets/${id}`)} />
                    <ActivityLogList logs={recentActivityLogs} title="Mi Actividad Reciente" />
                </div>

                <div className="flex justify-center mb-8">
                    <button onClick={() => navigate('/agent/tickets')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg">
                        Gestionar Todos Mis Tickets
                    </button>
                </div>
                
                <div id="quick-notes" className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Mis Notas Rápidas</h2>
                    <textarea
                        className="w-full p-3 border rounded-md h-24"
                        placeholder="Escribe una nueva nota aquí..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                    ></textarea>
                    <button onClick={handleCreateNote} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                        Añadir Nota
                    </button>

                    <div className="mt-6 border-t pt-4 space-y-4">
                        {notes.length > 0 ? notes.map(note => (
                            <div key={note.id} className="bg-gray-50 p-4 rounded-md border">
                                {editingNoteId === note.id ? (
                                    <>
                                        <textarea 
                                            value={editingContent}
                                            onChange={(e) => setEditingContent(e.target.value)}
                                            className="w-full p-2 border rounded-md h-20"
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <button onClick={() => handleUpdateNote(note.id)} className="text-sm bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600">Guardar</button>
                                            <button onClick={() => setEditingNoteId(null)} className="text-sm bg-gray-200 text-gray-700 py-1 px-3 rounded hover:bg-gray-300">Cancelar</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2">
                                            <p className="text-xs text-gray-400">
                                                Actualizado: {formatLocalDate(note.updated_at)}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                                <button onClick={() => startEditing(note)} className="text-sm text-blue-600 hover:underline">Editar</button>
                                                <button onClick={() => handleDeleteNote(note.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )) : (
                            <p className="text-center text-gray-500">No tienes notas guardadas.</p>
                        )}
                    </div>
                </div>
            </div>
            
            {isModalOpen && user && <DetailsModal title={modalContent.title} items={modalContent.items} onClose={() => setIsModalOpen(false)} loading={modalLoading} role={user.role} />}
        </>
    );
};

export default AgentDashboard;