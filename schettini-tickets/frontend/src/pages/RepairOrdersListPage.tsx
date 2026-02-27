import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';
import { FaPlus, FaEye, FaFilePdf, FaWhatsapp } from 'react-icons/fa';

interface RepairOrderRow {
  id: number;
  order_number: string;
  client_id?: number;
  client_name?: string;
  client_business_name?: string;
  client_phone?: string;
  status: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  technician_id?: number | null;
  technician_name?: string | null;
  technicianId?: number;
  entry_date?: string | null;
  created_at?: string;
  updated_at?: string | null;
  total_cost?: number | null;
  deposit_paid?: number | null;
  technical_report?: string | null;
  reported_fault?: string | null;
  public_notes?: string | null;
  spare_parts_detail?: string | null;
  accepted_date?: string | null;
  promised_date?: string | null;
  delivered_date?: string | null;
  warranty_expiration_date?: string | null;
  items?: { brand?: string; model?: string; serial_number?: string }[];
}

interface CompanySettings {
  company_name: string;
  address: string;
  logo_url: string | null;
  tax_percentage: number;
  default_iva_percent?: number | null;
  quote_footer_text: string;
  primary_color: string;
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

function formatDateTime(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
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

function buildWhatsAppMessage(order: RepairOrderRow): string {
  const totalCost = order.total_cost ?? 0;
  const depositPaid = order.deposit_paid ?? 0;
  const saldo = totalCost - depositPaid;
  return `Estimado Cliente:
Estado de su Orden Nº ${order.order_number}
Estado: *${STATUS_LABELS[order.status] || order.status}*
Equipo: ${order.equipment_type || '—'}
Costo: $ ${totalCost.toLocaleString('es-AR')}
Saldo: $ ${saldo.toLocaleString('es-AR')}`;
}

function getAlertBadge(order: RepairOrderRow): { text: string; className: string } | null {
  const updated = order.updated_at ? new Date(order.updated_at).getTime() : 0;
  const now = Date.now();
  if ((order.status === 'cotizado' || order.status === 'en_espera') && updated) {
    const days = (now - updated) / (24 * 60 * 60 * 1000);
    if (days > 3) return { text: 'Demorado', className: 'bg-red-100 text-red-800 border border-red-300' };
  }
  if (order.status === 'listo' && updated) {
    const hours = (now - updated) / (60 * 60 * 1000);
    if (hours > 48) return { text: 'Notificar Retiro', className: 'bg-amber-100 text-amber-800 border border-amber-400' };
  }
  return null;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const fullUrl = getImageUrl(url);
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '');
  const expanded = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expanded);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

const RepairOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';

  const [orders, setOrders] = useState<RepairOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [clients, setClients] = useState<{ id: number; username: string; business_name?: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; username: string; full_name?: string }[]>([]);

  const [filters, setFilters] = useState({
    orderNumber: '',
    brand: '',
    model: '',
    serial: '',
    clientId: '',
    technicianId: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchOrders = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.orderNumber) params.set('orderNumber', filters.orderNumber);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.model) params.set('model', filters.model);
    if (filters.serial) params.set('serial', filters.serial);
    if (filters.clientId) params.set('clientId', filters.clientId);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    setLoading(true);
    api
      .get<{ success: boolean; data: RepairOrderRow[] }>(`/api/repair-orders?${params.toString()}`)
      .then((res) => setOrders(res.data.data || []))
      .catch(() => toast.error('Error al cargar órdenes'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    api.get('/api/settings/company').then((res) => {
      const d = res.data.data || res.data;
      if (d) setCompanySettings(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; username: string; business_name?: string; role?: string }[] }>('/api/users').then((res) => {
      const list = (res.data.data || []).filter((u) => u.role === 'client');
      setClients(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: { id: number; username: string; full_name?: string }[] }>('/api/users/technicians').then((res) => {
      setTechnicians(res.data.data || []);
    }).catch(() => {});
  }, []);

  const generarPDF = async (order: RepairOrderRow) => {
    const cs = companySettings ?? { company_name: 'Empresa', address: '—', logo_url: null, tax_percentage: 21, quote_footer_text: '', primary_color: '#000000' };
    const [r, g, b] = hexToRgb(cs.primary_color || '#000000');
    const laborCost = 0;
    const sparePartsCost = 0;
    const subtotal = (order.total_cost ?? 0) / (1 + ((cs.default_iva_percent ?? cs.tax_percentage ?? 21) / 100));
    const iva = (order.total_cost ?? 0) - subtotal;
    const totalPagar = order.total_cost ?? 0;
    const depositPaid = order.deposit_paid ?? 0;
    const saldo = totalPagar - depositPaid;

    let logoDataUrl: string | null = null;
    if (cs.logo_url) logoDataUrl = await loadImageAsDataUrl(cs.logo_url);

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    let y = 20;

    if (logoDataUrl) {
      try {
        const fmt = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(logoDataUrl, fmt, margin, 12, 25, 18);
      } catch {
        doc.rect(margin, 12, 25, 18);
      }
    }
    doc.setFontSize(10);
    doc.text(cs.company_name || 'Empresa', 200, 16);
    doc.setFontSize(8);
    doc.text(cs.address || '—', 200, 21);

    y = 45;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`COMPROBANTE - Orden Nº ${order.order_number}`, margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const tableData: (string | number)[][] = [
      ['Cliente', order.client_name || order.client_business_name || '—'],
      ['Equipo', order.equipment_type || '—'],
      ['Modelo', order.model || '—'],
      ['Nº Serie', order.serial_number || '—'],
      ['Estado', STATUS_LABELS[order.status] || order.status],
      ['Total', `$ ${Math.round(totalPagar).toLocaleString('es-AR')}`],
      ['Pagado', `$ ${Math.round(depositPaid).toLocaleString('es-AR')}`],
      ['Saldo', `$ ${Math.round(saldo).toLocaleString('es-AR')}`]
    ];
    autoTable(doc, {
      startY: y,
      head: [['Dato', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [r, g, b], textColor: 255 },
      styles: { fontSize: 9 }
    });

    doc.save(`Comprobante-Orden-${order.order_number}.pdf`);
    toast.success('Comprobante descargado.');
  };

  const enviarWhatsApp = (order: RepairOrderRow) => {
    if (!order.client_phone) {
      toast.error('El cliente no tiene teléfono cargado.');
      return;
    }
    const phone = phoneToWhatsApp(order.client_phone);
    if (!phone) {
      toast.error('Número de teléfono inválido.');
      return;
    }
    const msg = encodeURIComponent(buildWhatsAppMessage(order));
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes de Reparación</h1>
        <button
          onClick={() => navigate(`${basePath}/new`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
        >
          <FaPlus /> Nueva Orden
        </button>
      </div>

      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <input
            type="text"
            placeholder="Nº Orden"
            value={filters.orderNumber}
            onChange={(e) => setFilters((f) => ({ ...f, orderNumber: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Marca"
            value={filters.brand}
            onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Modelo"
            value={filters.model}
            onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Nº Serie"
            value={filters.serial}
            onChange={(e) => setFilters((f) => ({ ...f, serial: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <select
            value={filters.clientId}
            onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.username}</option>
            ))}
          </select>
          <select
            value={filters.technicianId}
            onChange={(e) => setFilters((f) => ({ ...f, technicianId: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Técnico</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Estado</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Listado">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay órdenes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Orden</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Equipo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Técnico</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha y Hora Ingreso</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Alertas</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const badge = getAlertBadge(o);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{o.order_number}</td>
                      <td className="px-4 py-2">{o.client_name || '—'} {o.client_business_name && <span className="text-gray-500 text-sm">({o.client_business_name})</span>}</td>
                      <td className="px-4 py-2">{o.equipment_type || '—'} {o.model && <span className="text-gray-500 text-sm">/ {o.model}</span>}</td>
                      <td className="px-4 py-2">{o.technician_name || '—'}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-200">{STATUS_LABELS[o.status] || o.status}</span>
                      </td>
                      <td className="px-4 py-2 text-sm">{formatDateTime(o.entry_date || o.created_at)}</td>
                      <td className="px-4 py-2">
                        {badge && <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>⚠️ {badge.text}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`${basePath}/${o.id}`)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver Detalles"><FaEye /></button>
                          <button onClick={() => generarPDF(o)} className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg" title="Re-imprimir PDF"><FaFilePdf /></button>
                          <button onClick={() => enviarWhatsApp(o)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Enviar WhatsApp"><FaWhatsapp /></button>
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
    </div>
  );
};

export default RepairOrdersListPage;
