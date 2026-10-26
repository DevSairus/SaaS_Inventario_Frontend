// frontend/src/components/sales/RegisterSalePaymentModal.jsx
//
// Abono a una factura/remisión con saldo (o a un saldo inicial de cartera).
// Lo usan Cuentas por Cobrar y el filtro "Por cobrar" del historial de ventas.
// `invoice` necesita id, sale_number, customer_name, balance y, si aplica,
// is_opening_balance.
import { useState } from 'react';
import toast from 'react-hot-toast';
import salesApi from '../../api/sales';
import { openingBalancesAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';
import NumericInput from '../inputs/NumericInput';
import BankAccountSelect from '../accounting/BankAccountSelect';

export default function RegisterSalePaymentModal({ invoice, onClose, onSuccess }) {
  const [paymentAmount, setPaymentAmount] = useState(invoice?.balance ? String(invoice.balance) : '');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [excessToAdvance, setExcessToAdvance] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!invoice) return null;

  // Pago mayor al saldo: la diferencia puede quedar como anticipo del cliente
  const paymentExcess = !invoice.is_opening_balance
    ? Math.max(0, Math.round((parseFloat(paymentAmount || 0) - parseFloat(invoice.balance || 0)) * 100) / 100)
    : 0;

  const handleRegisterPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast('Por favor ingrese un monto válido');
      return;
    }
    if (paymentExcess > 0 && !excessToAdvance) {
      toast.error(`El monto supera el saldo en ${formatCurrency(paymentExcess)}. Ajusta el monto o marca "dejar como anticipo".`);
      return;
    }

    setSaving(true);
    try {
      if (invoice.is_opening_balance) {
        // Saldo inicial (Contabilidad → Saldos Iniciales): no es una venta,
        // se abona en su propio registro con su asiento contra cartera.
        await openingBalancesAPI.registerPayment(invoice.id, {
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          bank_account_id: paymentMethod !== 'Efectivo' ? bankAccountId : null,
          notes: paymentNotes
        });
      } else {
        const res = await salesApi.registerPayment(invoice.id, {
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          bank_account_id: paymentMethod !== 'Efectivo' ? bankAccountId : null,
          notes: paymentNotes,
          excess_to_advance: paymentExcess > 0 && excessToAdvance ? true : undefined,
        });
        if (res?.data?.advance) toast.success(res.data.message, { duration: 6000 });
      }
      toast.success('Pago registrado');
      onSuccess?.();
    } catch (error) {
      // Causas típicas: caja cerrada en la sede, venta ya pagada, monto inválido.
      toast.error(error.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Registrar Pago - {invoice.sale_number}
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Cliente: {invoice.customer_name}</p>
                <p className="text-sm text-gray-600">
                  Saldo Pendiente: <span className="font-bold text-red-600">
                    {formatCurrency(invoice.balance)}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monto a Pagar
                </label>
                <NumericInput
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option>Efectivo</option>
                  <option>Tarjeta de Crédito</option>
                  <option>Tarjeta de Débito</option>
                  <option>Transferencia</option>
                  <option>Cheque</option>
                </select>
              </div>

              {paymentMethod !== 'Efectivo' && (
                <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} />
              )}

              {paymentExcess > 0 && (
                <label className={`flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 cursor-pointer ${excessToAdvance ? 'border-teal-400 bg-teal-50' : 'border-amber-300 bg-amber-50'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    checked={excessToAdvance}
                    onChange={(e) => setExcessToAdvance(e.target.checked)}
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-gray-900">
                      Dejar {formatCurrency(paymentExcess)} como anticipo del cliente
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      El pago supera el saldo. Se abona {formatCurrency(invoice.balance)} a la factura y la diferencia queda como anticipo con el mismo medio de pago ({paymentMethod}).
                    </span>
                  </span>
                </label>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notas (Opcional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleRegisterPayment}
              disabled={saving}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {saving ? 'Registrando...' : 'Registrar Pago'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
