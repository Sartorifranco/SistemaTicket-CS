import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import { FaPlus, FaEye } from 'react-icons/fa';

interface RepairOrderRow {
  id: number;
  order_number: string;
  client_name?: string;
  client_business_name?: string;
  status: string;
  equipment_type?: string;
  technician_name?: string | null;
  created_at?: string;
}

const RepairOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const [orders, setOrders] = useState<RepairOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ success: boolean; data: RepairOrderRow[] }>('/api/repair-orders')
      .then((res) => setOrders(res.data.data || []))
      .catch(() => toast.error('Error al cargar órdenes'))
      .finally(() => setLoading(false));
  }, []);

  const statusLabels: Record<string, string> = {
    ingresado: 'Ingresado',
    cotizado: 'Cotizado',
    aceptado: 'Aceptado',
    no_aceptado: 'No Aceptado',
    en_espera: 'En Espera',
    sin_reparacion: 'Sin Reparación',
    listo: 'Listo',
    entregado: 'Entregado',
    entregado_sin_reparacion: 'Entregado sin Reparación'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes de Reparación</h1>
        <button
          onClick={() => navigate(`${basePath}/new`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
        >
          <FaPlus /> Nueva Orden
        </button>
      </div>

      <SectionCard title="Listado">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay órdenes. Creá la primera.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Orden</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Equipo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Técnico Asignado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{o.order_number}</td>
                    <td className="px-4 py-2">{o.client_name || '—'} {o.client_business_name && <span className="text-gray-500 text-sm">({o.client_business_name})</span>}</td>
                    <td className="px-4 py-2">{o.equipment_type || '—'}</td>
                    <td className="px-4 py-2">{o.technician_name || '—'}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-200">{statusLabels[o.status] || o.status}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '—'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => navigate(`${basePath}/${o.id}`)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default RepairOrdersListPage;
