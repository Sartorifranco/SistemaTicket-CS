import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Barcode from 'react-barcode';
import { getImageUrl } from '../../utils/imageUrl';
import { formatRepairOrderClientDisplay } from '../../utils/repairOrderLabels';
import { formatDateTimeArgentina } from '../../utils/dateFormatter';
import './RepairOrderReceipt.css';

const DEFAULT_LEGAL_TEXT = `1- Para el requerimiento de cualquier servicio respecto del equipo y/o el retiro del mismo, se solicitará, sin excepción, la exhibición del presente comprobante o el DNI.
2- SCH COMERCIAL SAS no se responsabiliza por la pérdida total o parcial de la información.
3- El plazo para el retiro del equipo en reparación es de 60 días a partir de la fecha de ingreso. Durante ese tiempo el equipo estará a disposición del cliente. Cumplido ese término, se cobrará un monto diario de usd$0.80+iva, en concepto de gastos por depósito. Si no es retirada en 90 días, se considerará abandonada por su dueño y SCH COMERCIAL SAS quedará facultado para ejercer cualquier acto de disposición.
4- El diagnóstico de los equipos tiene un costo actual de $10.000 (pesos) que serán abonados al INGRESO del equipo. Este monto será reconocido cómo parte de pago en caso de aceptar la reparación.
5- GARANTIA: se conviene un plazo de garantía por el servicio técnico y materiales de 30 días.
7- El cliente firma en conformidad, declarando haber leído y aceptado todas las condiciones.
8- Es responsabilidad del cliente revisar las condiciones: https://casaschettini-shop.com/terminos-y-condiciones-politicas-garantia/
10- El cliente recibe copia de este documento.
11- Las cotizaciones qué NO superen el monto de $40.000 + iva, se consideran ACEPTADAS sin necesidad de previa confirmación del cliente.`;

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
  client_id?: number | null;
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
  const clientName = formatRepairOrderClientDisplay(order);
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

  const logoSrc = getImageUrl(cs?.logo_url);

  /** Texto legal del pie: Configuración Central (company_settings.legal_footer_text); si está vacío, respaldo embebido. */
  const legalText =
    cs?.legal_footer_text != null && String(cs.legal_footer_text).trim() !== ''
      ? String(cs.legal_footer_text)
      : DEFAULT_LEGAL_TEXT;

  return (
    <div className="h-[48vh] overflow-hidden flex flex-col p-2 break-inside-avoid">
      {/* Label */}
      <p className="text-right text-[10px] font-semibold text-gray-600 mb-0.5 flex-shrink-0">{label}</p>

      {/* HEADER: Flexbox */}
      <div className="flex justify-between items-start gap-2 mb-1 flex-shrink-0">
        <div className="min-w-0">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="Logo"
              className="h-12 object-contain mb-0.5 max-w-[120px]"
            />
          ) : null}
          <p className="text-[11px] font-bold text-black leading-tight">{cs.company_name || '—'}</p>
          <p className="text-[9px] text-gray-700 leading-tight">Soluciones para comercios y empresas</p>
          <p className="text-[9px] text-gray-600 leading-tight">{cs.address || '—'}</p>
          <p className="text-[9px] text-gray-600 leading-tight">Tel: {cs.phone || '—'}</p>
          <p className="text-[9px] text-gray-600 leading-tight">{cs.email || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] mb-0.5">Entrada: {formatDateTimeArgentina(order.entry_date || order.created_at)}</p>
          <div className="border border-black p-1 text-center">
            <p className="text-[10px] font-medium">Orden de Reparación</p>
            <p className="text-lg font-bold">{order.order_number}</p>
            <div className="flex justify-center">
              <Barcode value={String(order.order_number)} width={1.2} height={32} displayValue={false} />
            </div>
          </div>
        </div>
      </div>

      {/* TÍTULO */}
      <h2 className="text-center font-bold text-sm mb-1 flex-shrink-0">NOTA DE RECEPCION</h2>

      {/* CAJA CLIENTE: Grid 2 cols - h-auto, sin flex-1 para que mida exacto el contenido */}
      <div className="border border-black p-1 mb-1 break-inside-avoid h-auto">
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
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

      {/* CAJA EQUIPO: Línea superior e inferior - h-auto, sin flex-1 para que mida exacto el contenido */}
      <div className="border-t border-b border-black py-1 mb-1 break-inside-avoid h-auto">
        {items.map((it, idx) => (
          <div key={idx} className="mb-1 last:mb-0 text-[9px] leading-tight">
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
          <p className="mt-0.5"><span className="font-semibold">Observaciones: </span>{order.public_notes}</p>
        )}
      </div>

      {/* TÉRMINOS Y CONDICIONES — desde configuración central o texto por defecto */}
      <div className="text-[7px] leading-tight text-justify mt-2 break-inside-avoid">
        <p className="font-semibold mb-0.5">Términos y condiciones - SCH COMERCIAL SAS</p>
        <p className="whitespace-pre-line">
          {legalText}
        </p>
        {/* Espacio para firma - alineado a la derecha */}
        <div className="flex justify-end mt-2">
          <div className="w-48 border-t border-black text-center text-[10px] font-bold pt-1">
            Firma del Cliente y Aclaración
          </div>
        </div>
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
    <div className="min-h-screen w-full flex flex-col bg-white text-black p-2 print:p-1">
      <ReceiptHalf label="ORIGINAL" order={order} companySettings={cs} />
      <hr className="border-dashed border-gray-400 my-1 flex-shrink-0" />
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
