import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaSearch, FaTrashAlt } from 'react-icons/fa';

interface MovementDetail {
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

interface MovementConsolidated extends MovementDetail {
  entry_count: number;
  first_used_at: string;
  last_used_at: string;
}

type ViewMode = 'consolidated' | 'detail';

const ArticleMovementsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [list, setList] = useState<(MovementDetail | MovementConsolidated)[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const ordersBasePath = user?.role === 'agent' ? '/agent/repair-orders' : '/admin/repair-orders';

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('view', viewMode);
      const res = await api.get<{ success: boolean; data: typeof list; view: ViewMode }>(`/api/movements?${params.toString()}`);
      setList(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'status' in err.response ? err.response.status : null;
      if (status === 403) {
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
  }, [searchTerm, viewMode]);

  const formatDate = (s: string) => (s ? formatDateTimeArgentina(s) : '—');

  const isConsolidated = (row: MovementDetail | MovementConsolidated): row is MovementConsolidated =>
    'entry_count' in row && row.entry_count != null;

  const handleDelete = async (row: MovementDetail) => {
    if (!isAdmin) return;
    if (!window.confirm(`¿Eliminar este movimiento de artículo?\n\n${row.article_name}\nOrden: ${row.order_number || '#' + row.order_id}\nCantidad: ${row.quantity}`)) {
      return;
    }
    setDeletingId(row.id);
    try {
      await api.delete(`/api/movements/${row.id}`);
      toast.success('Movimiento eliminado.');
      fetchMovements();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
        ? (err.response.data as { message?: string })?.message
        : 'No se pudo eliminar.';
      toast.error(msg || 'No se pudo eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && list.length === 0) {
    return <div className="p-8 text-center text-gray-500">Cargando movimientos...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaBoxOpen className="text-indigo-600" /> Movimientos de Artículos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vista consolidada: un repuesto por orden con cantidad total (ideal para control de stock).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setViewMode('consolidated')}
              className={`px-3 py-1.5 rounded-md font-medium ${viewMode === 'consolidated' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Consolidado
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-md font-medium ${viewMode === 'detail' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Detalle
            </button>
          </div>
          <div className="relative w-full sm:w-72">
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
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3 font-bold">{viewMode === 'consolidated' ? 'Último uso' : 'Fecha'}</th>
                <th className="p-3 font-bold">Artículo / Descripción</th>
                <th className="p-3 font-bold">Cantidad</th>
                <th className="p-3 font-bold">N° Orden</th>
                <th className="p-3 font-bold">Usuario / Técnico</th>
                {viewMode === 'consolidated' && <th className="p-3 font-bold">Registros</th>}
                {isAdmin && viewMode === 'detail' && <th className="p-3 font-bold w-28 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.length > 0 ? (
                list.map((row) => (
                  <tr key={`${row.order_id}-${row.id}-${row.article_name}`} className="hover:bg-indigo-50/40">
                    <td className="p-3 text-gray-700 text-sm">
                      {viewMode === 'consolidated' && isConsolidated(row)
                        ? formatDate(row.last_used_at)
                        : formatDate(row.created_at)}
                    </td>
                    <td className="p-3 font-medium text-gray-800">{row.article_name || '—'}</td>
                    <td className="p-3 text-gray-700 font-semibold">{row.quantity ?? 1}</td>
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
                    {viewMode === 'consolidated' && (
                      <td className="p-3 text-gray-600 text-sm">
                        {isConsolidated(row) && row.entry_count > 1 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 border border-amber-200" title={`${row.entry_count} cargas; sumadas en cantidad`}>
                            {row.entry_count} cargas
                          </span>
                        ) : (
                          '1'
                        )}
                      </td>
                    )}
                    {isAdmin && viewMode === 'detail' && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                          title="Eliminar movimiento (solo administrador)"
                        >
                          <FaTrashAlt className="text-xs" />
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={viewMode === 'consolidated' ? 6 : isAdmin ? 6 : 5} className="p-8 text-center text-gray-500">
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
