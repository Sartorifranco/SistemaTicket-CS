import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../config/axiosConfig';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  FaWrench,
  FaUser,
  FaClock,
  FaExclamationTriangle,
  FaArrowLeft,
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaSortAmountDown,
} from 'react-icons/fa';
import { formatRepairOrderClientDisplay, formatOrderNumber } from '../utils/repairOrderLabels';

interface MonitorOrder {
  id: number;
  order_number: string;
  entry_date: string;
  status: string;
  priority: string;
  promised_date: string | null;
  client_id?: number | null;
  client_name?: string | null;
  client_business_name?: string | null;
  technician_id?: number | null;
  technician_name?: string | null;
  technician_full_name?: string | null;
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  is_warranty?: number | null;
  has_warranty_items?: number | null;
}

// DOC2.2: sólo estados pendientes. Entregado/Abandonado/Reciclaje quedan excluidos del monitor por backend.
const PENDING_STATUSES_ORDER = [
  'ingresado',
  'cotizado',
  'aceptado',
  'no_aceptado',
  'en_espera',
  'sin_reparacion',
  'listo',
] as const;

type PendingStatus = typeof PENDING_STATUSES_ORDER[number];

const STATUS_LABELS: Record<string, string> = {
  ingresado: 'Ingresado',
  cotizado: 'Cotizado',
  aceptado: 'Aceptado',
  no_aceptado: 'No Aceptado',
  en_espera: 'En Espera',
  sin_reparacion: 'Sin Reparación',
  listo: 'Listo',
  entregado: 'Entregado',
  entregado_sin_reparacion: 'Entregado sin Reparación',
  abandonado: 'Abandonado',
};

// DOC2.1: color distintivo por estado para las cajas de resumen
const STATUS_BOX_STYLES: Record<PendingStatus, { bg: string; border: string; text: string; accent: string }> = {
  ingresado:      { bg: 'bg-sky-900/40',     border: 'border-sky-500',     text: 'text-sky-200',     accent: 'text-sky-400' },
  cotizado:       { bg: 'bg-indigo-900/40',  border: 'border-indigo-500',  text: 'text-indigo-200',  accent: 'text-indigo-400' },
  aceptado:       { bg: 'bg-emerald-900/40', border: 'border-emerald-500', text: 'text-emerald-200', accent: 'text-emerald-400' },
  no_aceptado:    { bg: 'bg-rose-900/40',    border: 'border-rose-500',    text: 'text-rose-200',    accent: 'text-rose-400' },
  en_espera:      { bg: 'bg-amber-900/40',   border: 'border-amber-500',   text: 'text-amber-200',   accent: 'text-amber-400' },
  sin_reparacion: { bg: 'bg-slate-700/60',   border: 'border-slate-500',   text: 'text-slate-200',   accent: 'text-slate-300' },
  listo:          { bg: 'bg-teal-900/40',    border: 'border-teal-500',    text: 'text-teal-200',    accent: 'text-teal-400' },
};

const PRIORITY_STYLES: Record<string, string> = {
  Normal: 'bg-gray-200 text-gray-800',
  Urgente: 'bg-amber-400 text-amber-900 font-bold',
  Critico: 'bg-red-500 text-white font-bold',
};

const PRIORITY_OPTIONS = ['Normal', 'Urgente', 'Critico'] as const;

// Estados que consideramos "activos" para que una orden pueda estar demorada.
// Coherente con backend cronJobs.js ACTIVE_STATUSES_FOR_DELAY.
const ACTIVE_STATUSES_FOR_DELAY: string[] = ['ingresado', 'cotizado', 'aceptado'];

type SortMode = 'oldest' | 'newest' | 'most_delayed';

function getElapsed(entryDate: string): { text: string; hours: number; days: number } {
  const entry = new Date(entryDate).getTime();
  const now = Date.now();
  const diffMs = now - entry;
  const hours = diffMs / (1000 * 60 * 60);
  const days = hours / 24;
  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return { text: `${mins} min`, hours, days };
  }
  if (hours < 24) {
    return { text: `${Math.floor(hours)} h`, hours, days };
  }
  return { text: `${Math.floor(days)} días`, hours, days };
}

function isDelayed(order: MonitorOrder, thresholdDays: number): boolean {
  const { status, entry_date, promised_date } = order;
  if (promised_date) {
    const promised = new Date(promised_date).getTime();
    if (Date.now() > promised) return true;
  }
  if (!ACTIVE_STATUSES_FOR_DELAY.includes(status)) return false;
  const { days } = getElapsed(entry_date);
  return days > thresholdDays;
}

const OrderMonitorPage: React.FC = () => {
  const [orders, setOrders] = useState<MonitorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [delayedDaysThreshold, setDelayedDaysThreshold] = useState<number>(3);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<PendingStatus | null>(null);
  const [searchText, setSearchText] = useState('');
  const [techFilter, setTechFilter] = useState<string>(''); // '' = todos, 'unassigned' = sin asignar, o id como string
  const [priorityFilter, setPriorityFilter] = useState<string>(''); // '' = todas
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState(''); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('oldest');
  const [showAdvanced, setShowAdvanced] = useState(true);

  const { socket } = useNotification();
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: MonitorOrder[] }>('/api/repair-orders/monitor');
      setOrders(res.data.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trae el umbral configurado en company_settings. Si falla, mantiene default 3.
  const fetchThreshold = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { delayed_days_threshold?: number | null } }>('/api/settings/company');
      const raw = res.data?.data?.delayed_days_threshold;
      const parsed = raw != null ? Number(raw) : NaN;
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 365) {
        setDelayedDaysThreshold(parsed);
      }
    } catch {
      // silencioso: queda el default
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchThreshold();
  }, [fetchOrders, fetchThreshold]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchOrders();
    socket.on('repair_orders_update', handler);
    return () => {
      socket.off('repair_orders_update', handler);
    };
  }, [socket, fetchOrders]);

  const clientDisplay = (o: MonitorOrder) =>
    formatRepairOrderClientDisplay({
      client_id: o.client_id,
      client_name: o.client_name,
      client_business_name: o.client_business_name,
    });
  const equipmentDisplay = (o: MonitorOrder) =>
    [o.equipment_type, o.brand, o.model].filter(Boolean).join(' / ') || '—';
  const techDisplay = (o: MonitorOrder) =>
    o.technician_full_name || o.technician_name || 'Sin asignar';

  // Opciones de técnicos derivadas de las órdenes (no hace falta un endpoint extra).
  const technicianOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      if (o.technician_id != null) {
        const label = o.technician_full_name || o.technician_name || `Técnico #${o.technician_id}`;
        map.set(String(o.technician_id), label);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [orders]);

  // Contadores por estado (sobre el TOTAL, no sobre filtrado, porque las cajas
  // funcionan como filtros adicionales y deben reflejar el universo completo).
  const statusCounts = useMemo(() => {
    return PENDING_STATUSES_ORDER.reduce((acc, s) => {
      acc[s] = orders.filter((o) => o.status === s).length;
      return acc;
    }, {} as Record<PendingStatus, number>);
  }, [orders]);

  // Aplica todos los filtros.
  const filteredOrders = useMemo(() => {
    const norm = (v: string | null | undefined) => (v || '').toString().toLowerCase();
    const needle = searchText.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;

    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (priorityFilter && o.priority !== priorityFilter) return false;

      if (techFilter) {
        if (techFilter === 'unassigned') {
          if (o.technician_id != null) return false;
        } else if (String(o.technician_id ?? '') !== techFilter) {
          return false;
        }
      }

      if (warrantyOnly) {
        const isWarr = !!o.is_warranty || !!o.has_warranty_items;
        if (!isWarr) return false;
      }

      if (delayedOnly && !isDelayed(o, delayedDaysThreshold)) return false;

      if (from || to) {
        const ed = new Date(o.entry_date).getTime();
        if (from && ed < from) return false;
        if (to && ed > to) return false;
      }

      if (needle) {
        const bag = [
          o.order_number,
          o.client_name,
          o.client_business_name,
          o.equipment_type,
          o.brand,
          o.model,
          o.technician_full_name,
          o.technician_name,
        ]
          .map(norm)
          .join(' ');
        if (!bag.includes(needle)) return false;
      }

      return true;
    });
  }, [
    orders,
    statusFilter,
    priorityFilter,
    techFilter,
    warrantyOnly,
    delayedOnly,
    dateFrom,
    dateTo,
    searchText,
    delayedDaysThreshold,
  ]);

  const sortedOrders = useMemo(() => {
    const copy = [...filteredOrders];
    if (sortMode === 'oldest') {
      copy.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
    } else if (sortMode === 'newest') {
      copy.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    } else {
      // most_delayed: demoradas primero, y dentro de cada grupo las más viejas arriba.
      copy.sort((a, b) => {
        const da = isDelayed(a, delayedDaysThreshold) ? 1 : 0;
        const db = isDelayed(b, delayedDaysThreshold) ? 1 : 0;
        if (da !== db) return db - da;
        return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
      });
    }
    return copy;
  }, [filteredOrders, sortMode, delayedDaysThreshold]);

  const delayedVisibleCount = useMemo(
    () => sortedOrders.filter((o) => isDelayed(o, delayedDaysThreshold)).length,
    [sortedOrders, delayedDaysThreshold]
  );

  const activeFilterCount = [
    statusFilter,
    priorityFilter,
    techFilter,
    warrantyOnly ? 'w' : '',
    delayedOnly ? 'd' : '',
    dateFrom,
    dateTo,
    searchText.trim(),
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatusFilter(null);
    setPriorityFilter('');
    setTechFilter('');
    setWarrantyOnly(false);
    setDelayedOnly(false);
    setDateFrom('');
    setDateTo('');
    setSearchText('');
    setSortMode('oldest');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white text-sm font-medium rounded-lg border border-slate-600 backdrop-blur-sm transition-all"
        title="Volver al sistema"
      >
        <FaArrowLeft size={12} />
        Volver
      </button>

      <header className="mb-5 border-b border-slate-600 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <FaWrench className="text-amber-400" />
          Monitor de Órdenes Técnicas
        </h1>
        <p className="text-slate-400 mt-1 text-base md:text-lg">
          Mostrando <span className="text-white font-semibold">{sortedOrders.length}</span> de{' '}
          <span className="text-white font-semibold">{orders.length}</span> orden
          {orders.length !== 1 ? 'es' : ''} pendiente{orders.length !== 1 ? 's' : ''}.
          {delayedVisibleCount > 0 && (
            <span className="ml-2 text-red-300">
              <FaExclamationTriangle className="inline -mt-1" /> {delayedVisibleCount} demorada
              {delayedVisibleCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-2 text-slate-500 text-sm">
            (umbral demora: {delayedDaysThreshold} día{delayedDaysThreshold !== 1 ? 's' : ''})
          </span>
        </p>
      </header>

      {/* Cajas de resumen por estado (siguen funcionando como filtros rápidos). */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        {PENDING_STATUSES_ORDER.map((s) => {
          const style = STATUS_BOX_STYLES[s];
          const isActive = statusFilter === s;
          return (
            <button
              type="button"
              key={s}
              onClick={() => setStatusFilter(isActive ? null : s)}
              className={`${style.bg} ${style.border} border-2 rounded-xl p-3 text-left transition-all hover:scale-[1.02] ${
                isActive ? 'ring-4 ring-white/30 shadow-lg' : 'opacity-90 hover:opacity-100'
              }`}
              title={`Filtrar por ${STATUS_LABELS[s]}`}
            >
              <div className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                {STATUS_LABELS[s]}
              </div>
              <div className={`text-3xl font-bold mt-1 ${style.accent}`}>{statusCounts[s]}</div>
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda + orden */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nro de orden, cliente, marca, modelo, técnico..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Limpiar búsqueda"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FaSortAmountDown className="text-slate-400 shrink-0" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400 outline-none"
            >
              <option value="oldest">Más antiguas primero</option>
              <option value="newest">Más recientes primero</option>
              <option value="most_delayed">Demoradas primero</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition ${
              showAdvanced
                ? 'bg-amber-500 border-amber-400 text-slate-900 font-semibold'
                : 'bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <FaFilter /> Filtros {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-3 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-2"
              title="Limpiar todos los filtros"
            >
              <FaTimes /> Limpiar
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Técnico</label>
              <select
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400 outline-none"
              >
                <option value="">Todos los técnicos</option>
                <option value="unassigned">— Sin asignar —</option>
                {technicianOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Prioridad</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400 outline-none"
              >
                <option value="">Todas</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ingreso desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ingreso hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setWarrantyOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2 transition ${
                  warrantyOnly
                    ? 'bg-orange-500 border-orange-400 text-white'
                    : 'bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <FaShieldAlt /> Solo garantías
              </button>
              <button
                type="button"
                onClick={() => setDelayedOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-2 transition ${
                  delayedOnly
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <FaExclamationTriangle /> Solo demoradas
              </button>
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setStatusFilter(null)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-slate-600 text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                >
                  <FaTimes /> Estado: {STATUS_LABELS[statusFilter]}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-64 rounded-xl bg-slate-800/50 border border-slate-700">
          <p className="text-slate-400 text-xl">No hay órdenes pendientes</p>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-xl bg-slate-800/50 border border-slate-700 gap-3">
          <p className="text-slate-400 text-lg">No hay órdenes que coincidan con los filtros aplicados.</p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-semibold hover:bg-amber-400"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map((order) => {
            const elapsed = getElapsed(order.entry_date);
            const delayed = isDelayed(order, delayedDaysThreshold);
            const priorityStyle = PRIORITY_STYLES[order.priority] || PRIORITY_STYLES.Normal;
            // DOC2.3: garantía = global (is_warranty) O híbrida (al menos un item con garantía)
            const isFullWarranty = !!order.is_warranty;
            const isHybridWarranty = !isFullWarranty && !!order.has_warranty_items;
            const isWarranty = isFullWarranty || isHybridWarranty;
            const displayNumber = formatOrderNumber(order.order_number, isFullWarranty);

            return (
              <div
                key={order.id}
                className={`rounded-xl p-4 md:p-5 border-2 transition-all ${
                  delayed
                    ? 'bg-red-900/30 border-red-500'
                    : isFullWarranty
                    ? 'bg-orange-900/30 border-orange-500 hover:border-orange-400'
                    : isHybridWarranty
                    ? 'bg-yellow-900/20 border-yellow-500 hover:border-yellow-400'
                    : 'bg-slate-800/80 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isWarranty && (
                      <FaShieldAlt
                        className={`${isFullWarranty ? 'text-orange-400' : 'text-yellow-400'} shrink-0`}
                        title={isFullWarranty ? 'Garantía' : 'Garantía parcial'}
                      />
                    )}
                    <span className={`text-2xl font-bold ${isFullWarranty ? 'text-orange-400' : isHybridWarranty ? 'text-yellow-400' : 'text-amber-400'}`}>
                      {displayNumber}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${priorityStyle}`}>
                    {order.priority}
                  </span>
                </div>

                {isWarranty && (
                  <div
                    className={`mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider ${
                      isFullWarranty
                        ? 'bg-orange-500 text-white'
                        : 'bg-yellow-400 text-yellow-900'
                    }`}
                  >
                    <FaShieldAlt className="text-[10px]" />
                    {isFullWarranty ? 'GARANTÍA' : 'GARANTÍA PARCIAL'}
                  </div>
                )}

                <p className="text-lg font-semibold text-white truncate" title={clientDisplay(order)}>
                  {clientDisplay(order)}
                </p>

                <p className="text-slate-300 text-sm mt-1 truncate" title={equipmentDisplay(order)}>
                  {equipmentDisplay(order)}
                </p>

                <div className="mt-3 flex items-center gap-2 text-slate-400 text-sm">
                  <FaUser className="shrink-0" />
                  <span className={order.technician_name ? 'text-green-400' : 'text-amber-400'}>
                    {techDisplay(order)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-slate-400 text-sm">
                  <FaClock className="shrink-0" />
                  <span>{elapsed.text}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs">{formatDateTimeArgentina(order.entry_date)}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-600 flex justify-between items-center">
                  <span className="px-2 py-1 rounded bg-slate-700 text-sm">
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  {delayed && (
                    <div className="text-lg font-bold p-3 border-2 border-red-500 rounded-lg bg-red-900/50 text-red-200 flex items-center gap-2">
                      <FaExclamationTriangle /> Demora
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderMonitorPage;
