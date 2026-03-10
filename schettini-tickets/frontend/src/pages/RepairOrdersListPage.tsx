import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import SectionCard from '../components/Common/SectionCard';
import { FaPlus, FaEye, FaPrint, FaWhatsapp, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import RepairOrderReceipt, { useReceiptPrintPortal } from '../components/RepairOrder/RepairOrderReceipt';
import type { RepairOrderReceiptData } from '../components/RepairOrder/RepairOrderReceipt';
import { formatDateTimeArgentina } from '../utils/dateFormatter';

interface RepairOrderRow {
  id: number;
  order_number: string;
  client_id?: number;
  client_name?: string;
  client_business_name?: string;
  client_phone?: string;
  client_email?: string | null;
  client_address?: string | null;
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
  items?: { equipment_type?: string; brand?: string; model?: string; serial_number?: string; reported_fault?: string; included_accessories?: string }[];
}

interface CompanySettings {
  company_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  tax_percentage?: number;
  default_iva_percent?: number | null;
  quote_footer_text?: string;
  primary_color?: string;
  legal_footer_text?: string | null;
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

const STATUS_COLORS: Record<string, string> = {
  ingresado: 'bg-amber-100 text-amber-800 border-amber-300',
  cotizado: 'bg-blue-100 text-blue-800 border-blue-300',
  aceptado: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  no_aceptado: 'bg-red-100 text-red-800 border-red-300',
  en_espera: 'bg-orange-100 text-orange-800 border-orange-300',
  sin_reparacion: 'bg-gray-200 text-gray-700 border-gray-400',
  listo: 'bg-green-100 text-green-800 border-green-300',
  entregado: 'bg-green-200 text-green-900 border-green-400',
  entregado_sin_reparacion: 'bg-gray-100 text-gray-700 border-gray-300',
  abandonado: 'bg-red-200 text-red-900 border-red-500'
};

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

const RepairOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/repair-orders' : '/agent/repair-orders';
  const isViewer = user?.role === 'viewer';

  const [orders, setOrders] = useState<RepairOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [clients, setClients] = useState<{ id: number; username: string; business_name?: string }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: number; username: string; full_name?: string }[]>([]);
  const [printOrder, setPrintOrder] = useState<RepairOrderRow | null>(null);
  const [showAbandonadoModal, setShowAbandonadoModal] = useState(false);
  const [abandonadoOrder, setAbandonadoOrder] = useState<RepairOrderRow | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  useReceiptPrintPortal();

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

  const handlePrintComprobante = async (order: RepairOrderRow) => {
    try {
      const res = await api.get<{ success: boolean; data: RepairOrderRow }>(`/api/repair-orders/${order.id}`);
      const fullOrder = res.data.data;
      if (!fullOrder) {
        toast.error('No se pudo cargar la orden');
        return;
      }
      setPrintOrder(fullOrder);
      setTimeout(() => window.print(), 150);
    } catch {
      toast.error('Error al cargar la orden para imprimir');
    }
  };

  useEffect(() => {
    const onAfterPrint = () => setPrintOrder(null);
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const handleStatusChange = async (order: RepairOrderRow, newStatus: string) => {
    if (newStatus === order.status) return;
    if (newStatus === 'abandonado') {
      setAbandonadoOrder(order);
      setShowAbandonadoModal(true);
      return;
    }
    setUpdatingStatusId(order.id);
    try {
      await api.put(`/api/repair-orders/${order.id}/status`, { status: newStatus });
      toast.success('Estado actualizado correctamente');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Error al actualizar estado');
    } finally {
      setUpdatingStatusId(null);
    }
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
    <div className="space-y-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Órdenes de Reparación</h1>
        {!isViewer && (
          <button
            onClick={() => navigate(`${basePath}/new`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            <FaPlus /> Nueva Orden
          </button>
        )}
      </div>

      <SectionCard title="Filtros">
        <div className="flex flex-wrap gap-3 min-w-0">
          <input
            type="text"
            placeholder="Nº Orden"
            value={filters.orderNumber}
            onChange={(e) => setFilters((f) => ({ ...f, orderNumber: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          />
          <input
            type="text"
            placeholder="Marca"
            value={filters.brand}
            onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          />
          <input
            type="text"
            placeholder="Modelo"
            value={filters.model}
            onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          />
          <input
            type="text"
            placeholder="Nº Serie"
            value={filters.serial}
            onChange={(e) => setFilters((f) => ({ ...f, serial: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          />
          <select
            value={filters.clientId}
            onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          >
            <option value="">Cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.username}</option>
            ))}
          </select>
          <select
            value={filters.technicianId}
            onChange={(e) => setFilters((f) => ({ ...f, technicianId: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          >
            <option value="">Técnico</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          >
            <option value="">Estado</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm min-w-[120px] flex-1 max-w-[180px]"
          />
        </div>
      </SectionCard>

      <SectionCard title="Listado">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-600 font-medium mb-1">Aún no hay registros aquí.</p>
            <p className="text-gray-500 text-sm">Hacé clic en el botón «Nueva Orden» arriba a la derecha para comenzar.</p>
          </div>
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
                        {isViewer ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[o.status] || 'bg-gray-200 text-gray-700'}`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </span>
                        ) : (
                          <select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o, e.target.value)}
                            disabled={updatingStatusId === o.id}
                            className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer min-w-[140px] focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_COLORS[o.status] || 'bg-gray-200 text-gray-700 border-gray-400'}`}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{formatDateTimeArgentina(o.entry_date || o.created_at)}</td>
                      <td className="px-4 py-2">
                        {badge && <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>⚠️ {badge.text}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`${basePath}/${o.id}`)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver Detalles"><FaEye /></button>
                          <button onClick={() => handlePrintComprobante(o)} className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg" title="Imprimir comprobante"><FaPrint /></button>
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

      {/* Modal: Abandonado requiere ir al detalle */}
      {showAbandonadoModal && abandonadoOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <FaExclamationTriangle className="text-amber-600 text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Área de Reciclaje</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Para declarar abandono debés entrar al detalle de la orden <strong>Nº {abandonadoOrder.order_number}</strong>. 
                  Se requieren fotos y notas obligatorias del estado del equipo.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAbandonadoModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAbandonadoModal(false);
                      setAbandonadoOrder(null);
                      navigate(`${basePath}/${abandonadoOrder.id}`);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Ir al detalle
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowAbandonadoModal(false); setAbandonadoOrder(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}

      {printOrder && (
        <RepairOrderReceipt
          order={printOrder as RepairOrderReceiptData}
          companySettings={companySettings ?? { company_name: 'SCH COMERCIAL SAS', address: '—', phone: '—', email: '—', logo_url: null, legal_footer_text: '' }}
        />
      )}
    </div>
  );
};

export default RepairOrdersListPage;
