import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  FaFileInvoiceDollar,
  FaWarehouse,
  FaLaptop,
  FaFileExcel,
  FaSyncAlt,
  FaMoneyBillWave,
  FaHandHoldingUsd,
} from 'react-icons/fa';

type TabType = 'taller' | 'remoto';

interface DebtRow {
  id: number;
  order_number: string;
  entry_date: string | null;
  status: string | null;
  total_cost: number | null;
  deposit_paid: number | null;
  saldo: number;
  client_display?: string;
  tech_display?: string;
  estado?: string;
}

interface TotalsData {
  taller: { total_facturado: number; total_cobrado: number; total_pendiente: number };
  remoto: { total_facturado: number; total_cobrado: number; total_pendiente: number };
  startDate: string;
  endDate: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const TechDebtsReportsPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('taller');
  const [tallerRows, setTallerRows] = useState<DebtRow[]>([]);
  const [remotoRows, setRemotoRows] = useState<DebtRow[]>([]);
  const [totals, setTotals] = useState<TotalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState(todayStr());

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (onlyWithBalance) params.onlyWithBalance = 'true';
      const [tallerRes, remotoRes, totalsRes] = await Promise.all([
        api.get<{ success: boolean; data: DebtRow[] }>('/api/reports/debts/taller', { params }),
        api.get<{ success: boolean; data: DebtRow[] }>('/api/reports/debts/remoto', { params }),
        api.get<{ success: boolean; data: TotalsData }>('/api/reports/debts/totals', {
          params: dateStart && dateEnd ? { startDate: dateStart, endDate: dateEnd } : {},
        }),
      ]);
      setTallerRows(Array.isArray(tallerRes.data.data) ? tallerRes.data.data : []);
      setRemotoRows(Array.isArray(remotoRes.data.data) ? remotoRes.data.data : []);
      setTotals(totalsRes.data.data || null);
    } catch {
      setTallerRows([]);
      setRemotoRows([]);
      setTotals(null);
      toast.error('Error al cargar informes de deudas');
    } finally {
      setLoading(false);
    }
  }, [onlyWithBalance, dateStart, dateEnd]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const currentRows = tab === 'taller' ? tallerRows : remotoRows;
  const currentTotals = totals
    ? tab === 'taller'
      ? totals.taller
      : totals.remoto
    : { total_facturado: 0, total_cobrado: 0, total_pendiente: 0 };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const headers = ['N° Orden', 'Fecha', 'Cliente', 'Total', 'Abonado', 'Saldo Pendiente', 'Estado'];
      const rows = currentRows.map((r) => [
        r.order_number || '—',
        r.entry_date ? new Date(r.entry_date).toLocaleDateString('es-AR') : '—',
        r.client_display || '—',
        Number(r.total_cost ?? 0),
        Number(r.deposit_paid ?? 0),
        r.saldo ?? 0,
        r.estado || '—',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tab === 'taller' ? 'Deudas Taller' : 'Deudas Remoto');
      XLSX.writeFile(wb, `deudas_${tab}_${todayStr()}.xlsx`);
      toast.success('Exportado a Excel');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaFileInvoiceDollar className="text-indigo-600" /> Informes de Deudas
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || currentRows.length === 0}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition font-medium flex items-center gap-2 shadow"
            >
              <FaFileExcel /> {exporting ? 'Exportando…' : 'Exportar a Excel'}
            </button>
            <button
              type="button"
              onClick={() => fetchDebts()}
              className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-2"
            >
              <FaSyncAlt /> Actualizar
            </button>
          </div>
        </div>

        {/* Tabs Taller / Remoto */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('taller')}
            className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition ${
              tab === 'taller' ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FaWarehouse /> Taller
          </button>
          <button
            type="button"
            onClick={() => setTab('remoto')}
            className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition ${
              tab === 'remoto' ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FaLaptop /> Remoto
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithBalance}
              onChange={(e) => setOnlyWithBalance(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Solo con saldo pendiente</span>
          </label>
          <span className="text-gray-400">|</span>
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Tarjetas de totales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Facturado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
              <FaFileInvoiceDollar className="text-indigo-500" /> ${currentTotals.total_facturado.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Cobrado</p>
            <p className="text-2xl font-bold text-green-600 mt-1 flex items-center gap-2">
              <FaMoneyBillWave /> ${currentTotals.total_cobrado.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pendiente</p>
            <p className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-2">
              <FaHandHoldingUsd /> ${currentTotals.total_pendiente.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Cargando…</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4 font-bold">N° Orden</th>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold text-right">Total</th>
                    <th className="p-4 font-bold text-right">Abonado</th>
                    <th className="p-4 font-bold text-right">Saldo Pendiente</th>
                    <th className="p-4 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No hay órdenes {tab === 'taller' ? 'de taller' : 'remotas'} en el criterio seleccionado.
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-800">{r.order_number || '—'}</td>
                        <td className="p-4 text-sm text-gray-700">
                          {r.entry_date ? new Date(r.entry_date).toLocaleDateString('es-AR') : '—'}
                        </td>
                        <td className="p-4 text-sm">{r.client_display || '—'}</td>
                        <td className="p-4 text-sm text-right">${Number(r.total_cost ?? 0).toLocaleString('es-AR')}</td>
                        <td className="p-4 text-sm text-right text-green-600">${Number(r.deposit_paid ?? 0).toLocaleString('es-AR')}</td>
                        <td className="p-4 text-sm text-right font-medium text-amber-600">${Number(r.saldo ?? 0).toLocaleString('es-AR')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            r.estado === 'Cancelado' ? 'bg-gray-200 text-gray-700' :
                            r.estado === 'Parcial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.estado || 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechDebtsReportsPage;
