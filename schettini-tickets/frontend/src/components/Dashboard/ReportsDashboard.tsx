import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { ReportMetrics, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import { toast } from 'react-toastify';

// Type declaration for jspdf-autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Interfaces for new report data
interface CompanyReportData {
    companyName: string;
    ticketCount: number;
}
interface AgentReportData {
    username: string;
    assignedTickets: number;
    closedTickets: number;
}

const AdminReportsPage: React.FC = () => {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [companyReport, setCompanyReport] = useState<CompanyReportData[]>([]);
    const [agentReport, setAgentReport] = useState<AgentReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const reportContainerRef = useRef<HTMLDivElement>(null);

    const fetchReportData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [metricsRes, companiesRes, agentsRes] = await Promise.all([
                api.get('/api/reports/metrics'),
                api.get('/api/reports/companies'),
                api.get('/api/reports/agents')
            ]);
            setMetrics(metricsRes.data.data);
            setCompanyReport(companiesRes.data.data);
            setAgentReport(agentsRes.data.data);
        } catch (err) {
            const message = isAxiosErrorTypeGuard(err) ? (err.response?.data as ApiResponseError)?.message || 'Error al cargar los reportes.' : 'Error inesperado.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchReportData();
        }
    }, [user, fetchReportData]);

    const handleDownloadPdf = async () => {
        if (!metrics || !reportContainerRef.current) return;
        setIsDownloading(true);
        toast.info("Generando PDF, por favor espera...");

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const canvas = await html2canvas(reportContainerRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            doc.setFontSize(18);
            doc.text('Reporte General del Sistema de Tickets', 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Generado el: ${new Date().toLocaleString('es-AR')}`, 14, 30);

            autoTable(doc, {
                startY: 40,
                head: [['Estado del Ticket', 'Cantidad']],
                body: metrics.ticketsByStatus.map(item => [ticketStatusTranslations[item.status as keyof typeof ticketStatusTranslations] || item.status, item.count]),
            });
            autoTable(doc, {
                head: [['Tickets por Empresa', 'Cantidad']],
                body: companyReport.map(item => [item.companyName, item.ticketCount]),
            });
            autoTable(doc, {
                head: [['Agente', 'Tickets Asignados', 'Tickets Cerrados']],
                body: agentReport.map(item => [item.username, item.assignedTickets, item.closedTickets]),
            });

            doc.addPage();
            doc.setFontSize(18);
            doc.text('Visualización Gráfica', 14, 22);
            
            const pdfWidth = doc.internal.pageSize.getWidth() - 28;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 14, 30, pdfWidth, pdfHeight);

            doc.save(`reporte-completo-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch(err) {
            toast.error("No se pudo generar el PDF.");
            console.error(err);
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando reportes...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    if (!metrics) return <div className="p-8 text-center">No se encontraron datos.</div>;

    const statusChartData = {
        labels: metrics.ticketsByStatus.map(item => ticketStatusTranslations[item.status as keyof typeof ticketStatusTranslations] || item.status),
        datasets: [{ data: metrics.ticketsByStatus.map(item => item.count), backgroundColor: ['#3B82F6', '#6B7280', '#F59E0B', '#10B981', '#8B5CF6'] }],
    };
    const companyChartData = {
        labels: companyReport.map(item => item.companyName),
        datasets: [{ label: 'Tickets', data: companyReport.map(item => item.ticketCount), backgroundColor: '#3B82F6' }],
    };
    const agentChartData = {
        labels: agentReport.map(item => item.username),
        datasets: [
            { label: 'Asignados', data: agentReport.map(item => item.assignedTickets), backgroundColor: '#10B981' },
            { label: 'Cerrados', data: agentReport.map(item => item.closedTickets), backgroundColor: '#8B5CF6' },
        ],
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Reportes Avanzados</h1>
                <button 
                    onClick={handleDownloadPdf} 
                    disabled={isDownloading} 
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg self-start sm:self-center"
                >
                    {isDownloading ? 'Generando...' : 'Descargar Reporte PDF'}
                </button>
            </div>
            
            <div ref={reportContainerRef} className="space-y-8 bg-gray-50 p-4 sm:p-6 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Tickets por Estado</h2>
                        <div className="h-80 flex justify-center"><Pie data={statusChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Tickets por Empresa</h2>
                        <div className="h-80"><Bar data={companyChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">Rendimiento por Agente</h2>
                    <div className="h-80"><Bar data={agentChartData} options={{ maintainAspectRatio: false }} /></div>
                </div>
            </div>
        </div>
    );
};

export default AdminReportsPage;