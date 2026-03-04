import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  FaShieldAlt,
  FaClock,
  FaTimesCircle,
  FaExclamationTriangle,
  FaFileExcel,
  FaFilter,
  FaSyncAlt,
} from 'react-icons/fa';

interface WarrantyStats {
  total_activas: number;
  tiempo_promedio_resolucion_dias: number | null;
  total_rechazados: number;
  ordenes_mas_30_dias_activas: { id: number; order_number: string; client_name?: string; dias_activos: number | null }[];
  by_supplier: { supplier: string; count: number }[];
  by_brand: { brand: string; count: number }[];
}

interface WarrantyItem {
  id: number;
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
}

interface WarrantyOrder {
  id: number;
  order_number: string;
  entry_date: string | null;
  warranty_status: string | null;
  warranty_type: string | null;
  original_supplier: string | null;
  client_name?: string | null;
  client_business_name?: string | null;
  items: WarrantyItem[];
  serial_number?: string | null;
}

const WARRANTY_STATUS_LABELS: Record<string, string> = {
  ingresado_garantia: 'Ingresado garantía',
  en_diagnostico: 'En diagnóstico',
  espera_aprobacion_proveedor: 'Espera aprobación proveedor',
  enviado_fabrica: 'Enviado a fábrica',
  aprobado_cambio: 'Aprobado cambio',
  reparado_garantia: 'Reparado garantía',
  rechazado_mal_uso: 'Rechazado mal uso',
  finalizado: 'Finalizado',
  entregado: 'Entregado',
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  oficial_fabricante: 'Oficial fabricante',
  garantia_propia: 'Garantía propia',
  garantia_proveedor: 'Garantía proveedor',
};

function daysOpen(entryDate: string | null): number | null {
  if (!entryDate) return null;
  const entry = new Date(entryDate).getTime();
  return Math.floor((Date.now() - entry) / (24 * 60 * 60 * 1000));
}

const WarrantiesDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<WarrantyStats | null>(null);
  const [orders, setOrders] = useState<WarrantyOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    brand: '',
    supplier: '',
    status: '',
    warrantyType: '',
  });

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get<{ success: boolean; data: WarrantyStats }>('/api/warranties/stats');
      setStats(res.data.data || null);
    } catch {
      setStats(null);
      toast.error('Error al cargar estadísticas de garantías');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingList(true);
    try {
      const params: Record<string, string> = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.supplier) params.original_supplier = filters.supplier;
      if (filters.status) params.warranty_status = filters.status;
      if (filters.warrantyType) params.warranty_type = filters.warrantyType;
      const res = await api.get<{ success: boolean; data: WarrantyOrder[] }>('/api/warranties', { params });
      setOrders(res.data.data || []);
    } catch {
      setOrders([]);
      toast.error('Error al cargar listado de garantías');
    } finally {
      setLoadingList(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.supplier, filters.status, filters.warrantyType]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredByBrand = filters.brand
    ? orders.filter((o) => o.items?.some((it) => (it.brand || '').toLowerCase() === filters.brand.toLowerCase()))
    : orders;

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const headers = ['N° Orden', 'Cliente', 'N° Serie', 'Proveedor', 'Estado de Garantía', 'Tipo Garantía', 'Días Abierto'];
      const rows = filteredByBrand.map((o) => {
        const client = o.client_business_name || o.client_name || '—';
        const serial = o.serial_number || (o.items?.[0]?.serial_number ?? '—');
        const supplier = o.original_supplier || '—';
        const status = (o.warranty_status && WARRANTY_STATUS_LABELS[o.warranty_status]) || o.warranty_status || '—';
        const type = (o.warranty_type && WARRANTY_TYPE_LABELS[o.warranty_type]) || o.warranty_type || '—';
        const days = daysOpen(o.entry_date);
        return [o.order_number, client, serial, supplier, status, type, days != null ? days : '—'];
      });
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Garantías');
      const fileName = `garantias_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Exportado correctamente');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const clientDisplay = (o: WarrantyOrder) => o.client_business_name || o.client_name || '—';
  const serialDisplay = (o: WarrantyOrder) => o.serial_number || (o.items?.[0]?.serial_number ?? '—');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaShieldAlt className="text-indigo-600" /> Panel de Garantías
          </h1>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            {loadingStats ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total garantías activas</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{stats?.total_activas ?? 0}</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            {loadingStats ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <FaClock className="text-amber-500" /> Tiempo promedio resolución
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {stats?.tiempo_promedio_resolucion_dias != null
                    ? `${stats.tiempo_promedio_resolucion_dias} días`
                    : '—'}
                </p>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            {loadingStats ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <FaTimesCircle className="text-red-500" /> Casos rechazados
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats?.total_rechazados ?? 0}</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            {loadingStats ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <FaExclamationTriangle className="text-amber-500" /> Equipos demorados (&gt;30 días)
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {stats?.ordenes_mas_30_dias_activas?.length ?? 0}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className="text-gray-500" />
            <span className="font-semibold text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
              <select
                value={filters.brand}
                onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todas</option>
                {stats?.by_brand?.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brand}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor</label>
              <select
                value={filters.supplier}
                onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todos</option>
                {stats?.by_supplier?.map((s) => (
                  <option key={s.supplier} value={s.supplier}>
                    {s.supplier}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todos</option>
                {Object.entries(WARRANTY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo garantía</label>
              <select
                value={filters.warrantyType}
                onChange={(e) => setFilters((f) => ({ ...f, warrantyType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Todos</option>
                {Object.entries(WARRANTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => fetchOrders()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <FaSyncAlt /> Aplicar
            </button>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  dateFrom: '',
                  dateTo: '',
                  brand: '',
                  supplier: '',
                  status: '',
                  warrantyType: '',
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabla + Export */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Órdenes en garantía</h2>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || filteredByBrand.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <FaFileExcel /> Exportar a Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            {loadingList ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : filteredByBrand.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No hay órdenes en garantía con los filtros aplicados.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-3 font-bold">N° Orden</th>
                    <th className="p-3 font-bold">Cliente</th>
                    <th className="p-3 font-bold">N° Serie</th>
                    <th className="p-3 font-bold">Proveedor</th>
                    <th className="p-3 font-bold">Estado de Garantía</th>
                    <th className="p-3 font-bold">Días Abierto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredByBrand.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/repair-orders/${o.id}`)}
                    >
                      <td className="p-3 font-medium text-indigo-600">{o.order_number}</td>
                      <td className="p-3 text-gray-800">{clientDisplay(o)}</td>
                      <td className="p-3 text-gray-700">{serialDisplay(o)}</td>
                      <td className="p-3 text-gray-700">{o.original_supplier || '—'}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-800">
                          {(o.warranty_status && WARRANTY_STATUS_LABELS[o.warranty_status]) || o.warranty_status || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">
                        {daysOpen(o.entry_date) != null ? `${daysOpen(o.entry_date)} días` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantiesDashboardPage;
