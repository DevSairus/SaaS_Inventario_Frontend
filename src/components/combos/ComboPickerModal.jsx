// Selector de combo para factura / cotización (SaleFormPage) y orden de
// trabajo (WorkOrderDetailPage). Paso 1: elegir combo. Paso 2: ajustar
// cantidad de combos, cómo se muestra, y cantidad/precio de cada línea
// (lockPrices: el precio queda fijo al definido en el combo).
// onConfirm recibe { combo, quantity, show_breakdown, items: [{ product_id,
// product, quantity (total = por combo × combos), unit_price }] }.
import { useState, useEffect } from 'react';
import { Search, Loader2, Layers, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { combosAPI } from '../../api/combos';
import { formatCurrency } from '../../utils/formatters';
import { estimateLineTotal, estimateComboTotal } from './comboUtils';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5';

export default function ComboPickerModal({ isOpen, onClose, onConfirm, hidePrices = false, lockPrices = false, submitting = false, showApprovalOption = false }) {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [lines, setLines] = useState([]);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setSearch('');
    setLoading(true);
    combosAPI.list()
      .then(res => setCombos(res.data.data || []))
      .catch(() => toast.error('Error al cargar los combos'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const pick = (combo) => {
    setSelected(combo);
    setQuantity(1);
    setShowBreakdown(combo.show_breakdown !== false);
    setRequiresApproval(false);
    setLines((combo.items || [])
      .filter(ci => ci.product && ci.product.is_active !== false)
      .map(ci => ({
        product_id: ci.product_id,
        product: ci.product,
        perCombo: Number(ci.quantity) || 1,
        unit_price: Number(ci.unit_price) || 0,
      })));
    const inactive = (combo.items || []).filter(ci => !ci.product || ci.product.is_active === false);
    if (inactive.length > 0) toast(`${inactive.length} producto(s) inactivo(s) del combo no se agregarán`, { icon: '⚠️' });
  };

  const updateLine = (index, field, value) => {
    setLines(ls => ls.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const comboQty = Number(quantity) > 0 ? Number(quantity) : 1;
  const resolvedLines = lines.map(l => ({
    product_id: l.product_id,
    product: l.product,
    quantity: (Number(l.perCombo) || 0) * comboQty,
    unit_price: Math.max(0, Number(l.unit_price) || 0),
  }));

  const handleConfirm = () => {
    if (resolvedLines.length === 0) return toast.error('El combo no tiene líneas para agregar');
    if (resolvedLines.some(l => !(l.quantity > 0))) return toast.error('Las cantidades deben ser mayores a 0');
    onConfirm({ combo: selected, quantity: comboQty, show_breakdown: showBreakdown, items: resolvedLines, requires_approval: requiresApproval });
  };

  const term = search.trim().toLowerCase();
  const visible = term ? combos.filter(c => c.name.toLowerCase().includes(term)) : combos;

  return (
    <Modal isOpen={isOpen} onClose={() => !submitting && onClose()} title={selected ? selected.name : 'Agregar combo'} size="lg">
      {!selected ? (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar combo..."
              className="w-full border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : visible.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              {combos.length === 0 ? 'No hay combos activos. Créalos en Inventario > Combos.' : 'Ningún combo coincide.'}
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5 border border-gray-100 dark:border-white/10 rounded-lg">
              {visible.map(c => (
                <button key={c.id} type="button" onClick={() => pick(c)}
                  className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
                      <Layers size={15} className="text-emerald-600 shrink-0" /> {c.name}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5 truncate">
                      {(c.items || []).map(i => `${Number(i.quantity)} × ${i.product?.name || 'Producto'}`).join(' · ')}
                    </span>
                  </span>
                  {!hidePrices && (
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">{formatCurrency(estimateComboTotal(c.items))}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={14} /> Elegir otro combo
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cantidad de combos</label>
              <input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Mostrar en el documento</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: true, t: 'Desglosado' }, { v: false, t: 'Solo nombre y total' }].map(o => (
                  <button key={String(o.v)} type="button" onClick={() => setShowBreakdown(o.v)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      showBreakdown === o.v
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium'
                        : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                    {o.t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-white/10 rounded-lg text-sm divide-y divide-gray-50 dark:divide-white/5">
            {lines.map((l, index) => (
              <div key={l.product_id} className="flex flex-wrap items-end gap-x-2 gap-y-2 px-3 py-2.5">
                <div className="basis-full sm:basis-0 sm:flex-1 min-w-0">
                  <p className="text-gray-800 dark:text-gray-100 break-words">{l.product?.name}</p>
                  <p className="text-xs text-gray-400">{l.product?.product_type === 'service' ? 'Servicio' : 'Producto'}</p>
                </div>
                <label className="w-20 shrink-0">
                  <span className="block text-[11px] text-gray-400 mb-0.5">Cant. x combo</span>
                  <input type="number" min="0.001" step="any" value={l.perCombo} className={inputCls}
                    onChange={e => updateLine(index, 'perCombo', e.target.value)} />
                </label>
                {!hidePrices && (
                  <label className="w-28 shrink-0">
                    <span className="block text-[11px] text-gray-400 mb-0.5">Precio unit.</span>
                    {lockPrices ? (
                      <span className="block py-1.5 text-right text-gray-700 dark:text-gray-200">{formatCurrency(l.unit_price)}</span>
                    ) : (
                      <input type="number" min="0" step="any" value={l.unit_price} className={inputCls}
                        onChange={e => updateLine(index, 'unit_price', e.target.value)} />
                    )}
                  </label>
                )}
                {!hidePrices && (
                  <div className="flex-1 sm:flex-none sm:w-28 text-right">
                    <span className="block text-[11px] text-gray-400 mb-0.5">Total</span>
                    <span className="block py-1.5 font-medium">{formatCurrency(estimateLineTotal(resolvedLines[index]))}</span>
                  </div>
                )}
                <button type="button" title="Quitar del documento" onClick={() => setLines(ls => ls.filter((_, i) => i !== index))}
                  className="p-1.5 mb-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!hidePrices && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-b-lg">
                <span className="text-xs text-gray-500">Total estimado (con IVA)</span>
                <span className="font-semibold">{formatCurrency(estimateComboTotal(resolvedLines))}</span>
              </div>
            )}
          </div>

          {showApprovalOption && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} />
              Requiere aprobación del cliente (no descuenta inventario hasta aprobar)
            </label>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-white/5">Cancelar</button>
            <button type="button" onClick={handleConfirm} disabled={submitting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {submitting ? 'Agregando...' : 'Agregar combo'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
