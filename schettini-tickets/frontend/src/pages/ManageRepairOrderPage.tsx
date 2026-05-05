import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import { formatDateArgentina, formatDateForInput, formatNowArgentina, toDateOnly } from '../utils/dateFormatter';
import { useAuth } from '../context/AuthContext';
import { hasAnyPermission } from '../utils/permissions';
import SectionCard from '../components/Common/SectionCard';
import HelpTooltip from '../components/Common/HelpTooltip';
import CreatableAutocomplete from '../components/Common/CreatableAutocomplete';
import { FaWhatsapp, FaSave, FaTimes, FaTrash, FaPlus, FaPrint } from 'react-icons/fa';
import WebcamCapture, { CapturedPhoto } from '../components/RepairOrders/WebcamCapture';
import RepairOrderReceipt, { useReceiptPrintPortal } from '../components/RepairOrder/RepairOrderReceipt';
import { formatRepairOrderClientDisplay } from '../utils/repairOrderLabels';

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
  tax_percentage: number;
  quote_footer_text: string;
  primary_color: string;
  usd_exchange_rate?: number | null;
  default_iva_percent?: number | null;
  list_price_surcharge_percent?: number | null;
  profit_margin_percent?: number | null;
  legal_footer_text?: string | null;
}

interface SparePartItem {
  nombre: string;
  precio_ars: number;
  /** Código interno / SKU (catálogo, DUX/ERP) */
  codigo?: string | null;
}

interface SparePartCatalogItem {
  id: number;
  nombre: string;
  precio_usd: number | null;
  precio_ars: number | null;
  codigo?: string | null;
}

/** Nombre + código para lista, WhatsApp y texto legible. */
function sparePartLineLabel(p: SparePartItem): string {
  const nombre = (p.nombre || '').trim();
  const code = (p.codigo || '').trim();
  if (!code) return nombre || '—';
  if (!nombre) return `Cód: ${code}`;
  if (code === nombre) return nombre;
  return `${nombre} | Cód: ${code}`;
}

interface LaborOption {
  id: number;
  value: string;
}

interface TechnicianOption {
  id: number;
  username: string;
  full_name?: string;
  role: string;
}

interface RepairOrderItem {
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  reported_fault?: string | null;
  included_accessories?: string | null;
}

const WARRANTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'oficial_fabricante', label: 'Oficial fabricante' },
  { value: 'garantia_propia', label: 'Garantía propia' },
  { value: 'garantia_proveedor', label: 'Garantía proveedor' }
];

const WARRANTY_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ingresado_garantia', label: 'Ingresado en garantía' },
  { value: 'en_diagnostico', label: 'En diagnóstico' },
  { value: 'espera_aprobacion_proveedor', label: 'En espera aprobación proveedor' },
  { value: 'enviado_fabrica', label: 'Enviado a fábrica' },
  { value: 'aprobado_cambio', label: 'Aprobado cambio' },
  { value: 'reparado_garantia', label: 'Reparado en garantía' },
  { value: 'rechazado_mal_uso', label: 'Rechazado por mal uso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'entregado', label: 'Entregado' }
];

interface RepairOrder {
  id: number;
  order_number: string;
  client_id: number | null;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string | null;
  technician_id?: number | null;
  technician_name?: string | null;
  status: string;
  equipment_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  reported_fault?: string;
  items?: RepairOrderItem[];
  included_accessories?: string;
  is_warranty: number;
  labor_cost?: number | null;
  spare_parts_cost?: number | null;
  total_cost?: number | null;
  deposit_paid?: number | null;
  technical_report?: string | null;
  internal_notes?: string;
  entry_date?: string;
  accepted_date?: string | null;
  promised_date?: string | null;
  delivered_date?: string | null;
  warranty_expiration_date?: string | null;
  public_notes?: string | null;
  spare_parts_detail?: string | null;
  created_at?: string;
  photos?: { id: number; photo_url: string; perspective_label: string }[];
  warranty_type?: string | null;
  purchase_invoice_number?: string | null;
  purchase_date?: string | null;
  original_supplier?: string | null;
  requires_factory_shipping?: number;
  warranty_status?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ingresado: 'Ingresado',
  cotizado: 'Cotizado',
  aceptado: 'Aceptado',
  no_aceptado: 'No Aceptado',
  en_espera: 'En Espera',
  sin_reparacion: 'Sin Reparación',
  listo: 'Listo',
  entregado: 'Entregado',
  entregado_sin_reparacion: 'Entregado sin Reparación',
  abandonado: 'Abandonado/Reciclaje'
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

// Formateo de fechas para WhatsApp sin depender de timezone del navegador.
function formatDateForWhatsApp(dateValue?: string | null): string {
  if (!dateValue) return '—';
  const raw = String(dateValue);
  // Acepta 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM:SS' o 'YYYY-MM-DDTHH:MM:SS'
  const datePart = raw.split('T')[0].split(' ')[0];
  if (!datePart) return '—';
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function buildWhatsAppTemplate(order: RepairOrder): string {
  const totalCost = order.total_cost ?? 0;
  const depositPaid = order.deposit_paid ?? 0;
  const saldo = totalCost - depositPaid;
  return `Estimado Cliente:
Este mensaje es para informarle el Estado de su Orden Nº ${order.order_number}
Su Nº de Cliente es: ${order.client_id != null ? order.client_id : 'N/A (sin cliente en sistema)'}

Equipo: ${order.equipment_type || '—'}
Modelo: ${order.model || '—'}
Nº de Serie: ${order.serial_number || '—'}

El ESTADO de la Orden es:
*${STATUS_LABELS[order.status] || order.status}*

FALLA ORIGINAL DECLARADA:
${order.reported_fault || '—'}

INFORME TECNICO / SOLUCION:
*${order.technical_report || '—'}*

Ingreso el: ${formatDateForWhatsApp(order.entry_date)}
Aceptado el: ${formatDateForWhatsApp(order.accepted_date)}
Prometido para: ${formatDateForWhatsApp(order.promised_date)}
Entregado el: ${formatDateForWhatsApp(order.delivered_date)}
Garantía: ${formatDateForWhatsApp(order.warranty_expiration_date)}

Observaciones: 
${order.public_notes || '—'}

Repuestos:
${order.spare_parts_detail || '—'}

Costo de la Reparación: $ ${totalCost.toLocaleString('es-AR')}
Suma de sus pagos: $ ${depositPaid.toLocaleString('es-AR')}
SALDO: $ ${saldo.toLocaleString('es-AR')}`;
}

function phoneToWhatsApp(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '';
  if (digits.startsWith('0')) return digits.slice(1);
  if (digits.startsWith('549')) return digits;
  if (digits.startsWith('54') && digits.length >= 10) return digits;
  if (digits.startsWith('9') && digits.length >= 10) return '54' + digits;
  if (digits.length >= 10) return '54' + digits;
  return '54' + digits;
}

const ManageRepairOrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const canEdit = user?.role === 'admin' || user?.role === 'agent' || user?.role === 'supervisor';
  /** Ver botón eliminar foto: quien puede editar O quien tiene permiso repairs_edit (ej. viewer con ese permiso) */
  const canDeletePhoto = canEdit || hasAnyPermission(user?.permissions || [], ['repairs_edit']);
  const canEditEquipment = user?.role === 'admin';
  const isAgentBlind = user?.role === 'agent';

  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [sparePartsList, setSparePartsList] = useState<SparePartItem[]>([]);
  const [sparePartsSearch, setSparePartsSearch] = useState('');
  const [sparePartsSuggestions, setSparePartsSuggestions] = useState<SparePartCatalogItem[]>([]);
  const [showSparePartsDropdown, setShowSparePartsDropdown] = useState(false);
  const [laborOptions, setLaborOptions] = useState<LaborOption[]>([]);
  const [laborValue, setLaborValue] = useState('');
  const [accessoriesOptions, setAccessoriesOptions] = useState<string[]>([]);
  const [accessoriesArray, setAccessoriesArray] = useState<string[]>([]);
  const [otherAccessoryInput, setOtherAccessoryInput] = useState('');
  const [equipmentTypeOptions, setEquipmentTypeOptions] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [manualPartNombre, setManualPartNombre] = useState('');
  const [manualPartPrecio, setManualPartPrecio] = useState('');
  const [manualCostInput, setManualCostInput] = useState('');
  const [manualCostIsUsd, setManualCostIsUsd] = useState(false);
  const [manualLaborValue, setManualLaborValue] = useState('');
  const sparePartsDropdownRef = useRef<HTMLDivElement>(null);
  useReceiptPrintPortal();

  const [showRecyclingModal, setShowRecyclingModal] = useState(false);
  const [recyclingNotes, setRecyclingNotes] = useState('');
  const [recyclingPhotos, setRecyclingPhotos] = useState<File[]>([]);
  const [savingRecycling, setSavingRecycling] = useState(false);

  /** Fotos actuales de la orden (estado local para poder eliminar antes de guardar) */
  const [existingPhotos, setExistingPhotos] = useState<{ id: number; photo_url: string; perspective_label: string }[]>([]);

  /** Nuevas fotos tomadas o subidas en la vista de edición (se envían al backend al guardar). */
  const [newPhotos, setNewPhotos] = useState<CapturedPhoto[]>([]);

  const [form, setForm] = useState({
    status: '',
    equipmentType: '',
    brand: '',
    model: '',
    serialNumber: '',
    reportedFault: '',
    includedAccessories: '',
    technicalReport: '',
    laborCost: '',
    sparePartsCost: '',
    totalCost: '',
    depositPaid: '',
    acceptedDate: '',
    promisedDate: '',
    deliveredDate: '',
    warrantyExpirationDate: '',
    publicNotes: '',
    sparePartsDetail: '',
    technicianId: '',
    internalNotes: '',
    isWarranty: false,
    warrantyType: '',
    purchaseInvoiceNumber: '',
    purchaseDate: '',
    originalSupplier: '',
    requiresFactoryShipping: false,
    warrantyStatus: ''
  });

  const fetchOrder = () => {
    if (!id) return;
    setLoading(true);
    api
      .get<{ success: boolean; data: RepairOrder }>(`/api/repair-orders/${id}`)
      .then((res) => {
        const o = res.data.data;
        setOrder(o);
        setExistingPhotos(Array.isArray(o.photos) ? o.photos : []);
        const rawAccessories = (o.items?.[0]?.included_accessories ?? o.included_accessories ?? '') || '';
        const parsedAccessories = rawAccessories.split(/\s*,\s*/).map((s: string) => s.trim()).filter(Boolean);
        setAccessoriesArray(parsedAccessories);

        setForm({
          status: o.status || '',
          equipmentType: (o.items?.[0]?.equipment_type ?? o.equipment_type ?? '') || '',
          brand: (o.items?.[0]?.brand ?? o.brand ?? '') || '',
          model: (o.items?.[0]?.model ?? o.model ?? '') || '',
          serialNumber: o.serial_number || '',
          reportedFault: o.reported_fault || '',
          includedAccessories: rawAccessories,
          technicalReport: o.technical_report || '',
          laborCost: o.labor_cost != null ? String(o.labor_cost) : '',
          sparePartsCost: o.spare_parts_cost != null ? String(o.spare_parts_cost) : '',
          totalCost: o.total_cost != null ? String(o.total_cost) : '',
          depositPaid: o.deposit_paid != null ? String(o.deposit_paid) : '',
          acceptedDate: formatDateForInput(o.accepted_date) || '',
          promisedDate: formatDateForInput(o.promised_date) || '',
          deliveredDate: formatDateForInput(o.delivered_date) || '',
          warrantyExpirationDate: formatDateForInput(o.warranty_expiration_date) || '',
          publicNotes: o.public_notes || '',
          sparePartsDetail: o.spare_parts_detail || '',
          technicianId: o.technician_id ? String(o.technician_id) : '',
          internalNotes: o.internal_notes || '',
          isWarranty: !!o.is_warranty,
          warrantyType: o.warranty_type || '',
          purchaseInvoiceNumber: o.purchase_invoice_number || '',
          purchaseDate: formatDateForInput(o.purchase_date) || '',
          originalSupplier: o.original_supplier || '',
          requiresFactoryShipping: !!o.requires_factory_shipping,
          warrantyStatus: o.warranty_status || ''
        });
        setLaborValue(o.labor_cost != null ? String(o.labor_cost) : '');
        try {
          const detail = o.spare_parts_detail || '';
          if (detail.startsWith('[')) {
            const arr = JSON.parse(detail) as SparePartItem[];
            setSparePartsList(Array.isArray(arr) ? arr : []);
          } else if (o.spare_parts_cost != null && o.spare_parts_cost > 0) {
            setSparePartsList([{ nombre: detail || 'Repuestos', precio_ars: o.spare_parts_cost }]);
          } else {
            setSparePartsList([]);
          }
        } catch {
          setSparePartsList(o.spare_parts_cost != null && o.spare_parts_cost > 0 ? [{ nombre: 'Repuestos', precio_ars: o.spare_parts_cost }] : []);
        }
      })
      .catch(() => toast.error('Error al cargar la orden'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    api.get('/api/settings/company').then((res) => {
      const d = res.data.data || res.data;
      if (d) setCompanySettings(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: TechnicianOption[] }>('/api/users/technicians').then((res) => {
      setTechnicians(res.data.data || []);
    }).catch(() => toast.error('Error al cargar técnicos'));
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; category: string; value: string }[] }>('/api/settings/system-options?category=labor_price').then((res) => {
      setLaborOptions((res.data.data || []).map((o) => ({ id: o.id, value: o.value })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadAccessories = (cat: string) =>
      api.get<{ success: boolean; data: { id: number; category: string; value: string }[] }>(`/api/settings/system-options?category=${cat}`)
        .then((res) => (res.data.data || []).map((o) => o.value));
    loadAccessories('accessory').then((opts) => {
      setAccessoriesOptions(opts);
      if (opts.length === 0) loadAccessories('accessories').then((o) => setAccessoriesOptions(o)).catch(() => {});
    }).catch(() => loadAccessories('accessories').then((o) => setAccessoriesOptions(o)).catch(() => {}));
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; category: string; value: string }[] }>('/api/settings/system-options?category=equipment_type').then((res) => {
      setEquipmentTypeOptions((res.data.data || []).map((o) => o.value));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; category: string; value: string }[] }>('/api/settings/system-options?category=brand').then((res) => {
      setBrandOptions((res.data.data || []).map((o) => o.value));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; category: string; value: string }[] }>('/api/settings/system-options?category=model').then((res) => {
      setModelOptions((res.data.data || []).map((o) => o.value));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sparePartsSearch.trim()) {
      setSparePartsSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      api.get<{ success: boolean; data: SparePartCatalogItem[] }>(`/api/settings/spare-parts-catalog/search?q=${encodeURIComponent(sparePartsSearch)}`).then((res) => {
        setSparePartsSuggestions(res.data.data || []);
        setShowSparePartsDropdown(true);
      }).catch(() => setSparePartsSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [sparePartsSearch]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sparePartsDropdownRef.current && !sparePartsDropdownRef.current.contains(e.target as Node)) setShowSparePartsDropdown(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const sparePartsTotal = useMemo(() => sparePartsList.reduce((s, i) => s + Number(i.precio_ars), 0), [sparePartsList]);
  const laborNum = laborValue ? Number(parseFloat(String(laborValue))) : 0;
  const ivaPct = Number(companySettings?.default_iva_percent ?? companySettings?.tax_percentage ?? 21);
  // Repuestos ya incluyen IVA: total = repuestos + mano de obra; IVA solo informativo = Total Repuestos - (Total Repuestos / 1.21)
  const ivaAmount = sparePartsTotal - sparePartsTotal / 1.21;
  const totalEfectivo = sparePartsTotal + laborNum;
  const surchargePct = Number(companySettings?.list_price_surcharge_percent ?? 0);
  const totalLista = surchargePct > 0 ? totalEfectivo * (1 + surchargePct / 100) : totalEfectivo;

  const usdRate = Number(companySettings?.usd_exchange_rate ?? 0);
  const profitMarginPct = Number(companySettings?.profit_margin_percent ?? 30);
  const manualCostNum = Number(parseFloat(String(manualCostInput)) || 0);
  const costoBasePesosManual = manualCostIsUsd ? manualCostNum * usdRate : manualCostNum;
  const costoConMargen = costoBasePesosManual * (1 + profitMarginPct / 100);
  const manualLaborNum = Number(parseFloat(String(manualLaborValue)) || 0);
  const repuestosConIvaManual = costoConMargen * (1 + ivaPct / 100);
  const ivaManual = repuestosConIvaManual - repuestosConIvaManual / 1.21;
  const totalEfectivoManual = repuestosConIvaManual + manualLaborNum;
  const totalListaManual = surchargePct > 0 ? totalEfectivoManual * (1 + surchargePct / 100) : totalEfectivoManual;

  const applyManualQuote = () => {
    if (costoBasePesosManual <= 0) {
      toast.warn('Ingresá un costo válido');
      return;
    }
    setSparePartsList((p) => [...p, { nombre: 'Repuesto Externo / Manual', precio_ars: totalEfectivoManual }]);
    setLaborValue(manualLaborValue || laborValue);
    setManualCostInput('');
    setManualLaborValue('');
    toast.success('Cotización manual aplicada a la orden');
  };

  const addSparePartFromCatalog = (item: SparePartCatalogItem) => {
    const precio = Number(item.precio_ars ?? (item.precio_usd ? item.precio_usd * Number(companySettings?.usd_exchange_rate ?? 1200) : 0));
    const codigo = item.codigo != null && String(item.codigo).trim() !== '' ? String(item.codigo).trim() : undefined;
    setSparePartsList((p) => [...p, { nombre: item.nombre, precio_ars: precio, ...(codigo ? { codigo } : {}) }]);
    setSparePartsSearch('');
    setShowSparePartsDropdown(false);
    setSparePartsSuggestions([]);
  };

  const addManualSparePart = () => {
    const nombre = manualPartNombre.trim();
    const precio = parseFloat(manualPartPrecio) || 0;
    if (!nombre) {
      toast.warn('Ingresá el nombre del repuesto');
      return;
    }
    setSparePartsList((p) => [...p, { nombre, precio_ars: precio }]);
    setManualPartNombre('');
    setManualPartPrecio('');
    toast.success('Repuesto agregado');
  };

  const removeSparePart = (idx: number) => setSparePartsList((p) => p.filter((_, i) => i !== idx));

  const toggleAccessory = (value: string) => {
    setAccessoriesArray((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  };

  const addOtherAccessory = () => {
    const val = otherAccessoryInput.trim();
    if (!val) {
      toast.warn('Ingresá un accesorio');
      return;
    }
    if (accessoriesArray.includes(val)) {
      toast.warn('Ya está agregado');
      return;
    }
    setAccessoriesArray((prev) => [...prev, val]);
    setOtherAccessoryInput('');
  };

  const openWhatsAppModal = () => {
    if (!order) return;
    const spareDetailText = sparePartsList.length > 0
      ? sparePartsList.map((p) => `${sparePartLineLabel(p)}: $${p.precio_ars.toLocaleString('es-AR')}`).join('\n')
      : (form.sparePartsDetail || order.spare_parts_detail || '—');
    const merged: RepairOrder = {
      ...order,
      status: form.status || order.status,
      equipment_type: form.equipmentType || order.equipment_type,
      model: form.model || order.model,
      serial_number: form.serialNumber || order.serial_number,
      reported_fault: form.reportedFault || order.reported_fault,
      technical_report: form.technicalReport || order.technical_report,
      total_cost: totalEfectivo || order.total_cost,
      deposit_paid: form.depositPaid ? parseFloat(form.depositPaid) : order.deposit_paid,
      accepted_date: form.acceptedDate || order.accepted_date,
      promised_date: form.promisedDate || order.promised_date,
      delivered_date: form.deliveredDate || order.delivered_date,
      warranty_expiration_date: form.warrantyExpirationDate || order.warranty_expiration_date,
      public_notes: form.publicNotes || order.public_notes,
      spare_parts_detail: spareDetailText
    };
    setWhatsappMessage(buildWhatsAppTemplate(merged));
    setShowWhatsAppModal(true);
  };

  const sendWhatsApp = () => {
    if (!order?.client_phone) {
      toast.error('El cliente no tiene teléfono cargado.');
      return;
    }
    const phone = phoneToWhatsApp(order.client_phone);
    if (!phone) {
      toast.error('Número de teléfono inválido.');
      return;
    }
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    setShowWhatsAppModal(false);
  };

  const isOficialFabricante = form.isWarranty && form.warrantyType === 'oficial_fabricante';
  const effectiveLaborNum = isOficialFabricante ? 0 : laborNum;
  const effectiveSparePartsTotal = isOficialFabricante ? 0 : sparePartsTotal;
  const effectiveIvaAmount = effectiveSparePartsTotal - effectiveSparePartsTotal / 1.21;
  const effectiveTotalEfectivo = effectiveSparePartsTotal + effectiveLaborNum;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (form.isWarranty) {
      if (!form.warrantyType?.trim()) {
        toast.error('Falta seleccionar el Tipo de Garantía (Oficial fabricante, Garantía propia o Garantía proveedor).', { autoClose: 8000, style: { fontSize: '16px', fontWeight: 'bold', maxWidth: '420px' } });
        return;
      }
      if (!form.purchaseInvoiceNumber?.trim()) {
        toast.error('Falta ingresar el Número de Factura de Compra.', { autoClose: 8000, style: { fontSize: '16px', fontWeight: 'bold', maxWidth: '420px' } });
        return;
      }
      if (!form.purchaseDate?.trim()) {
        toast.error('Falta ingresar la Fecha de Compra.', { autoClose: 8000, style: { fontSize: '16px', fontWeight: 'bold', maxWidth: '420px' } });
        return;
      }
      if (!form.originalSupplier?.trim()) {
        toast.error('Falta ingresar el Proveedor Original.', { autoClose: 8000, style: { fontSize: '16px', fontWeight: 'bold', maxWidth: '420px' } });
        return;
      }
      if (!form.serialNumber?.trim()) {
        toast.error('Falta el Nº de Serie del equipo. En órdenes por garantía es obligatorio.', { autoClose: 8000, style: { fontSize: '16px', fontWeight: 'bold', maxWidth: '420px' } });
        return;
      }
    }
    const originalTechId = order?.technician_id ? String(order.technician_id) : '';
    const newTechId = form.technicianId || '';
    let finalInternalNotes = form.internalNotes || '';
    if (originalTechId !== newTechId && newTechId) {
      const ok = window.confirm('Estás reasignando esta orden. Quedará registrado. ¿Continuar?');
      if (!ok) return;
      const techName = technicians.find((t) => String(t.id) === newTechId)?.full_name || technicians.find((t) => String(t.id) === newTechId)?.username || 'Técnico';
      const prevName = technicians.find((t) => String(t.id) === originalTechId)?.full_name || technicians.find((t) => String(t.id) === originalTechId)?.username || 'Sin asignar';
      const note = `[${formatNowArgentina()}] Reasignada a ${techName}. Anterior: ${prevName}.`;
      finalInternalNotes = finalInternalNotes ? `${finalInternalNotes}\n${note}` : note;
    }
    setSaving(true);
    try {
      /** Si sparePartsList queda vacío tras borrar ítems, hay que enviar explícitamente vacío/null.
       *  No usar form.sparePartsDetail como respaldo: conserva el texto cargado al abrir la orden y el backend volvería a guardar los repuestos “fantasma”. */
      const sparePartsDetailPayload =
        sparePartsList.length > 0 ? JSON.stringify(sparePartsList) : '';
      const keptPhotoIds = existingPhotos.map((p) => p.id);

      // Si no hay fotos nuevas, mantenemos el flujo JSON existente (sin multipart)
      if (newPhotos.length === 0) {
        await api.put(`/api/repair-orders/${id}`, {
          status: form.status || null,
          equipmentType: form.equipmentType || null,
          brand: form.brand || null,
          model: form.model || null,
          serialNumber: form.serialNumber || null,
          reportedFault: form.reportedFault || null,
          includedAccessories: accessoriesArray.length > 0 ? accessoriesArray.join(', ') : null,
          technicalReport: form.technicalReport || null,
          laborCost: isOficialFabricante ? 0 : (effectiveLaborNum || null),
          sparePartsCost: isOficialFabricante ? 0 : (effectiveSparePartsTotal || null),
          totalCost: isOficialFabricante ? 0 : (effectiveTotalEfectivo || null),
          depositPaid: form.depositPaid ? parseFloat(form.depositPaid) : null,
          acceptedDate: toDateOnly(form.acceptedDate) ?? null,
          promisedDate: toDateOnly(form.promisedDate) ?? null,
          deliveredDate: toDateOnly(form.deliveredDate) ?? null,
          warrantyExpirationDate: toDateOnly(form.warrantyExpirationDate) ?? null,
          publicNotes: form.publicNotes || null,
          sparePartsDetail: sparePartsDetailPayload,
          technicianId: form.technicianId ? parseInt(form.technicianId, 10) : null,
          internalNotes: finalInternalNotes || null,
          isWarranty: form.isWarranty,
          warrantyType: form.isWarranty ? form.warrantyType || null : null,
          purchaseInvoiceNumber: form.isWarranty ? form.purchaseInvoiceNumber?.trim() || null : null,
          purchaseDate: form.isWarranty ? (toDateOnly(form.purchaseDate) ?? null) : null,
          originalSupplier: form.isWarranty ? form.originalSupplier?.trim() || null : null,
          requiresFactoryShipping: form.isWarranty ? form.requiresFactoryShipping : undefined,
          warrantyStatus: form.isWarranty && form.warrantyStatus ? form.warrantyStatus : null,
          photoIds: keptPhotoIds
        });
      } else {
        // Cuando hay fotos nuevas, usamos FormData para enviar archivos + campos + ids de fotos que se conservan.
        const formData = new FormData();
        formData.append('status', form.status || '');
        formData.append('equipmentType', form.equipmentType || '');
        formData.append('brand', form.brand || '');
        formData.append('model', form.model || '');
        formData.append('serialNumber', form.serialNumber || '');
        formData.append('reportedFault', form.reportedFault || '');
        formData.append('includedAccessories', accessoriesArray.length > 0 ? accessoriesArray.join(', ') : '');
        formData.append('technicalReport', form.technicalReport || '');
        formData.append('laborCost', String(isOficialFabricante ? 0 : (effectiveLaborNum || '')));
        formData.append('sparePartsCost', String(isOficialFabricante ? 0 : (effectiveSparePartsTotal || '')));
        formData.append('totalCost', String(isOficialFabricante ? 0 : (effectiveTotalEfectivo || '')));
        if (form.depositPaid) {
          formData.append('depositPaid', form.depositPaid);
        }
        formData.append('acceptedDate', toDateOnly(form.acceptedDate) ?? '');
        formData.append('promisedDate', toDateOnly(form.promisedDate) ?? '');
        formData.append('deliveredDate', toDateOnly(form.deliveredDate) ?? '');
        formData.append('warrantyExpirationDate', toDateOnly(form.warrantyExpirationDate) ?? '');
        formData.append('publicNotes', form.publicNotes || '');
        formData.append('sparePartsDetail', sparePartsDetailPayload);
        if (form.technicianId) {
          formData.append('technicianId', form.technicianId);
        }
        formData.append('internalNotes', finalInternalNotes || '');
        formData.append('isWarranty', form.isWarranty ? 'true' : 'false');
        if (form.isWarranty) {
          formData.append('warrantyType', form.warrantyType || '');
          formData.append('purchaseInvoiceNumber', form.purchaseInvoiceNumber?.trim() || '');
          formData.append('purchaseDate', toDateOnly(form.purchaseDate) ?? '');
          formData.append('originalSupplier', form.originalSupplier?.trim() || '');
          formData.append('requiresFactoryShipping', form.requiresFactoryShipping ? 'true' : 'false');
          if (form.warrantyStatus) {
            formData.append('warrantyStatus', form.warrantyStatus);
          }
        }

        // Fotos existentes que se conservan (ids) y nuevas fotos como archivos
        formData.append('photoIds', JSON.stringify(keptPhotoIds));
        newPhotos.forEach((p) => formData.append('photos', p.file));
        formData.append('perspectiveLabels', JSON.stringify(newPhotos.map((p) => p.label)));

        await api.put(`/api/repair-orders/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Orden actualizada');
      setNewPhotos([]);
      fetchOrder();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name } = target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    if (name === 'status' && value === 'abandonado') {
      if (user?.role === 'agent' && order?.entry_date) {
        const entry = new Date(order.entry_date).getTime();
        const now = Date.now();
        const days = (now - entry) / (24 * 60 * 60 * 1000);
        if (days < 90) {
          toast.error('Debe cumplir 90 días para declarar abandono.');
          return;
        }
      }
      setRecyclingNotes('');
      setRecyclingPhotos([]);
      setShowRecyclingModal(true);
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleRecyclingSave = async () => {
    if (!id) return;
    setSavingRecycling(true);
    try {
      const formData = new FormData();
      formData.append('recycling_notes', recyclingNotes);
      recyclingPhotos.forEach((f) => formData.append('photos', f));
      await api.post(`/api/repair-orders/${id}/recycling`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Orden procesada a reciclaje (abandonado).');
      setShowRecyclingModal(false);
      setRecyclingNotes('');
      setRecyclingPhotos([]);
      fetchOrder();
    } catch {
      toast.error('Error al procesar reciclaje.');
    } finally {
      setSavingRecycling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Orden no encontrada</p>
        <button onClick={() => navigate(basePath)} className="mt-4 text-indigo-600 hover:underline">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={() => navigate(basePath)} className="text-indigo-600 hover:underline flex items-center gap-1">
          ← Volver
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Orden {order.order_number}
            <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded bg-gray-200">
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <FaPrint size={18} /> Imprimir Comprobante
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={openWhatsAppModal}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FaWhatsapp size={18} /> Avisar por WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit ? (
        <form onSubmit={handleSave}>
          <SectionCard title="Editar Orden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Asignado <span className="text-red-500">*</span></label>
                <select name="technicianId" value={form.technicianId} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Seleccionar técnico...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || t.username} {t.role && `(${t.role})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Equipo</label>
                <CreatableAutocomplete
                  options={equipmentTypeOptions}
                  value={form.equipmentType}
                  onChange={(v) => setForm((f) => ({ ...f, equipmentType: v }))}
                  placeholder="Escribir o elegir de la lista"
                  disabled={!canEditEquipment}
                  className={`w-full px-3 py-2 border rounded-lg ${!canEditEquipment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <CreatableAutocomplete
                  options={brandOptions}
                  value={form.brand}
                  onChange={(v) => setForm((f) => ({ ...f, brand: v }))}
                  placeholder="Escribir o elegir de la lista"
                  disabled={!canEditEquipment}
                  className={`w-full px-3 py-2 border rounded-lg ${!canEditEquipment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="text-xs text-gray-500 mt-0.5">Podés escribir una marca nueva si no está en la lista.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <CreatableAutocomplete
                  options={modelOptions}
                  value={form.model}
                  onChange={(v) => setForm((f) => ({ ...f, model: v }))}
                  placeholder="Escribir o elegir de la lista"
                  disabled={!canEditEquipment}
                  className={`w-full px-3 py-2 border rounded-lg ${!canEditEquipment ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                <p className="text-xs text-gray-500 mt-0.5">Podés escribir un modelo nuevo si no está en la lista.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nº de Serie {form.isWarranty && <span className="text-red-500">*</span>}
                </label>
                <input name="serialNumber" value={form.serialNumber} onChange={handleChange} disabled={!canEditEquipment} required={form.isWarranty} className={`w-full px-3 py-2 border rounded-lg ${!canEditEquipment ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  ¿Es un ingreso por Garantía?
                  <HelpTooltip text="Si se tilda, no se podrá facturar y requerirá N° de serie obligatorio." />
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="isWarranty" checked={form.isWarranty} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                  <span className="font-medium text-gray-800">Sí, esta orden es por garantía</span>
                </label>
              </div>
              {form.isWarranty && (
                <div className="md:col-span-2 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/80 space-y-4">
                  <h4 className="font-bold text-gray-800">Datos de Garantía</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de garantía <span className="text-red-500">*</span></label>
                      <select name="warrantyType" value={form.warrantyType} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                        <option value="">Seleccionar...</option>
                        {WARRANTY_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nº de factura de compra <span className="text-red-500">*</span></label>
                      <input type="text" name="purchaseInvoiceNumber" value={form.purchaseInvoiceNumber} onChange={handleChange} required placeholder="Ej: 001-00001234" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra <span className="text-red-500">*</span></label>
                      <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor original <span className="text-red-500">*</span></label>
                      <input type="text" name="originalSupplier" value={form.originalSupplier} onChange={handleChange} required placeholder="Nombre del proveedor o fabricante" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">¿Requiere envío a fábrica?</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="requiresFactoryShipping" checked={form.requiresFactoryShipping} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                        <span>Sí</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado de garantía</label>
                      <select name="warrantyStatus" value={form.warrantyStatus} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                        <option value="">Seleccionar...</option>
                        {WARRANTY_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Falla / Problema Reportado</label>
                <textarea name="reportedFault" value={form.reportedFault} onChange={handleChange} rows={3} disabled={!canEditEquipment} className={`w-full px-3 py-2 border rounded-lg ${!canEditEquipment ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios incluidos</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {accessoriesOptions.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accessoriesArray.includes(opt)}
                        onChange={() => toggleAccessory(opt)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                  {accessoriesOptions.length === 0 && (
                    <p className="text-xs text-gray-500 col-span-full py-1">Sin opciones predefinidas. Agregá manualmente abajo.</p>
                  )}
                </div>
                {accessoriesArray.filter((a) => !accessoriesOptions.includes(a)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs text-gray-500 font-medium">Otros (manuales):</span>
                    {accessoriesArray
                      .filter((a) => !accessoriesOptions.includes(a))
                      .map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm"
                        >
                          {a}
                          <button
                            type="button"
                            onClick={() => toggleAccessory(a)}
                            className="text-indigo-600 hover:text-indigo-800 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otherAccessoryInput}
                    onChange={(e) => setOtherAccessoryInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOtherAccessory())}
                    placeholder="Otro accesorio (especificar)..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={addOtherAccessory}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 text-sm flex items-center gap-1"
                  >
                    <FaPlus size={12} /> Agregar
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Informe Técnico / Solución</label>
                <textarea name="technicalReport" value={form.technicalReport} onChange={handleChange} rows={4} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Costos / Cotización</h4>
                {isOficialFabricante && (
                  <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Costo cubierto por Garantía Oficial (Mano de obra y repuestos $0)
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* COLUMNA IZQUIERDA: Cotizador Automático */}
                  <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h5 className="text-sm font-semibold text-indigo-700">Cotizador Automático</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repuestos</label>
                      <div className="relative" ref={sparePartsDropdownRef}>
                        <input
                          type="text"
                          value={sparePartsSearch}
                          onChange={(e) => setSparePartsSearch(e.target.value)}
                          onFocus={() => sparePartsSearch && setShowSparePartsDropdown(true)}
                          placeholder="Buscar en catálogo..."
                          disabled={isOficialFabricante}
                          className={`w-full px-3 py-2 border rounded-lg mb-2 ${isOficialFabricante ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                        {showSparePartsDropdown && sparePartsSuggestions.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                            {sparePartsSuggestions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => addSparePartFromCatalog(s)}
                                className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-0 text-sm"
                              >
                                <span className="truncate">{s.nombre}</span>
                                {s.codigo ? (
                                  <span className="text-gray-500 text-xs ml-1">| Cód: {s.codigo}</span>
                                ) : null}
                                {!isAgentBlind && ` — $${(s.precio_ars ?? 0).toLocaleString('es-AR')}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={manualPartNombre}
                          onChange={(e) => setManualPartNombre(e.target.value)}
                          placeholder="Agregar manual: nombre"
                          disabled={isOficialFabricante}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm ${isOficialFabricante ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={manualPartPrecio}
                          onChange={(e) => setManualPartPrecio(e.target.value)}
                          placeholder="$"
                          disabled={isOficialFabricante}
                          className={`w-24 px-3 py-2 border rounded-lg text-sm ${isOficialFabricante ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                        <button type="button" onClick={addManualSparePart} disabled={isOficialFabricante} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                          <FaPlus /> Agregar
                        </button>
                      </div>
                      {sparePartsList.length > 0 && (
                        <ul className="space-y-1">
                          {sparePartsList.map((p, i) => (
                            <li key={i} className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded border">
                              <span className="min-w-0 break-words pr-2">
                                {(() => {
                                  const n = (p.nombre || '').trim();
                                  const c = (p.codigo || '').trim();
                                  const main = n || (c ? `Cód: ${c}` : '—');
                                  const showChip = !!(c && n && c !== n);
                                  return (
                                    <>
                                      <span className="font-medium text-gray-800">{main}</span>
                                      {showChip ? (
                                        <>
                                          <span className="text-gray-400 mx-1">|</span>
                                          <span className="inline-block align-middle px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                                            Cód: {c}
                                          </span>
                                        </>
                                      ) : null}
                                    </>
                                  );
                                })()}
                              </span>
                              <span className="flex items-center gap-2">
                                ${p.precio_ars.toLocaleString('es-AR')}
                                <button type="button" onClick={() => removeSparePart(i)} className="text-red-600 hover:text-red-700 p-1">
                                  <FaTrash size={12} />
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mano de obra</label>
                      <input
                        type="number"
                        list="labor-options-cotizador"
                        min={0}
                        step="0.01"
                        value={isOficialFabricante ? '0' : laborValue}
                        onChange={(e) => setLaborValue(e.target.value)}
                        disabled={isOficialFabricante}
                        placeholder="Ej: 12500 o seleccionar de la lista"
                        className={`w-full px-3 py-2 border rounded-lg ${isOficialFabricante ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      <datalist id="labor-options-cotizador">
                        <option value="0" />
                        {laborOptions.map((o) => (
                          <option key={o.id} value={o.value} />
                        ))}
                      </datalist>
                    </div>
                    <div className="pt-3 border-t border-gray-200 space-y-1 text-sm">
                      <p className="flex justify-between"><span>Repuestos:</span> <strong>${effectiveSparePartsTotal.toLocaleString('es-AR')}</strong></p>
                      <p className="flex justify-between"><span>IVA ({ivaPct}% incluido en repuestos):</span> ${effectiveIvaAmount.toLocaleString('es-AR')}</p>
                      <p className="flex justify-between"><span>Mano de obra:</span> <strong>${effectiveLaborNum.toLocaleString('es-AR')}</strong></p>
                      <p className="flex justify-between text-green-700 font-bold"><span>Total Efectivo:</span> ${effectiveTotalEfectivo.toLocaleString('es-AR')}</p>
                      {surchargePct > 0 && <p className="flex justify-between text-amber-700 font-medium"><span>Total Lista ({surchargePct}%):</span> ${(effectiveTotalEfectivo * (1 + surchargePct / 100)).toLocaleString('es-AR')}</p>}
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: Calculadora Manual - variables desde Config. Central */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-800">Calculadora Manual (Repuestos Externos)</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio COSTO sin IVA</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={manualCostInput}
                          onChange={(e) => setManualCostInput(e.target.value)}
                          placeholder="0"
                          className="flex-1 px-3 py-2 border rounded-lg bg-white"
                        />
                        <label className="flex items-center gap-2 cursor-pointer shrink-0 text-sm">
                          <input
                            type="checkbox"
                            checked={manualCostIsUsd}
                            onChange={(e) => setManualCostIsUsd(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className={manualCostIsUsd ? 'font-bold text-indigo-700' : 'text-gray-500'}>USD</span>
                          <span className="text-gray-400">|</span>
                          <span className={!manualCostIsUsd ? 'font-bold text-indigo-700' : 'text-gray-500'}>PESOS</span>
                        </label>
                      </div>
                      {!isAgentBlind && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {manualCostIsUsd ? 'USD' : 'PESOS'} — Dólar: ${usdRate.toLocaleString('es-AR')} (Config. Central)
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mano de Obra</label>
                      <input
                        type="number"
                        list="labor-options-manual"
                        min={0}
                        step="0.01"
                        value={manualLaborValue}
                        onChange={(e) => setManualLaborValue(e.target.value)}
                        placeholder="Ej: 12500 o seleccionar de la lista"
                        className="w-full px-3 py-2 border rounded-lg bg-white"
                      />
                      <datalist id="labor-options-manual">
                        {laborOptions.map((o) => (
                          <option key={o.id} value={o.value} />
                        ))}
                      </datalist>
                    </div>
                    <div className="pt-3 border-t border-gray-300 space-y-1 text-sm bg-white p-3 rounded">
                      {!isAgentBlind && (
                        <>
                          <p className="flex justify-between text-gray-600"><span>Repuestos (costo + margen + IVA):</span> <strong>${repuestosConIvaManual.toLocaleString('es-AR')}</strong></p>
                          <p className="flex justify-between text-gray-600"><span>IVA ({ivaPct}% incluido en repuestos):</span> ${ivaManual.toLocaleString('es-AR')}</p>
                          <p className="flex justify-between text-gray-600"><span>Mano de obra:</span> <strong>${manualLaborNum.toLocaleString('es-AR')}</strong></p>
                        </>
                      )}
                      <p className="flex justify-between text-green-700 font-bold"><span>TOTAL EFECTIVO:</span> ${totalEfectivoManual.toLocaleString('es-AR')}</p>
                      {surchargePct > 0 && <p className="flex justify-between text-amber-700 font-medium"><span>TOTAL LISTA ({surchargePct}%):</span> ${totalListaManual.toLocaleString('es-AR')}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={applyManualQuote}
                      className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                    >
                      Aplicar Cotización Manual a la Orden
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  Seña / Pagos ($)
                  <HelpTooltip text="Monto adelantado por el cliente. Se restará del total." />
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  name="depositPaid"
                  value={form.depositPaid ?? ''}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aceptado el</label>
                <input type="date" name="acceptedDate" value={form.acceptedDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prometido para</label>
                <input type="date" name="promisedDate" value={form.promisedDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entregado el</label>
                <input type="date" name="deliveredDate" value={form.deliveredDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garantía hasta</label>
                <input type="date" name="warrantyExpirationDate" value={form.warrantyExpirationDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas (solo personal)</label>
                <textarea name="internalNotes" value={form.internalNotes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Notas internas, reasignaciones..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones públicas (visible para el cliente)</label>
                <textarea name="publicNotes" value={form.publicNotes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Falta caja" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                  {STATUS_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <FaSave /> {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </SectionCard>
        </form>
      ) : (
        <SectionCard title="Datos de la Orden">
          <p className="text-gray-500">Solo administradores y técnicos pueden editar.</p>
        </SectionCard>
      )}

      <SectionCard title="Cliente">
        <p className="font-medium">{formatRepairOrderClientDisplay(order)}</p>
        {order.client_phone?.trim() ? <p className="text-sm">Tel: {order.client_phone}</p> : null}
        {order.client_email?.trim() ? <p className="text-sm">Email: {order.client_email}</p> : null}
      </SectionCard>

      {canEdit ? (
        <SectionCard title="Fotos del Equipo" overflowVisible>
          {existingPhotos.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {existingPhotos
                  .filter((p) => p && p.photo_url)
                  .map((p) => (
                    <div key={p.id} className="flex flex-col gap-1">
                      <img
                        src={getImageUrl(p.photo_url)}
                        alt={p.perspective_label || 'Foto'}
                        className="w-full aspect-square object-cover rounded-lg border"
                      />
                      <p className="text-xs text-gray-500">{p.perspective_label}</p>
                      {canDeletePhoto && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const msg = canEdit
                              ? '¿Eliminar esta foto? Se aplicará al guardar cambios.'
                              : '¿Eliminar esta foto de la orden?';
                            if (!window.confirm(msg)) return;
                            if (canEdit) {
                              setExistingPhotos((prev) => prev.filter((photo) => photo.id !== p.id));
                              return;
                            }
                            try {
                              await api.delete(`/api/repair-orders/${id}/photos/${p.id}`);
                              toast.success('Foto eliminada');
                              fetchOrder();
                            } catch {
                              toast.error('Error al eliminar la foto');
                            }
                          }}
                          className="flex items-center justify-center gap-1 w-full py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded hover:bg-red-100"
                        >
                          <FaTrash className="w-3.5 h-3.5" /> Eliminar foto
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Agregar nuevas fotos (cámara o dispositivo)</p>
            <WebcamCapture photos={newPhotos} onPhotosChange={setNewPhotos} />
          </div>
        </SectionCard>
      ) : (
        existingPhotos.length > 0 && (
          <SectionCard title="Fotos" overflowVisible>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {existingPhotos
                .filter((p) => p && p.photo_url)
                .map((p) => (
                  <div key={p.id} className="flex flex-col gap-1">
                    <img
                      src={getImageUrl(p.photo_url)}
                      alt={p.perspective_label || 'Foto'}
                      className="w-full aspect-square object-cover rounded-lg border"
                    />
                    <p className="text-xs text-gray-500">{p.perspective_label}</p>
                    {canDeletePhoto && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const msg = canEdit
                            ? '¿Eliminar esta foto? Se aplicará al guardar cambios.'
                            : '¿Eliminar esta foto de la orden?';
                          if (!window.confirm(msg)) return;
                          if (canEdit) {
                            setExistingPhotos((prev) => prev.filter((photo) => photo.id !== p.id));
                            return;
                          }
                          try {
                            await api.delete(`/api/repair-orders/${id}/photos/${p.id}`);
                            toast.success('Foto eliminada');
                            fetchOrder();
                          } catch {
                            toast.error('Error al eliminar la foto');
                          }
                        }}
                        className="flex items-center justify-center gap-1 w-full py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded hover:bg-red-100"
                      >
                        <FaTrash className="w-3.5 h-3.5" /> Eliminar foto
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </SectionCard>
        )
      )}

      {/* Modal Procesar a Reciclaje */}
      {showRecyclingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Procesar a Reciclaje</h2>
              <button onClick={() => setShowRecyclingModal(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">La orden pasará a estado <strong>Abandonado/Reciclaje</strong>. Complete las observaciones y fotos del equipo (internas, no visibles para el cliente).</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de Reciclaje (internas)</label>
                <textarea
                  value={recyclingNotes}
                  onChange={(e) => setRecyclingNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Estado del equipo, motivo del reciclaje..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imágenes del estado del equipo</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setRecyclingPhotos(e.target.files ? Array.from(e.target.files) : [])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {recyclingPhotos.length > 0 && <p className="text-xs text-gray-500 mt-1">{recyclingPhotos.length} archivo(s) seleccionado(s)</p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setShowRecyclingModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleRecyclingSave} disabled={savingRecycling} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {savingRecycling ? 'Guardando...' : 'Guardar y pasar a Abandonado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WhatsApp */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Revisar Mensaje de WhatsApp</h2>
              <button onClick={() => setShowWhatsAppModal(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-y"
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={sendWhatsApp}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FaWhatsapp /> Enviar Mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {order && (
        <RepairOrderReceipt
          order={order}
          companySettings={companySettings ?? { company_name: 'SCH COMERCIAL SAS', address: '—', phone: '—', email: '—', logo_url: null, legal_footer_text: '' }}
        />
      )}
    </div>
  );
};

export default ManageRepairOrderPage;
