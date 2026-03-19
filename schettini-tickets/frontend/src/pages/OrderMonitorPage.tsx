import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { FaWrench, FaUser, FaClock, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { formatRepairOrderClientDisplay } from '../utils/repairOrderLabels';

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
}

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

  const sortedOrders = [...orders].sort((a, b) => {
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
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-64 rounded-xl bg-slate-800/50 border border-slate-700">
          <p className="text-slate-400 text-xl">No hay órdenes pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedOrders.map((order) => {
            const elapsed = getElapsed(order.entry_date);
            const delayed = isDelayed(order);
            const priorityStyle = PRIORITY_STYLES[order.priority] || PRIORITY_STYLES.Normal;

            return (
              <div
                key={order.id}
                className={`rounded-xl p-4 md:p-5 border-2 transition-all ${
                  delayed
                    ? 'bg-red-900/30 border-red-500'
                    : 'bg-slate-800/80 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl font-bold text-amber-400">{order.order_number}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${priorityStyle}`}
                  >
                    {order.priority}
                  </span>
                </div>

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
