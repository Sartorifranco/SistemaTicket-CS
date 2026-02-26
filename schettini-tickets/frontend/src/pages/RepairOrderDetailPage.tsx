import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';

interface RepairOrder {
  id: number;
  order_number: string;
  client_id: number;
  client_name?: string;
  client_business_name?: string;
  status: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  reported_fault?: string;
  included_accessories?: string;
  is_warranty: number;
  internal_notes?: string;
  entry_date?: string;
  created_at?: string;
  photos?: { id: number; photo_url: string; perspective_label: string }[];
}

const RepairOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ success: boolean; data: RepairOrder }>(`/api/repair-orders/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => toast.error('Error al cargar la orden'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Orden no encontrada</p>
        <button onClick={() => navigate(basePath)} className="mt-4 text-indigo-600 hover:underline">
          Volver
        </button>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    ingresado: 'Ingresado',
    cotizado: 'Cotizado',
    aceptado: 'Aceptado',
    no_aceptado: 'No Aceptado',
    en_espera: 'En Espera',
    sin_reparacion: 'Sin Reparación',
    listo: 'Listo',
    entregado: 'Entregado'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button onClick={() => navigate(basePath)} className="text-indigo-600 hover:underline flex items-center gap-1">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          Orden {order.order_number}
          <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded bg-gray-200">
            {statusLabels[order.status] || order.status}
          </span>
        </h1>
      </div>

      <SectionCard title="Cliente">
        <p className="font-medium">{order.client_name || 'Sin nombre'}</p>
        {order.client_business_name && <p className="text-sm text-gray-500">{order.client_business_name}</p>}
      </SectionCard>

      <SectionCard title="Equipo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Tipo</p>
            <p>{order.equipment_type || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Modelo</p>
            <p>{order.model || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Serie N°</p>
            <p>{order.serial_number || '—'}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs text-gray-500">Falla / Problema Reportado</p>
          <p className="whitespace-pre-wrap">{order.reported_fault || '—'}</p>
        </div>
        {order.included_accessories && (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Accesorios incluidos</p>
            <p>{order.included_accessories}</p>
          </div>
        )}
        {order.is_warranty ? <p className="mt-2 text-sm text-amber-600">En garantía</p> : null}
      </SectionCard>

      {order.photos && order.photos.length > 0 && (
        <SectionCard title="Fotos">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {order.photos.map((p) => (
              <div key={p.id} className="space-y-1">
                <img
                  src={getImageUrl(p.photo_url)}
                  alt={p.perspective_label}
                  className="w-full aspect-square object-cover rounded-lg border"
                />
                <p className="text-xs text-gray-500">{p.perspective_label}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default RepairOrderDetailPage;
