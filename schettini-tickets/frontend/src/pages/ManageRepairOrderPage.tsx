import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api, { API_BASE_URL } from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import SectionCard from '../components/Common/SectionCard';
import { FaWhatsapp, FaSave, FaTimes, FaFilePdf } from 'react-icons/fa';

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
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '');
  const expanded = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const res = await fetch(fullUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface TechnicianOption {
  id: number;
  username: string;
  full_name?: string;
  role: string;
}

interface RepairOrder {
  id: number;
  order_number: string;
  client_id: number;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  client_phone?: string;
  technician_id?: number | null;
  technician_name?: string | null;
  status: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  reported_fault?: string;
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
  entregado_sin_reparacion: 'Entregado sin Reparación'
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

function formatDate(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

function buildWhatsAppTemplate(order: RepairOrder): string {
  const totalCost = order.total_cost ?? 0;
  const depositPaid = order.deposit_paid ?? 0;
  const saldo = totalCost - depositPaid;
  return `Estimado Cliente:
Este mensaje es para informarle el Estado de su Orden Nº ${order.order_number}
Su Nº de Cliente es: ${order.client_id}

Equipo: ${order.equipment_type || '—'}
Modelo: ${order.model || '—'}
Nº de Serie: ${order.serial_number || '—'}

El ESTADO de la Orden es:
*${STATUS_LABELS[order.status] || order.status}*

FALLA ORIGINAL DECLARADA:
${order.reported_fault || '—'}

INFORME TECNICO / SOLUCION:
*${order.technical_report || '—'}*

Ingreso el: ${formatDate(order.entry_date) || '—'}
Aceptado el: ${formatDate(order.accepted_date) || '—'}
Prometido para: ${formatDate(order.promised_date) || '—'}
Entregado el: ${formatDate(order.delivered_date) || '—'}
Garantía: ${formatDate(order.warranty_expiration_date) || '—'}

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

  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  const [form, setForm] = useState({
    status: '',
    equipmentType: '',
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
    technicianId: ''
  });

  const fetchOrder = () => {
    if (!id) return;
    setLoading(true);
    api
      .get<{ success: boolean; data: RepairOrder }>(`/api/repair-orders/${id}`)
      .then((res) => {
        const o = res.data.data;
        setOrder(o);
        setForm({
          status: o.status || '',
          equipmentType: o.equipment_type || '',
          model: o.model || '',
          serialNumber: o.serial_number || '',
          reportedFault: o.reported_fault || '',
          includedAccessories: o.included_accessories || '',
          technicalReport: o.technical_report || '',
          laborCost: o.labor_cost != null ? String(o.labor_cost) : '',
          sparePartsCost: o.spare_parts_cost != null ? String(o.spare_parts_cost) : '',
          totalCost: o.total_cost != null ? String(o.total_cost) : '',
          depositPaid: o.deposit_paid != null ? String(o.deposit_paid) : '',
          acceptedDate: formatDate(o.accepted_date) || '',
          promisedDate: formatDate(o.promised_date) || '',
          deliveredDate: formatDate(o.delivered_date) || '',
          warrantyExpirationDate: formatDate(o.warranty_expiration_date) || '',
          publicNotes: o.public_notes || '',
          sparePartsDetail: o.spare_parts_detail || '',
          technicianId: o.technician_id ? String(o.technician_id) : ''
        });
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

  const generarComprobantePDF = async () => {
    if (!order) {
      toast.warning('Esperando datos de la orden...');
      return;
    }
    const cs: CompanySettings = companySettings ?? {
      company_name: 'Tu Empresa S.A.',
      address: '—',
      phone: '—',
      email: '—',
      website: '—',
      logo_url: null,
      tax_percentage: 21,
      quote_footer_text: 'Comprobante válido como referencia.',
      primary_color: '#000000',
    };
    const [r, g, b] = hexToRgb(cs.primary_color || '#000000');

    const depositPaid = form.depositPaid ? parseFloat(form.depositPaid) : (order.deposit_paid ?? 0);
    const laborCost = form.laborCost ? parseFloat(form.laborCost) : (order.labor_cost ?? 0);
    const sparePartsCost = form.sparePartsCost ? parseFloat(form.sparePartsCost) : (order.spare_parts_cost ?? 0);
    const totalFromForm = form.totalCost ? parseFloat(form.totalCost) : null;
    const subtotal = totalFromForm ?? ((laborCost + sparePartsCost) || (order.total_cost ?? 0));
    const taxPct = cs.tax_percentage ?? 0;
    const iva = taxPct > 0 ? subtotal * (taxPct / 100) : 0;
    const totalPagar = subtotal + iva;
    const saldo = totalPagar - depositPaid;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    let logoDataUrl: string | null = null;
    if (cs.logo_url) logoDataUrl = await loadImageAsDataUrl(cs.logo_url);
    if (logoDataUrl) {
      try {
        const fmt = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(logoDataUrl, fmt, margin, 12, 25, 18);
      } catch {
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, 12, 25, 18);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('LOGO', margin + 4, 22);
      }
    } else {
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, 12, 25, 18);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('LOGO', margin + 4, 22);
    }

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(cs.company_name || 'Tu Empresa S.A.', pageW - margin - 50, 16);
    doc.setFontSize(8);
    doc.text(cs.address || '—', pageW - margin - 50, 21);
    doc.text(`Tel: ${cs.phone || '—'}`, pageW - margin - 50, 26);
    doc.text(cs.website || cs.email || '—', pageW - margin - 50, 31);

    y = 45;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`COMPROBANTE - Orden Nº ${order.order_number}`, margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y);
    y += 10;

    const tableData: (string | number)[][] = [
      ['Cliente', order.client_name || order.client_business_name || '—'],
      ['Equipo', form.equipmentType || order.equipment_type || '—'],
      ['Modelo', form.model || order.model || '—'],
      ['Nº Serie', form.serialNumber || order.serial_number || '—'],
      ['Estado', STATUS_LABELS[form.status || order.status] || '—'],
      ['Falla reportada', (form.reportedFault || order.reported_fault || '—').slice(0, 80) + ((form.reportedFault || order.reported_fault || '').length > 80 ? '...' : '')],
      ['Informe técnico', (form.technicalReport || order.technical_report || '—').slice(0, 80) + ((form.technicalReport || order.technical_report || '').length > 80 ? '...' : '')],
    ];
    autoTable(doc, {
      startY: y,
      head: [['Dato', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: 255 },
      styles: { fontSize: 9 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    const costRows: (string | number)[][] = [
      ['Mano de obra', `$ ${Math.round(laborCost).toLocaleString('es-AR')}`],
      ['Repuestos', `$ ${Math.round(sparePartsCost).toLocaleString('es-AR')}`],
    ];
    if (taxPct > 0) {
      costRows.push([`IVA ${taxPct}%`, `$ ${Math.round(iva).toLocaleString('es-AR')}`]);
    }
    costRows.push(['Total', `$ ${Math.round(totalPagar).toLocaleString('es-AR')}`]);
    costRows.push(['Pagado/Seña', `$ ${Math.round(depositPaid).toLocaleString('es-AR')}`]);
    costRows.push(['Saldo', `$ ${Math.round(saldo).toLocaleString('es-AR')}`]);

    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Monto']],
      body: costRows,
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: 255 },
      styles: { fontSize: 10 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(cs.quote_footer_text?.trim() || 'Comprobante válido como referencia. Sujeto a condiciones del servicio.', margin, y);

    doc.save(`Comprobante-Orden-${order.order_number}.pdf`);
    toast.success('Comprobante descargado correctamente.');
  };

  const openWhatsAppModal = () => {
    if (!order) return;
    const merged: RepairOrder = {
      ...order,
      status: form.status || order.status,
      equipment_type: form.equipmentType || order.equipment_type,
      model: form.model || order.model,
      serial_number: form.serialNumber || order.serial_number,
      reported_fault: form.reportedFault || order.reported_fault,
      technical_report: form.technicalReport || order.technical_report,
      total_cost: form.totalCost ? parseFloat(form.totalCost) : order.total_cost,
      deposit_paid: form.depositPaid ? parseFloat(form.depositPaid) : order.deposit_paid,
      accepted_date: form.acceptedDate || order.accepted_date,
      promised_date: form.promisedDate || order.promised_date,
      delivered_date: form.deliveredDate || order.delivered_date,
      warranty_expiration_date: form.warrantyExpirationDate || order.warranty_expiration_date,
      public_notes: form.publicNotes || order.public_notes,
      spare_parts_detail: form.sparePartsDetail || order.spare_parts_detail
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/api/repair-orders/${id}`, {
        status: form.status || null,
        equipmentType: form.equipmentType || null,
        model: form.model || null,
        serialNumber: form.serialNumber || null,
        reportedFault: form.reportedFault || null,
        includedAccessories: form.includedAccessories || null,
        technicalReport: form.technicalReport || null,
        laborCost: form.laborCost ? parseFloat(form.laborCost) : null,
        sparePartsCost: form.sparePartsCost ? parseFloat(form.sparePartsCost) : null,
        totalCost: form.totalCost ? parseFloat(form.totalCost) : null,
        depositPaid: form.depositPaid ? parseFloat(form.depositPaid) : null,
        acceptedDate: form.acceptedDate || null,
        promisedDate: form.promisedDate || null,
        deliveredDate: form.deliveredDate || null,
        warrantyExpirationDate: form.warrantyExpirationDate || null,
        publicNotes: form.publicNotes || null,
        sparePartsDetail: form.sparePartsDetail || null,
        technicianId: form.technicianId ? parseInt(form.technicianId, 10) : null
      });
      toast.success('Orden actualizada');
      fetchOrder();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
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
    <div className="max-w-4xl mx-auto space-y-6">
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
              onClick={generarComprobantePDF}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              <FaFilePdf size={18} /> Imprimir Comprobante
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg">
                  {STATUS_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
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
                <input name="equipmentType" value={form.equipmentType} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input name="model" value={form.model} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº de Serie</label>
                <input name="serialNumber" value={form.serialNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Falla / Problema Reportado</label>
                <textarea name="reportedFault" value={form.reportedFault} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Accesorios incluidos</label>
                <textarea name="includedAccessories" value={form.includedAccessories} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Informe Técnico / Solución</label>
                <textarea name="technicalReport" value={form.technicalReport} onChange={handleChange} rows={4} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mano de obra ($)</label>
                <input type="number" step="0.01" name="laborCost" value={form.laborCost} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repuestos ($)</label>
                <input type="number" step="0.01" name="sparePartsCost" value={form.sparePartsCost} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total ($)</label>
                <input type="number" step="0.01" name="totalCost" value={form.totalCost} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seña / Pagos ($)</label>
                <input type="number" step="0.01" name="depositPaid" value={form.depositPaid} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones públicas (visible para el cliente)</label>
                <textarea name="publicNotes" value={form.publicNotes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Falta caja" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Repuestos (detalle)</label>
                <textarea name="sparePartsDetail" value={form.sparePartsDetail} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg" />
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
        <p className="font-medium">{order.client_name || 'Sin nombre'}</p>
        {order.client_business_name && <p className="text-sm text-gray-500">{order.client_business_name}</p>}
        {order.client_phone && <p className="text-sm">Tel: {order.client_phone}</p>}
        {order.client_email && <p className="text-sm">Email: {order.client_email}</p>}
      </SectionCard>

      {order.photos && order.photos.length > 0 && (
        <SectionCard title="Fotos">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {order.photos.map((p) => (
              <div key={p.id} className="space-y-1">
                <img
                  src={p.photo_url.startsWith('http') ? p.photo_url : `${API_BASE_URL}${p.photo_url}`}
                  alt={p.perspective_label}
                  className="w-full aspect-square object-cover rounded-lg border"
                />
                <p className="text-xs text-gray-500">{p.perspective_label}</p>
              </div>
            ))}
          </div>
        </SectionCard>
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
    </div>
  );
};

export default ManageRepairOrderPage;
