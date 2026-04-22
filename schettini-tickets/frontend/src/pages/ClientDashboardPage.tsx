import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Department } from '../types';

// Interfaz para la estructura de las métricas que esperamos del backend
interface ClientMetrics {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
}

// --- Componente del Modal para Crear Ticket ---
const CreateTicketModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; }> = ({ isOpen, onClose, onSuccess }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [responseTimeHours, setResponseTimeHours] = useState<number>(48);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [deptsRes, cfgRes] = await Promise.all([
                        api.get('/api/departments'),
                        api.get('/api/settings/company').catch(() => ({ data: { data: {} } })),
                    ]);
                    setDepartments(deptsRes.data.data || []);
                    const data = cfgRes.data?.data ?? cfgRes.data;
                    const h = Number(data?.ticket_response_time_hours);
                    if (Number.isFinite(h) && h > 0) setResponseTimeHours(h);
                } catch {
                    toast.error('No se pudieron cargar los datos.');
                }
            };
            fetchData();
        } else {
            setDescription('');
            setDepartmentId('');
            setAttachments([]);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !departmentId) {
            toast.error('Por favor, complete todos los campos.');
            return;
        }
        setLoading(true);
        // El título del ticket se deriva de las primeras palabras de la descripción
        const firstLine = description.trim().split(/\n/)[0];
        const autoTitle = firstLine.length > 60 ? `${firstLine.substring(0, 57)}...` : firstLine;
        const formData = new FormData();
        formData.append('title', autoTitle || 'Consulta del cliente');
        formData.append('description', description);
        formData.append('department_id', departmentId);
        formData.append('priority', 'medium');

        attachments.forEach(file => {
            formData.append('attachments', file);
        });

        try {
            await api.post('/api/tickets', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('¡Ticket creado exitosamente!');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('No se pudo crear el ticket.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Crear Nuevo Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2 flex-wrap">
                            <span>¿Qué está sucediendo?</span>
                            <span className="text-xs font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                Responderemos su consulta en un plazo máximo de {responseTimeHours}hs hábiles
                            </span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Utilice esta sección para describir su consulta de manera clara y detallada. Cuanta más información nos brinde, más ágil y precisa podrá ser nuestra asistencia."
                            className="w-full p-2 border rounded-md mt-1 h-32"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Departamento</label>
                        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full p-2 border rounded-md mt-1" required>
                            <option value="">Seleccione un departamento</option>
                            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Adjuntar Archivos</label>
                        <input type="file" multiple onChange={e => setAttachments(Array.from(e.target.files || []))} className="w-full text-sm mt-1" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg" disabled={loading}>Cancelar</button>
                        <button type="submit" className="bg-red-600 text-white py-2 px-4 rounded-lg" disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Componente Principal de la Página ---
const ClientDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/dashboard/client');
            setMetrics(response.data.data);
        } catch (err) {
            setError('No se pudieron cargar las estadísticas.');
            console.error("Error fetching client dashboard:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'client') {
            fetchMetrics();
        }
    }, [user, fetchMetrics]);

    if (loading) {
        return <div className="p-8 text-center">Cargando dashboard...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Tu Dashboard</h1>
                <p className="text-md sm:text-lg text-gray-500 mb-8">
                    Bienvenido, {user?.username}. Aquí tienes un resumen de tus tickets.
                </p>

                {metrics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform hover:scale-105">
                            <p className="text-4xl sm:text-5xl font-bold text-blue-600">{metrics.open}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase mt-2">Tickets Abiertos</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform hover:scale-105">
                            <p className="text-4xl sm:text-5xl font-bold text-yellow-500">{metrics.inProgress}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase mt-2">En Progreso</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform hover:scale-105">
                            <p className="text-4xl sm:text-5xl font-bold text-green-600">{metrics.resolved}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase mt-2">Resueltos</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md text-center transition-transform hover:scale-105">
                            <p className="text-4xl sm:text-5xl font-bold text-gray-600">{metrics.closed}</p>
                            <p className="text-sm font-semibold text-gray-500 uppercase mt-2">Cerrados</p>
                        </div>
                    </div>
                )}
                
                <div className="mt-12 text-center bg-white p-8 rounded-lg shadow-md">
                     <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">¿Necesitas ayuda?</h2>
                     <p className="text-gray-600 mb-6 max-w-2xl mx-auto">Si tienes un problema o una nueva consulta, crea un ticket y nuestro equipo se pondrá en contacto contigo.</p>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                        Crear Nuevo Ticket
                    </button>
                </div>
            </div>
            
            <CreateTicketModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchMetrics} // Refresca las métricas después de crear un ticket
            />
        </>
    );
};

export default ClientDashboardPage;