import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { FaWrench, FaEye, FaTimes } from 'react-icons/fa';

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
  labor_cost?: number | null;
  spare_parts_cost?: number | null;
  total_cost?: number | null;
  deposit_paid?: number | null;
  technical_report?: string | null;
  created_at?: string;
  photos?: { id: number; photo_url: string; perspective_label: string }[];
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
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openDetail = (order: RepairOrder) => {
    setSelectedOrder(null);
    setDetailLoading(true);
    api
      .get<{ success: boolean; data: RepairOrder }>(`/api/repair-orders/${order.id}`)
      .then((res) => {
        const data = res.data.data;
        if (data && 'internal_notes' in data) delete (data as Record<string, unknown>).internal_notes;
        setSelectedOrder(data);
      })
      .catch(() => toast.error('Error al cargar el detalle'))
      .finally(() => setDetailLoading(false));
  };

  const formatDateTime = (d?: string | null) =>
    d ? formatDateTimeArgentina(d) : '—';

  const formatCurrency = (n?: number | null) =>
    n != null ? `$${Number(n).toLocaleString('es-AR')}` : '—';

  const equipmentLabel = (o: RepairOrder) => {
    if (o.items && o.items.length > 0) {
      return o.items.map((it, i) => [it.equipment_type, it.brand, it.model].filter(Boolean).join(' ') || `Equipo ${i + 1}`).join('; ') || 'Sin especificar';
    }
    return [o.equipment_type, o.model].filter(Boolean).join(' ') || 'Sin especificar';
  };

  const isQuoted = (status: string) => ['cotizado', 'aceptado', 'en_espera', 'listo', 'entregado', 'entregado_sin_reparacion', 'no_aceptado', 'sin_reparacion'].includes(status);

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
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No tenés órdenes de reparación.
        </div>
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
                    onClick={() => openDetail(order)}
                    className="flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium"
                  >
                    <FaEye /> Ver Detalle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {(selectedOrder || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedOrder?.order_number || 'Cargando...'}
              </h2>
              <button
                onClick={() => { setSelectedOrder(null); }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : selectedOrder ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Fecha y hora de entrada</p>
                    <p>{formatDateTime(selectedOrder.entry_date || selectedOrder.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Equipos ingresados</p>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      <ul className="mt-1 space-y-2">
                        {selectedOrder.items.map((it, idx) => (
                          <li key={idx} className="text-sm p-2 bg-gray-50 rounded border border-gray-100">
                            <span className="font-medium">{it.equipment_type || 'Equipo'} {it.brand && `/ ${it.brand}`} {it.model && `/ ${it.model}`}</span>
                            {it.serial_number && <span className="text-gray-500"> — Serie: {it.serial_number}</span>}
                            {it.reported_fault && <p className="text-gray-600 mt-1">Falla: {it.reported_fault}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-wrap">{selectedOrder.reported_fault || '—'}</p>
                    )}
                  </div>
                  {selectedOrder.technical_report && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Informe técnico</p>
                      <p className="whitespace-pre-wrap">{selectedOrder.technical_report}</p>
                    </div>
                  )}

                  {selectedOrder.photos && selectedOrder.photos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Fotos del equipo al ingreso</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {selectedOrder.photos
                          .filter((p) => p && p.photo_url)
                          .map((p) => (
                            <div key={p.id} className="space-y-1">
                              <img
                                src={getImageUrl(p.photo_url)}
                                alt={p.perspective_label || 'Foto'}
                                className="w-full aspect-square object-cover rounded-lg border"
                              />
                              <p className="text-xs text-gray-500">{p.perspective_label}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {isQuoted(selectedOrder.status) && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Estado financiero</p>
                      <div className="space-y-1 text-sm bg-gray-50 p-4 rounded-lg">
                        <p className="flex justify-between"><span>Mano de obra:</span> {formatCurrency(selectedOrder.labor_cost)}</p>
                        <p className="flex justify-between"><span>Repuestos:</span> {formatCurrency(selectedOrder.spare_parts_cost)}</p>
                        <p className="flex justify-between font-bold"><span>Total:</span> {formatCurrency(selectedOrder.total_cost)}</p>
                        {selectedOrder.deposit_paid != null && selectedOrder.deposit_paid > 0 && (
                          <p className="flex justify-between"><span>Seña abonada:</span> {formatCurrency(selectedOrder.deposit_paid)}</p>
                        )}
                        {selectedOrder.total_cost != null && selectedOrder.deposit_paid != null && (
                          <p className="flex justify-between text-indigo-700 font-medium mt-2">
                            <span>Saldo:</span> {formatCurrency(selectedOrder.total_cost - selectedOrder.deposit_paid)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientRepairsPage;
