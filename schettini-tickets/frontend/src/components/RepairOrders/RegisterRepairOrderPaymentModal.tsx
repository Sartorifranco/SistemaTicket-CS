import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../config/axiosConfig';
import { FaTimes } from 'react-icons/fa';

const PAYMENT_METHOD_OPTIONS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta débito',
  'Tarjeta crédito',
  'Mercado Pago',
  'Cheque',
  'Otro'
];

interface RegisterRepairOrderPaymentModalProps {
  isOpen: boolean;
  orderId: number;
  /** Saldo pendiente sugerido como monto inicial */
  defaultAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const RegisterRepairOrderPaymentModal: React.FC<RegisterRepairOrderPaymentModalProps> = ({
  isOpen,
  orderId,
  defaultAmount,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const rounded = Math.max(0, Number(defaultAmount) || 0);
    setAmount(rounded > 0 ? String(rounded) : '');
    setPaymentMethod('Efectivo');
    setNotes('');
  }, [isOpen, defaultAmount, orderId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(String(amount).replace(',', '.'));
    if (!amt || amt <= 0 || Number.isNaN(amt)) {
      toast.error('Ingresá un monto válido mayor a cero');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/repair-orders/${orderId}/payments`, {
        amount: amt,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined
      });
      toast.success('Pago registrado correctamente');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
          ? (err.response.data as { message?: string })?.message
          : 'Error al registrar el pago';
      toast.error(msg || 'Error al registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="payment-modal-title" className="text-lg font-semibold text-gray-900">
            Registrar pago
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">No puede superar el saldo pendiente de la orden.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Referencia, comprobante, etc."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {submitting ? 'Guardando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterRepairOrderPaymentModal;
