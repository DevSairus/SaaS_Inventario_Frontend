// frontend/src/components/sales/VoidSaleModal.jsx
import { useState, useMemo } from 'react';
import { X, AlertTriangle, RotateCcw, ChevronRight, ChevronLeft, Check, FileText, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// ─── Constantes ───────────────────────────────────────────────────────────────
const REASONS = [
  { value: 'customer_request', label: 'Solicitud del cliente' },
  { value: 'defective',        label: 'Producto defectuoso' },
  { value: 'wrong_product',    label: 'Producto equivocado' },
  { value: 'other',            label: 'Otro motivo' },
];

// ─── VoidSaleModal ─────────────────────────────────────────────────────────────
export default function VoidSaleModal({ isOpen, onClose, sale, onSuccess }) {
  const isFactura  = sale?.document_type === 'factura';
  const isRemision = sale?.document_type === 'remision' || !sale?.document_type;

  // Ítems que pueden devolverse (solo product/service con product_id, excluye free_line)
  const returnableItems = useMemo(() =>
    (sale?.items || []).filter(i => i.item_type !== 'free_line' && i.product_id),
    [sale]
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]         = useState(1);       // 1 = tipo, 2 = ítems, 3 = confirmar
  const [returnType, setReturnType] = useState('total'); // 'total' | 'partial'
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries((sale?.items || []).map(i => [i.id, parseFloat(i.quantity)]))
  );
  const [reason, setReason]     = useState('customer_request');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null); // respuesta final del backend

  if (!isOpen || !sale) return null;

  // ── Computed ───────────────────────────────────────────────────────────────
  const selectedItems = returnableItems.filter(i => quantities[i.id] > 0);

  const returnTotal = selectedItems.reduce((sum, item) => {
    const qty   = quantities[item.id] || 0;
    const ratio = qty / parseFloat(item.quantity);
    return sum + parseFloat(item.total) * ratio;
  }, 0);

  const isValid = selectedItems.length > 0 && reason;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleReturnTypeSelect = (type) => {
    setReturnType(type);
    if (type === 'total') {
      // Resetear todas las cantidades al máximo
      setQuantities(Object.fromEntries(
        (sale?.items || []).map(i => [i.id, parseFloat(i.quantity)])
      ));
    } else {
      // Limpiar cantidades para que el usuario elija
      setQuantities(Object.fromEntries(
        (sale?.items || []).map(i => [i.id, 0])
      ));
    }
    setStep(type === 'total' ? 3 : 2);
  };

  const handleQtyChange = (itemId, value) => {
    const item    = returnableItems.find(i => i.id === itemId);
    const max     = parseFloat(item.quantity);
    const parsed  = parseFloat(value) || 0;
    const clamped = Math.min(Math.max(0, parsed), max);
    setQuantities(prev => ({ ...prev, [itemId]: clamped }));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      const items = selectedItems.map(item => ({
        sale_item_id: item.id,
        quantity:     quantities[item.id],
        condition:    'used',
      }));

      const { data } = await api.post(`/sales/${sale.id}/void`, {
        reason,
        notes,
        items,
        return_type: returnType,
      });

      setResult(data);
      setStep(4); // paso de éxito
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar la anulación');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setReturnType('total');
    setReason('customer_request');
    setNotes('');
    setResult(null);
    setQuantities(Object.fromEntries((sale?.items || []).map(i => [i.id, parseFloat(i.quantity)])));
    onClose();
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const stepLabel = { 1: 'Tipo de anulación', 2: 'Seleccionar ítems', 3: 'Confirmar', 4: 'Listo' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={step < 4 ? handleClose : undefined} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${step === 4 ? 'bg-green-50 border-green-100' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            {step < 4
              ? <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                </div>
              : <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
            }
            <div>
              <h2 className="font-semibold text-gray-900">
                {step < 4 ? 'Anular venta' : 'Anulación procesada'}
              </h2>
              <p className="text-xs text-gray-500">{sale.sale_number} · {stepLabel[step]}</p>
            </div>
          </div>

          {/* Stepper pills */}
          {step < 4 && (
            <div className="flex items-center gap-1.5 mr-8">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s < step  ? 'w-6 bg-red-500' :
                    s === step ? 'w-8 bg-red-600' :
                                 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

          {/* ─ PASO 1: Tipo de anulación ─ */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Alerta factura */}
              {isFactura && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Esta es una <strong>factura electrónica</strong>. La anulación generará una
                    nota crédito que será enviada a la DIAN automáticamente.
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                ¿Cuánto quieres devolver de la venta por{' '}
                <span className="font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</span>?
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Devolución total */}
                <button
                  onClick={() => handleReturnTypeSelect('total')}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 rounded-xl transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
                    <RotateCcw className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Devolución total</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Devuelve todos los ítems y{' '}
                      {isRemision ? 'revierte el inventario' : 'genera nota crédito completa'}
                    </p>
                  </div>
                  <span className="text-base font-bold text-red-600">{formatCurrency(sale.total_amount)}</span>
                </button>

                {/* Devolución parcial */}
                <button
                  onClick={() => handleReturnTypeSelect('partial')}
                  className="group flex flex-col items-center gap-3 p-5 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Devolución parcial</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Elige qué ítems y cuántas unidades devolver
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">Seleccionar ítems →</span>
                </button>
              </div>
            </div>
          )}

          {/* ─ PASO 2: Selección de ítems (parcial) ─ */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Especifica la cantidad a devolver por ítem.</p>

              <div className="space-y-2">
                {returnableItems.map(item => {
                  const max = parseFloat(item.quantity);
                  const qty = quantities[item.id] || 0;
                  const pct = max > 0 ? (qty / max) * 100 : 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                        qty > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      {/* Info producto */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">
                            Vendidos: <span className="font-medium">{max}</span>
                          </p>
                          <span className="text-gray-300">·</span>
                          <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} c/u</p>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Input cantidad */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleQtyChange(item.id, qty - 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 font-bold transition-colors text-sm"
                        >−</button>
                        <input
                          type="number"
                          min="0"
                          max={max}
                          step="1"
                          value={qty}
                          onChange={e => handleQtyChange(item.id, e.target.value)}
                          className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          onClick={() => handleQtyChange(item.id, qty + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 font-bold transition-colors text-sm"
                        >+</button>
                        <span className="text-xs text-gray-400 ml-1">/ {max}</span>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right w-20 flex-shrink-0">
                        <p className={`text-sm font-semibold ${qty > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                          {formatCurrency(parseFloat(item.total) * (qty / max))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumen parcial */}
              {selectedItems.length > 0 && (
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-sm text-blue-700">
                    {selectedItems.length} ítem{selectedItems.length !== 1 ? 's' : ''} seleccionado{selectedItems.length !== 1 ? 's' : ''}
                  </p>
                  <p className="font-bold text-blue-800">{formatCurrency(returnTotal)}</p>
                </div>
              )}
            </div>
          )}

          {/* ─ PASO 3: Confirmar ─ */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Resumen de lo que se devuelve */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Resumen de devolución</p>
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product_name}
                      <span className="text-gray-400 ml-1">× {quantities[item.id]}</span>
                    </span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(item.total) * (quantities[item.id] / parseFloat(item.quantity)))}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total a devolver</span>
                  <span className="text-red-600">{formatCurrency(returnTotal)}</span>
                </div>
              </div>

              {/* Qué va a pasar */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Esto generará</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Devolución registrada ({returnType === 'total' ? 'total' : 'parcial'})
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Ajuste de inventario — entradas para los ítems devueltos
                  </div>
                  {isFactura && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      Nota crédito electrónica enviada a la DIAN
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REASONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                        reason === r.value
                          ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Observaciones <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalle adicional del motivo de devolución..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>
            </div>
          )}

          {/* ─ PASO 4: Éxito ─ */}
          {step === 4 && result && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">Anulación procesada</p>
                <p className="text-sm text-gray-500 text-center">
                  Se registró la devolución{' '}
                  <span className="font-mono font-medium text-gray-700">{result.data?.return_number}</span>
                </p>
              </div>

              {/* Detalle resultado */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Devolución</span>
                  <span className="font-medium text-green-700">{result.data?.return_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto devuelto</span>
                  <span className="font-bold text-red-600">{formatCurrency(result.data?.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inventario</span>
                  <span className="font-medium text-green-600">✓ Ajustado</span>
                </div>
                {isFactura && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nota crédito DIAN</span>
                    <span className={`font-medium ${
                      result.data?.dian_status === 'accepted' ? 'text-green-600' :
                      result.data?.dian_status === 'pending'  ? 'text-amber-600' :
                                                                'text-gray-500'
                    }`}>
                      {result.data?.dian_status === 'accepted' ? '✓ Aceptada' :
                       result.data?.dian_status === 'pending'  ? '⏳ Pendiente' :
                                                                  'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
          {/* Botón volver */}
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {step === 3 && (
            <button
              onClick={() => setStep(returnType === 'partial' ? 2 : 1)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {(step === 1 || step === 4) && <span />}

          {/* Botón acción */}
          <div className="flex items-center gap-2 ml-auto">
            {step < 4 && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={selectedItems.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors min-w-[140px] justify-center"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    {isFactura ? 'Anular y enviar DIAN' : 'Confirmar anulación'}
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}