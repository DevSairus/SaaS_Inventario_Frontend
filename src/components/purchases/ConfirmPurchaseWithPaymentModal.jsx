// frontend/src/components/purchases/ConfirmPurchaseWithPaymentModal.jsx
import { useState, useEffect } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, DevicePhoneMobileIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const CREDIT_DAYS_OPTIONS = [15, 30, 60, 90];

const PAYMENT_METHODS_LIST = [
  { value: 'cash',        label: 'Efectivo',      icon: BanknotesIcon },
  { value: 'transfer',    label: 'Transferencia', icon: DevicePhoneMobileIcon },
  { value: 'check',       label: 'Cheque',        icon: BanknotesIcon },
  { value: 'credit_card', label: 'T. Crédito',    icon: CreditCardIcon },
];

const ConfirmPurchaseWithPaymentModal = ({
  isOpen,
  onClose,
  onConfirm,
  purchaseTotal,
  defaultCreditDays,  // plazo por defecto del proveedor, si lo tiene
  loading = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount]       = useState(purchaseTotal);
  const [paymentType, setPaymentType]     = useState(defaultCreditDays > 0 ? 'credit' : 'full');
  const [creditDays, setCreditDays]       = useState(defaultCreditDays || 30);
  const [customDays, setCustomDays]       = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaidAmount(purchaseTotal);
      setPaymentType(defaultCreditDays > 0 ? 'credit' : 'full');
      setCreditDays(defaultCreditDays || 30);
      setCustomDays('');
      setPaymentMethod('cash');
    }
  }, [isOpen, purchaseTotal, defaultCreditDays]);

  if (!isOpen) return null;

  const effectiveDays = customDays !== '' ? parseInt(customDays) : creditDays;

  const handleSubmit = () => {
    const payload = { payment_method: paymentMethod };

    if (paymentType === 'full') {
      payload.paid_amount = purchaseTotal;
    } else if (paymentType === 'partial') {
      payload.paid_amount = parseFloat(paidAmount) || 0;
      payload.credit_days = effectiveDays;
    } else if (paymentType === 'credit') {
      payload.paid_amount = 0;
      payload.credit_days = effectiveDays;
    }

    onConfirm(payload);
  };

  const isValid =
    paymentType === 'full' ||
    (paymentType === 'partial' && parseFloat(paidAmount) > 0 && parseFloat(paidAmount) < purchaseTotal && effectiveDays > 0) ||
    (paymentType === 'credit' && effectiveDays > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Confirmar Compra</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total de la Compra</p>
            <p className="text-3xl font-bold text-gray-900">${purchaseTotal.toLocaleString('es-CO')}</p>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Método de Pago</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS_LIST.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    paymentMethod === value
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-pink-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'full',    label: 'Contado', color: 'green',  emoji: '✅' },
                { key: 'partial', label: 'Parcial',  color: 'yellow', emoji: '🕐' },
                { key: 'credit',  label: 'Crédito',  color: 'red',    emoji: '📋' },
              ].map(({ key, label, color, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentType(key)}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${
                    paymentType === key
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : `border-gray-300 bg-white text-gray-700 hover:border-${color}-300`
                  }`}
                >
                  <span className="text-base">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Monto abonado (parcial) */}
          {paymentType === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto abonado ahora</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  min="1"
                  max={purchaseTotal - 1}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Saldo pendiente: ${Math.max(purchaseTotal - (parseFloat(paidAmount) || 0), 0).toLocaleString('es-CO')}
              </p>
            </div>
          )}

          {/* Plazo (parcial o crédito) */}
          {(paymentType === 'partial' || paymentType === 'credit') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <CalendarDaysIcon className="w-4 h-4" /> Plazo para el saldo
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {CREDIT_DAYS_OPTIONS.map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => { setCreditDays(days); setCustomDays(''); }}
                    className={`px-2 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      customDays === '' && creditDays === days
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-pink-300'
                    }`}
                  >
                    {days} días
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                placeholder="Otro plazo (días)"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              {effectiveDays > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Vence el {new Date(Date.now() + effectiveDays * 86400000).toLocaleDateString('es-CO')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Confirmando...' : 'Confirmar Compra'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPurchaseWithPaymentModal;
