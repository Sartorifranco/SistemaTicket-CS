import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import CreatableSelect from 'react-select/creatable';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';
import HelpTooltip from '../components/Common/HelpTooltip';
import { formatDateArgentina } from '../utils/dateFormatter';
import { FaPlus, FaFileAlt, FaTimes, FaTicketAlt } from 'react-icons/fa';

type ActivationStatus = 'pending_validation' | 'pending_client_fill' | 'processing' | 'ready';
type FormType = 'general' | 'alta_general' | 'controlador_fiscal' | 'fiscal' | 'no_fiscal' | 'none';

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
  general: 'Planilla Estándar',
  alta_general: 'Planilla Estándar',
  controlador_fiscal: 'Controlador Fiscal',
  fiscal: 'Fiscal',
  no_fiscal: 'No fiscal',
  none: 'Sin tipo'
};

const PRODUCT_TYPE_OPTIONS = [
  { value: 'controlador_fiscal', label: 'Controlador Fiscal' },
  { value: 'software_gestion', label: 'Software de Gestión' }
];

const FISCAL_MODEL_OPTIONS = [
  { value: 'Sam4s 330', label: 'Sam4s 330' },
  { value: 'Moretti Kinder', label: 'Moretti Kinder' },
  { value: 'Epson', label: 'Epson' },
  { value: 'Hasar', label: 'Hasar' }
];

const AFIP_ALTA_OPTIONS = [
  { value: 'nosotros', label: 'Nosotros (Brindar Clave Fiscal)' },
  { value: 'su_contador', label: 'Su Contador (Servicio Delegado)' }
];

const SOFTWARE_TYPE_OPTIONS = [
  { value: 'StarPOS Restaurant', label: 'StarPOS Restaurant' },
  { value: 'StarPOS Market', label: 'StarPOS Market' },
  { value: 'Dux', label: 'Dux' }
];

const BILLING_TYPE_OPTIONS = [
  { value: 'fiscal', label: 'Fiscal (Facturación Electrónica)' },
  { value: 'no_fiscal', label: 'No Fiscal (Ticket Interno)' }
];

const CONDICION_IVA_OPTIONS = [
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'exento', label: 'Exento' }
];

interface CloudContractTemplate {
  filename: string;
  label: string;
  url: string;
}

const ClientActivationsPage: React.FC = () => {
  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [completeModalId, setCompleteModalId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cloudContracts, setCloudContracts] = useState<CloudContractTemplate[]>([]);

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

  useEffect(() => {
    api.get<{ success: boolean; data: CloudContractTemplate[] }>('/api/settings/cloud-contracts')
      .then((res) => setCloudContracts(res.data.data || []))
      .catch(() => {});
  }, []);

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
                    <td className="px-4 py-2 text-sm">{formatDateArgentina(a.created_at)}</td>
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
          cloudContracts={cloudContracts}
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
  cloudContracts: CloudContractTemplate[];
  onClose: () => void;
  onSuccess: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

interface PlanillaProductOption {
  value: string;
  label: string;
}

const ActivationFormModal: React.FC<ActivationFormModalProps> = ({ activation, cloudContracts, onClose, onSuccess, submitting, setSubmitting }) => {
  const isAltaGeneral = activation.form_type === 'alta_general' || activation.form_type === 'general';
  const isControladorFiscalLegacy = activation.form_type === 'controlador_fiscal';
  const isLegacyFiscal = activation.form_type === 'fiscal';
  const isLegacyNoFiscal = activation.form_type === 'no_fiscal';

  const [form, setForm] = useState<Record<string, string>>({});
  const [productType, setProductType] = useState<'controlador_fiscal' | 'software_gestion' | ''>('');
  const [afipAltaType, setAfipAltaType] = useState<'nosotros' | 'su_contador' | ''>('');
  const [clientBillingChoice, setClientBillingChoice] = useState<'fiscal' | 'no_fiscal' | ''>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [constanciaFile, setConstanciaFile] = useState<File | null>(null);
  const [cloudNubeDesea, setCloudNubeDesea] = useState(false);
  const [cloudNubeContratoFiles, setCloudNubeContratoFiles] = useState<File[]>([]);

  // Productos dinámicos desde la base de datos
  const [planillaProductOptions, setPlanillaProductOptions] = useState<PlanillaProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PlanillaProductOption | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Sub-opciones dinámicas del producto seleccionado
  const [suboptions, setSuboptions] = useState<{ value: string; label: string }[]>([]);
  const [suboptionsLoading, setSuboptionsLoading] = useState(false);

  useEffect(() => {
    if (activation.form_type === 'controlador_fiscal' && !productType) setProductType('controlador_fiscal');
  }, [activation.form_type]);

  // Cargar productos desde la BD al montar el modal
  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; name: string }[] }>('/api/planilla-products')
      .then((res) => {
        const opts = (res.data.data || []).map((p) => ({ value: String(p.id), label: p.name }));
        setPlanillaProductOptions(opts);
      })
      .catch(() => {
        // Si falla la carga, usamos las opciones hardcodeadas como fallback
        setPlanillaProductOptions(PRODUCT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })));
      });
  }, []);

  // Crear un nuevo producto en la BD y seleccionarlo
  const handleCreateProduct = async (inputValue: string) => {
    setIsCreatingProduct(true);
    try {
      const res = await api.post<{ success: boolean; data: { id: number; name: string } }>(
        '/api/planilla-products',
        { name: inputValue }
      );
      const newOpt: PlanillaProductOption = {
        value: String(res.data.data.id),
        label: res.data.data.name
      };
      setPlanillaProductOptions((prev) => [...prev, newOpt]);
      setSelectedProduct(newOpt);
      setSuboptions([]);
      update('software_type', '');
      update('model', '');
      // Mapear al productType legado si coincide
      const nameLower = res.data.data.name.toLowerCase();
      if (nameLower.includes('controlador') || nameLower.includes('fiscal')) {
        setProductType('controlador_fiscal');
      } else {
        setProductType('software_gestion');
      }
      // Producto nuevo: no tiene sub-opciones aún
      toast.success(`Producto "${res.data.data.name}" creado y seleccionado.`);
    } catch {
      toast.error('No se pudo crear el producto. Intente de nuevo.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Cargar sub-opciones dinámicas del producto seleccionado
  const loadSuboptions = async (productId: string) => {
    setSuboptionsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { id: number; name: string }[] }>(
        `/api/planilla-products/${productId}/suboptions`
      );
      const data = res.data.data || [];
      setSuboptions(data.map((s) => ({ value: s.name, label: s.name })));
    } catch {
      setSuboptions([]);
    } finally {
      setSuboptionsLoading(false);
    }
  };

  // Cuando el usuario selecciona un producto existente del dropdown
  const handleSelectProduct = (opt: PlanillaProductOption | null) => {
    setSelectedProduct(opt);
    setSuboptions([]);
    update('software_type', '');
    update('model', '');
    if (!opt) {
      setProductType('');
      return;
    }
    const nameLower = opt.label.toLowerCase();
    if (nameLower.includes('controlador') || nameLower.includes('fiscal')) {
      setProductType('controlador_fiscal');
    } else {
      setProductType('software_gestion');
    }
    // Cargar sub-opciones si el ID es numérico (producto de la BD)
    if (!isNaN(Number(opt.value))) {
      loadSuboptions(opt.value);
    }
  };

  const isControladorFiscal = productType === 'controlador_fiscal' || (isControladorFiscalLegacy && productType === '');
  const isSoftwareGestion = productType === 'software_gestion';
  const showFiscalFields = isSoftwareGestion ? clientBillingChoice === 'fiscal' : (isAltaGeneral ? clientBillingChoice === 'fiscal' : isLegacyFiscal);
  const showNoFiscalFields = isSoftwareGestion ? clientBillingChoice === 'no_fiscal' : (isAltaGeneral ? clientBillingChoice === 'no_fiscal' : isLegacyNoFiscal);

  // Condicional 2: campos fiscales completos para Controlador Fiscal O Software Fiscal
  const showEquiposFiscalesFields = isControladorFiscal || showFiscalFields;
  // Condicional 1: Software de Gestión + No Fiscal → formulario simplificado (solo Razón Social, CUIT, Teléfono)
  const showSoftwareNoFiscalSimple = isSoftwareGestion && clientBillingChoice === 'no_fiscal';
  const fiscalModel = (form.model || '').trim();
  const showDepartments = isControladorFiscal && (fiscalModel.toLowerCase().includes('sam4s') || fiscalModel.toLowerCase().includes('moretti'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productType && !isControladorFiscalLegacy && !isAltaGeneral) {
      toast.warn('Seleccioná qué producto adquirió.');
      return;
    }
    if (isControladorFiscal && !form.model?.trim()) {
      toast.warn('Seleccioná Marca/Modelo del controlador fiscal.');
      return;
    }
    if (isControladorFiscal && !afipAltaType) {
      toast.warn('Seleccioná quién realizará el alta en AFIP.');
      return;
    }
    if (isControladorFiscal && afipAltaType === 'nosotros' && !(form.clave_fiscal ?? '').trim()) {
      toast.warn('La Clave Fiscal es obligatoria cuando el alta la realizamos nosotros.');
      return;
    }
    if (isSoftwareGestion && !form.software_type?.trim()) {
      toast.warn('Seleccioná el tipo de software.');
      return;
    }
    if (isSoftwareGestion && !clientBillingChoice) {
      toast.warn('Seleccioná el tipo de facturación deseada.');
      return;
    }
    if (isAltaGeneral && !productType && !clientBillingChoice) {
      toast.warn('Seleccioná el tipo de facturación deseada.');
      return;
    }
    if (cloudNubeDesea && cloudNubeContratoFiles.length === 0) {
      toast.warn('Si desea contratar Cloud Nube, debe adjuntar al menos un contrato firmado.');
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, String(v)); });
    if (productType) fd.append('product_type', productType);
    else if (isControladorFiscalLegacy) fd.append('product_type', 'controlador_fiscal');
    if (afipAltaType) fd.append('afip_alta_type', afipAltaType);
    if (isAltaGeneral && clientBillingChoice) fd.append('billing_type', clientBillingChoice);
    if (isSoftwareGestion && clientBillingChoice) fd.append('billing_type', clientBillingChoice);
    if (logoFile) fd.append('logo', logoFile);
    if (constanciaFile && showFiscalFields) fd.append('constancia_alta', constanciaFile);
    if (cloudNubeDesea && cloudNubeContratoFiles.length > 0) {
      cloudNubeContratoFiles.forEach((file) => fd.append('cloud_nube_contrato', file));
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Completar Planilla — {activation.invoice_number}</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {/* Tipo de producto adquirido — selector dinámico con creación inline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿Qué producto adquirió? <span className="text-red-500">*</span>
            </label>
            <CreatableSelect<PlanillaProductOption>
              options={planillaProductOptions}
              value={selectedProduct}
              onChange={(opt) => {
                handleSelectProduct(opt as PlanillaProductOption | null);
                if (opt) {
                  const nameLower = (opt as PlanillaProductOption).label.toLowerCase();
                  if (!nameLower.includes('controlador') && !nameLower.includes('fiscal')) {
                    setAfipAltaType('');
                  }
                } else {
                  setAfipAltaType('');
                }
              }}
              onCreateOption={handleCreateProduct}
              isDisabled={isCreatingProduct || submitting}
              isLoading={isCreatingProduct}
              placeholder="Seleccionar o escribir nuevo producto..."
              formatCreateLabel={(inputValue) => `Crear producto: "${inputValue}"`}
              noOptionsMessage={() => 'Escribí para crear un nuevo producto'}
              isClearable
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#d1d5db',
                  borderRadius: '0.5rem',
                  minHeight: '42px',
                  boxShadow: 'none',
                  '&:hover': { borderColor: '#6366f1' }
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#e0e7ff' : 'white',
                  color: state.isSelected ? 'white' : '#1f2937'
                })
              }}
            />
            <p className="text-xs text-gray-400 mt-1">Si el producto no está en la lista, escribilo y presioná Enter para crearlo.</p>
          </div>

          {/* Lógica Controlador Fiscal */}
          {isControladorFiscal && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca/Modelo <span className="text-red-500">*</span></label>
                <select
                  name="model"
                  value={form.model ?? ''}
                  onChange={(e) => update('model', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  disabled={suboptionsLoading}
                >
                  <option value="">{suboptionsLoading ? 'Cargando...' : 'Seleccionar...'}</option>
                  {(suboptions.length > 0 ? suboptions : FISCAL_MODEL_OPTIONS).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién realizará el alta en AFIP? <span className="text-red-500">*</span></label>
                <select
                  value={afipAltaType}
                  onChange={(e) => setAfipAltaType(e.target.value as 'nosotros' | 'su_contador')}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {AFIP_ALTA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {afipAltaType === 'nosotros' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave Fiscal <span className="text-red-500">*</span></label>
                  <input type="text" name="clave_fiscal" value={form.clave_fiscal ?? ''} onChange={(e) => update('clave_fiscal', e.target.value)} placeholder="Clave Fiscal" required className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              {afipAltaType === 'su_contador' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <p className="font-medium mb-1">Servicio delegado a su contador</p>
                  <p>Debe descargar el manual para su contador y enviarlo junto con los datos que le indiquemos.</p>
                  <a href="/manual-contador.pdf" target="_blank" rel="noopener noreferrer" download className="inline-block mt-2 text-indigo-600 font-medium hover:underline">Descargar manual para contador</a>
                </div>
              )}
              {showDepartments && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamentos / Rubros</label>
                  <textarea name="departments" value={form.departments ?? ''} onChange={(e) => update('departments', e.target.value)} placeholder="Ej: 1-Almacén, 2-Bebidas" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              )}
            </>
          )}

          {/* Lógica Software de Gestión */}
          {isSoftwareGestion && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Software <span className="text-red-500">*</span></label>
                <select
                  name="software_type"
                  value={form.software_type ?? ''}
                  onChange={(e) => update('software_type', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  disabled={suboptionsLoading}
                >
                  <option value="">{suboptionsLoading ? 'Cargando...' : 'Seleccionar...'}</option>
                  {(suboptions.length > 0 ? suboptions : SOFTWARE_TYPE_OPTIONS).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Tipo de Facturación deseada? <span className="text-red-500">*</span></label>
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
            </>
          )}

          {isAltaGeneral && !productType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Tipo de Facturación deseada? <span className="text-red-500">*</span></label>
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

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              N° Factura/Pedido
              <HelpTooltip text="Lo encontrás en el margen superior derecho de tu comprobante." />
            </label>
            <input type="text" name="invoice_number" value={form.invoice_number ?? ''} onChange={(e) => update('invoice_number', e.target.value)} placeholder="N° Factura" className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {showEquiposFiscalesFields && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición ante el IVA <span className="text-red-500">*</span></label>
                <select name="condicion_iva" value={form.condicion_iva ?? ''} onChange={(e) => update('condicion_iva', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
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
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">Punto de Venta <HelpTooltip text="Debe ser NUEVO. No repetir un PV usado en otro sistema." /></label>
                <input type="text" name="punto_venta" value={form.punto_venta ?? ''} onChange={(e) => update('punto_venta', e.target.value)} placeholder="N° Punto Venta" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">CUIT <HelpTooltip text="CUIT al cual se registrará la licencia." /></label>
                <input type="text" name="cuit" value={form.cuit ?? ''} onChange={(e) => update('cuit', e.target.value)} placeholder="CUIT" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <input type="text" name="razon_social" value={form.razon_social ?? ''} onChange={(e) => update('razon_social', e.target.value)} placeholder="Razón Social" className="w-full px-3 py-2 border rounded-lg" />
              {!isControladorFiscal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave Fiscal (opcional)</label>
                  <input type="text" name="clave_fiscal" value={form.clave_fiscal ?? ''} onChange={(e) => update('clave_fiscal', e.target.value)} placeholder="Clave Fiscal" className="w-full px-3 py-2 border rounded-lg" />
                </div>
              )}
              <input type="text" name="telefono" value={form.telefono ?? ''} onChange={(e) => update('telefono', e.target.value)} placeholder="Teléfono" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="ingresos_brutos" value={form.ingresos_brutos ?? ''} onChange={(e) => update('ingresos_brutos', e.target.value)} placeholder="Ingresos Brutos" className="w-full px-3 py-2 border rounded-lg" />
              <input type="text" name="inicio_actividades" value={form.inicio_actividades ?? ''} onChange={(e) => update('inicio_actividades', e.target.value)} placeholder="Inicio Actividades" className="w-full px-3 py-2 border rounded-lg" />
              <input type="email" name="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded-lg" />
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">Logo (JPG) <HelpTooltip text="Tamaño recomendado: 350x250px en BLANCO y NEGRO. Formato: JPG de 1 bit." /></label>
                <input type="file" accept=".jpg,.jpeg" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">Constancia de Alta (PDF) <HelpTooltip text="Adjuntar constancia en formato PDF." /></label>
                <input type="file" accept=".pdf" onChange={(e) => setConstanciaFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </>
          )}
          {/* Condicional 1: Software No Fiscal — formulario simplificado */}
          {showSoftwareNoFiscalSimple && (
            <>
              <input type="text" name="razon_social" value={form.razon_social ?? ''} onChange={(e) => update('razon_social', e.target.value)} placeholder="Razón Social" className="w-full px-3 py-2 border rounded-lg" />
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">CUIT <HelpTooltip text="CUIT al cual se registrará la licencia." /></label>
                <input type="text" name="cuit" value={form.cuit ?? ''} onChange={(e) => update('cuit', e.target.value)} placeholder="CUIT" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <input type="text" name="telefono" value={form.telefono ?? ''} onChange={(e) => update('telefono', e.target.value)} placeholder="Teléfono" className="w-full px-3 py-2 border rounded-lg" />
            </>
          )}
          {/* Formulario No Fiscal legacy (alta_general o formularios anteriores) */}
          {showNoFiscalFields && !showSoftwareNoFiscalSimple && (
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
          {isControladorFiscalLegacy && productType === '' && (
            <p className="text-gray-500 text-sm">Completá los datos del controlador fiscal y el alta en AFIP.</p>
          )}
          {isAltaGeneral && !productType && !clientBillingChoice && (
            <p className="text-gray-500 text-sm">Elegí el tipo de facturación para ver los campos a completar.</p>
          )}
          {isSoftwareGestion && !clientBillingChoice && (
            <p className="text-gray-500 text-sm">Elegí el tipo de facturación para ver los campos a completar.</p>
          )}

          {/* Sección Cloud Nube */}
          <div className="pt-4 mt-4 border-t border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Servicio Cloud Nube</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cloudNubeDesea}
                onChange={(e) => { setCloudNubeDesea(e.target.checked); if (!e.target.checked) setCloudNubeContratoFiles([]); }}
                className="rounded border-gray-300 text-indigo-600"
              />
              <span className="text-sm text-gray-700">¿Desea contratar Cloud Nube?</span>
            </label>
            {cloudNubeDesea && (
              <div className="pl-6 space-y-2">
                {cloudContracts.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">Descargar plantillas de contrato:</p>
                    <ul className="list-none space-y-1">
                      {cloudContracts.map((c) => (
                        <li key={c.filename}>
                          <a href={getImageUrl(c.url)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                            Descargar Contrato {c.label || c.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No hay plantillas disponibles en este momento.</p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrato(s) firmado(s) (PDF o imagen) <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={(e) => setCloudNubeContratoFiles(e.target.files ? Array.from(e.target.files) : [])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {cloudNubeContratoFiles.length > 0 && <p className="text-xs text-gray-500 mt-1">{cloudNubeContratoFiles.length} archivo(s) seleccionado(s)</p>}
                </div>
              </div>
            )}
          </div>
          </div>

          <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white">
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
