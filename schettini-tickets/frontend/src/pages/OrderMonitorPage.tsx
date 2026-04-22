import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { FaWrench, FaUser, FaClock, FaExclamationTriangle, FaArrowLeft, FaShieldAlt } from 'react-icons/fa';
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
  abandonado: 'Abandonado'
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
  Critico: 'bg-red-500 text-white font-bold'
};

function getElapsed(entryDate: string): { text: string; hours: number } {
  const entry = new Date(entryDate).getTime();
  const now = Date.now();
  const diffMs = now - entry;
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) {
    const mins = Math.floor((diffMs / (1000 * 60)));
    return { text: `${mins} min`, hours };
  }
  if (hours < 24) {
    return { text: `${Math.floor(hours)} h`, hours };
  }
  const days = Math.floor(hours / 24);
  return { text: `${days} días`, hours };
}

function isDelayed(order: MonitorOrder): boolean {
  const { status, entry_date, promised_date } = order;
  const { hours } = getElapsed(entry_date);
  const days = hours / 24;
  if (promised_date) {
    const promised = new Date(promised_date).getTime();
    if (Date.now() > promised) return true;
  }
  if ((status === 'ingresado' || status === 'cotizado') && days > 3) return true;
  return false;
}

const OrderMonitorPage: React.FC = () => {
  const [orders, setOrders] = useState<MonitorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  // DOC2.1: filtro activo por status (null = sin filtro, muestra todos)
  const [statusFilter, setStatusFilter] = useState<PendingStatus | null>(null);
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const clientDisplay = (o: MonitorOrder) =>
    formatRepairOrderClientDisplay({
      client_id: o.client_id,
      client_name: o.client_name,
      client_business_name: o.client_business_name
    });
  const equipmentDisplay = (o: MonitorOrder) =>
    [o.equipment_type, o.brand, o.model].filter(Boolean).join(' / ') || '—';
  const techDisplay = (o: MonitorOrder) =>
    o.technician_full_name || o.technician_name || 'Sin asignar';

  // DOC2.1: contadores por estado para las cajas de resumen
  const statusCounts = PENDING_STATUSES_ORDER.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<PendingStatus, number>);

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.entry_date).getTime();
    const dateB = new Date(b.entry_date).getTime();
    return dateA - dateB;
  });

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

      <header className="mb-6 border-b border-slate-600 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <FaWrench className="text-amber-400" />
          Monitor de Órdenes Técnicas
        </h1>
        <p className="text-slate-400 mt-1 text-lg">
          {orders.length} orden{orders.length !== 1 ? 'es' : ''} pendiente{orders.length !== 1 ? 's' : ''}
          {statusFilter && (
            <>
              {' · Filtrando: '}
              <span className="text-amber-300 font-semibold">{STATUS_LABELS[statusFilter]}</span>
              <button
                type="button"
                onClick={() => setStatusFilter(null)}
                className="ml-2 text-xs underline text-slate-300 hover:text-white"
              >
                Limpiar filtro
              </button>
            </>
          )}
        </p>
      </header>

      {/* DOC2.1: cajas de resumen por estado (clickeables como filtros) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
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
              <div className={`text-3xl font-bold mt-1 ${style.accent}`}>
                {statusCounts[s]}
              </div>
            </button>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-64 rounded-xl bg-slate-800/50 border border-slate-700">
          <p className="text-slate-400 text-xl">No hay órdenes pendientes</p>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-xl bg-slate-800/50 border border-slate-700">
          <p className="text-slate-400 text-lg">
            No hay órdenes en estado &quot;{statusFilter ? STATUS_LABELS[statusFilter] : ''}&quot;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map((order) => {
            const elapsed = getElapsed(order.entry_date);
            const delayed = isDelayed(order);
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
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${priorityStyle}`}
                  >
                    {order.priority}
                  </span>
                </div>

                {/* DOC2.3: etiqueta GARANTÍA clara */}
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
