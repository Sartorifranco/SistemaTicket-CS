import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Barcode from 'react-barcode';
import { getImageUrl } from '../../utils/imageUrl';
import { FaPrint, FaTimes } from 'react-icons/fa';
import './RepairOrderReceipt.css';

export interface CompanySettingsReceipt {
  company_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  legal_footer_text?: string | null;
}

export interface RepairOrderItemReceipt {
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  reported_fault?: string | null;
  included_accessories?: string | null;
}

export interface RepairOrderReceiptData {
  id: number;
  order_number: string;
  client_id: number;
  client_name?: string | null;
  client_business_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  entry_date?: string | null;
  created_at?: string | null;
  deposit_paid?: number | null;
  public_notes?: string | null;
  items?: RepairOrderItemReceipt[];
  equipment_type?: string | null;
  model?: string | null;
  serial_number?: string | null;
  reported_fault?: string | null;
  included_accessories?: string | null;
}

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const FRONTEND_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/client/repairs`
  : (process.env.REACT_APP_PUBLIC_URL || '');

function ReceiptHalf({
  label,
  order,
  companySettings,
}: {
  label: 'ORIGINAL' | 'DUPLICADO';
  order: RepairOrderReceiptData;
  companySettings: CompanySettingsReceipt;
}) {
  const cs = companySettings;
  const clientName = order.client_name || order.client_business_name || '—';
  const items = order.items && order.items.length > 0
    ? order.items
    : [{
        equipment_type: order.equipment_type || '—',
        brand: null,
        model: order.model || '—',
        serial_number: order.serial_number || '—',
        reported_fault: order.reported_fault || '—',
        included_accessories: order.included_accessories || null,
      }];
  const depositPaid = order.deposit_paid ?? 0;

  return (
    <div className="receipt-half break-inside-avoid">
      <p className="text-right text-xs font-semibold text-gray-600 mb-1">{label}</p>
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          {cs.logo_url && (
            <img src={getImageUrl(cs.logo_url)} alt="Logo" className="h-14 object-contain mb-1" />
          )}
          <p className="font-bold text-sm">{cs.company_name || '—'}</p>
          <p className="text-xs">{cs.address || '—'}</p>
          <p className="text-xs">Tel: {cs.phone || '—'}</p>
          <p className="text-xs">{cs.email || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs mb-1">Entrada: {formatDateTime(order.entry_date || order.created_at)}</p>
          <div className="border border-black p-2 text-center">
            <p className="text-xs font-medium">Orden de Reparación</p>
            <p className="text-xl font-bold">{order.order_number}</p>
          </div>
          <div className="flex justify-center my-1">
            <Barcode value={order.order_number} displayValue fontSize={10} />
          </div>
          <p className="text-[10px] mt-1">Vea el estado de su Orden por internet en:</p>
          <p className="text-[10px] font-medium break-all">{FRONTEND_URL}</p>
          <p className="text-[10px] mt-0.5">Su Nº de Cliente es: {order.client_id}</p>
        </div>
      </div>

      <h2 className="text-center font-bold text-base mb-3">NOTA DE RECEPCIÓN</h2>

      <div className="border border-black p-2 mb-2 receipt-box break-inside-avoid">
        <p className="text-xs font-semibold mb-1">Datos del Cliente</p>
        <p className="text-xs">Nombre: {clientName}</p>
        <p className="text-xs">Teléfono: {order.client_phone || '—'}</p>
        <p className="text-xs">Dirección: —</p>
        <p className="text-xs">Email: {order.client_email || '—'}</p>
      </div>

      <div className="border border-black p-2 mb-2 receipt-box break-inside-avoid">
        <p className="text-xs font-semibold mb-1">Equipo(s)</p>
        {items.map((it, idx) => (
          <div key={idx} className="mb-2 last:mb-0 text-xs">
            <p><span className="font-medium">Equipo:</span> {[it.equipment_type, it.brand, it.model].filter(Boolean).join(' / ') || '—'}</p>
            <p><span className="font-medium">Modelo:</span> {it.model || '—'}</p>
            <p><span className="font-medium">Serie:</span> {it.serial_number || '—'}</p>
            {it.included_accessories && <p><span className="font-medium">Accesorios incluidos:</span> {it.included_accessories}</p>}
            <p><span className="font-medium">Falla declarada:</span> {it.reported_fault || '—'}</p>
          </div>
        ))}
      </div>

      {order.public_notes && (
        <div className="mb-2 text-xs">
          <p className="font-medium">Observaciones:</p>
          <p className="whitespace-pre-wrap">{order.public_notes}</p>
        </div>
      )}

      {depositPaid > 0 && (
        <p className="text-sm font-bold border-t border-black pt-1 mt-1">
          Seña / Pago por adelantado: $ {depositPaid.toLocaleString('es-AR')}
        </p>
      )}

      <div className="mt-2 pt-2 border-t border-dashed receipt-legal break-inside-avoid">
        <p className="text-[9px] font-semibold mb-1">Términos y condiciones - SCH COMERCIAL SAS</p>
        <p className="text-[8px] leading-tight whitespace-pre-wrap">{cs.legal_footer_text?.trim() || 'Sin términos adicionales.'}</p>
        <div className="mt-4 pt-2 border-t border-gray-400">
          <p className="text-xs">Firma del Cliente: _________________________</p>
        </div>
      </div>
    </div>
  );
}

interface RepairOrderReceiptProps {
  order: RepairOrderReceiptData;
  companySettings: CompanySettingsReceipt;
  onClose?: () => void;
  /** Si es true, muestra el modal con acciones Imprimir/Cerrar. Si es false, solo el contenido (para uso interno) */
  showActions?: boolean;
}

const RepairOrderReceipt: React.FC<RepairOrderReceiptProps> = ({
  order,
  companySettings,
  onClose,
  showActions = true,
}) => {
  const cs = companySettings ?? {
    company_name: 'SCH COMERCIAL SAS',
    address: '—',
    phone: '—',
    email: '—',
    logo_url: null,
    legal_footer_text: '',
  };

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black">
      <ReceiptHalf label="ORIGINAL" order={order} companySettings={cs} />
      <div className="flex items-center justify-center gap-2 py-2 my-2 border-t-2 border-dashed border-gray-500">
        <span className="text-gray-500">✂️</span>
        <span className="text-xs text-gray-500">Cortar por aquí</span>
        <span className="text-gray-500">✂️</span>
      </div>
      <ReceiptHalf label="DUPLICADO" order={order} companySettings={cs} />
    </div>
  );

  if (!showActions) {
    return content;
  }

  const modal = (
    <div
      id="receipt-print-portal"
      className="fixed inset-0 z-[9999] bg-gray-900/80 flex items-center justify-center p-4 overflow-auto"
      style={{ display: 'flex' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-[210mm] w-full max-h-[95vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center receipt-print-no-print z-10">
          <h3 className="font-bold text-gray-800">Nota de Recepción - Orden {order.order_number}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <FaPrint size={16} /> Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              <FaTimes size={16} /> Cerrar
            </button>
          </div>
        </div>
        <div className="p-4 text-black">{content}</div>
      </div>
    </div>
  );

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('receipt-print-portal-root') : null;
  if (portalRoot) {
    return createPortal(modal, portalRoot);
  }
  return modal;
};

/** Crea el contenedor portal en el body si no existe */
export function useReceiptPrintPortal() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('receipt-print-portal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'receipt-print-portal-root';
      document.body.appendChild(el);
    }
    return () => {
      // No eliminamos el div, puede usarse para futuras impresiones
    };
  }, []);
}

export default RepairOrderReceipt;
