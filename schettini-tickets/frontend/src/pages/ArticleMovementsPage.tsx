import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaSearch } from 'react-icons/fa';

interface Movement {
  id: number;
  article_name: string;
  order_id: number;
  quantity: number;
  user_id: number | null;
  created_at: string;
  order_number: string | null;
  user_username: string | null;
  user_display_name: string | null;
}

const ArticleMovementsPage: React.FC = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const ordersBasePath = user?.role === 'agent' ? '/agent/repair-orders' : '/admin/repair-orders';

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const res = await api.get<{ success: boolean; data: Movement[] }>(`/api/movements?${params.toString()}`);
      setList(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error('No tenés permiso para ver los movimientos de artículos.');
      } else {
        toast.error('Error al cargar movimientos');
      }
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [searchTerm]);

  const formatDate = (s: string) => (s ? formatDateTimeArgentina(s) : '—');

  if (loading && list.length === 0) {
    return <div className="p-8 text-center text-gray-500">Cargando movimientos...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FaBoxOpen className="text-indigo-600" /> Movimientos de Artículos
        </h1>
        <div className="relative w-full md:w-80">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descripción o código..."
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3 font-bold">Fecha</th>
                <th className="p-3 font-bold">Artículo / Descripción</th>
                <th className="p-3 font-bold">Cantidad</th>
                <th className="p-3 font-bold">N° Orden</th>
                <th className="p-3 font-bold">Usuario / Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.length > 0 ? (
                list.map((row) => (
                  <tr key={row.id} className="hover:bg-indigo-50/40">
                    <td className="p-3 text-gray-700 text-sm">{formatDate(row.created_at)}</td>
                    <td className="p-3 font-medium text-gray-800">{row.article_name || '—'}</td>
                    <td className="p-3 text-gray-700">{row.quantity ?? 1}</td>
                    <td className="p-3">
                      {row.order_number ? (
                        <Link to={`${ordersBasePath}/${row.order_id}`} className="text-indigo-600 hover:underline font-medium">
                          {row.order_number}
                        </Link>
                      ) : (
                        <span className="text-gray-500">#{row.order_id}</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">{row.user_display_name || row.user_username || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {searchTerm ? 'Sin resultados para esa búsqueda.' : 'Aún no hay movimientos de artículos registrados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ArticleMovementsPage;
