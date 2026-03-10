import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { formatNowArgentina } from '../utils/dateFormatter';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, XAxis as AreaXAxis, YAxis as AreaYAxis, CartesianGrid as AreaGrid
} from 'recharts';
import { FaChartLine, FaMoneyBillWave, FaTools, FaBoxOpen, FaTicketAlt, FaInbox, FaCheckCircle } from 'react-icons/fa';

const WORKSHOP_STATUS_LABELS: Record<string, string> = {
  ingresado: 'Ingresado',
  cotizado: 'Cotizado',
  aceptado: 'Aceptado',
  no_aceptado: 'No Aceptado',
  en_espera: 'En Espera',
  sin_reparacion: 'Sin Reparación',
  listo: 'Listo',
  entregado: 'Entregado',
  entregado_sin_reparacion: 'Entregado sin Reparación',
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  'in-progress': 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  pending: 'Pendiente',
};

interface DashboardData {
  workshop: {
    kpis: {
      totalRecaudadoMes: number;
      dineroEnLaCalle: number;
      equiposEnTaller: number;
    };
    statusDistribution: { status: string; count: number }[];
    technicianPerformance: {
      technicianId: number | null;
      technicianName: string;
      equiposEntregados: number;
      totalManoObra: number;
    }[];
    financialTrend: { year: number; month: number; total: number; label: string }[];
  };
  tickets: {
    kpis: {
      totalCreadosMes: number;
      ticketsAbiertos: number;
      ticketsCerradosMes: number;
    };
    ticketsByStatus: { status: string; count: number }[];
    ticketsByAgent: { agentId: number | null; agentName: string; ticketsResueltos: number }[];
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

type TabId = 'workshop' | 'tickets';

const TABS: { id: TabId; label: string; pdfTitle: string }[] = [
  { id: 'workshop', label: '🛠️ Taller y Facturación', pdfTitle: 'Taller y Facturación' },
  { id: 'tickets', label: '🎫 Tickets de Soporte', pdfTitle: 'Tickets de Soporte' },
];

const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('workshop');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ success: boolean; data: DashboardData }>('/api/reports/dashboard');
        setData(res.data.data);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
            ? (err.response.data as { message?: string })?.message
            : 'Error al cargar el dashboard';
        setError(msg || 'Error al cargar el dashboard');
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
        <p className="text-gray-500 font-medium">Cargando reportes...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">{error || 'No hay datos disponibles.'}</p>
      </div>
    );
  }

  const workshop = data.workshop;
  const tickets = data.tickets;

  const pieData = workshop.statusDistribution.map((d) => ({
    name: WORKSHOP_STATUS_LABELS[d.status] || d.status,
    value: d.count,
  }));

  const ticketPieData = tickets.ticketsByStatus.map((d) => ({
    name: TICKET_STATUS_LABELS[d.status] || d.status,
    value: d.count,
  }));

  const ticketBarData = tickets.ticketsByAgent.map((a) => ({
    name: a.agentName.length > 10 ? a.agentName.slice(0, 8) + '…' : a.agentName,
    fullName: a.agentName,
    resueltos: a.ticketsResueltos,
  }));

  const barData = workshop.technicianPerformance.map((t) => ({
    name: t.technicianName.length > 12 ? t.technicianName.slice(0, 10) + '…' : t.technicianName,
    fullName: t.technicianName,
    equiposEntregados: t.equiposEntregados,
    facturacion: t.totalManoObra,
  }));

  const exportDashboardToPDF = async () => {
    const el = document.getElementById('dashboard-content');
    if (!el) {
      toast.error('No se encontró el contenido a exportar.');
      return;
    }
    toast.info('Generando PDF...');
    try {
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const title = `Reporte de Casa Schettini - ${TABS.find((t) => t.id === activeTab)?.pdfTitle || 'Dashboard'}`;
      const dateStr = formatNowArgentina({
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      doc.setFontSize(16);
      doc.text(title, margin, 15);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(dateStr, margin, 22);
      doc.setTextColor(0, 0, 0);
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const maxH = pageH - margin - 30;
      const finalH = imgH > maxH ? maxH : imgH;
      const finalW = (canvas.width * finalH) / canvas.height;
      const x = (pageW - finalW) / 2;
      doc.addImage(imgData, 'PNG', x, 28, finalW, finalH);
      const filename = `Reporte_Schettini_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      toast.success('PDF descargado correctamente.');
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      toast.error('Error al generar el PDF.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <FaChartLine className="text-2xl text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-800">Dashboard de Reportes</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportDashboardToPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors"
          >
            📄 Exportar a PDF
          </button>
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 border border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab: Taller y Facturación */}
      {activeTab === 'workshop' && (
        <div id="dashboard-content" className="space-y-8">
          {/* KPI Cards - Taller */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 p-5 md:p-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaMoneyBillWave className="text-xl text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ingresos del Mes</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">
                  {formatCurrency(workshop.kpis.totalRecaudadoMes)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border-l-4 border-amber-500 p-5 md:p-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FaBoxOpen className="text-xl text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dinero a Cobrar / En la Calle</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">
                  {formatCurrency(workshop.kpis.dineroEnLaCalle)}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-500 p-5 md:p-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FaTools className="text-xl text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Equipos en Taller</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{workshop.kpis.equiposEnTaller}</p>
              </div>
            </div>
          </div>

          {/* Gráficos Taller */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Distribución por Estado</h2>
              <div className="h-64 md:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Órdenes']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Ingresos - Últimos 6 Meses</h2>
              <div className="h-64 md:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workshop.financialTrend}>
                    <AreaGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <AreaXAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <AreaYAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Ingresos']} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Rendimiento por Técnico (Mes Actual)</h2>
            <div className="h-72 md:h-80 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: barData.length > 4 ? 80 : 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={barData.length > 4 ? -25 : 0}
                    textAnchor={barData.length > 4 ? 'end' : 'middle'}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [name === 'equiposEntregados' ? v : formatCurrency(v), name]}
                    labelFormatter={(_: unknown, payload: { payload?: { fullName?: string } }[]) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="equiposEntregados" name="Equipos Reparados" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="facturacion" name="Facturación (Mano de Obra)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tickets de Soporte */}
      {activeTab === 'tickets' && (
        <div id="dashboard-content" className="space-y-8">
          {/* KPI Cards - Tickets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-xl shadow-md border-l-4 border-indigo-500 p-5 md:p-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <FaTicketAlt className="text-xl text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tickets del Mes</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{tickets.kpis.totalCreadosMes}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border-l-4 border-red-500 p-5 md:p-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <FaInbox className="text-xl text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tickets Abiertos</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{tickets.kpis.ticketsAbiertos}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 p-5 md:p-6 flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaCheckCircle className="text-xl text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tickets Resueltos</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{tickets.kpis.ticketsCerradosMes}</p>
              </div>
            </div>
          </div>

          {/* Gráficos Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Tickets por Estado</h2>
              <div className="h-64 md:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {ticketPieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Tickets']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Top Agentes - Tickets Resueltos</h2>
              <div className="h-64 md:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, 'Resueltos']} labelFormatter={(_: unknown, p: { payload?: { fullName?: string } }[]) => p?.[0]?.payload?.fullName ?? ''} />
                    <Bar dataKey="resueltos" name="Tickets Resueltos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
