import { useState, useEffect } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const ConfirmSaleWithPaymentModal = ({ isOpen, onClose, onConfirm, saleTotal, loading = false }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(saleTotal);
  const [paymentType, setPaymentType] = useState('full'); // 'full', 'partial', 'credit'

  useEffect(() => {
    if (isOpen) {
      // Resetear valores cuando se abre el modal
      setPaymentMethod('cash');
      setPaidAmount(saleTotal);
      setPaymentType('full');
    }
  }, [isOpen, saleTotal]);

  useEffect(() => {
    // Ajustar monto según el tipo de pago
    if (paymentType === 'full') {
      setPaidAmount(saleTotal);
    } else if (paymentType === 'credit') {
      setPaidAmount(0);
    } else if (paymentType === 'partial' && paidAmount === saleTotal) {
      setPaidAmount(saleTotal / 2); // Sugerir la mitad
    }
  }, [paymentType, saleTotal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      alert('Debe seleccionar un método de pago');
      return;
    }

    const finalAmount = paymentType === 'credit' ? 0 : parseFloat(paidAmount);

    if (paymentType === 'partial' && (finalAmount <= 0 || finalAmount >= saleTotal)) {
      alert('El monto del pago parcial debe ser mayor a 0 y menor al total');
      return;
    }

    onConfirm({
      payment_method: paymentMethod,
      paid_amount: finalAmount
    });
  };

  if (!isOpen) return null;

  const pendingAmount = saleTotal - parseFloat(paidAmount || 0);

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo', icon: BanknotesIcon },
    { value: 'credit_card', label: 'Tarjeta de Crédito', icon: CreditCardIcon },
    { value: 'debit_card', label: 'Tarjeta de Débito', icon: CreditCardIcon },
    { value: 'transfer', label: 'Transferencia', icon: DevicePhoneMobileIcon },
    { value: 'check', label: 'Cheque', icon: BanknotesIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCardIcon className="w-6 h-6" />
                  Confirmar Venta y Pago
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Total de la venta */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total de la Venta</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${saleTotal.toLocaleString('es-CO')}
                </p>
              </div>

              {/* Tipo de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Pago
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType('full')}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      paymentType === 'full'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                    }`}
                  >
                    Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('partial')}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      paymentType === 'partial'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-yellow-300'
                    }`}
                  >
                    Parcial
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      paymentType === 'credit'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
                    }`}
                  >
                    Crédito
                  </button>
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          paymentMethod === method.value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monto pagado (solo para parcial) */}
              {paymentType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto Pagado
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </span>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
                      placeholder="0"
                      min="1"
                      max={saleTotal - 1}
                      step="any"
                      required
                    />
                  </div>
                  {pendingAmount > 0 && (
                    <p className="mt-2 text-sm text-orange-600 font-medium">
                      Quedará pendiente: ${pendingAmount.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}

              {/* Resumen */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Venta:</span>
                    <span className="font-semibold text-gray-900">
                      ${saleTotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto a Pagar:</span>
                    <span className="font-bold text-green-600 text-base">
                      ${(paymentType === 'credit' ? 0 : parseFloat(paidAmount || 0)).toLocaleString('es-CO')}
                    </span>
                  </div>
                  {pendingAmount > 0 && paymentType !== 'credit' && (
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-gray-600">Saldo Pendiente:</span>
                      <span className="font-bold text-orange-600 text-base">
                        ${pendingAmount.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  {paymentType === 'credit' && (
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-gray-600">Estado:</span>
                      <span className="font-bold text-red-600 text-base">
                        PENDIENTE DE PAGO
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Advertencias */}
              {paymentType === 'credit' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        Esta venta se registrará como <strong>pendiente de pago</strong>. 
                        Deberás registrar el pago posteriormente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-medium text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  '✓ Confirmar Venta'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-lg border-2 border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSaleWithPaymentModal;