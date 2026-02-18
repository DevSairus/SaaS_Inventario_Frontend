// frontend/src/components/sales/ConfirmSaleWithPaymentModal.jsx
import { useState, useEffect } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, DevicePhoneMobileIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';

const CREDIT_DAYS_OPTIONS = [15, 30, 60, 90];

const ConfirmSaleWithPaymentModal = ({ isOpen, onClose, onConfirm, saleTotal, loading = false }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount]       = useState(saleTotal);
  const [paymentType, setPaymentType]     = useState('full'); // 'full' | 'partial' | 'credit'
  const [creditDays, setCreditDays]       = useState(30);
  const [customDays, setCustomDays]       = useState('');
  const [useCustomDays, setUseCustomDays] = useState(false);

  // Reset cuando se abre
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setPaidAmount(saleTotal);
      setPaymentType('full');
      setCreditDays(30);
      setCustomDays('');
      setUseCustomDays(false);
    }
  }, [isOpen, saleTotal]);

  // Ajustar monto según tipo
  useEffect(() => {
    if (paymentType === 'full')    setPaidAmount(saleTotal);
    if (paymentType === 'credit')  setPaidAmount(0);
    if (paymentType === 'partial' && paidAmount === saleTotal) setPaidAmount(Math.round(saleTotal / 2));
  }, [paymentType, saleTotal]);

  const effectiveCreditDays = useCustomDays ? parseInt(customDays || 0) : creditDays;

  const getDueDate = () => {
    if (!effectiveCreditDays || paymentType === 'full') return null;
    const d = new Date();
    d.setDate(d.getDate() + effectiveCreditDays);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!paymentMethod) {
      return;
    }

    const finalAmount = paymentType === 'credit' ? 0 : parseFloat(paidAmount);

    if (paymentType === 'partial' && (finalAmount <= 0 || finalAmount >= saleTotal)) {
      return;
    }

    if ((paymentType === 'partial' || paymentType === 'credit') && effectiveCreditDays <= 0) {
      return;
    }

    onConfirm({
      payment_method: paymentMethod,
      paid_amount: finalAmount,
      credit_days: paymentType !== 'full' ? effectiveCreditDays : undefined,
    });
  };

  if (!isOpen) return null;

  const pendingAmount = saleTotal - parseFloat(paidAmount || 0);

  const paymentMethods = [
    { value: 'cash',        label: 'Efectivo',          icon: BanknotesIcon },
    { value: 'credit_card', label: 'T. Crédito',        icon: CreditCardIcon },
    { value: 'debit_card',  label: 'T. Débito',         icon: CreditCardIcon },
    { value: 'transfer',    label: 'Transferencia',     icon: DevicePhoneMobileIcon },
    { value: 'check',       label: 'Cheque',            icon: BanknotesIcon },
  ];

  const needsCreditSection = paymentType === 'partial' || paymentType === 'credit';
  const dueDate = getDueDate();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCardIcon className="w-6 h-6" />
                  Confirmar Venta y Pago
                </h3>
                <button type="button" onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Total */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total de la Venta</p>
                <p className="text-3xl font-bold text-gray-900">${saleTotal.toLocaleString('es-CO')}</p>
              </div>

              {/* Tipo de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'full',    label: 'Contado',  color: 'green' },
                    { key: 'partial', label: 'Parcial',  color: 'yellow' },
                    { key: 'credit',  label: 'Crédito',  color: 'red' },
                  ].map(({ key, label, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaymentType(key)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        paymentType === key
                          ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                          : `border-gray-300 bg-white text-gray-700 hover:border-${color}-300`
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        paymentMethod === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto abono (solo parcial) */}
              {paymentType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Abono inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
                      min="1"
                      max={saleTotal - 1}
                      step="any"
                      required
                    />
                  </div>
                  {pendingAmount > 0 && (
                    <p className="mt-1.5 text-sm text-orange-600 font-medium">
                      Saldo pendiente: ${pendingAmount.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}

              {/* ── Sección de plazo (parcial o crédito) ── */}
              {needsCreditSection && (
                <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm">
                    <ClockIcon className="w-4 h-4" />
                    Plazo de pago
                  </div>

                  {/* Días predefinidos */}
                  <div className="grid grid-cols-4 gap-2">
                    {CREDIT_DAYS_OPTIONS.map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => { setCreditDays(days); setUseCustomDays(false); }}
                        className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                          !useCustomDays && creditDays === days
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>

                  {/* Personalizado */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUseCustomDays(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all flex-shrink-0 ${
                        useCustomDays
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'
                      }`}
                    >
                      Personalizado
                    </button>
                    {useCustomDays && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="number"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          placeholder="Días"
                          min="1"
                          max="365"
                          className="w-20 px-2 py-1.5 border-2 border-indigo-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          autoFocus
                        />
                        <span className="text-sm text-indigo-700">días</span>
                      </div>
                    )}
                  </div>

                  {/* Fecha de vencimiento calculada */}
                  {dueDate && effectiveCreditDays > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-indigo-200">
                      <CalendarDaysIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-sm text-indigo-800">
                        Vence el <strong>{dueDate}</strong>
                        <span className="text-indigo-500 ml-1">({effectiveCreditDays} días)</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Resumen */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Venta:</span>
                  <span className="font-semibold text-gray-900">${saleTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto a cobrar hoy:</span>
                  <span className="font-bold text-green-600 text-base">
                    ${(paymentType === 'credit' ? 0 : parseFloat(paidAmount || 0)).toLocaleString('es-CO')}
                  </span>
                </div>
                {(paymentType === 'partial' || paymentType === 'credit') && pendingAmount > 0 && (
                  <div className="flex justify-between pt-2 border-t border-blue-300">
                    <span className="text-gray-600">Saldo a crédito:</span>
                    <span className="font-bold text-orange-600 text-base">
                      ${(paymentType === 'credit' ? saleTotal : pendingAmount).toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
                {dueDate && effectiveCreditDays > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha límite de pago:</span>
                    <span className="font-semibold text-indigo-700">{dueDate}</span>
                  </div>
                )}
              </div>

              {/* Aviso crédito */}
              {paymentType === 'credit' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg text-sm text-red-700">
                  Esta venta se registrará como <strong>pendiente de pago</strong>. El saldo completo queda en cartera.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center rounded-lg border-2 border-gray-300 px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center rounded-lg px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-sm transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </span>
                ) : '✓ Confirmar Venta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSaleWithPaymentModal;
