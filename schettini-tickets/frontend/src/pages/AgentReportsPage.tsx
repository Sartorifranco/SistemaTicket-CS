import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- TRADUCCIONES DE DATOS ---
const translateStatus = (status: string) => {
    const map: Record<string, string> = {
        'open': 'Abierto',
        'in-progress': 'En Proceso',
        'resolved': 'Resuelto',
        'closed': 'Cerrado',
        'pending': 'Pendiente'
    };
    return map[status] || status;
};

const translatePriority = (priority: string) => {
    const map: Record<string, string> = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta',
        'urgent': 'Urgente'
    };
    return map[priority] || priority;
};

const AgentReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const fetchReports = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        console.log("🚀 [Frontend] Obteniendo métricas en español...");

        try {
            const params = new URLSearchParams();
            params.append('startDate', dateRange.startDate);
            params.append('endDate', dateRange.endDate);
            params.append('agentId', String(user.id));

            const response = await api.get(`/api/reports?${params.toString()}`);
            setReportData(response.data.data);
        } catch (error) {
            console.error("❌ Error reportes:", error);
            toast.error("Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    }, [user, dateRange]);

    useEffect(() => {
        if (user) fetchReports();
    }, [user, fetchReports]);

    if (!user) return <div className="p-10 text-center text-gray-500">Cargando perfil...</div>;

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Generando métricas...</p>
        </div>
    );

    if (!reportData) return <div className="p-10 text-center text-gray-400">Sin datos disponibles.</div>;

    // Preparamos datos traducidos para los gráficos
    const statusChartData = reportData.ticketsByStatus?.map((item: any) => ({
        ...item,
        status: translateStatus(item.status) // Traducir etiqueta
    })) || [];

    const priorityChartData = reportData.ticketsByPriority?.map((item: any) => ({
        ...item,
        priority: translatePriority(item.priority) // Traducir etiqueta
    })) || [];

    return (
        <div className="container mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Mis Reportes</h1>
                    <p className="text-gray-500 text-sm">Periodo: {dateRange.startDate} al {dateRange.endDate}</p>
                </div>
                <div className="flex gap-4 mt-4 md:mt-0 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Desde</label>
                        <input type="date" name="startDate" value={dateRange.startDate} onChange={handleDateChange} className="border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hasta</label>
                        <input type="date" name="endDate" value={dateRange.endDate} onChange={handleDateChange} className="border rounded-lg p-2 text-sm" />
                    </div>
                    <button onClick={fetchReports} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 h-10">
                        Actualizar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Asignados</h3>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">
                        {reportData.agentPerformance?.find((a: any) => a.agentId === user.id)?.assignedTickets || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Resueltos</h3>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">
                        {reportData.agentPerformance?.find((a: any) => a.agentId === user.id)?.closedTickets || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Tiempo Promedio</h3>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">
                        {parseFloat(reportData.agentResolutionTimes?.find((a: any) => a.agentId === user.id)?.avgResolutionTimeHours || 0).toFixed(1)} hs
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Gráfico de Estado */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-gray-700 mb-6 text-center">Estado de mis Tickets</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="status" // Usa el nombre traducido
                                label
                            >
                                {statusChartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfico de Prioridad */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-gray-700 mb-6 text-center">Prioridad</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="priority" /> {/* Usa el nombre traducido */}
                            <YAxis />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar dataKey="count" fill="#8884d8" name="Cantidad" radius={[4, 4, 0, 0]}>
                                {priorityChartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AgentReportsPage;