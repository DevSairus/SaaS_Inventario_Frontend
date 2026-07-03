// frontend/src/components/sales/CreditDebitNoteModal.jsx
import { useState, useMemo } from 'react';
import { X, AlertTriangle, ChevronRight, ChevronLeft, Check, FileText, Minus, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import dianAPI from '../../api/dian';
import toast from 'react-hot-toast';

const REASONS = {
  credit: [
    { value: 'devolucion',      label: 'Devolución de mercancía' },
    { value: 'descuento',       label: 'Descuento posterior' },
    { value: 'anulacion',       label: 'Anulación de factura' },
    { value: 'error_factura',   label: 'Error en factura' },
    { value: 'other',           label: 'Otro motivo' },
  ],
  debit: [
    { value: 'intereses',       label: 'Intereses de mora' },
    { value: 'ajuste_precio',   label: 'Ajuste de precio' },
    { value: 'cargo_adicional', label: 'Cargo adicional' },
    { value: 'other',           label: 'Otro motivo' },
  ],
};

export default function CreditDebitNoteModal({ isOpen, onClose, sale, onSuccess, type = 'credit' }) {
  const isCredit = type === 'credit';
  const title = isCredit ? 'Nota Crédito' : 'Nota Débito';
  const reasons = isCredit ? REASONS.credit : REASONS.debit;

  // ── State ──────────────────────────────────────────────────
  const [step, setStep]         = useState(1); // 1=modo, 2=items, 3=confirmar
  const [mode, setMode]         = useState('items'); // 'items' | 'amount' | 'total'
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries((sale?.items || []).map(i => [i.id, 0]))
  );
  const [amount, setAmount]     = useState('');
  const [reason, setReason]     = useState(reasons[0].value);
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);

  if (!isOpen || !sale) return null;

  // ── Computed ───────────────────────────────────────────────
  const allItems = useMemo(() =>
    (sale?.items || []).filter(i => i.item_type !== 'free_line'),
    [sale]
  );

  const selectedItems = allItems.filter(i => (quantities[i.id] || 0) > 0);

  const itemsTotal = selectedItems.reduce((sum, item) => {
    const qty   = quantities[item.id] || 0;
    const ratio = qty / parseFloat(item.quantity);
    return sum + parseFloat(item.total) * ratio;
  }, 0);

  const noteTotal = mode === 'amount' ? parseFloat(amount) || 0 : itemsTotal;

  const isValid = isCredit
    ? (reason && (mode === 'total' || (mode === 'items' && selectedItems.length > 0) || (mode === 'amount' && noteTotal > 0)))
    : (reason && noteTotal > 0);

  // ── Handlers ───────────────────────────────────────────────
  const handleModeSelect = (m) => {
    setMode(m);
    if (m === 'total') {
      setQuantities(Object.fromEntries(allItems.map(i => [i.id, parseFloat(i.quantity)])));
    } else if (m === 'items') {
      setQuantities(Object.fromEntries(allItems.map(i => [i.id, 0])));
    }
    setStep(m === 'items' ? 2 : 3);
  };

  const handleQtyChange = (itemId, value) => {
    const item    = allItems.find(i => i.id === itemId);
    const max     = parseFloat(item.quantity);
    const parsed  = parseFloat(value) || 0;
    const clamped = Math.min(Math.max(0, parsed), max);
    setQuantities(prev => ({ ...prev, [itemId]: clamped }));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      let payload;

      if (mode === 'total') {
        payload = { reason, notes: notes || undefined };
      } else if (mode === 'items') {
        const items = selectedItems.map(item => ({
          sale_item_id: item.id,
          quantity: quantities[item.id],
        }));
        payload = { items, reason, notes: notes || undefined };
      } else {
        payload = { amount: noteTotal, reason, notes: notes || undefined };
      }

      const apiCall = isCredit ? dianAPI.createCreditNote : dianAPI.createDebitNote;
      const { data } = await apiCall(sale.id, payload);

      setResult(data);
      setStep(4);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || `Error al crear ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setMode('items');
    setQuantities(Object.fromEntries((sale?.items || []).map(i => [i.id, 0])));
    setAmount('');
    setReason(reasons[0].value);
    setNotes('');
    setResult(null);
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────
  const stepLabel = { 1: 'Modo', 2: 'Seleccionar ítems', 3: 'Confirmar', 4: 'Listo' };
  const accentColor = isCredit ? 'red' : 'orange';
  const AccentIcon  = isCredit ? FileText : Plus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step < 4 ? handleClose : undefined} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${step === 4 ? 'bg-green-50 border-green-100' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            {step < 4
              ? <div className={`w-8 h-8 rounded-full bg-${accentColor}-100 flex items-center justify-center`}>
                  <AccentIcon className={`w-4 h-4 text-${accentColor}-600`} />
                </div>
              : <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
            }
            <div>
              <h2 className="font-semibold text-gray-900">
                {step < 4 ? `Crear ${title}` : `${title} creada`}
              </h2>
              <p className="text-xs text-gray-500">{sale.sale_number} · {stepLabel[step]}</p>
            </div>
          </div>

          {step < 4 && (
            <div className="flex items-center gap-1.5 mr-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
                  s < step  ? `w-6 bg-${accentColor}-500` :
                  s === step ? `w-8 bg-${accentColor}-600` :
                               'w-4 bg-gray-200'
                }`} />
              ))}
            </div>
          )}

          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

          {/* PASO 1: Modo */}
          {step === 1 && (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 bg-${accentColor}-50 border border-${accentColor}-200 rounded-xl px-4 py-3`}>
                <AlertTriangle className={`w-4 h-4 text-${accentColor}-500 flex-shrink-0 mt-0.5`} />
                <p className={`text-sm text-${accentColor}-800`}>
                  Se creará una <strong>{title.toLowerCase()}</strong> para la factura{' '}
                  <strong>{sale.dian_invoice_number || sale.sale_number}</strong> y se enviará a la DIAN.
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Factura original: <span className="font-semibold">{formatCurrency(sale.total_amount)}</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {isCredit && (
                  <button onClick={() => handleModeSelect('total')}
                    className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 rounded-xl transition-all">
                    <div className="w-10 h-10 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 text-sm">Total</p>
                      <p className="text-xs text-gray-500 mt-0.5">Acreditar el total</p>
                    </div>
                    <span className="text-base font-bold text-red-600">{formatCurrency(sale.total_amount)}</span>
                  </button>
                )}

                <button onClick={() => handleModeSelect('items')}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-sm">Por ítems</p>
                    <p className="text-xs text-gray-500 mt-0.5">Seleccionar ítems y cantidades</p>
                  </div>
                </button>

                <button onClick={() => { setMode('amount'); setStep(3); }}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-sm">Por monto</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ingresar monto fijo</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Selección de ítems */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {isCredit ? 'Selecciona los ítems y cantidades a acreditar.' : 'Selecciona los ítems para el cargo.'}
              </p>

              <div className="space-y-2">
                {allItems.map(item => {
                  const max = parseFloat(item.quantity);
                  const qty = quantities[item.id] || 0;
                  const pct = max > 0 ? (qty / max) * 100 : 0;

                  return (
                    <div key={item.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                      qty > 0 ? `border-${accentColor}-200 bg-${accentColor}-50` : 'border-gray-100 bg-gray-50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">Disponible: <span className="font-medium">{max}</span></p>
                          <span className="text-gray-300">·</span>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} c/u</p>
                        </div>
                        <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full bg-${accentColor}-500 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleQtyChange(item.id, qty - 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 font-bold text-sm">−</button>
                        <input type="number" min="0" max={max} step="1" value={qty}
                          onChange={e => handleQtyChange(item.id, e.target.value)}
                          className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <button onClick={() => handleQtyChange(item.id, qty + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 font-bold text-sm">+</button>
                        <span className="text-xs text-gray-400 ml-1">/ {max}</span>
                      </div>

                      <div className="text-right w-20 flex-shrink-0">
                        <p className={`text-sm font-semibold ${qty > 0 ? `text-${accentColor}-700` : 'text-gray-300'}`}>
                          {formatCurrency(parseFloat(item.total) * (qty / max))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedItems.length > 0 && (
                <div className={`flex justify-between items-center bg-${accentColor}-50 border border-${accentColor}-100 rounded-xl px-4 py-3`}>
                  <p className={`text-sm text-${accentColor}-700`}>
                    {selectedItems.length} ítem{selectedItems.length !== 1 ? 's' : ''} seleccionado{selectedItems.length !== 1 ? 's' : ''}
                  </p>
                  <p className={`font-bold text-${accentColor}-800`}>{formatCurrency(itemsTotal)}</p>
                </div>
              )}
            </div>
          )}

          {/* PASO 3: Confirmar */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen</p>

                {mode === 'total' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Total de la factura</span>
                    <span className="font-medium">{formatCurrency(sale.total_amount)}</span>
                  </div>
                )}

                {mode === 'items' && selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product_name} <span className="text-gray-400">× {quantities[item.id]}</span>
                    </span>
                    <span className="font-medium">{formatCurrency(parseFloat(item.total) * (quantities[item.id] / parseFloat(item.quantity)))}</span>
                  </div>
                ))}

                {mode === 'amount' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg font-medium"
                        min="1" max={sale.total_amount} step="any" placeholder="0" />
                    </div>
                    {parseFloat(amount) > parseFloat(sale.total_amount) && (
                      <p className="mt-1 text-xs text-red-600">El monto no puede exceder el total de la factura</p>
                    )}
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total {title.toLowerCase()}</span>
                  <span className={`text-${accentColor}-600`}>{formatCurrency(mode === 'total' ? sale.total_amount : noteTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {reasons.map(r => (
                    <button key={r.value} onClick={() => setReason(r.value)}
                      className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                        reason === r.value
                          ? `border-${accentColor}-400 bg-${accentColor}-50 text-${accentColor}-700 font-medium`
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Observaciones <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Detalle adicional..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
              </div>
            </div>
          )}

          {/* PASO 4: Éxito */}
          {step === 4 && result && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{title} creada</p>
                <p className="text-sm text-gray-500 text-center">
                  Se creó <span className="font-mono font-medium text-gray-700">{result.data?.sale_number}</span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Documento</span>
                  <span className="font-medium text-green-700">{result.data?.sale_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo</span>
                  <span className="font-medium">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto</span>
                  <span className="font-bold text-red-600">{formatCurrency(result.data?.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DIAN</span>
                  <span className={`font-medium ${
                    result.data?.dian_status === 'accepted' ? 'text-green-600' :
                    result.data?.dian_status === 'pending'  ? 'text-amber-600' :
                                                              'text-gray-500'
                  }`}>
                    {result.data?.dian_status === 'accepted' ? '✓ Aceptada' :
                     result.data?.dian_status === 'pending'  ? '⏳ En proceso...' :
                                                                'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          )}
          {step === 3 && (
            <button onClick={() => setStep(mode === 'items' ? 2 : 1)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          )}
          {(step === 1 || step === 4) && <span />}

          <div className="flex items-center gap-2 ml-auto">
            {step < 4 && (
              <button onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
            )}

            {step === 2 && (
              <button onClick={() => setStep(3)} disabled={selectedItems.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button onClick={handleSubmit} disabled={!isValid || loading}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-${accentColor}-600 hover:bg-${accentColor}-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors min-w-[140px] justify-center`}>
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <AccentIcon className="w-4 h-4" />
                    Crear {title}
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button onClick={handleClose}
                className="px-5 py-2 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors">
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
