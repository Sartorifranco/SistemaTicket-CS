import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  FaCashRegister,
  FaArrowDown,
  FaArrowUp,
  FaWallet,
  FaPlus,
  FaFileExcel,
  FaSyncAlt,
} from 'react-icons/fa';

interface Movement {
  id: number;
  movement_date: string;
  type: 'ingreso' | 'egreso';
  concept: string;
  linked_reference: string | null;
  client_id: number | null;
  payment_method: string | null;
  amount: number;
  user_id: number | null;
  notes: string | null;
  client_username?: string | null;
  client_name?: string | null;
  user_username?: string | null;
  user_name?: string | null;
}

const CONCEPT_LABELS: Record<string, string> = {
  taller: 'Taller',
  remoto: 'Remoto',
  repuesto: 'Repuesto',
  gasto: 'Gasto',
  otro: 'Otro',
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const TechCashPage: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterStart, setFilterStart] = useState(todayStr());
  const [filterEnd, setFilterEnd] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    movementDate: todayStr(),
    type: 'ingreso' as 'ingreso' | 'egreso',
    concept: 'taller',
    linkedReference: '',
    paymentMethod: 'Efectivo',
    amount: '',
    notes: '',
  });

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        startDate: filterStart,
        endDate: filterEnd,
      };
      const res = await api.get<{ success: boolean; data: Movement[] }>('/api/tech-cash', { params });
      setMovements(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      setMovements([]);
      toast.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [filterStart, filterEnd]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const ingresosDia = movements.filter((m) => m.type === 'ingreso').reduce((s, m) => s + Number(m.amount), 0);
  const egresosDia = movements.filter((m) => m.type === 'egreso').reduce((s, m) => s + Number(m.amount), 0);
  const saldoDia = ingresosDia - egresosDia;

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const headers = ['Fecha', 'Tipo', 'Concepto', 'Método', 'Monto', 'Usuario', 'Orden Vinculada', 'Notas'];
      const rows = movements.map((m) => [
        m.movement_date ? new Date(m.movement_date).toLocaleString('es-AR') : '',
        m.type === 'ingreso' ? 'Ingreso' : 'Egreso',
        CONCEPT_LABELS[m.concept] || m.concept,
        m.payment_method || '—',
        m.type === 'egreso' ? -Number(m.amount) : Number(m.amount),
        m.user_name || m.user_username || '—',
        m.linked_reference || '—',
        m.notes || '—',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Caja Técnica');
      XLSX.writeFile(wb, `caja_tecnica_${filterStart}_${filterEnd}.xlsx`);
      toast.success('Exportado a Excel');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.warn('Monto debe ser un número positivo');
      return;
    }
    try {
      await api.post('/api/tech-cash', {
        movementDate: form.movementDate + 'T12:00:00',
        type: form.type,
        concept: form.concept,
        linkedReference: form.linkedReference.trim() || null,
        paymentMethod: form.paymentMethod.trim() || 'Efectivo',
        amount: amountNum,
        notes: form.notes.trim() || null,
      });
      toast.success('Movimiento registrado');
      setModalOpen(false);
      setForm({ ...form, amount: '', notes: '', linkedReference: '' });
      fetchMovements();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaCashRegister className="text-indigo-600" /> Caja Técnica
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2 shadow"
            >
              <FaPlus /> Nuevo Movimiento
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || movements.length === 0}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition font-medium flex items-center gap-2 shadow"
            >
              <FaFileExcel /> {exporting ? 'Exportando…' : 'Exportar a Excel'}
            </button>
            <button
              type="button"
              onClick={() => fetchMovements()}
              className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium flex items-center gap-2"
            >
              <FaSyncAlt /> Actualizar
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ingresos del Día</p>
            <p className="text-2xl font-bold text-green-600 mt-1 flex items-center gap-2">
              <FaArrowDown /> ${ingresosDia.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Egresos del Día</p>
            <p className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-2">
              <FaArrowUp /> ${egresosDia.toLocaleString('es-AR')}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Saldo (período)</p>
            <p className={`text-2xl font-bold mt-1 flex items-center gap-2 ${saldoDia >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
              <FaWallet /> ${saldoDia.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* Filtro fechas */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <input
            type="date"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <input
            type="date"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Cargando movimientos…</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Tipo</th>
                    <th className="p-4 font-bold">Concepto</th>
                    <th className="p-4 font-bold">Método</th>
                    <th className="p-4 font-bold text-right">Monto</th>
                    <th className="p-4 font-bold">Usuario</th>
                    <th className="p-4 font-bold">Orden Vinculada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No hay movimientos en el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-800">
                          {m.movement_date ? new Date(m.movement_date).toLocaleString('es-AR') : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${m.type === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{CONCEPT_LABELS[m.concept] || m.concept}</td>
                        <td className="p-4 text-sm">{m.payment_method || '—'}</td>
                        <td className={`p-4 text-sm text-right font-medium ${m.type === 'egreso' ? 'text-red-600' : 'text-green-600'}`}>
                          {m.type === 'egreso' ? '-' : ''}${Number(m.amount).toLocaleString('es-AR')}
                        </td>
                        <td className="p-4 text-sm">{m.user_name || m.user_username || '—'}</td>
                        <td className="p-4 text-sm">{m.linked_reference || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nuevo Movimiento */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Nuevo Movimiento</h2>
            <form onSubmit={handleSubmitMovement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.movementDate}
                  onChange={(e) => setForm({ ...form, movementDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'ingreso' | 'egreso' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <select
                  value={form.concept}
                  onChange={(e) => setForm({ ...form, concept: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {Object.entries(CONCEPT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <input
                  type="text"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  placeholder="Efectivo, Transferencia, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden vinculada (ej. REP-123)</label>
                <input
                  type="text"
                  value={form.linkedReference}
                  onChange={(e) => setForm({ ...form, linkedReference: e.target.value })}
                  placeholder="Opcional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechCashPage;
