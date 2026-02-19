import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import SectionCard from '../components/Common/SectionCard';
import { FaPlus, FaCalendarAlt, FaList, FaTrash, FaCheck, FaTasks } from 'react-icons/fa';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Task {
    id: number;
    title: string;
    description: string | null;
    assigned_to_user_id: number;
    assigned_by_user_id: number;
    assignee_name: string;
    assigner_name: string;
    assignee_role?: string;
    due_date: string | null;
    due_time: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: string;
    created_at: string;
    completed_at: string | null;
}

interface AssignableUser {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
}

interface AgentTasksPageProps {
    mode?: 'admin';
}

const AgentTasksPage: React.FC<AgentTasksPageProps> = ({ mode }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [showForm, setShowForm] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newAssignedTo, setNewAssignedTo] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newPriority, setNewPriority] = useState('medium');

    const isAdmin = mode === 'admin' || user?.role === 'admin';
    const isSupervisor = user?.role === 'supervisor';
    const canCreate = isAdmin || isSupervisor;

    const fetchTasks = async () => {
        setLoading(true);
        try {
            let url = '/api/tasks?';
            if (!isAdmin && !isSupervisor) url += 'assignedToMe=true&';
            if (filterAssignedTo) url += `assigned_to=${filterAssignedTo}&`;
            if (filterStatus) url += `status=${filterStatus}&`;
            const res = await api.get(url);
            setTasks(res.data.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar tareas');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignableUsers = async () => {
        try {
            const res = await api.get('/api/tasks/assignable-users');
            setAssignableUsers(res.data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { fetchTasks(); }, [filterAssignedTo, filterStatus, isAdmin, isSupervisor]);
    useEffect(() => { if (canCreate) fetchAssignableUsers(); }, [canCreate]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newAssignedTo) {
            toast.error('Título y responsable son obligatorios');
            return;
        }
        try {
            await api.post('/api/tasks', {
                title: newTitle.trim(),
                description: newDescription.trim() || null,
                assigned_to_user_id: parseInt(newAssignedTo),
                due_date: newDueDate || null,
                priority: newPriority
            });
            toast.success('Tarea creada');
            setNewTitle('');
            setNewDescription('');
            setNewAssignedTo('');
            setNewDueDate('');
            setShowForm(false);
            fetchTasks();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al crear';
            toast.error(msg);
        }
    };

    const handleUpdateStatus = async (id: number, status: Task['status']) => {
        try {
            await api.put(`/api/tasks/${id}`, { status });
            toast.success('Estado actualizado');
            fetchTasks();
        } catch (e) {
            toast.error('Error al actualizar');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar esta tarea?')) return;
        try {
            await api.delete(`/api/tasks/${id}`);
            toast.success('Tarea eliminada');
            fetchTasks();
        } catch (e) {
            toast.error('Error al eliminar');
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'cancelled': return 'bg-gray-200 text-gray-600';
            default: return 'bg-amber-100 text-amber-700';
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'border-l-red-500';
            case 'low': return 'border-l-gray-400';
            default: return 'border-l-amber-500';
        }
    };

    // Calendar
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // Pad inicio para que el día 1 caiga en la columna correcta (Dom=0)
    const startPad = getDay(monthStart);
    const days = [...Array(startPad).fill(null), ...daysInMonth];
    const tasksByDate: Record<string, Task[]> = {};
    tasks.filter(t => t.due_date && t.status !== 'cancelled').forEach(t => {
        const d = t.due_date!;
        if (!tasksByDate[d]) tasksByDate[d] = [];
        tasksByDate[d].push(t);
    });

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">
                {isAdmin ? 'Tareas del Equipo' : isSupervisor ? 'Tareas' : 'Mis Tareas'}
            </h1>

            <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('list')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        <FaList /> Listado
                    </button>
                    <button
                        onClick={() => setView('calendar')}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        <FaCalendarAlt /> Calendario
                    </button>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                        <FaPlus /> Nueva Tarea
                    </button>
                )}
            </div>

            {(isAdmin || isSupervisor) && (
                <div className="flex flex-wrap gap-4 mb-4">
                    {isAdmin && (
                        <select
                            value={filterAssignedTo}
                            onChange={e => setFilterAssignedTo(e.target.value)}
                            className="p-2 border rounded text-sm"
                        >
                            <option value="">Todos los asignados</option>
                            {assignableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>
                            ))}
                        </select>
                    )}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="p-2 border rounded text-sm"
                    >
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>
                </div>
            )}

            {showForm && canCreate && (
                <SectionCard title="Crear nueva tarea" className="mb-6">
                    <form onSubmit={handleCreateTask} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Título *</label>
                            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required
                                className="w-full p-2 border rounded" placeholder="Ej: Revisar documentación" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                                className="w-full p-2 border rounded" rows={2} placeholder="Detalles opcionales" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Asignar a *</label>
                                <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} required
                                    className="w-full p-2 border rounded">
                                    <option value="">Seleccionar...</option>
                                    {assignableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Fecha límite</label>
                                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                                    className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Prioridad</label>
                                <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                                    className="w-full p-2 border rounded">
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-medium">Crear</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        </div>
                    </form>
                </SectionCard>
            )}

            {view === 'list' && (
                <SectionCard title={isAdmin ? 'Listado de tareas' : 'Mis tareas asignadas'}>
                    {loading ? (
                        <p className="text-gray-500">Cargando...</p>
                    ) : tasks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No hay tareas.</p>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map(t => (
                                <div
                                    key={t.id}
                                    className={`border-l-4 p-4 rounded-r-lg bg-gray-50 hover:bg-gray-100 ${getPriorityColor(t.priority)}`}
                                >
                                    <div className="flex flex-wrap justify-between items-start gap-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{t.title}</h4>
                                            {t.description && <p className="text-sm text-gray-600 mt-1">{t.description}</p>}
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(t.status)}`}>
                                                    {t.status === 'in_progress' ? 'En progreso' : t.status === 'completed' ? 'Completada' : t.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                                </span>
                                                {(isAdmin || isSupervisor) && (
                                                    <span className="text-xs text-gray-500">Asignado a: {t.assignee_name}</span>
                                                )}
                                                {t.due_date && (
                                                    <span className="text-xs text-gray-500">
                                                        Vence: {format(new Date(t.due_date), "d MMM y", { locale: es })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {t.status !== 'completed' && t.status !== 'cancelled' && (
                                                <>
                                                    {t.status === 'pending' && (
                                                        <button onClick={() => handleUpdateStatus(t.id, 'in_progress')}
                                                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">En progreso</button>
                                                    )}
                                                    <button onClick={() => handleUpdateStatus(t.id, 'completed')}
                                                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Completar</button>
                                                </>
                                            )}
                                            {(isAdmin || t.assigned_by_user_id === user?.id) && (
                                                <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700">
                                                    <FaTrash size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            )}

            {view === 'calendar' && (
                <SectionCard title="Calendario">
                    <div className="mb-4 flex items-center justify-between">
                        <button onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="px-3 py-1 border rounded hover:bg-gray-100">
                            ← Anterior
                        </button>
                        <h3 className="font-bold text-lg capitalize">{format(calendarMonth, "MMMM yyyy", { locale: es })}</h3>
                        <button onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="px-3 py-1 border rounded hover:bg-gray-100">
                            Siguiente →
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
                            <div key={d} className="font-bold text-center text-gray-600 py-1">{d}</div>
                        ))}
                        {days.map((day, i) => {
                            if (!day) return <div key={`pad-${i}`} className="min-h-[80px] p-2 border rounded bg-gray-50" />;
                            const dStr = format(day, 'yyyy-MM-dd');
                            const dayTasks = tasksByDate[dStr] || [];
                            return (
                                <div
                                    key={dStr}
                                    className={`min-h-[80px] p-2 border rounded ${isSameMonth(day, calendarMonth) ? 'bg-white' : 'bg-gray-50'}`}
                                >
                                    <span className={`text-xs font-medium ${isSameMonth(day, calendarMonth) ? '' : 'text-gray-400'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    <div className="mt-1 space-y-1">
                                        {dayTasks.slice(0, 2).map(t => (
                                            <div
                                                key={t.id}
                                                className={`text-xs p-1 rounded truncate ${getStatusColor(t.status)}`}
                                                title={t.title}
                                            >
                                                {t.title}
                                            </div>
                                        ))}
                                        {dayTasks.length > 2 && (
                                            <div className="text-xs text-gray-500">+{dayTasks.length - 2} más</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}
        </div>
    );
};

export default AgentTasksPage;
