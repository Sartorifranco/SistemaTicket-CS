import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import { FaBoxOpen, FaTicketAlt } from 'react-icons/fa';

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

function formatDate(d: string | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ReadyEquipmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);

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
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay equipos listos.</p>
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
                {list.map((a) => (
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
                    <td className="px-4 py-2 text-sm">{formatDate(a.updated_at || a.created_at)}</td>
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
