import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { ApiResponseError, TicketData, User, Company, Department, TicketCategory } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { Bar, Pie, Line, getElementAtEvent } from 'react-chartjs-2';
import 'chart.js/auto'; 
import type { Chart, ChartData } from 'chart.js'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import { toast } from 'react-toastify';

// --- Interfaces ---
interface ReportData {
    ticketsByStatus: { status: string; count: number }[];
    ticketsByPriority: { priority: string; count: number }[];
    ticketsByDepartment: { departmentName: string; count: number; departmentId: number }[]; 
    agentPerformance: { agentName: string; assignedTickets: number; closedTickets: number, agentId: number }[];
    agentResolutionTimes: { agentName: string; resolvedTickets: number; avgResolutionTimeHours: number | null, agentId: number }[];
    ticketsByCategory: { categoryName: string; count: number; categoryId: number }[]; 
    topClients: { clientName: string; count: number, clientId: number }[];
    ticketsByHour: { hour: number; count: number }[];
}

interface FilterOptions {
    agents: User[];
    clients: User[];
    companies: Company[];
    departments: Department[];
    categories: TicketCategory[];
}

// --- Componente Modal de Detalles ---
const DetailsModal: React.FC<{ title: string; items: Partial<TicketData>[]; onClose: () => void; loading: boolean }> = ({ title, items, onClose, loading }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <div className="max-h-96 overflow-y-auto border-t border-b py-2">
                    {loading ? (
                        <p className="text-center text-gray-500 py-4">Cargando...</p>
                    ) : items.length > 0 ? (
                        <ul className="space-y-2">
                            {items.map((ticket) => (
                                <li key={ticket.id} className="p-2 border-b flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-medium">#{ticket.id} - {ticket.title}</span>
                                        <span className="text-xs text-gray-500">{ticket.client_name || 'Sin cliente'}</span>
                                    </div>
                                    <span className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-700">
                                        {ticketStatusTranslations[ticket.status as keyof typeof ticketStatusTranslations] || ticket.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No hay tickets para mostrar.</p>
                    )}
                </div>
                <button onClick={onClose} className="mt-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded w-full">Cerrar</button>
            </div>
        </div>
    );
};

// --- Página Principal ---
const AdminReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const [filters, setFilters] = useState({
        startDate: '2020-01-01',
        endDate: new Date().toISOString().split('T')[0],
        agentId: '',
        companyId: '',
        departmentId: '',
        categoryId: '',
        clientId: ''
    });
    
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        agents: [],
        clients: [],
        companies: [],
        departments: [],
        categories: []
    });

    // Estados para el modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; items: TicketData[] }>({ title: '', items: [] });
    const [modalLoading, setModalLoading] = useState(false);

    // Referencias para los gráficos
    const reportContainerRef = useRef<HTMLDivElement>(null);
    const statusChartRef = useRef<Chart<'pie'>>(null);
    const priorityChartRef = useRef<Chart<'bar'>>(null);
    const departmentChartRef = useRef<Chart<'bar'>>(null);
    const categoryChartRef = useRef<Chart<'bar'>>(null);
    const hourChartRef = useRef<Chart<'line'>>(null);
    const agentChartRef = useRef<Chart<'bar'>>(null);

    // 1. Cargar opciones para filtros
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const [agentsRes, clientsRes, companiesRes, departmentsRes, categoriesRes] = await Promise.all([
                    api.get('/api/users/agents'),
                    api.get('/api/users?role=client'), 
                    api.get('/api/companies'),
                    api.get('/api/departments'),
                    api.get('/api/tickets/categories')
                ]);
                setFilterOptions({
                    agents: agentsRes.data.data || [],
                    clients: clientsRes.data.data || [],
                    companies: companiesRes.data.data || [],
                    departments: departmentsRes.data.data || [],
                    categories: categoriesRes.data.data || []
                });
            } catch (error) {
                console.error(error);
                toast.error("No se pudo cargar la data para los filtros.");
            }
        };
        if (user?.role === 'admin') {
            fetchFilterData();
        }
    }, [user]);

    // 2. Cargar datos del reporte
    const fetchReportData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('startDate', filters.startDate);
            params.append('endDate', filters.endDate);
            if (filters.agentId) params.append('agentId', filters.agentId);
            if (filters.companyId) params.append('companyId', filters.companyId);
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.categoryId) params.append('categoryId', filters.categoryId);
            if (filters.clientId) params.append('clientId', filters.clientId);
            
            const res = await api.get(`/api/reports?${params.toString()}`);
            setReportData(res.data.data);
        } catch (err) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los reportes.' : 'Error inesperado.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchReportData();
        }
    }, [user, fetchReportData]);

    // 3. Mostrar tickets filtrados (Drill-down)
    const showFilteredTickets = async (title: string, modalFilters: Record<string, string | string[]>) => {
        setModalLoading(true);
        setIsModalOpen(true);
        setModalContent({ title: `Cargando: ${title}...`, items: [] });

        try {
            const params = new URLSearchParams();
            // Filtros globales actuales
            params.append('startDate', filters.startDate);
            params.append('endDate', filters.endDate);
            if (filters.agentId) params.append('agentId', filters.agentId);
            if (filters.companyId) params.append('companyId', filters.companyId);
            
            // Filtros específicos del click
            Object.entries(modalFilters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v));
                } else {
                    params.append(key, value);
                }
            });

            const response = await api.get(`/api/tickets?${params.toString()}`);
            setModalContent({ title: `Tickets: ${title}`, items: response.data.data || [] });
        } catch (error) {
            toast.error('No se pudo cargar la lista de tickets.');
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };
    
    // 4. Manejador de Click en Gráficos
    // CORRECCIÓN: Usamos 'any' en el ref para evitar conflictos de tipos entre Pie/Bar/Line
    const handleChartClick = (
        ref: any, 
        event: React.MouseEvent<HTMLCanvasElement>, 
        type: 'status' | 'priority' | 'department' | 'agentPerformance' | 'category' | 'client' | 'hour'
    ) => {
        if (!ref.current || !reportData) return;
        const element = getElementAtEvent(ref.current, event);
        if (!element.length) return;

        const { index } = element[0];
        let modalFilters: Record<string, string> = {};
        let title = '';

        if (type === 'status') {
            const item = reportData.ticketsByStatus[index];
            modalFilters = { status: item.status };
            title = ticketStatusTranslations[item.status as keyof typeof ticketStatusTranslations] || item.status;
        } else if (type === 'priority') {
            const item = reportData.ticketsByPriority[index];
            modalFilters = { priority: item.priority };
            title = ticketPriorityTranslations[item.priority as keyof typeof ticketPriorityTranslations] || item.priority;
        } else if (type === 'department') {
            const item = reportData.ticketsByDepartment[index];
            modalFilters = { departmentId: String(item.departmentId) };
            title = item.departmentName;
        } else if (type === 'category') {
            const item = reportData.ticketsByCategory[index];
            modalFilters = { categoryId: String(item.categoryId) };
            title = item.categoryName;
        } else if (type === 'client') {
            const item = reportData.topClients[index];
            modalFilters = { clientId: String(item.clientId) }; 
            title = `Cliente: ${item.clientName}`;
        } else if (type === 'agentPerformance') {
             const item = reportData.agentPerformance[index];
             modalFilters = { assigned_to_user_id: String(item.agentId) }; // Corrección: usé assigned_to_user_id para filtrar tickets de agente
             title = `Agente: ${item.agentName}`;
        }
        
        if (Object.keys(modalFilters).length > 0) {
            showFilteredTickets(title, modalFilters);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenerateReport = (e: React.FormEvent) => {
        e.preventDefault();
        fetchReportData();
    };

    const handleDownloadPdf = async () => {
        if (!reportData || !reportContainerRef.current) return;
        setIsDownloading(true);
        toast.info("Generando PDF...");
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            doc.setFontSize(18);
            doc.text('Reporte General - Schettini Tickets', 14, 22);
            doc.setFontSize(11);
            
            const agentName = filters.agentId ? filterOptions.agents.find(a => a.id === parseInt(filters.agentId, 10)) : null;
            let subtitle = `Periodo: ${filters.startDate} al ${filters.endDate}`;
            if (agentName) subtitle += ` | Agente: ${agentName.first_name || ''} ${agentName.last_name || agentName.username}`;
            doc.text(subtitle, 14, 30);
            
            autoTable(doc, {
                startY: 40,
                head: [['Estado', 'Cantidad']],
                body: reportData.ticketsByStatus.map(item => [
                    ticketStatusTranslations[item.status as keyof typeof ticketStatusTranslations] || item.status, 
                    item.count
                ]),
            });

            autoTable(doc, {
                head: [['Agente', 'Resueltos', 'Tiempo Promedio']],
                body: reportData.agentResolutionTimes.map(item => [
                    item.agentName, 
                    item.resolvedTickets, 
                    item.avgResolutionTimeHours !== null ? `${item.avgResolutionTimeHours.toFixed(2)} hs` : 'N/A'
                ]),
            });

            autoTable(doc, {
                head: [['Problemática', 'Tickets']],
                body: reportData.ticketsByCategory.map(item => [item.categoryName, item.count]),
            });

            // Captura de gráficos
            const canvas = await html2canvas(reportContainerRef.current, { scale: 1.5 });
            const imgData = canvas.toDataURL('image/png');
            doc.addPage();
            doc.text('Gráficos del Reporte', 14, 22);
            const pdfWidth = doc.internal.pageSize.getWidth() - 28;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 14, 30, pdfWidth, pdfHeight);

            doc.save(`reporte-${filters.endDate}.pdf`);
            toast.success("PDF descargado.");
        } catch (err) {
            toast.error("Error al generar PDF.");
            console.error(err);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Cargando datos del reporte...</div>;
    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
    if (!reportData) return <div className="p-8 text-center">No hay datos disponibles para este rango.</div>;

    // --- Configuración de Datos para Gráficos ---
    const chartOptionsBase = { responsive: true, maintainAspectRatio: false };

    const statusChartData: ChartData<'pie'> = {
        labels: reportData.ticketsByStatus.map(item => ticketStatusTranslations[item.status as keyof typeof ticketStatusTranslations] || item.status),
        datasets: [{ data: reportData.ticketsByStatus.map(item => item.count), backgroundColor: ['#3B82F6', '#6B7280', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'] }],
    };
    const priorityChartData: ChartData<'bar'> = {
        labels: reportData.ticketsByPriority.map(item => ticketPriorityTranslations[item.priority as keyof typeof ticketPriorityTranslations] || item.priority),
        datasets: [{ label: 'Tickets', data: reportData.ticketsByPriority.map(item => item.count), backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#DC2626'] }],
    };
    const departmentChartData: ChartData<'bar'> = {
        labels: reportData.ticketsByDepartment.map(item => item.departmentName),
        datasets: [{ label: 'Tickets', data: reportData.ticketsByDepartment.map(item => item.count), backgroundColor: '#14B8A6' }],
    };
    const categoryChartData: ChartData<'bar'> = {
        labels: reportData.ticketsByCategory.map(item => item.categoryName),
        datasets: [{ label: 'Tickets', data: reportData.ticketsByCategory.map(item => item.count), backgroundColor: '#8B5CF6' }],
    };

    const ticketsByHourData = Array(24).fill(0);
    reportData.ticketsByHour.forEach(item => { ticketsByHourData[item.hour] = item.count; });
    
    const hourChartData: ChartData<'line'> = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
            label: 'Actividad por Hora',
            data: ticketsByHourData,
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            tension: 0.3
        }],
    };

    const agentChartData: ChartData<'bar'> = {
        labels: reportData.agentPerformance.map(item => item.agentName), 
        datasets: [
            { label: 'Asignados', data: reportData.agentPerformance.map(item => item.assignedTickets), backgroundColor: '#10B981' },
            { label: 'Cerrados', data: reportData.agentPerformance.map(item => item.closedTickets), backgroundColor: '#6366F1' },
        ],
    };

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reportes Avanzados</h1>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg self-start sm:self-center">
                        {isDownloading ? 'Generando...' : 'Descargar PDF'}
                    </button>
                </div>
                
                {/* Filtros */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <form onSubmit={handleGenerateReport} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Desde</label>
                                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hasta</label>
                                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Agente</label>
                                <select name="agentId" value={filters.agentId} onChange={handleFilterChange} className="mt-1 block w-full p-2 border rounded-md bg-white">
                                    <option value="">Todos</option>
                                    {filterOptions.agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                <select name="clientId" value={filters.clientId} onChange={handleFilterChange} className="mt-1 block w-full p-2 border rounded-md bg-white">
                                    <option value="">Todos</option>
                                    {filterOptions.clients.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                                {loading ? 'Cargando...' : 'Actualizar Reporte'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Dashboard Visual */}
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Estado</h2>
                            <div className="h-64">
                                <Pie ref={statusChartRef} data={statusChartData} options={chartOptionsBase} onClick={(e) => handleChartClick(statusChartRef, e, 'status')} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Prioridad</h2>
                            <div className="h-64">
                                <Bar ref={priorityChartRef} data={priorityChartData} options={{...chartOptionsBase, plugins: { legend: { display: false }}}} onClick={(e) => handleChartClick(priorityChartRef, e, 'priority')} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Departamentos</h2>
                            <div className="h-64">
                                <Bar ref={departmentChartRef} data={departmentChartData} options={{...chartOptionsBase, plugins: { legend: { display: false }}}} onClick={(e) => handleChartClick(departmentChartRef, e, 'department')} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Actividad por Hora</h2>
                        <div className="h-64">
                            <Line ref={hourChartRef} data={hourChartData} options={{...chartOptionsBase, plugins: { legend: { display: false }}}} />
                        </div>
                    </div>

                    <div ref={reportContainerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Top Problemáticas</h2>
                            <div className="h-80">
                                <Bar ref={categoryChartRef} data={categoryChartData} options={{...chartOptionsBase, indexAxis: 'y', plugins: { legend: { display: false }}}} onClick={(e) => handleChartClick(categoryChartRef, e, 'category')} />
                            </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition">
                            <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Performance Agentes</h2>
                            <div className="h-80">
                                <Bar ref={agentChartRef} data={agentChartData} options={chartOptionsBase} onClick={(e) => handleChartClick(agentChartRef, e, 'agentPerformance')} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <h2 className="text-xl font-semibold p-6 border-b">Top 10 Clientes (Tickets Creados)</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.topClients.map(client => (
                                        <tr key={client.clientId} className="hover:bg-gray-50 cursor-pointer" onClick={() => showFilteredTickets(`Cliente: ${client.clientName}`, { clientId: String(client.clientId) })}>
                                            <td className="px-6 py-4 font-medium text-gray-900">{client.clientName}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 font-bold">{client.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            {isModalOpen && <DetailsModal title={modalContent.title} items={modalContent.items} onClose={() => setIsModalOpen(false)} loading={modalLoading} />}
        </>
    );
};

export default AdminReportsPage;