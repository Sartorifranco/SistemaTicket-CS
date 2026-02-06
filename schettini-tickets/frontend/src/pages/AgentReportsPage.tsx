import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

// Colores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AgentReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Primer día del mes
        endDate: new Date().toISOString().split('T')[0]
    });

    const fetchReports = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('startDate', dateRange.startDate);
            params.append('endDate', dateRange.endDate);
            params.append('agentId', String(user.id)); // 🔒 FILTRO CLAVE: Solo mis datos

            const response = await api.get(`/api/reports?${params.toString()}`);
            setReportData(response.data.data);
        } catch (error) {
            console.error("Error cargando reportes:", error);
            toast.error("No se pudieron cargar los reportes.");
        } finally {
            setLoading(false);
        }
    }, [user, dateRange]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Generando tus métricas...</div>;

    return (
        <div className="container mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
            {/* Header y Filtros */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Mis Reportes de Rendimiento</h1>
                    <p className="text-gray-500 text-sm">Analiza tu productividad en el periodo seleccionado.</p>
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
                    <button onClick={fetchReports} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 h-10">Filtrar</button>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Tickets Asignados</h3>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">
                        {reportData?.agentPerformance?.find((a: any) => a.agentId === user?.id)?.assignedTickets || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Tickets Resueltos</h3>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">
                        {reportData?.agentPerformance?.find((a: any) => a.agentId === user?.id)?.closedTickets || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
                    <h3 className="text-gray-500 text-xs font-bold uppercase">Tiempo Promedio (Hrs)</h3>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">
                        {parseFloat(reportData?.agentResolutionTimes?.find((a: any) => a.agentId === user?.id)?.avgResolutionTimeHours || 0).toFixed(1)}h
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Tickets por Estado */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-gray-700 mb-6 text-center">Estado de Mis Tickets</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={reportData?.ticketsByStatus || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="status"
                                label
                            >
                                {reportData?.ticketsByStatus?.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets por Prioridad */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                    <h3 className="font-bold text-gray-700 mb-6 text-center">Prioridad de Mis Tickets</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData?.ticketsByPriority || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="priority" />
                            <YAxis />
                            <Tooltip cursor={{ fill: '#f3f4f6' }} />
                            <Bar dataKey="count" fill="#8884d8" name="Cantidad" radius={[4, 4, 0, 0]}>
                                {reportData?.ticketsByPriority?.map((entry: any, index: number) => (
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