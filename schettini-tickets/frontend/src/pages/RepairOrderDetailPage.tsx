import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../config/axiosConfig';
import { getImageUrl } from '../utils/imageUrl';
import SectionCard from '../components/Common/SectionCard';
import RepairOrderPaymentsSection from '../components/RepairOrders/RepairOrderPaymentsSection';
import RepairOrderReceipt, { useReceiptPrintPortal } from '../components/RepairOrder/RepairOrderReceipt';
import { formatRepairOrderClientDisplay } from '../utils/repairOrderLabels';
import { formatDateTimeArgentina } from '../utils/dateFormatter';
import { FaPrint } from 'react-icons/fa';

interface RepairOrderItem {
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  reported_fault?: string | null;
  included_accessories?: string | null;
}

interface RepairOrderPayment {
  id: number;
  amount: number | string;
  payment_method: string;
  notes?: string | null;
  is_legacy_import?: number | boolean;
  created_at?: string;
}

interface RepairOrder {
  id: number;
  order_number: string;
  client_id: number | null;
  client_name?: string;
  client_business_name?: string;
  client_phone?: string;
  client_email?: string;
  client_address?: string | null;
  status: string;
  equipment_type?: string;
  model?: string;
  serial_number?: string;
  reported_fault?: string;
  included_accessories?: string;
  is_warranty: number;
  public_notes?: string | null;
  entry_date?: string;
  created_at?: string;
  labor_cost?: number | null;
  spare_parts_cost?: number | null;
  total_cost?: number | null;
  deposit_paid?: number | null;
  technical_report?: string | null;
  items?: RepairOrderItem[];
  photos?: { id: number; photo_url: string; perspective_label: string }[];
  payments?: RepairOrderPayment[];
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

/** Vista de solo lectura para el cliente (ruta `/client/repairs/:id`). Sin acciones de cobro. */
const RepairOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const listPath = '/client/repairs';

  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<{
    company_name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string | null;
    legal_footer_text?: string | null;
  } | null>(null);
  useReceiptPrintPortal();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<{ success: boolean; data: RepairOrder }>(`/api/repair-orders/${id}`)
      .then((res) => {
        const data = res.data.data;
        if (data && 'internal_notes' in data) delete (data as Record<string, unknown>).internal_notes;
        setOrder(data);
      })
      .catch(() => toast.error('Error al cargar la orden'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api
      .get('/api/settings/company')
      .then((res) => {
        const d = res.data.data || res.data;
        if (d) setCompanySettings(d);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 max-w-4xl mx-auto">
        <p className="text-gray-500">Orden no encontrada</p>
        <button type="button" onClick={() => navigate(listPath)} className="mt-4 text-indigo-600 hover:underline">
          Volver a mis reparaciones
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={() => navigate(listPath)} className="text-indigo-600 hover:underline flex items-center gap-1">
          ← Volver a mis reparaciones
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <FaPrint size={18} /> Imprimir comprobante
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800">
        Orden {order.order_number}
        <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded bg-gray-200">
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </h1>

      <SectionCard title="Cliente">
        <p className="font-medium">{formatRepairOrderClientDisplay(order)}</p>
        {order.client_phone?.trim() ? <p className="text-sm text-gray-600 mt-1">Tel: {order.client_phone}</p> : null}
        {order.client_email?.trim() ? <p className="text-sm text-gray-600">Email: {order.client_email}</p> : null}
      </SectionCard>

      <RepairOrderPaymentsSection order={order} variant="client" />

      <SectionCard title="Fecha de ingreso">
        <p className="text-gray-800">
          {order.entry_date || order.created_at
            ? formatDateTimeArgentina(String(order.entry_date || order.created_at))
            : '—'}
        </p>
      </SectionCard>

      <SectionCard title="Equipos y falla">
        {order.items && order.items.length > 0 ? (
          <ul className="space-y-3">
            {order.items.map((it, idx) => (
              <li key={idx} className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-medium text-gray-900">
                  {[it.equipment_type, it.brand, it.model].filter(Boolean).join(' · ') || `Equipo ${idx + 1}`}
                </span>
                {it.serial_number && <span className="text-gray-600"> — Serie: {it.serial_number}</span>}
                {it.reported_fault && <p className="text-gray-700 mt-2 whitespace-pre-wrap">Falla: {it.reported_fault}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p>{order.equipment_type || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Modelo</p>
                <p>{order.model || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Serie N°</p>
                <p>{order.serial_number || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Falla reportada</p>
              <p className="whitespace-pre-wrap">{order.reported_fault || '—'}</p>
            </div>
          </div>
        )}
        {order.included_accessories ? (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Accesorios incluidos</p>
            <p>{order.included_accessories}</p>
          </div>
        ) : null}
        {!!order.is_warranty && <p className="mt-3 text-sm text-amber-700 font-medium">Orden / equipo en garantía</p>}
      </SectionCard>

      {order.technical_report?.trim() ? (
        <SectionCard title="Informe técnico">
          <p className="whitespace-pre-wrap text-gray-800 text-sm">{order.technical_report}</p>
        </SectionCard>
      ) : null}

      {order.public_notes?.trim() ? (
        <SectionCard title="Observaciones">
          <p className="whitespace-pre-wrap text-gray-800 text-sm">{order.public_notes}</p>
        </SectionCard>
      ) : null}

      {order.photos && order.photos.length > 0 && (
        <SectionCard title="Fotos del equipo">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {order.photos
              .filter((p) => p && p.photo_url)
              .map((p) => (
                <div key={p.id} className="space-y-1">
                  <img
                    src={getImageUrl(p.photo_url)}
                    alt={p.perspective_label || 'Foto'}
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                  <p className="text-xs text-gray-500">{p.perspective_label}</p>
                </div>
              ))}
          </div>
        </SectionCard>
      )}

      <RepairOrderReceipt
        order={order}
        companySettings={
          companySettings ?? {
            company_name: 'SCH COMERCIAL SAS',
            address: '—',
            phone: '—',
            email: '—',
            logo_url: null,
            legal_footer_text: ''
          }
        }
      />
    </div>
  );
};

export default RepairOrderDetailPage;
