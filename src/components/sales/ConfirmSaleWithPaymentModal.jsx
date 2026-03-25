// frontend/src/components/sales/ConfirmSaleWithPaymentModal.jsx
import { useState, useEffect } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, DevicePhoneMobileIcon, CalendarDaysIcon, ClockIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const CREDIT_DAYS_OPTIONS = [15, 30, 60, 90];

const DOC_TYPES = [
  {
    value: 'remision',
    icon: '📋',
    label: 'Remisión',
    desc: 'Entrega de mercancía. Sin efecto fiscal.',
    color: 'border-blue-200 hover:border-blue-400',
    activeColor: 'border-blue-500 bg-blue-50',
    badge: 'text-blue-700 bg-blue-100',
  },
  {
    value: 'factura',
    icon: '📄',
    label: 'Factura',
    desc: 'Documento fiscal válido ante la DIAN.',
    color: 'border-emerald-200 hover:border-emerald-400',
    activeColor: 'border-emerald-500 bg-emerald-50',
    badge: 'text-emerald-700 bg-emerald-100',
  },
  {
    value: 'cotizacion',
    icon: '💼',
    label: 'Cotización',
    desc: 'Propuesta de precio. No mueve inventario.',
    color: 'border-amber-200 hover:border-amber-400',
    activeColor: 'border-amber-500 bg-amber-50',
    badge: 'text-amber-700 bg-amber-100',
  },
];

const PAYMENT_METHODS_LIST = [
  { value: 'cash',        label: 'Efectivo',      icon: BanknotesIcon },
  { value: 'credit_card', label: 'T. Crédito',    icon: CreditCardIcon },
  { value: 'debit_card',  label: 'T. Débito',     icon: CreditCardIcon },
  { value: 'transfer',    label: 'Transferencia', icon: DevicePhoneMobileIcon },
  { value: 'check',       label: 'Cheque',        icon: BanknotesIcon },
];

const emptyMixedRow = () => ({ method: 'cash', amount: '' });

const ConfirmSaleWithPaymentModal = ({
  isOpen,
  onClose,
  onConfirm,
  saleTotal,
  currentDocType,
  loading = false,
}) => {
  const [docType, setDocType]           = useState(currentDocType || 'remision');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount]       = useState(saleTotal);
  const [paymentType, setPaymentType]     = useState('full');
  const [creditDays, setCreditDays]       = useState(30);
  const [customDays, setCustomDays]       = useState('');
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [cashReceived, setCashReceived]   = useState('');

  // Mixed payment state
  const [mixedRows, setMixedRows] = useState([emptyMixedRow(), emptyMixedRow()]);

  useEffect(() => {
    if (isOpen) {
      setDocType(currentDocType || 'remision');
      setPaymentMethod('cash');
      setPaidAmount(saleTotal);
      setPaymentType('full');
      setCreditDays(30);
      setCustomDays('');
      setUseCustomDays(false);
      setCashReceived('');
      setMixedRows([emptyMixedRow(), emptyMixedRow()]);
    }
  }, [isOpen, saleTotal, currentDocType]);

  useEffect(() => {
    if (paymentType === 'full')    setPaidAmount(saleTotal);
    if (paymentType === 'credit')  setPaidAmount(0);
    if (paymentType === 'partial' && paidAmount === saleTotal) setPaidAmount(Math.round(saleTotal / 2));
    setCashReceived('');
  }, [paymentType, saleTotal]);

  useEffect(() => {
    if (paymentMethod !== 'cash') setCashReceived('');
  }, [paymentMethod]);

  const effectiveCreditDays = useCustomDays ? parseInt(customDays || 0) : creditDays;

  const getDueDate = () => {
    if (!effectiveCreditDays || paymentType === 'full') return null;
    const d = new Date();
    d.setDate(d.getDate() + effectiveCreditDays);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const amountToPay       = paymentType === 'credit' ? 0 : parseFloat(paidAmount || 0);
  const cashReceivedNum   = parseFloat(cashReceived || 0);
  const cashChange        = paymentMethod === 'cash' && cashReceived !== '' ? cashReceivedNum - amountToPay : null;
  const cashChangePositive = cashChange !== null && cashChange >= 0;

  // Mixed totals
  const mixedTotal = mixedRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const mixedRemaining = saleTotal - mixedTotal;
  const mixedValid = Math.abs(mixedRemaining) < 1 && mixedRows.every(r => parseFloat(r.amount) > 0);

  const updateMixedRow = (index, field, value) => {
    setMixedRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };
  const addMixedRow = () => setMixedRows(prev => [...prev, emptyMixedRow()]);
  const removeMixedRow = (index) => {
    if (mixedRows.length <= 2) return;
    setMixedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (paymentType === 'mixed') {
      if (!mixedValid) return;
      onConfirm({
        document_type: docType,
        payment_method: 'mixed',
        paid_amount: saleTotal,
        payment_splits: mixedRows.map(r => ({ method: r.method, amount: parseFloat(r.amount) })),
      });
      return;
    }

    if (!paymentMethod) return;
    const finalAmount = paymentType === 'credit' ? 0 : parseFloat(paidAmount);
    if (paymentType === 'partial' && (finalAmount <= 0 || finalAmount >= saleTotal)) return;
    if ((paymentType === 'partial' || paymentType === 'credit') && effectiveCreditDays <= 0) return;
    if (paymentMethod === 'cash' && cashReceived !== '' && cashReceivedNum < amountToPay) return;

    onConfirm({
      document_type: docType,
      payment_method: paymentMethod,
      paid_amount: finalAmount,
      credit_days: paymentType !== 'full' ? effectiveCreditDays : undefined,
    });
  };

  if (!isOpen) return null;

  const pendingAmount = saleTotal - parseFloat(paidAmount || 0);
  const paymentMethods = PAYMENT_METHODS_LIST;
  const needsCreditSection = paymentType === 'partial' || paymentType === 'credit';
  const dueDate = getDueDate();
  const isCash = paymentMethod === 'cash';
  const quickAmounts = isCash && paymentType !== 'credit'
    ? [amountToPay, ...[50000, 100000, 200000, 500000].filter(v => v > amountToPay).slice(0, 3)]
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCardIcon className="w-6 h-6" />
                  Confirmar Venta
                </h3>
                <button type="button" onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Tipo de documento ── */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de documento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_TYPES.map(({ value, icon, label, desc, color, activeColor, badge }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDocType(value)}
                      className={`flex flex-col items-center gap-1 p-3 border-2 rounded-xl text-center transition-all ${
                        docType === value ? activeColor : `bg-white ${color}`
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${badge}`}>{label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Total de la Venta</p>
                <p className="text-3xl font-bold text-gray-900">${saleTotal.toLocaleString('es-CO')}</p>
              </div>

              {/* Tipo de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Pago</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { key: 'full',    label: 'Contado',  color: 'green',  emoji: '✅' },
                    { key: 'partial', label: 'Parcial',  color: 'yellow', emoji: '🕐' },
                    { key: 'credit',  label: 'Crédito',  color: 'red',    emoji: '📋' },
                    { key: 'mixed',   label: 'Mixto',    color: 'purple', emoji: '🔀' },
                  ].map(({ key, label, color, emoji }) => (
                    <button key={key} type="button" onClick={() => setPaymentType(key)}
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${
                        paymentType === key
                          ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                          : `border-gray-300 bg-white text-gray-700 hover:border-${color}-300`
                      }`}>
                      <span className="text-base">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── PAGO MIXTO ── */}
              {paymentType === 'mixed' && (
                <div className="rounded-xl border-2 border-purple-100 bg-purple-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                      🔀 Múltiples formas de pago
                    </span>
                    <button type="button" onClick={addMixedRow}
                      className="flex items-center gap-1 text-xs text-purple-700 font-semibold bg-white border border-purple-300 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-all">
                      <PlusIcon className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {mixedRows.map((row, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white rounded-lg border border-purple-200 px-3 py-2">
                        <select
                          value={row.method}
                          onChange={(e) => updateMixedRow(index, 'method', e.target.value)}
                          className="flex-1 text-sm border-0 focus:ring-0 bg-transparent font-medium text-gray-700 cursor-pointer"
                        >
                          {PAYMENT_METHODS_LIST.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <div className="relative w-36 flex-shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => updateMixedRow(index, 'amount', e.target.value)}
                            placeholder="0"
                            min="1"
                            step="any"
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-right focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <button type="button" onClick={() => removeMixedRow(index)}
                          disabled={mixedRows.length <= 2}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors flex-shrink-0">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Totalizador mixto */}
                  <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 border-2 text-sm font-semibold transition-all ${
                    mixedValid
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : mixedRemaining > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    <span>{mixedValid ? '✅ Total cubierto' : mixedRemaining > 0 ? '⚠️ Falta cubrir' : '❌ Excede el total'}</span>
                    <span>
                      {mixedValid
                        ? `$${saleTotal.toLocaleString('es-CO')}`
                        : `$${Math.abs(mixedRemaining).toLocaleString('es-CO')}`
                      }
                    </span>
                  </div>

                  {/* Desglose rápido */}
                  {mixedRows.some(r => parseFloat(r.amount) > 0) && (
                    <div className="text-xs text-purple-700 space-y-0.5 pt-1 border-t border-purple-200">
                      {mixedRows.filter(r => parseFloat(r.amount) > 0).map((r, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{PAYMENT_METHODS_LIST.find(m => m.value === r.method)?.label}</span>
                          <span className="font-semibold">${parseFloat(r.amount).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Método de pago (para tipos no mixtos) */}
              {paymentType !== 'mixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Método de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map(({ value, label, icon: Icon }) => (
                      <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                          paymentMethod === value
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                        }`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Abono parcial */}
              {paymentType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Abono inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
                      min="1" max={saleTotal - 1} step="any" required />
                  </div>
                  {pendingAmount > 0 && (
                    <p className="mt-1.5 text-sm text-orange-600 font-medium">
                      Saldo pendiente: ${pendingAmount.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}

              {/* Efectivo: cambio */}
              {isCash && paymentType !== 'credit' && paymentType !== 'mixed' && (
                <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <BanknotesIcon className="w-4 h-4" />
                    Cobro en efectivo
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-700 mb-2">Monto recibido del cliente</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={amountToPay.toLocaleString('es-CO')}
                        min={amountToPay}
                        step="any"
                        className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 transition-all ${
                          cashChange !== null && !cashChangePositive
                            ? 'border-red-400 bg-red-50 focus:ring-red-300'
                            : 'border-emerald-300 bg-white focus:ring-emerald-400 focus:border-emerald-400'
                        }`}
                      />
                    </div>
                    {quickAmounts.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {quickAmounts.map((amt) => (
                          <button key={amt} type="button" onClick={() => setCashReceived(String(amt))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                              parseFloat(cashReceived) === amt
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500'
                            }`}>
                            ${amt.toLocaleString('es-CO')}
                          </button>
                        ))}
                      </div>
                    )}
                    {cashChange !== null && (
                      <div className={`mt-3 flex items-center justify-between rounded-lg px-4 py-3 border-2 ${
                        cashChangePositive ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          {cashChangePositive
                            ? <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            : <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          }
                          <span className={`text-sm font-semibold ${cashChangePositive ? 'text-green-700' : 'text-red-600'}`}>
                            {cashChangePositive ? 'Cambio a entregar:' : 'Monto insuficiente'}
                          </span>
                        </div>
                        {cashChangePositive && (
                          <span className="text-xl font-bold text-green-700">${cashChange.toLocaleString('es-CO')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Plazo crédito / parcial */}
              {needsCreditSection && (
                <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm">
                    <ClockIcon className="w-4 h-4" />
                    Plazo de pago
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {CREDIT_DAYS_OPTIONS.map(days => (
                      <button key={days} type="button"
                        onClick={() => { setCreditDays(days); setUseCustomDays(false); }}
                        className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                          !useCustomDays && creditDays === days
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'
                        }`}>
                        {days}d
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setUseCustomDays(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all flex-shrink-0 ${
                        useCustomDays
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400'
                      }`}>
                      Personalizado
                    </button>
                    {useCustomDays && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input type="number" value={customDays} onChange={(e) => setCustomDays(e.target.value)}
                          placeholder="Días" min="1" max="365" autoFocus
                          className="w-20 px-2 py-1.5 border-2 border-indigo-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                        <span className="text-sm text-indigo-700">días</span>
                      </div>
                    )}
                  </div>
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
              {paymentType !== 'mixed' && (
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
                  {isCash && cashChangePositive && cashChange > 0 && (
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-gray-600">Cambio:</span>
                      <span className="font-bold text-emerald-600 text-base">${cashChange.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {dueDate && effectiveCreditDays > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha límite:</span>
                      <span className="font-semibold text-indigo-700">{dueDate}</span>
                    </div>
                  )}
                </div>
              )}

              {paymentType === 'credit' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg text-sm text-red-700">
                  Esta venta se registrará como <strong>pendiente de pago</strong>. El saldo completo queda en cartera.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" onClick={onClose} disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center rounded-lg border-2 border-gray-300 px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all">
                Cancelar
              </button>
              <button type="submit"
                disabled={
                  loading ||
                  (paymentType === 'mixed' && !mixedValid) ||
                  (paymentType !== 'mixed' && isCash && cashReceived !== '' && !cashChangePositive)
                }
                className="w-full sm:w-auto inline-flex justify-center rounded-lg px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 shadow-sm transition-all">
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