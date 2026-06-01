import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { formatDateArgentina } from '../utils/dateFormatter';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';
import { useAuth } from '../context/AuthContext';
import {
  FaCheck,
  FaTimes,
  FaFileDownload,
  FaUser,
  FaExternalLinkAlt,
  FaPaperclip
} from 'react-icons/fa';

interface PendingPayment {
  id: number;
  user_id: number;
  amount: number;
  created_at: string;
  status: string;
  method?: string;
  payment_method?: string;
  description?: string;
  receipt_url?: string;
  username?: string;
  full_name?: string;
  business_name?: string;
}

const clientLabel = (p: PendingPayment) =>
  p.business_name?.trim() || p.full_name?.trim() || p.username || `Usuario #${p.user_id}`;

const AdminPaymentsInboxPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('paymentId');
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: PendingPayment[] }>('/api/payments/admin/pending');
      setPayments(res.data.data || []);
    } catch {
      toast.error('No se pudieron cargar los pagos pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const id = parseInt(highlightId, 10);
    if (Number.isNaN(id)) return;
    const row = rowRefs.current[id];
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('ring-2', 'ring-indigo-500');
      const t = window.setTimeout(() => row.classList.remove('ring-2', 'ring-indigo-500'), 4000);
      return () => window.clearTimeout(t);
    }
    if (!payments.some((p) => p.id === id)) {
      api
        .get<{ success: boolean; data: PendingPayment }>(`/api/payments/admin/payment/${id}`)
        .then((res) => {
          const p = res.data.data;
          if (p.status !== 'pending') {
            toast.info(
              `El pago #${id} ya fue ${p.status === 'approved' ? 'aprobado' : 'rechazado'}.`
            );
          }
          if (user?.role === 'admin' && p.user_id) {
            navigate(`/admin/users/${p.user_id}/payments?paymentId=${id}`, { replace: true });
          }
        })
        .catch(() => {
          toast.warn('No se encontró el pago de la notificación.');
        });
    }
  }, [highlightId, loading, payments, navigate, user?.role]);

  const handleStatus = async (paymentId: number, status: 'approved' | 'rejected') => {
    if (!window.confirm(`¿Marcar este pago como ${status === 'approved' ? 'APROBADO' : 'RECHAZADO'}?`)) return;
    setActionId(paymentId);
    try {
      await api.put(`/api/payments/admin/status/${paymentId}`, { status });
      toast.success(status === 'approved' ? 'Pago aprobado' : 'Pago rechazado');
      if (highlightId === String(paymentId)) {
        searchParams.delete('paymentId');
        setSearchParams(searchParams, { replace: true });
      }
      fetchPending();
    } catch {
      toast.error('No se pudo actualizar el pago');
    } finally {
      setActionId(null);
    }
  };

  const openClientPayments = (userId: number, paymentId: number) => {
    navigate(`/admin/users/${userId}/payments?paymentId=${paymentId}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 border-l-4 border-indigo-600 pl-4">
          Pagos informados por clientes
        </h1>
        <p className="text-sm text-gray-600 mt-2 ml-5">
          Revisá comprobantes, aprobá o rechazá los pagos que los clientes cargan desde Mi Perfil → Mis Pagos.
        </p>
      </div>

      <SectionCard title="Pendientes de revisión" dense>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No hay pagos pendientes de revisión.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-2">Fecha</th>
                  <th className="py-2 px-2">Cliente</th>
                  <th className="py-2 px-2">Monto</th>
                  <th className="py-2 px-2">Método</th>
                  <th className="py-2 px-2">Comprobante</th>
                  <th className="py-2 px-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((pay) => {
                  const method = pay.method || pay.payment_method || '—';
                  const isHighlighted = highlightId === String(pay.id);
                  const busy = actionId === pay.id;
                  return (
                    <tr
                      key={pay.id}
                      ref={(el) => {
                        rowRefs.current[pay.id] = el;
                      }}
                      className={`transition ${isHighlighted ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap">
                        {formatDateArgentina(pay.created_at)}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-gray-900">{clientLabel(pay)}</div>
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => openClientPayments(pay.user_id, pay.id)}
                            className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <FaUser className="shrink-0" /> Ficha del cliente
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-gray-900">${pay.amount}</td>
                      <td className="py-2.5 px-2 capitalize text-gray-600">{method}</td>
                      <td className="py-2.5 px-2">
                        {pay.receipt_url ? (
                          <a
                            href={getImageUrl(pay.receipt_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs bg-indigo-50 px-2 py-1 rounded"
                          >
                            <FaFileDownload /> Ver comprobante
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin archivo</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {pay.receipt_url && (
                            <a
                              href={getImageUrl(pay.receipt_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                              title="Abrir comprobante"
                            >
                              <FaPaperclip />
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleStatus(pay.id, 'approved')}
                            className="p-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            title="Aprobar"
                          >
                            <FaCheck />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleStatus(pay.id, 'rejected')}
                            className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            title="Rechazar"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {user?.role === 'admin' && (
        <p className="text-xs text-gray-500 text-center">
          También podés gestionar planes y historial completo desde{' '}
          <Link to="/admin/users" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
            Usuarios <FaExternalLinkAlt className="text-[10px]" />
          </Link>
        </p>
      )}
    </div>
  );
};

export default AdminPaymentsInboxPage;
