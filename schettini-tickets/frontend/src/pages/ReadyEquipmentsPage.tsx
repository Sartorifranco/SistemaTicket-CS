import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { formatDateArgentina } from '../utils/dateFormatter';
import SectionCard from '../components/Common/SectionCard';
import { FaBoxOpen, FaTicketAlt, FaSearch } from 'react-icons/fa';

interface Activation {
  id: number;
  client_id: number;
  invoice_number: string;
  form_type: string;
  status: string;
  ticket_id?: number | null;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  created_at?: string;
  updated_at?: string;
}

const ReadyEquipmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const fetchList = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Activation[] }>('/api/activations?status=ready')
      .then((res) => setList(res.data.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredList = useMemo(() => {
    if (!searchText.trim()) return list;
    const q = searchText.trim().toLowerCase();
    return list.filter(
      (a) =>
        (a.invoice_number && a.invoice_number.toLowerCase().includes(q)) ||
        (a.client_name && a.client_name.toLowerCase().includes(q)) ||
        (a.client_business_name && a.client_business_name.toLowerCase().includes(q)) ||
        (a.client_email && a.client_email.toLowerCase().includes(q)) ||
        (a.form_type && a.form_type.toLowerCase().includes(q))
    );
  }, [list, searchText]);

  const isAdmin = window.location.pathname.startsWith('/admin');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FaBoxOpen className="text-green-600" /> Equipos Listos
        </h1>
      </div>

      <p className="text-gray-600 text-sm">
        Activaciones y planillas con estado <strong>Listo</strong>. El cliente fue notificado para usar o retirar su equipo/software.
      </p>

      <SectionCard title="Listado">
        <div className="mb-4">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por N° factura/pedido, cliente o email..."
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
        ) : filteredList.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{searchText.trim() ? 'No hay resultados para la búsqueda.' : 'No hay equipos listos.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">N° Factura/Pedido</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ticket</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{a.invoice_number}</td>
                    <td className="px-4 py-2 text-sm">{a.client_name || a.client_business_name || '—'}</td>
                    <td className="px-4 py-2 text-sm">{a.client_email || '—'}</td>
                    <td className="px-4 py-2">
                      {a.ticket_id ? (
                        <button
                          type="button"
                          onClick={() => navigate(isAdmin ? `/admin/tickets/${a.ticket_id}` : `/agent/tickets/${a.ticket_id}`)}
                          className="flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          <FaTicketAlt /> #{a.ticket_id}
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">{(a.updated_at || a.created_at) ? formatDateArgentina(a.updated_at || a.created_at!) : '—'}</td>
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

export default ReadyEquipmentsPage;
