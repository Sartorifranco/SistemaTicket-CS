import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import SectionCard from '../components/Common/SectionCard';
import { formatDateArgentina } from '../utils/dateFormatter';
import { FaCheckCircle, FaTicketAlt, FaBoxOpen, FaTimes, FaBell, FaPrint } from 'react-icons/fa';

type ActivationStatus = 'pending_validation' | 'pending_client_fill' | 'processing' | 'ready' | 'rejected';
type FormTypeApi = 'general' | 'controlador_fiscal' | 'alta_general' | 'fiscal' | 'no_fiscal' | 'none';

interface Activation {
  id: number;
  client_id: number;
  invoice_number: string;
  form_type: FormTypeApi;
  status: ActivationStatus;
  ticket_id?: number | null;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  created_at?: string;
  updated_at?: string;
  form_data?: string | null;
}

/** Parsea form_data y devuelve una descripción del producto/equipo */
function parsePlanillaProductLabel(formData: string | null | undefined): string {
  if (!formData) return '—';
  try {
    const data = JSON.parse(formData);
    const pt = (data.product_type || '').toLowerCase();
    if (pt.includes('controlador') || pt.includes('fiscal')) {
      const model = data.model || '';
      return model ? `CF: ${model}` : 'Controlador Fiscal';
    }
    if (pt.includes('software')) {
      const sw = data.software_type || '';
      return sw ? `SW: ${sw}` : 'Software de Gestión';
    }
    // fallback: buscar cualquier campo descriptivo
    if (data.model) return data.model;
    if (data.software_type) return data.software_type;
    return '—';
  } catch {
    return '—';
  }
}

/** Convierte el objeto form_data en pares clave/valor legibles para impresión */
const FIELD_LABELS: Record<string, string> = {
  product_type: 'Tipo de Producto',
  software_type: 'Tipo de Software',
  model: 'Marca/Modelo',
  afip_alta_type: 'Alta AFIP',
  billing_type: 'Facturación',
  razon_social: 'Razón Social',
  razon_social_cuil: 'Razón Social / CUIL',
  cuit: 'CUIT',
  condicion_iva: 'Condición ante IVA',
  ingresos_brutos: 'Ingresos Brutos',
  inicio_actividades: 'Inicio de Actividades',
  punto_venta: 'Punto de Venta',
  domicilio: 'Domicilio',
  telefono: 'Teléfono',
  email: 'Email',
  clave_fiscal: 'Clave Fiscal',
  tipo_instalacion: 'Tipo de Instalación',
  tipo_rubro: 'Tipo de Rubro',
  departments: 'Departamentos / Rubros',
  invoice_number: 'N° Factura',
};

function parsePlanillaFields(formData: string | null | undefined): { label: string; value: string }[] {
  if (!formData) return [];
  try {
    const data = JSON.parse(formData);
    return Object.entries(data)
      .filter(([k, v]) => k !== '_uploads' && v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => ({
        label: FIELD_LABELS[k] || k,
        value: String(v)
      }));
  } catch {
    return [];
  }
}

const STATUS_LABELS: Record<ActivationStatus, string> = {
  pending_validation: 'Pendiente validación',
  pending_client_fill: 'Esperando al cliente',
  processing: 'Alta pendiente',
  ready: 'Equipo listo',
  rejected: 'Rechazada'
};

const AdminActivationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending_validation: 0, pending_client_fill: 0, processing: 0, ready: 0 });
  const [validateModalId, setValidateModalId] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [markingReadyId, setMarkingReadyId] = useState<number | null>(null);
  const [confirmReadyModal, setConfirmReadyModal] = useState<{ id: number; invoice_number: string } | null>(null);
  const [printModalActivation, setPrintModalActivation] = useState<Activation | null>(null);

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

  const handleApprove = () => {
    if (!validateModalId) return;
    setValidating(true);
    api.put(`/api/activations/${validateModalId}/validate`, { action: 'approve' })
      .then(() => {
        toast.success('Solicitud aprobada. El cliente puede completar la planilla.');
        setValidateModalId(null);
        fetchList();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error al aprobar'))
      .finally(() => setValidating(false));
  };

  const handleReject = () => {
    if (!validateModalId) return;
    setRejecting(true);
    api.put(`/api/activations/${validateModalId}/validate`, { action: 'reject' })
      .then(() => {
        toast.success('Solicitud rechazada.');
        setValidateModalId(null);
        fetchList();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error al rechazar'))
      .finally(() => setRejecting(false));
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Producto / Equipo</th>
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
                    <td className="px-4 py-2 text-sm">
                      <span className="text-gray-700">{parsePlanillaProductLabel(a.form_data)}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.status === 'ready' ? 'bg-green-100 text-green-800' :
                        a.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        a.status === 'pending_client_fill' ? 'bg-amber-100 text-amber-800' :
                        a.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
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
                    <td className="px-4 py-2 text-sm">{formatDateArgentina(a.created_at)}</td>
                    {!isViewer && (
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                        {a.status === 'pending_validation' && (
                          <button
                            type="button"
                            onClick={() => setValidateModalId(a.id)}
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
                        {a.form_data && (
                          <button
                            type="button"
                            onClick={() => setPrintModalActivation(a)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                            title="Ver e imprimir planilla como DDJJ"
                          >
                            <FaPrint /> DDJJ
                          </button>
                        )}
                        </div>
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
            <p className="text-sm text-gray-600 mb-4">
              ¿Confirma que el N° de Factura ingresado por el cliente es válido?
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setValidateModalId(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleReject} disabled={rejecting || validating} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {rejecting ? 'Rechazando...' : 'Rechazar Solicitud'}
              </button>
              <button type="button" onClick={handleApprove} disabled={validating || rejecting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {validating ? 'Aprobando...' : 'Aprobar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Imprimir DDJJ */}
      {printModalActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Planilla / DDJJ</h2>
                <p className="text-sm text-gray-500">Factura: {printModalActivation.invoice_number} — Cliente: {printModalActivation.client_name || printModalActivation.client_business_name || '—'}</p>
              </div>
              <button type="button" onClick={() => setPrintModalActivation(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div id="planilla-print-area" className="flex-1 overflow-y-auto px-6 py-4">
              <div className="print-only-header hidden">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Declaración Jurada — Alta de Sistema</h2>
                <p className="text-sm text-gray-600 mb-4">Factura: {printModalActivation.invoice_number} | Cliente: {printModalActivation.client_name || printModalActivation.client_business_name || '—'} | Fecha: {formatDateArgentina(printModalActivation.created_at)}</p>
                <hr className="mb-4" />
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {parsePlanillaFields(printModalActivation.form_data).map(({ label, value }) => (
                  <div key={label} className="border-b border-gray-100 pb-2">
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
                    <dd className="text-sm text-gray-900 font-medium mt-0.5 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button type="button" onClick={() => setPrintModalActivation(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white">
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <FaPrint /> Imprimir como DDJJ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Estilos de impresión para la planilla DDJJ */}
      <style>{`
        @media print {
          body > *:not(#root) { display: none !important; }
          #root > *:not(.planilla-print-wrapper) { display: none !important; }
          .print\\:hidden { display: none !important; }
          #planilla-print-area .print-only-header { display: block !important; }
          nav, header, aside, footer, button { display: none !important; }
          #planilla-print-area { overflow: visible !important; max-height: none !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminActivationsPage;
