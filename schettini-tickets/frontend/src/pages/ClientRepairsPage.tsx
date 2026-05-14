import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { FaWrench, FaEye } from 'react-icons/fa';

interface RepairOrderItem {
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  reported_fault?: string | null;
}

interface RepairOrder {
  id: number;
  order_number: string;
  entry_date?: string | null;
  status: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  reported_fault?: string;
  included_accessories?: string;
  is_warranty: number;
  created_at?: string;
  items?: RepairOrderItem[];
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
  abandonado: 'Abandonado/Reciclaje'
};

const getStatusColor = (status: string): string => {
  if (['listo', 'entregado', 'entregado_sin_reparacion'].includes(status)) return 'bg-green-100 text-green-800 border-green-200';
  if (['ingresado', 'cotizado', 'no_aceptado', 'en_espera', 'sin_reparacion'].includes(status)) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
};

const ClientRepairsPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    setLoading(true);
    api
      .get<{ success: boolean; data: RepairOrder[] }>('/api/repair-orders/my-orders')
      .then((res) => setOrders(res.data.data || []))
      .catch(() => toast.error('Error al cargar tus reparaciones'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDateTime = (d?: string | null) => (d ? formatDateTimeArgentina(d) : '—');

  const equipmentLabel = (o: RepairOrder) => {
    if (o.items && o.items.length > 0) {
      return o.items.map((it, i) => [it.equipment_type, it.brand, it.model].filter(Boolean).join(' ') || `Equipo ${i + 1}`).join('; ') || 'Sin especificar';
    }
    return [o.equipment_type, o.model].filter(Boolean).join(' ') || 'Sin especificar';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <FaWrench /> Mis Reparaciones
      </h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No tenés órdenes de reparación.</div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:border-indigo-200 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{order.order_number}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{equipmentLabel(order)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Fecha y hora:</span> {formatDateTime(order.entry_date || order.created_at)}
                  </p>
                  {order.reported_fault && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">Falla: {order.reported_fault}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-md text-sm font-medium border ${getStatusColor(order.status)}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/client/repairs/${order.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium"
                  >
                    <FaEye /> Ver detalle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientRepairsPage;
