import { useState } from 'react';
import { AlertTriangle, Package, User, FileText, ArrowUpCircle, ArrowDownCircle, Loader } from 'lucide-react';
import { adjustmentsAPI } from '../../api/adjustments';
import toast from 'react-hot-toast';

const REASONS_ENTRADA = [
  { value: 'compra',       label: 'Compra a proveedor' },
  { value: 'devolucion',   label: 'Devolución de cliente' },
  { value: 'sobrante',     label: 'Sobrante de inventario' },
  { value: 'correccion',   label: 'Corrección de conteo' },
  { value: 'otro',         label: 'Otro' },
];
const REASONS_SALIDA = [
  { value: 'merma',        label: 'Merma / vencimiento' },
  { value: 'dano',         label: 'Daño / deterioro' },
  { value: 'robo',         label: 'Robo / pérdida' },
  { value: 'correccion',   label: 'Corrección de conteo' },
  { value: 'uso_interno',  label: 'Uso interno' },
  { value: 'otro',         label: 'Otro' },
];

export default function QuickStockModal({ product, user, onClose, onSuccess }) {
  const [type,     setType]     = useState('entrada');
  const [quantity, setQuantity] = useState('');
  const [invoice,  setInvoice]  = useState('');
  const [reason,   setReason]   = useState('compra');
  const [notes,    setNotes]    = useState('');
  const [accepted, setAccepted] = useState(false);
  const [saving,   setSaving]   = useState(false);

  const reasons = type === 'entrada' ? REASONS_ENTRADA : REASONS_SALIDA;

  // Al cambiar tipo, resetear reason al primero de la lista
  const handleTypeChange = (t) => {
    setType(t);
    setReason(t === 'entrada' ? 'compra' : 'merma');
  };

  const qty = parseFloat(quantity);
  const currentStock = parseFloat(product.current_stock ?? 0);
  const projectedStock = type === 'entrada'
    ? currentStock + (qty || 0)
    : currentStock - (qty || 0);

  const canSubmit =
    accepted &&
    qty > 0 &&
    !isNaN(qty) &&
    reason &&
    !saving &&
    (type === 'entrada' || projectedStock >= 0 || product.allow_negative_stock);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    // Construir notas con factura incluida
    const notesText = [
      invoice ? `Factura/Doc: ${invoice}` : null,
      notes    ? notes                     : null,
    ].filter(Boolean).join(' | ');

    try {
      // 1. Crear ajuste en draft
      const created = await adjustmentsAPI.create({
        adjustment_type:  type,
        reason,
        adjustment_date:  new Date().toISOString().slice(0, 10),
        notes:            notesText || undefined,
        items: [{
          product_id: product.id,
          quantity:   qty,
          unit_cost:  parseFloat(product.average_cost ?? product.base_price ?? 0),
        }],
      });

      const adjustmentId = created?.data?.id ?? created?.id;
      if (!adjustmentId) throw new Error('No se obtuvo ID del ajuste');

      // 2. Confirmar — genera movimiento y actualiza stock
      await adjustmentsAPI.confirm(adjustmentId);

      toast.success(
        `Stock actualizado: ${type === 'entrada' ? '+' : '−'}${qty} ${product.unit ?? ''} en ${product.name}`
      );
      onSuccess();
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error al ajustar el stock';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const userName = user
    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <Package size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Ajuste rápido de stock</h2>
            <p className="text-sm text-gray-500 truncate">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Stock actual + proyección */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-0.5">Stock actual</p>
              <p className="text-xl font-bold text-gray-900">{currentStock} <span className="text-sm font-normal text-gray-500">{product.unit}</span></p>
            </div>
            <div className="text-gray-300 text-xl">→</div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-0.5">Stock resultante</p>
              <p className={`text-xl font-bold ${projectedStock < 0 ? 'text-red-600' : projectedStock === 0 ? 'text-orange-500' : 'text-green-600'}`}>
                {qty > 0 ? projectedStock : '—'} {qty > 0 && <span className="text-sm font-normal">{product.unit}</span>}
              </p>
            </div>
          </div>

          {/* Tipo de ajuste */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de ajuste *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('entrada')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  type === 'entrada'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <ArrowUpCircle size={16} /> Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('salida')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  type === 'salida'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <ArrowDownCircle size={16} /> Salida (−)
              </button>
            </div>
          </div>

          {/* Cantidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {type === 'salida' && qty > 0 && projectedStock < 0 && !product.allow_negative_stock && (
                <p className="text-xs text-red-500 mt-1">Insuficiente stock disponible</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <span className="flex items-center gap-1"><FileText size={11} /> N° Factura / Documento</span>
              </label>
              <input
                type="text"
                value={invoice}
                onChange={e => setInvoice(e.target.value)}
                placeholder="FAC-0001, REM-0012…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Notas opcionales */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas adicionales <span className="text-gray-400">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones del ajuste…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Responsable */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <User size={14} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Responsable del ajuste</p>
              <p className="text-sm font-medium text-gray-800">{userName}</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full capitalize">
              {user?.role ?? 'usuario'}
            </span>
          </div>

          {/* Advertencia + checkbox */}
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-800">Acción irreversible — lee antes de confirmar</p>
            </div>
            <ul className="text-xs text-amber-700 space-y-0.5 pl-5 list-disc">
              <li>Modifica el stock inmediatamente en el kardex</li>
              <li>Afecta el valor total del inventario y las estadísticas</li>
              <li>Queda registrado con tu usuario, IP y fecha exacta</li>
              <li>No puede deshacerse desde esta pantalla</li>
            </ul>
            <label className="flex items-start gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 accent-amber-600 shrink-0"
              />
              <span className="text-xs text-amber-800 font-medium leading-snug">
                Entiendo el impacto de esta acción y me hago responsable de la información suministrada.
              </span>
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
              type === 'entrada'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {saving
              ? <><Loader size={14} className="animate-spin" /> Registrando…</>
              : `Confirmar ${type === 'entrada' ? 'Entrada' : 'Salida'}`
            }
          </button>
        </div>

      </div>
    </div>
  );
}
