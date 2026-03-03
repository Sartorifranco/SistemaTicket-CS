import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import SectionCard from '../components/Common/SectionCard';
import { FaCheckCircle, FaTicketAlt, FaBoxOpen, FaTimes, FaBell } from 'react-icons/fa';

type ActivationStatus = 'pending_validation' | 'pending_client_fill' | 'processing' | 'ready';
type FormType = 'fiscal' | 'no_fiscal' | 'controlador_fiscal' | 'none';

interface Activation {
  id: number;
  client_id: number;
  invoice_number: string;
  form_type: FormType;
  status: ActivationStatus;
  ticket_id?: number | null;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  created_at?: string;
  updated_at?: string;
}

const STATUS_LABELS: Record<ActivationStatus, string> = {
  pending_validation: 'Pendiente validación',
  pending_client_fill: 'Esperando al cliente',
  processing: 'Alta pendiente',
  ready: 'Equipo listo'
};

const FORM_TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'no_fiscal', label: 'No fiscal' },
  { value: 'controlador_fiscal', label: 'Controlador fiscal' },
  { value: 'none', label: 'Ninguno' }
];

function formatDate(d: string | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const AdminActivationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending_validation: 0, pending_client_fill: 0, processing: 0, ready: 0 });
  const [validateModalId, setValidateModalId] = useState<number | null>(null);
  const [selectedFormType, setSelectedFormType] = useState<FormType>('fiscal');
  const [validating, setValidating] = useState(false);
  const [markingReadyId, setMarkingReadyId] = useState<number | null>(null);
  const [confirmReadyModal, setConfirmReadyModal] = useState<{ id: number; invoice_number: string } | null>(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Activation[] }>('/api/activations')
      .then((res) => {
        const data = res.data.data || [];
        setList(data);
        setCounts({
          pending_validation: data.filter((a) => a.status === 'pending_validation').length,
          pending_client_fill: data.filter((a) => a.status === 'pending_client_fill').length,
          processing: data.filter((a) => a.status === 'processing').length,
          ready: data.filter((a) => a.status === 'ready').length
        });
      })
      .catch(() => toast.error('Error al cargar planillas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleValidate = () => {
    if (!validateModalId) return;
    setValidating(true);
    api.put(`/api/activations/${validateModalId}/validate`, { form_type: selectedFormType })
      .then(() => {
        toast.success('Activación validada. El cliente puede completar la planilla.');
        setValidateModalId(null);
        fetchList();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error al validar'))
      .finally(() => setValidating(false));
  };

  const handleMarkReady = () => {
    if (!confirmReadyModal) return;
    const id = confirmReadyModal.id;
    setMarkingReadyId(id);
    api.put(`/api/activations/${id}`, { status: 'ready', notify_client: true })
      .then(() => {
        toast.success('Estado actualizado y cliente notificado por email.');
        setConfirmReadyModal(null);
        fetchList();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error'))
      .finally(() => setMarkingReadyId(null));
  };

  const isAdmin = window.location.pathname.startsWith('/admin');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Planillas</h1>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SectionCard title="Solicitudes pendientes" className="bg-amber-50 border-amber-200">
          <p className="text-3xl font-bold text-amber-700">{counts.pending_validation}</p>
          <p className="text-sm text-amber-600">Por validar</p>
        </SectionCard>
        <SectionCard title="Esperando al cliente" className="bg-blue-50 border-blue-200">
          <p className="text-3xl font-bold text-blue-700">{counts.pending_client_fill}</p>
          <p className="text-sm text-blue-600">Completar planilla</p>
        </SectionCard>
        <SectionCard title="Altas pendientes" className="bg-indigo-50 border-indigo-200">
          <p className="text-3xl font-bold text-indigo-700">{counts.processing}</p>
          <p className="text-sm text-indigo-600">En proceso</p>
        </SectionCard>
        <SectionCard title="Equipos listos" className="bg-green-50 border-green-200">
          <p className="text-3xl font-bold text-green-700">{counts.ready}</p>
          <p className="text-sm text-green-600">Completados</p>
        </SectionCard>
      </div>

      <SectionCard title="Listado de solicitudes">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay solicitudes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">N° Factura</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ticket</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  {!isViewer && <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{a.invoice_number}</td>
                    <td className="px-4 py-2 text-sm">{a.client_name || a.client_business_name || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.status === 'ready' ? 'bg-green-100 text-green-800' :
                        a.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        a.status === 'pending_client_fill' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
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
                    <td className="px-4 py-2 text-sm">{formatDate(a.created_at)}</td>
                    {!isViewer && (
                      <td className="px-4 py-2">
                        {a.status === 'pending_validation' && (
                          <button
                            type="button"
                            onClick={() => { setValidateModalId(a.id); setSelectedFormType('fiscal'); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                          >
                            <FaCheckCircle /> Validar
                          </button>
                        )}
                        {a.status === 'processing' && (
                          <button
                            type="button"
                            onClick={() => setConfirmReadyModal({ id: a.id, invoice_number: a.invoice_number })}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            <FaBoxOpen /> Marcar listo y notificar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Modal Marcar listo y notificar */}
      {confirmReadyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Equipo listo</h2>
            <p className="text-sm text-gray-600 mb-4">
              Se marcará la activación (Factura {confirmReadyModal.invoice_number}) como <strong>Listo</strong> y se enviará un email al cliente indicando que su equipo/software está listo para usar o retirar.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmReadyModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleMarkReady} disabled={!!markingReadyId} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {markingReadyId ? 'Enviando...' : 'Confirmar y notificar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Validar */}
      {validateModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Validar solicitud</h2>
              <button type="button" onClick={() => setValidateModalId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Seleccioná el tipo de formulario que debe completar el cliente.</p>
            <select
              value={selectedFormType}
              onChange={(e) => setSelectedFormType(e.target.value as FormType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            >
              {FORM_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setValidateModalId(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleValidate} disabled={validating} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {validating ? 'Validando...' : 'Validar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminActivationsPage;
