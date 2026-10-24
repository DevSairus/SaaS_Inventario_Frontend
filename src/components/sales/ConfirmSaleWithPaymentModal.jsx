// frontend/src/components/sales/ConfirmSaleWithPaymentModal.jsx
import { useState, useEffect } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, DevicePhoneMobileIcon, CalendarDaysIcon, ClockIcon, PlusIcon, TrashIcon, WalletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import NumericInput from '../inputs/NumericInput';
import { customerAdvancesAPI } from '../../api/customerAdvances';
import BankAccountSelect from '../accounting/BankAccountSelect';

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
  // Sin "Cotización": confirmar = volverlo venta (inventario, caja,
  // contabilidad). La cotización tiene su propio formulario (/quotes/new) y
  // llega aquí solo para convertirse, ya aprobada, en remisión o factura.
];

const PAYMENT_METHODS_LIST = [
  { value: 'cash',        label: 'Efectivo',      icon: BanknotesIcon },
  { value: 'credit_card', label: 'T. Crédito',    icon: CreditCardIcon },
  { value: 'debit_card',  label: 'T. Débito',     icon: CreditCardIcon },
  { value: 'transfer',    label: 'Transferencia', icon: DevicePhoneMobileIcon },
  { value: 'check',       label: 'Cheque',        icon: BanknotesIcon },
];

const emptyMixedRow = () => ({ method: 'cash', amount: '' });

// Casilla "dejar el excedente como anticipo" (pago mayor al valor a cobrar)
const ExcessAdvanceToggle = ({ amount, checked, onChange, disabled, hint }) => (
  <label className={`flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 transition-all ${
    disabled ? 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed'
      : checked ? 'border-teal-400 bg-teal-50 cursor-pointer' : 'border-teal-200 bg-white cursor-pointer hover:border-teal-300'
  }`}>
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      checked={checked && !disabled}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="text-sm">
      <span className="font-semibold text-teal-800 flex items-center gap-1.5">
        <WalletIcon className="w-4 h-4" />
        Dejar ${amount.toLocaleString('es-CO')} como anticipo del cliente
      </span>
      <span className="block text-xs text-gray-500 mt-0.5">
        {disabled
          ? 'Requiere una venta con cliente y el módulo de Cartera activo.'
          : hint || 'Al guardar se crea el anticipo a favor del cliente por la diferencia.'}
      </span>
    </span>
  </label>
);

const ConfirmSaleWithPaymentModal = ({
  isOpen,
  onClose,
  onConfirm,
  saleTotal,
  currentDocType,
  loading = false,
  // ID del cliente de la venta -- si viene, se consultan sus anticipos
  // disponibles (Cartera) para poder aplicarlos como parte del pago.
  customerId = null,
  // 'confirm' = confirmar un borrador (elige tipo de documento y forma de
  // pago); 'payment' = registrar un abono sobre una venta ya confirmada (el
  // documento ya existe y "Crédito" no tiene sentido: sería no pagar nada).
  mode = 'confirm',
  // Permite dejar el excedente (cliente paga más que el total) como anticipo
  // a su favor: requiere cliente y el módulo de Cartera.
  canCreateAdvance = false,
}) => {
  const isPaymentMode = mode === 'payment';
  const docTypes = DOC_TYPES;
  const [docType, setDocType]           = useState(currentDocType || 'remision');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount]       = useState(saleTotal);
  const [paymentType, setPaymentType]     = useState('full');
  const [creditDays, setCreditDays]       = useState(30);
  const [customDays, setCustomDays]       = useState('');
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [cashReceived, setCashReceived]   = useState('');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [excessToAdvance, setExcessToAdvance] = useState(false);

  // Mixed payment state
  const [mixedRows, setMixedRows] = useState([emptyMixedRow(), emptyMixedRow()]);

  // ── Anticipos del cliente (Cartera) ──────────────────────────────────────
  // Se sugiere pero nunca se aplica automático/silencioso (decisión #3 del
  // plan de Anticipos): se muestran los disponibles, el usuario marca cuáles
  // usar y puede editar el monto de cada uno antes de confirmar.
  const [advances, setAdvances]                 = useState([]);
  const [loadingAdvances, setLoadingAdvances]   = useState(false);
  const [selectedAdvances, setSelectedAdvances] = useState({}); // { advance_id: amountString }

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
      setBankAccountId(null);
      setExcessToAdvance(false);
      setMixedRows([emptyMixedRow(), emptyMixedRow()]);
      setSelectedAdvances({});
      setAdvances([]);
    }
  }, [isOpen, saleTotal, currentDocType]);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    let cancelled = false;
    setLoadingAdvances(true);
    customerAdvancesAPI.getAvailableForCustomer(customerId)
      .then((res) => { if (!cancelled) setAdvances(res.data?.data || []); })
      .catch(() => { if (!cancelled) setAdvances([]); })
      .finally(() => { if (!cancelled) setLoadingAdvances(false); });
    return () => { cancelled = true; };
  }, [isOpen, customerId]);

  // Cuánto se cubre con anticipos y cuánto queda realmente por cobrar hoy
  // (efectivo/tarjeta/crédito/mixto). Todo el bloque de "Tipo de Pago" de
  // abajo trabaja sobre este remanente, no sobre saleTotal.
  const advanceTotal      = Object.values(selectedAdvances).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const advanceOverBalance = advanceTotal > saleTotal + 0.01;
  const effectiveTotal    = Math.max(saleTotal - advanceTotal, 0);
  const advanceCoversAll  = advanceTotal > 0 && effectiveTotal <= 0 && !advanceOverBalance;

  const toggleAdvance = (advance, checked) => {
    setSelectedAdvances((prev) => {
      const next = { ...prev };
      if (checked) {
        const alreadySelected = Object.entries(prev).reduce(
          (sum, [id, amt]) => sum + (id === advance.id ? 0 : (parseFloat(amt) || 0)), 0
        );
        const remaining = Math.max(saleTotal - alreadySelected, 0);
        next[advance.id] = String(Math.min(parseFloat(advance.balance), remaining));
      } else {
        delete next[advance.id];
      }
      return next;
    });
  };
  const updateAdvanceAmount = (advanceId, value) => {
    setSelectedAdvances((prev) => ({ ...prev, [advanceId]: value }));
  };
  const applyAdvancesFifo = () => {
    let remaining = saleTotal;
    const next = {};
    for (const adv of advances) {
      if (remaining <= 0) break;
      const toApply = Math.min(parseFloat(adv.balance), remaining);
      if (toApply > 0) { next[adv.id] = String(toApply); remaining -= toApply; }
    }
    setSelectedAdvances(next);
  };

  useEffect(() => {
    if (paymentType === 'full')    setPaidAmount(effectiveTotal);
    if (paymentType === 'credit')  setPaidAmount(0);
    if (paymentType === 'partial' && paidAmount === effectiveTotal) setPaidAmount(Math.round(effectiveTotal / 2));
    setCashReceived('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, effectiveTotal]);

  useEffect(() => {
    setCashReceived('');
  }, [paymentMethod]);

  const effectiveCreditDays = useCustomDays ? parseInt(customDays || 0) : creditDays;

  const getDueDate = () => {
    if (!effectiveCreditDays || paymentType === 'full') return null;
    const d = new Date();
    d.setDate(d.getDate() + effectiveCreditDays);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // "Monto recibido" aplica a cualquier medio (no solo efectivo): si el
  // cliente entrega/transfiere más de lo que se cobra, la diferencia es
  // cambio (efectivo) o puede quedar como anticipo a su favor.
  const amountToPay       = paymentType === 'credit' ? 0 : parseFloat(paidAmount || 0);
  const cashReceivedNum   = parseFloat(cashReceived || 0);
  const cashChange        = cashReceived !== '' ? cashReceivedNum - amountToPay : null;
  const cashChangePositive = cashChange !== null && cashChange >= 0;
  const singleExcess      = paymentType === 'full' && cashChange !== null && cashChange > 0.5 ? Math.round(cashChange * 100) / 100 : 0;

  // Mixed totals -- se reparte lo que falta por cobrar después del anticipo
  const mixedTotal = mixedRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const mixedRemaining = effectiveTotal - mixedTotal;
  const mixedExcess = paymentType === 'mixed' && mixedRemaining < -0.5 ? Math.round(-mixedRemaining * 100) / 100 : 0;
  const mixedRowsOk = mixedRows.every(r => parseFloat(r.amount) > 0);
  const mixedValid = mixedRowsOk && (Math.abs(mixedRemaining) < 1 || (mixedExcess > 0 && excessToAdvance && canCreateAdvance));

  const excessAmount = paymentType === 'mixed' ? mixedExcess : singleExcess;
  const willCreateAdvance = canCreateAdvance && excessToAdvance && excessAmount > 0;
  // Pagos electrónicos (transferencia, tarjeta...) no tienen "cambio": si
  // llegó de más, hay que dejarlo como anticipo o corregir el monto.
  const nonCashExcessUnhandled = paymentType !== 'mixed' && paymentMethod !== 'cash' && singleExcess > 0 && !willCreateAdvance;

  const updateMixedRow = (index, field, value) => {
    setMixedRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };
  const addMixedRow = () => setMixedRows(prev => [...prev, emptyMixedRow()]);
  const removeMixedRow = (index) => {
    if (mixedRows.length <= 2) return;
    setMixedRows(prev => prev.filter((_, i) => i !== index));
  };

  const advanceApplications = Object.entries(selectedAdvances)
    .map(([advance_id, amount]) => ({ advance_id, amount: parseFloat(amount) }))
    .filter(a => a.amount > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (advanceOverBalance) return;

    // El anticipo ya cubre todo lo pendiente: no hace falta método de pago,
    // se confirma con paid_amount 0 y se aplica el anticipo aparte.
    if (advanceCoversAll) {
      onConfirm({
        document_type: docType,
        payment_method: 'cash',
        paid_amount: 0,
        advance_applications: advanceApplications,
      });
      return;
    }

    if (paymentType === 'mixed') {
      if (!mixedValid) return;
      onConfirm({
        document_type: docType,
        payment_method: 'mixed',
        paid_amount: effectiveTotal,
        payment_splits: mixedRows.map(r => ({
          method: r.method,
          amount: parseFloat(r.amount),
          bank_account_id: r.method !== 'cash' ? (r.bank_account_id || null) : null,
        })),
        excess_advance_amount: willCreateAdvance ? mixedExcess : undefined,
        advance_applications: advanceApplications,
      });
      return;
    }

    if (!paymentMethod) return;
    const finalAmount = paymentType === 'credit' ? 0 : parseFloat(paidAmount);
    if (paymentType === 'partial' && (finalAmount <= 0 || finalAmount >= effectiveTotal)) return;
    if (!isPaymentMode && (paymentType === 'partial' || paymentType === 'credit') && effectiveCreditDays <= 0) return;
    if (cashReceived !== '' && cashReceivedNum < amountToPay) return;
    if (nonCashExcessUnhandled) return;

    onConfirm({
      document_type: docType,
      payment_method: paymentMethod,
      paid_amount: finalAmount,
      bank_account_id: paymentMethod !== 'cash' && finalAmount > 0 ? bankAccountId : null,
      credit_days: paymentType !== 'full' ? effectiveCreditDays : undefined,
      excess_advance_amount: willCreateAdvance ? singleExcess : undefined,
      advance_applications: advanceApplications,
    });
  };

  if (!isOpen) return null;

  const pendingAmount = effectiveTotal - parseFloat(paidAmount || 0);
  const paymentMethods = PAYMENT_METHODS_LIST;
  const needsCreditSection = !isPaymentMode && (paymentType === 'partial' || paymentType === 'credit');
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
                  {isPaymentMode ? 'Registrar Pago' : 'Confirmar Venta'}
                </h3>
                <button type="button" onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Tipo de documento (solo al confirmar) ── */}
              {!isPaymentMode && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de documento
                </label>
                <div className={`grid gap-2 ${docTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {docTypes.map(({ value, icon, label, desc, color, activeColor, badge }) => (
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
              )}

              {/* Total */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-1">{isPaymentMode ? 'Saldo pendiente' : 'Total de la Venta'}</p>
                <p className="text-3xl font-bold text-gray-900">${saleTotal.toLocaleString('es-CO')}</p>
              </div>

              {/* ── Anticipos disponibles del cliente (Cartera) ── */}
              {loadingAdvances && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" /> Consultando anticipos del cliente...
                </div>
              )}
              {!loadingAdvances && advances.length > 0 && (
                <div className="rounded-xl border-2 border-teal-100 bg-teal-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-teal-800 flex items-center gap-1.5">
                      <WalletIcon className="w-4 h-4" /> Anticipos disponibles del cliente
                    </span>
                    <button type="button" onClick={applyAdvancesFifo}
                      className="text-xs text-teal-700 font-semibold bg-white border border-teal-300 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-all">
                      Aplicar automático
                    </button>
                  </div>

                  <div className="space-y-2">
                    {advances.map((adv) => {
                      const isChecked = selectedAdvances[adv.id] !== undefined;
                      return (
                        <div key={adv.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${isChecked ? 'border-teal-300 bg-white' : 'border-teal-100 bg-white/60'}`}>
                          <input type="checkbox" checked={isChecked}
                            onChange={(e) => toggleAdvance(adv, e.target.checked)}
                            className="h-4 w-4 text-teal-600 border-gray-300 rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{adv.advance_number}</div>
                            <div className="text-xs text-gray-500">
                              Recibido {new Date(adv.received_date).toLocaleDateString('es-CO')} · Disponible ${parseFloat(adv.balance).toLocaleString('es-CO')}
                            </div>
                            {adv.reference_note && (
                              <div className="text-xs text-gray-400 italic truncate">{adv.reference_note}</div>
                            )}
                          </div>
                          <div className="relative w-28 flex-shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">$</span>
                            <NumericInput
                              value={selectedAdvances[adv.id] || ''}
                              onChange={(e) => updateAdvanceAmount(adv.id, e.target.value)}
                              disabled={!isChecked}
                              className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {advanceTotal > 0 && (
                    <div className={`flex items-center justify-between rounded-lg px-4 py-2 border-2 text-sm font-semibold ${
                      advanceOverBalance ? 'bg-red-50 border-red-300 text-red-800' : 'bg-teal-100 border-teal-300 text-teal-800'
                    }`}>
                      <span>{advanceOverBalance ? 'Supera el total de la venta' : 'Cubierto con anticipo'}</span>
                      <span>${advanceTotal.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                </div>
              )}

              {advanceCoversAll && (
                <div className="bg-teal-50 border-l-4 border-teal-400 p-3 rounded-r-lg text-sm text-teal-800">
                  El anticipo cubre el total de la venta. No se requiere cobrar nada adicional hoy.
                </div>
              )}

              {!advanceCoversAll && (
              <>
              {/* Tipo de pago */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Pago</label>
                <div className={`grid grid-cols-2 gap-2 ${isPaymentMode ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
                  {[
                    { key: 'full',    label: 'Contado',  color: 'green',  emoji: '✅' },
                    { key: 'partial', label: 'Parcial',  color: 'yellow', emoji: '🕐' },
                    !isPaymentMode && { key: 'credit',  label: 'Crédito',  color: 'red',    emoji: '📋' },
                    { key: 'mixed',   label: 'Mixto',    color: 'purple', emoji: '🔀' },
                  ].filter(Boolean).map(({ key, label, color, emoji }) => (
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
                      <div key={index} className="bg-white rounded-lg border border-purple-200 px-3 py-2 space-y-1.5">
                      <div className="flex items-center gap-2">
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
                          <NumericInput
                            value={row.amount}
                            onChange={(e) => updateMixedRow(index, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-right focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <button type="button" onClick={() => removeMixedRow(index)}
                          disabled={mixedRows.length <= 2}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors flex-shrink-0">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {row.method !== 'cash' && (
                        <BankAccountSelect
                          compact
                          value={row.bank_account_id}
                          onChange={(id) => updateMixedRow(index, 'bank_account_id', id)}
                        />
                      )}
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
                    <span>{mixedValid ? (mixedExcess > 0 ? '✅ Total cubierto + anticipo' : '✅ Total cubierto') : mixedRemaining > 0 ? '⚠️ Falta cubrir' : '❌ Excede el total'}</span>
                    <span>
                      {mixedValid
                        ? `$${effectiveTotal.toLocaleString('es-CO')}`
                        : `$${Math.abs(mixedRemaining).toLocaleString('es-CO')}`
                      }
                    </span>
                  </div>
                  {mixedExcess > 0 && (
                    <ExcessAdvanceToggle
                      amount={mixedExcess}
                      checked={excessToAdvance}
                      onChange={setExcessToAdvance}
                      disabled={!canCreateAdvance}
                      hint="Se descuenta de los últimos medios de pago de la lista."
                    />
                  )}

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

              {/* Cuenta bancaria que recibe el pago (no efectivo) */}
              {paymentType !== 'mixed' && paymentType !== 'credit' && !isCash && (
                <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} />
              )}

              {/* Abono parcial */}
              {paymentType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Abono inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <NumericInput value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
                      required />
                  </div>
                  {pendingAmount > 0 && (
                    <p className="mt-1.5 text-sm text-orange-600 font-medium">
                      Saldo pendiente: ${pendingAmount.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}

              {/* Monto recibido: cambio (efectivo) o excedente → anticipo */}
              {(paymentType === 'full' || (isCash && paymentType === 'partial')) && (
                <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <BanknotesIcon className="w-4 h-4" />
                    {isCash ? 'Cobro en efectivo' : 'Monto recibido (opcional)'}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-700 mb-2">
                      {isCash ? 'Monto recibido del cliente' : 'Si el cliente pagó más del valor a cobrar, escribe lo que realmente recibiste'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                      <NumericInput
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={amountToPay.toLocaleString('es-CO')}
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
                            {!cashChangePositive ? 'Monto insuficiente' : willCreateAdvance ? 'Queda como anticipo:' : isCash ? 'Cambio a entregar:' : 'Excedente recibido:'}
                          </span>
                        </div>
                        {cashChangePositive && (
                          <span className="text-xl font-bold text-green-700">${cashChange.toLocaleString('es-CO')}</span>
                        )}
                      </div>
                    )}
                    {singleExcess > 0 && (
                      <div className="mt-3">
                        <ExcessAdvanceToggle
                          amount={singleExcess}
                          checked={excessToAdvance}
                          onChange={setExcessToAdvance}
                          disabled={!canCreateAdvance}
                          hint={`Se registra con el mismo medio de pago (${PAYMENT_METHODS_LIST.find(m => m.value === paymentMethod)?.label || paymentMethod})${!isCash ? ' y cuenta bancaria' : ''}.`}
                        />
                        {nonCashExcessUnhandled && (
                          <p className="mt-2 text-xs text-red-600">
                            Un pago {PAYMENT_METHODS_LIST.find(m => m.value === paymentMethod)?.label?.toLowerCase()} no da cambio: deja el excedente como anticipo o corrige el monto recibido.
                          </p>
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
                  {advanceTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cubierto con anticipo:</span>
                      <span className="font-semibold text-teal-700">-${advanceTotal.toLocaleString('es-CO')}</span>
                    </div>
                  )}
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
                        ${(paymentType === 'credit' ? effectiveTotal : pendingAmount).toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                  {willCreateAdvance ? (
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="text-gray-600">Anticipo a favor del cliente:</span>
                      <span className="font-bold text-teal-600 text-base">${excessAmount.toLocaleString('es-CO')}</span>
                    </div>
                  ) : isCash && cashChangePositive && cashChange > 0 && (
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
              </>
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
                  advanceOverBalance ||
                  (!advanceCoversAll && paymentType === 'mixed' && !mixedValid) ||
                  (!advanceCoversAll && paymentType !== 'mixed' && cashReceived !== '' && !cashChangePositive) ||
                  (!advanceCoversAll && nonCashExcessUnhandled)
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
                ) : (isPaymentMode ? '✓ Registrar Pago' : '✓ Confirmar Venta')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSaleWithPaymentModal;