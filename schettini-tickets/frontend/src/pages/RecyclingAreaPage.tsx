import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';
import { FaEye, FaRecycle, FaSearch } from 'react-icons/fa';

interface RecyclingOrder {
  id: number;
  order_number: string;
  client_id?: number;
  client_name?: string;
  client_business_name?: string;
  status: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  entry_date?: string | null;
  created_at?: string;
  recycling_notes?: string | null;
  recycling_photos?: string[] | string | null;
}

function parseRecyclingPhotos(v: RecyclingOrder['recycling_photos']): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const RecyclingAreaPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const [orders, setOrders] = useState<RecyclingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchOrders = useCallback(() => {
    setLoading(true);
    api
      .get<{ success: boolean; data: RecyclingOrder[] }>('/api/repair-orders?status=abandonado')
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchText.trim()) return orders;
    const q = searchText.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.client_name && o.client_name.toLowerCase().includes(q)) ||
        (o.client_business_name && o.client_business_name.toLowerCase().includes(q)) ||
        (o.equipment_type && o.equipment_type.toLowerCase().includes(q)) ||
        (o.model && o.model.toLowerCase().includes(q)) ||
        (o.serial_number && o.serial_number.toLowerCase().includes(q))
    );
  }, [orders, searchText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaRecycle className="text-amber-600" /> Área de Reciclaje
        </h1>
        <button
          onClick={() => navigate(isAdmin ? '/admin/repair-orders' : '/agent/repair-orders')}
          className="text-indigo-600 hover:underline flex items-center gap-1"
        >
          ← Volver a Órdenes de Taller
        </button>
      </div>

      <p className="text-gray-600 text-sm">
        Órdenes declaradas en estado <strong>Abandonado/Reciclaje</strong>. Observaciones y fotos de reciclaje son de uso interno (no visibles para el cliente).
      </p>

      <SectionCard title="Órdenes abandonadas">
        <div className="mb-4">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por N° orden, cliente o equipo..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{searchText.trim() ? 'No hay resultados para la búsqueda.' : 'No hay órdenes en reciclaje.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Orden</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Equipo / Modelo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha ingreso</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Observaciones reciclaje</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((o) => (
                  <React.Fragment key={o.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{o.order_number}</td>
                      <td className="px-4 py-2">{o.client_name || '—'} {o.client_business_name && <span className="text-gray-500 text-sm">({o.client_business_name})</span>}</td>
                      <td className="px-4 py-2">{o.equipment_type || '—'} {o.model && <span className="text-gray-500 text-sm">/ {o.model}</span>}</td>
                      <td className="px-4 py-2 text-sm">{formatDate(o.entry_date || o.created_at)}</td>
                      <td className="px-4 py-2 text-sm max-w-xs">
                        {o.recycling_notes ? (
                          <span className="line-clamp-2 text-gray-700">{o.recycling_notes}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Ver detalle y fotos"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => navigate(`${basePath}/${o.id}`)}
                          className="ml-1 p-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                          title="Ver orden completa"
                        >
                          Ver orden
                        </button>
                      </td>
                    </tr>
                    {expandedId === o.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50 border-l border-r border-b">
                          <div className="space-y-3">
                            {o.recycling_notes && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones de reciclaje</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{o.recycling_notes}</p>
                              </div>
                            )}
                            {parseRecyclingPhotos(o.recycling_photos).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Imágenes del estado del equipo</p>
                                <div className="flex flex-wrap gap-4">
                                  {parseRecyclingPhotos(o.recycling_photos).map((url, idx) => (
                                    <div key={idx} className="flex flex-col">
                                      <img
                                        src={getImageUrl(url)}
                                        alt={`Reciclaje ${idx + 1}`}
                                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                                      />
                                      <span className="text-xs text-gray-500 mt-1">Foto {idx + 1}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {(!o.recycling_notes || parseRecyclingPhotos(o.recycling_photos).length === 0) && (
                              <p className="text-sm text-gray-400">Sin observaciones ni fotos de reciclaje.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default RecyclingAreaPage;
