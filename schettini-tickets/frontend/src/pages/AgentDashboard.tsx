import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, ActivityLog, AgentMetrics, AgentNote } from '../types';
import { toast } from 'react-toastify';
import { formatLocalDate } from '../utils/dateFormatter';

// --- Componentes Internos ---
const MetricCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-${color}-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow`}>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        <span className={`text-4xl font-extrabold text-${color}-600 mt-2`}>{value}</span>
    </div>
);

const AgentDashboard: React.FC = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
    const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [notes, setNotes] = useState<AgentNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // Nota: Quitamos depositarios para evitar 404 si no usas ese módulo
            const [metricsRes, ticketsRes, notesRes] = await Promise.all([
                api.get('/api/dashboard/agent'),
                api.get('/api/tickets?view=assigned&limit=5'),
                api.get('/api/notes')
            ]);

            setMetrics(metricsRes.data.data);
            setRecentTickets(ticketsRes.data.data || []);
            setNotes(notesRes.data.data || []);

            try {
                const logsRes = await api.get(`/api/activity-logs?user_id=${user.id}&limit=5`);
                setLogs(logsRes.data.data || []);
            } catch (_) {}
        } catch (error) {
            console.error("Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user?.role === 'agent') {
            fetchData();
        } else if (!authLoading && (!isAuthenticated || user?.role !== 'agent')) {
            navigate('/login');
        }
    }, [authLoading, isAuthenticated, user, navigate, fetchData]);

    // --- Funciones Notas ---
    const addNote = async () => {
        if (!newNote.trim()) return;
        try {
            await api.post('/api/notes', { content: newNote });
            toast.success('Nota creada');
            setNewNote('');
            fetchData();
        } catch (e) { toast.error('Error al crear nota'); }
    };

    const deleteNote = async (id: number) => {
        if (!window.confirm('¿Borrar nota?')) return;
        try {
            await api.delete(`/api/notes/${id}`);
            toast.success('Nota eliminada');
            fetchData();
        } catch (e) { toast.error('Error al borrar nota'); }
    };

    if (authLoading || loading) return <div className="p-10 text-center text-gray-500">Cargando panel...</div>;

    return (
        <div className="container mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard de Agente</h1>
                    <p className="text-gray-500">Bienvenido, {user?.username}</p>
                </div>
                <button onClick={() => navigate('/agent/tickets')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition">
                    Ver Todos Mis Tickets
                </button>
            </div>

            {/* 1. Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Asignados" value={metrics?.assignedTickets || 0} color="blue" />
                <MetricCard title="Sin Asignar" value={metrics?.unassignedTickets || 0} color="yellow" />
                <MetricCard title="Resueltos (Histórico)" value={metrics?.resolvedByMe || 0} color="green" />
            </div>

            {/* 2. Contenido Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Tickets Recientes */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Tickets Asignados Recientes</h3>
                    </div>
                    <div className="divide-y divide-gray-100 flex-1">
                        {recentTickets.length > 0 ? recentTickets.map(ticket => (
                            <div key={ticket.id} className="p-4 hover:bg-gray-50 transition flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">#{ticket.id}</span>
                                        <span className="text-sm text-gray-600 font-medium">{ticket.title}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${
                                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' : 
                                            'bg-gray-100 text-gray-600'
                                        }`}>{ticket.priority}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{ticket.client_name} • {formatLocalDate(ticket.created_at)}</p>
                                </div>
                                <Link to={`/agent/tickets/${ticket.id}`} className="text-indigo-600 opacity-0 group-hover:opacity-100 font-semibold text-sm hover:underline transition-opacity">
                                    Gestionar &rarr;
                                </Link>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-400">No tienes tickets recientes asignados.</div>
                        )}
                    </div>
                </div>

                {/* Notas Rápidas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-96">
                    <h3 className="font-bold text-gray-700 mb-4">Notas Rápidas</h3>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="Escribe una nota..."
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addNote()}
                        />
                        <button onClick={addNote} className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 transition font-bold">+</button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {notes.length > 0 ? notes.map(note => (
                            <div key={note.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 relative group transition hover:shadow-sm">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                <button 
                                    onClick={() => deleteNote(note.id)}
                                    className="absolute top-1 right-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                                    title="Eliminar"
                                >
                                    &times;
                                </button>
                                <span className="text-[10px] text-gray-400 block mt-2 text-right">{formatLocalDate(note.updated_at)}</span>
                            </div>
                        )) : (
                            <p className="text-center text-gray-400 text-sm mt-10">Tus notas personales aparecerán aquí.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentDashboard;