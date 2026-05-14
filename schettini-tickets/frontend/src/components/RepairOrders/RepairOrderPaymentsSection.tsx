import React, { useMemo } from 'react';
import SectionCard from '../Common/SectionCard';
import { formatDateTimeArgentina } from '../../utils/dateFormatter';

export type RepairOrderPaymentsOrderSlice = {
  total_cost?: number | null;
  deposit_paid?: number | null;
  payments?: {
    id: number;
    amount: number | string;
    payment_method: string;
    notes?: string | null;
    is_legacy_import?: number | boolean;
    created_at?: string;
  }[];
};

export function computeRepairOrderPaymentSummary(order: RepairOrderPaymentsOrderSlice) {
  const paymentsList = Array.isArray(order.payments) ? order.payments : [];
  const totalAbonado =
    paymentsList.length > 0
      ? paymentsList.reduce((s, p) => s + (Number(p.amount) || 0), 0)
      : order.deposit_paid != null
        ? Number(order.deposit_paid)
        : 0;
  const totalOrden = order.total_cost != null ? Number(order.total_cost) : NaN;
  const saldoPendiente = !Number.isNaN(totalOrden) ? Math.max(0, totalOrden - totalAbonado) : null;
  return { paymentsList, totalAbonado, totalOrden, saldoPendiente };
}

interface RepairOrderPaymentsSectionProps {
  order: RepairOrderPaymentsOrderSlice;
  /** staff: botón registrar + mensajes de permisos; client: solo lectura */
  variant: 'staff' | 'client';
  canRegisterPayment?: boolean;
  onRegisterPaymentClick?: () => void;
}

const RepairOrderPaymentsSection: React.FC<RepairOrderPaymentsSectionProps> = ({
  order,
  variant,
  canRegisterPayment = false,
  onRegisterPaymentClick
}) => {
  const { paymentsList, totalAbonado, totalOrden, saldoPendiente } = useMemo(
    () => computeRepairOrderPaymentSummary(order),
    [order]
  );

  return (
    <SectionCard title="Pagos y facturación">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total de la orden</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {!Number.isNaN(totalOrden) ? `$${totalOrden.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Total abonado</p>
          <p className="text-xl font-bold text-emerald-900 mt-1">
            ${totalAbonado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-700 mt-1">Suma de cobros registrados</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-xs font-medium text-amber-900 uppercase tracking-wide">Saldo pendiente</p>
          <p className="text-xl font-bold text-amber-950 mt-1">
            {saldoPendiente != null
              ? `$${saldoPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </p>
          {saldoPendiente != null && saldoPendiente <= 0.005 && (
            <p className="text-xs text-green-700 font-medium mt-1">Orden al día</p>
          )}
        </div>
      </div>

      {paymentsList.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No hay movimientos de cobro registrados en el historial.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-700">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold text-right">Monto</th>
                <th className="px-3 py-2 font-semibold">Medio de pago</th>
                <th className="px-3 py-2 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {paymentsList.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-800">
                    {p.created_at ? formatDateTimeArgentina(p.created_at) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    ${Number(p.amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-gray-800">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {p.payment_method || '—'}
                      {(p.is_legacy_import === 1 || p.is_legacy_import === true) && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 border border-amber-200">
                          Histórico
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={p.notes || ''}>
                    {p.notes?.trim() ? p.notes : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {variant === 'staff' && (
        <>
          {canRegisterPayment && (Number.isNaN(totalOrden) || (saldoPendiente != null && saldoPendiente > 0.005)) && (
            <button
              type="button"
              onClick={onRegisterPaymentClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Registrar pago
            </button>
          )}
          {canRegisterPayment && !Number.isNaN(totalOrden) && saldoPendiente != null && saldoPendiente <= 0.005 && (
            <p className="text-sm text-green-700 font-medium">No hay saldo pendiente; no se pueden registrar más cobros por este medio.</p>
          )}
          {!canRegisterPayment && (
            <p className="text-xs text-gray-500">Solo personal con permiso de edición de taller puede registrar cobros.</p>
          )}
        </>
      )}
    </SectionCard>
  );
};

export default RepairOrderPaymentsSection;
