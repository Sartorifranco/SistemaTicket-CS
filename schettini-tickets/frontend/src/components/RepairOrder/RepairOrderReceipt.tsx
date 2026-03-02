import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Barcode from 'react-barcode';
import { getImageUrl } from '../../utils/imageUrl';
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
  client_address?: string | null;
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

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function parseAccessoriesList(text?: string | null): string[] {
  if (!text || typeof text !== 'string') return [];
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

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
  const clientAddress = order.client_address || '—';
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

  return (
    <div className="break-inside-avoid">
      {/* Label */}
      <p className="text-right text-xs font-semibold text-gray-600 mb-1">{label}</p>

      {/* HEADER: Flexbox */}
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          {cs.logo_url && (
            <img src={getImageUrl(cs.logo_url)} alt="Logo" className="w-32 object-contain mb-1" />
          )}
          <p className="text-sm font-bold text-black">{cs.company_name || '—'}</p>
          <p className="text-xs text-gray-700">Soluciones para comercios y empresas</p>
          <p className="text-xs text-gray-600">{cs.address || '—'}</p>
          <p className="text-xs text-gray-600">Tel: {cs.phone || '—'}</p>
          <p className="text-xs text-gray-600">{cs.email || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs mb-1">Entrada: {formatDate(order.entry_date || order.created_at)}</p>
          <div className="border border-black p-2 text-center">
            <p className="text-xs font-medium">Orden de Reparación</p>
            <p className="text-2xl font-bold">{order.order_number}</p>
            <div className="flex justify-center mt-1">
              <Barcode value={String(order.order_number)} width={1.5} height={40} displayValue={false} />
            </div>
          </div>
        </div>
      </div>

      {/* TÍTULO */}
      <h2 className="text-center font-bold text-base mb-3">NOTA DE RECEPCION</h2>

      {/* CAJA CLIENTE: Grid 2 cols */}
      <div className="border border-black p-2 mb-2 break-inside-avoid">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <span className="font-semibold">Cliente: </span>
            <span>{clientName}</span>
          </div>
          <div>
            <span className="font-semibold">Teléfono: </span>
            <span>{order.client_phone || '—'}</span>
          </div>
          <div>
            <span className="font-semibold">Dirección: </span>
            <span>{clientAddress}</span>
          </div>
          <div>
            <span className="font-semibold">Email: </span>
            <span>{order.client_email || '—'}</span>
          </div>
        </div>
      </div>

      {/* CAJA EQUIPO: Línea superior e inferior */}
      <div className="border-t border-b border-black py-2 mb-2 break-inside-avoid">
        {items.map((it, idx) => (
          <div key={idx} className="mb-2 last:mb-0 text-xs">
            <p><span className="font-semibold">Equipo: </span>{[it.equipment_type, it.brand, it.model].filter(Boolean).join(' / ') || '—'}</p>
            <p><span className="font-semibold">Modelo: </span>{it.model || '—'}</p>
            <p><span className="font-semibold">Serie: </span>{it.serial_number || '—'}</p>
            {parseAccessoriesList(it.included_accessories).length > 0 ? (
              <div>
                <span className="font-semibold">Accesorios Incluidos: </span>
                <ul className="list-disc list-inside ml-1 mt-0.5">
                  {parseAccessoriesList(it.included_accessories).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : it.included_accessories ? (
              <p><span className="font-semibold">Accesorios Incluidos: </span>{it.included_accessories}</p>
            ) : null}
            <p><span className="font-semibold">Falla declarada: </span>{it.reported_fault || '—'}</p>
          </div>
        ))}
        {order.public_notes && (
          <p className="mt-1"><span className="font-semibold">Observaciones: </span>{order.public_notes}</p>
        )}
      </div>

      {/* LEGALES */}
      <div className="text-[9px] leading-tight break-inside-avoid">
        <p className="font-semibold mb-1">Términos y condiciones - SCH COMERCIAL SAS</p>
        <p className="whitespace-pre-wrap">{cs.legal_footer_text?.trim() || 'Sin términos adicionales.'}</p>
      </div>
    </div>
  );
}

interface RepairOrderReceiptProps {
  order: RepairOrderReceiptData;
  companySettings: CompanySettingsReceipt;
}

const RepairOrderReceipt: React.FC<RepairOrderReceiptProps> = ({ order, companySettings }) => {
  const cs = companySettings ?? {
    company_name: 'SCH COMERCIAL SAS',
    address: '—',
    phone: '—',
    email: '—',
    logo_url: null,
    legal_footer_text: '',
  };

  const content = (
    <div className="h-screen w-full flex flex-col bg-white text-black p-4">
      <ReceiptHalf label="ORIGINAL" order={order} companySettings={cs} />
      <hr className="border-dashed border-gray-400 my-4 flex-shrink-0" />
      <ReceiptHalf label="DUPLICADO" order={order} companySettings={cs} />
    </div>
  );

  const portalContent = (
    <div
      id="receipt-print-area"
      className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black print:z-[9999]"
    >
      {content}
    </div>
  );

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('receipt-print-portal-root') : null;
  if (portalRoot) {
    return createPortal(portalContent, portalRoot);
  }
  return portalContent;
};

export function useReceiptPrintPortal() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('receipt-print-portal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'receipt-print-portal-root';
      document.body.appendChild(el);
    }
  }, []);
}

export default RepairOrderReceipt;
