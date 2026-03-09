import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import HelpTooltip from '../components/Common/HelpTooltip';
import { FaPlus, FaFileAlt, FaTimes, FaTicketAlt } from 'react-icons/fa';

type ActivationStatus = 'pending_validation' | 'pending_client_fill' | 'processing' | 'ready';
type FormType = 'alta_general' | 'controlador_fiscal' | 'fiscal' | 'no_fiscal' | 'none';

interface Activation {
  id: number;
  invoice_number: string;
  form_type: FormType;
  status: ActivationStatus;
  ticket_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

const STATUS_LABELS: Record<ActivationStatus, string> = {
  pending_validation: 'Esperando validación',
  pending_client_fill: 'Completar planilla',
  processing: 'En proceso',
  ready: 'Listo'
};

const FORM_TYPE_LABELS: Record<string, string> = {
  alta_general: 'Alta General',
  controlador_fiscal: 'Controlador Fiscal',
  fiscal: 'Fiscal',
  no_fiscal: 'No fiscal',
  none: 'Sin tipo'
};

const BILLING_TYPE_OPTIONS = [
  { value: 'fiscal', label: 'Fiscal (Facturación Electrónica)' },
  { value: 'no_fiscal', label: 'No Fiscal (Ticket Interno)' }
];

const CONDICION_IVA_OPTIONS = [
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'exento', label: 'Exento' }
];

function formatDate(d: string | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ClientActivationsPage: React.FC = () => {
  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [completeModalId, setCompleteModalId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchList = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Activation[] }>('/api/activations/client')
      .then((res) => setList(res.data.data || []))
      .catch(() => toast.error('Error al cargar activaciones'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRequest = () => {
    const v = (invoiceNumber || '').trim();
    if (!v) {
      toast.warn('Ingresá el N° de Factura o Pedido.');
      return;
    }
    setRequesting(true);
    api.post('/api/activations/request', { invoice_number: v })
      .then(() => {
        toast.success('Solicitud enviada. Quedará en "Esperando validación".');
        setShowRequestModal(false);
        setInvoiceNumber('');
        fetchList();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error al solicitar'))
      .finally(() => setRequesting(false));
  };

  const activationToComplete = list.find((a) => a.id === completeModalId);
  const formType = activationToComplete?.form_type;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Mis Activaciones / Planillas</h1>
        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
        >
          <FaPlus /> Solicitar Alta
        </button>
      </div>

      <SectionCard title="Solicitudes">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No tenés solicitudes. Usá "Solicitar Alta" para comenzar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">N° Factura/Pedido</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ticket</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{a.invoice_number}</td>
                    <td className="px-4 py-2 text-sm">{FORM_TYPE_LABELS[a.form_type]}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.status === 'ready' ? 'bg-green-100 text-green-800' :
                        a.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        a.status === 'pending_client_fill' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {a.ticket_id ? (
                        <span className="flex items-center gap-1 text-indigo-600">
                          <FaTicketAlt /> #{a.ticket_id}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-2">
                      {a.status === 'pending_client_fill' && (
                        <button
                          type="button"
                          onClick={() => setCompleteModalId(a.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                        >
                          <FaFileAlt /> Completar Planilla
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Modal Solicitar Alta */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Solicitar Alta</h2>
              <button type="button" onClick={() => setShowRequestModal(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Ingresá el número de factura o pedido. La solicitud quedará en espera de validación.</p>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="N° Factura o Pedido"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleRequest} disabled={requesting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {requesting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Completar Planilla (formulario dinámico por form_type) */}
      {completeModalId && activationToComplete && (
        <ActivationFormModal
          activation={activationToComplete}
          onClose={() => setCompleteModalId(null)}
          onSuccess={() => {
            setCompleteModalId(null);
            fetchList();
          }}
          submitting={submitting}
          setSubmitting={setSubmitting}
        />
      )}
    </div>
  );
};

interface ActivationFormModalProps {
  activation: Activation;
  onClose: () => void;
  onSuccess: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

const CONTRATO_CLOUD_NUBE_BLANCO_URL = '/documents/contrato-cloud-nube-blank.pdf';

const ActivationFormModal: React.FC<ActivationFormModalProps> = ({ activation, onClose, onSuccess, submitting, setSubmitting }) => {
  const isAltaGeneral = activation.form_type === 'alta_general';
  const isControladorFiscal = activation.form_type === 'controlador_fiscal';
  const isLegacyFiscal = activation.form_type === 'fiscal';
  const isLegacyNoFiscal = activation.form_type === 'no_fiscal';

  const [form, setForm] = useState<Record<string, string>>({});
  const [clientBillingChoice, setClientBillingChoice] = useState<'fiscal' | 'no_fiscal' | ''>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [constanciaFile, setConstanciaFile] = useState<File | null>(null);
  const [noClaveFiscal, setNoClaveFiscal] = useState(false);
  const [cloudNubeDesea, setCloudNubeDesea] = useState(false);
  const [cloudNubeContratoFile, setCloudNubeContratoFile] = useState<File | null>(null);

  const showFiscalFields = isAltaGeneral ? clientBillingChoice === 'fiscal' : isLegacyFiscal;
  const showNoFiscalFields = isAltaGeneral ? clientBillingChoice === 'no_fiscal' : isLegacyNoFiscal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAltaGeneral && !clientBillingChoice) {
      toast.warn('Seleccioná el tipo de facturación deseada.');
      return;
    }
    if (cloudNubeDesea && !cloudNubeContratoFile) {
      toast.warn('Si desea contratar Cloud Nube, debe adjuntar el contrato firmado.');
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    if (isAltaGeneral && clientBillingChoice) fd.append('billing_type', clientBillingChoice);
    if (noClaveFiscal) fd.append('no_brindar_clave_fiscal', '1');
    if (logoFile) fd.append('logo', logoFile);
    if (constanciaFile && showFiscalFields) fd.append('constancia_alta', constanciaFile);
    if (cloudNubeDesea && cloudNubeContratoFile) fd.append('cloud_nube_contrato', cloudNubeContratoFile);

    setSubmitting(true);
    api.post(`/api/activations/${activation.id}/submit-form`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => {
        toast.success(res.data.message || 'Planilla enviada. Estado: En proceso.');
        onSuccess();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error al enviar'))
      .finally(() => setSubmitting(false));
  };

  const update = (name: string, value: string) => setForm((p) => ({ ...p, [name]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Completar Planilla — {activation.invoice_number}</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              N° Factura/Pedido
              <HelpTooltip text="Lo encontrás en el margen superior derecho de tu comprobante." />
            </label>
            <input type="text" name="invoice_number" value={form.invoice_number ?? ''} onChange={(e) => update('invoice_number', e.target.value)} placeholder="N° Factura" className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {isAltaGeneral && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ¿Tipo de Facturación deseada? <span className="text-red-500">*</span>
              </label>
              <select
                value={clientBillingChoice}
                onChange={(e) => setClientBillingChoice(e.target.value as 'fiscal' | 'no_fiscal')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">Seleccionar...</option>
                {BILLING_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {showFiscalFields && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición ante el IVA <span className="text-red-500">*</span></label>
                <select
                  name="condicion_iva"
                  value={form.condicion_iva ?? ''}
                  onChange={(e) => update('condicion_iva', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {CONDICION_IVA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <input type="text" name="tipo_instalacion" value={form.tipo_instalacion ?? ''} onChange={(e) => update('tipo_instalacion', e.target.value)} placeholder="Tipo Instalación" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="tipo_rubro" value={form.tipo_rubro ?? ''} onChange={(e) => update('tipo_rubro', e.target.value)} placeholder="Tipo Rubro" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="domicilio" value={form.domicilio ?? ''} onChange={(e) => update('domicilio', e.target.value)} placeholder="Domicilio" className="w-full px-3 py-2 border rounded-lg" />
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  Punto de Venta
                  <HelpTooltip text="Debe ser NUEVO. No repetir un PV usado en otro sistema." />
                </label>
                <input type="text" name="punto_venta" value={form.punto_venta ?? ''} onChange={(e) => update('punto_venta', e.target.value)} placeholder="N° Punto Venta" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  CUIT
                  <HelpTooltip text="CUIT al cual se registrará la licencia." />
                </label>
                <input type="text" name="cuit" value={form.cuit ?? ''} onChange={(e) => update('cuit', e.target.value)} placeholder="CUIT" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <input type="text" name="razon_social" value={form.razon_social ?? ''} onChange={(e) => update('razon_social', e.target.value)} placeholder="Razón Social" className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="noClave" checked={noClaveFiscal} onChange={(e) => setNoClaveFiscal(e.target.checked)} />
                <label htmlFor="noClave" className="flex items-center gap-2 text-sm">
                  No brindar clave fiscal
                  <HelpTooltip text="Opcional. Si elegís NO brindar la clave para relacionar los certificados, el proceso sufrirá mayores demoras en Arca." />
                </label>
              </div>
              {!noClaveFiscal && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    Clave Fiscal
                    <HelpTooltip text="Opcional. Si elegís NO brindar la clave para relacionar los certificados, el proceso sufrirá mayores demoras en Arca." />
                  </label>
                  <input type="text" name="clave_fiscal" value={form.clave_fiscal ?? ''} onChange={(e) => update('clave_fiscal', e.target.value)} placeholder="Clave Fiscal" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              <input type="text" name="telefono" value={form.telefono ?? ''} onChange={(e) => update('telefono', e.target.value)} placeholder="Teléfono" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="ingresos_brutos" value={form.ingresos_brutos ?? ''} onChange={(e) => update('ingresos_brutos', e.target.value)} placeholder="Ingresos Brutos" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="inicio_actividades" value={form.inicio_actividades ?? ''} onChange={(e) => update('inicio_actividades', e.target.value)} placeholder="Inicio Actividades" className="w-full px-3 py-2 border rounded-lg" />
              <input type="email" name="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded-lg" />
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  Logo (JPG)
                  <HelpTooltip text="Tamaño recomendado: 350x250px en BLANCO y NEGRO. Formato: JPG de 1 bit." />
                </label>
                <input type="file" accept=".jpg,.jpeg" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  Constancia de Alta (PDF)
                  <HelpTooltip text="Adjuntar constancia en formato PDF." />
                </label>
                <input type="file" accept=".pdf" onChange={(e) => setConstanciaFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </>
          )}
          {showNoFiscalFields && (
            <>
              <input type="text" name="tipo_rubro" value={form.tipo_rubro ?? ''} onChange={(e) => update('tipo_rubro', e.target.value)} placeholder="Tipo Rubro" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="domicilio" value={form.domicilio ?? ''} onChange={(e) => update('domicilio', e.target.value)} placeholder="Domicilio" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="razon_social_cuil" value={form.razon_social_cuil ?? ''} onChange={(e) => update('razon_social_cuil', e.target.value)} placeholder="Razón Social / CUIL" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="telefono" value={form.telefono ?? ''} onChange={(e) => update('telefono', e.target.value)} placeholder="Teléfono" className="w-full px-3 py-2 border rounded-lg" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </>
          )}
          {isControladorFiscal && (
            <p className="text-gray-500 text-sm">Completá los datos que te haya indicado el equipo y subí los archivos necesarios.</p>
          )}
          {isAltaGeneral && !clientBillingChoice && (
            <p className="text-gray-500 text-sm">Elegí el tipo de facturación para ver los campos a completar.</p>
          )}

          {/* Sección Cloud Nube */}
          <div className="pt-4 mt-4 border-t border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Servicio Cloud Nube</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cloudNubeDesea}
                onChange={(e) => { setCloudNubeDesea(e.target.checked); if (!e.target.checked) setCloudNubeContratoFile(null); }}
                className="rounded border-gray-300 text-indigo-600"
              />
              <span className="text-sm text-gray-700">¿Desea contratar Cloud Nube?</span>
            </label>
            {cloudNubeDesea && (
              <div className="pl-6 space-y-2">
                <p className="text-xs text-gray-600">
                  <a href={CONTRATO_CLOUD_NUBE_BLANCO_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    Descargar Contrato en Blanco
                  </a>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrato Firmado (PDF o imagen) <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setCloudNubeContratoFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {cloudNubeContratoFile && <p className="text-xs text-gray-500 mt-1">{cloudNubeContratoFile.name}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'Enviando...' : 'Enviar planilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientActivationsPage;
