// Editor de líneas de cotización del CRM (Nuevo negocio / ventana del negocio).
// Precios fijos: salen del catálogo o de lo ya cotizado, el asesor solo
// maneja productos, combos, cantidades y el descuento global (% o $).
import { useState } from 'react';
import { Layers, Minus, Plus, Trash2, Package, X } from 'lucide-react';
import NumericInput from '../inputs/NumericInput';
import ProductSearchInput from '../common/ProductSearchInput';
import ComboPickerModal from '../combos/ComboPickerModal';
import { newComboGroupId } from '../combos/comboUtils';
import { formatCurrency, toInteger } from '../../utils/formatters';
import { getServerOrigin } from '../../utils/env';

const taxPctOf = (product) => (product.has_tax === false ? 0 : Number(product.tax_percentage ?? 19) || 0);

// Mismo cálculo que calculateItemTotals de SaleFormPage (sin AIU ni descuento por línea).
function lineAmounts(product, quantity, unitPrice) {
  const gross = quantity * unitPrice;
  const pct = taxPctOf(product);
  if (!pct) return { tax: 0, total: gross };
  if (product.price_includes_tax) {
    const tax = Math.round((gross * pct) / (100 + pct));
    return { tax, total: gross };
  }
  const tax = Math.round((gross * pct) / 100);
  return { tax, total: gross + tax };
}

const lineParts = (l) => (l.type === 'product'
  ? [lineAmounts(l.product, l.quantity, l.unitPrice)]
  : l.items.map(it => lineAmounts(it.product, it.perCombo * l.quantity, it.unitPrice)));

const lineTotal = (l) => lineParts(l).reduce((s, p) => s + p.total, 0);

export function computeTotals(lines, discount) {
  let tax = 0;
  let total = 0;
  lines.forEach(l => lineParts(l).forEach(p => { tax += p.tax; total += p.total; }));
  const value = toInteger(discount.value, 0);
  const discountAmount = value <= 0 ? 0
    : discount.type === 'percentage' ? Math.round(total * Math.min(value, 100) / 100)
      : Math.min(value, total);
  return { subtotal: total - tax, tax, discountAmount, grandTotal: total - discountAmount };
}

function toSaleItem(product, quantity, unitPrice, comboFields) {
  return {
    item_type: product.product_type === 'service' ? 'service' : 'product',
    product_id: product.id,
    product_name: product.name,
    quantity,
    unit_price: unitPrice,
    discount_percentage: 0,
    tax_percentage: taxPctOf(product),
    ...comboFields,
  };
}

export const buildSaleItems = (lines) => lines.flatMap(l => (l.type === 'product'
  ? [toSaleItem(l.product, l.quantity, l.unitPrice)]
  : l.items.map(it => toSaleItem(it.product, it.perCombo * l.quantity, it.unitPrice, {
    combo_id: l.combo.id,
    combo_group_id: l.key,
    combo_name: l.combo.name,
    combo_quantity: l.quantity,
    combo_show_breakdown: l.showBreakdown !== false,
  }))));

// Ítems guardados de una venta -> líneas del editor (combos agrupados por combo_group_id).
export function linesFromSaleItems(items = []) {
  const lines = [];
  const combos = new Map();
  items.forEach(item => {
    const product = item.product || {
      id: item.product_id, name: item.product_name, tax_percentage: item.tax_percentage, has_tax: Number(item.tax_percentage) > 0,
    };
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    if (!item.combo_group_id) {
      lines.push({ key: item.id, type: 'product', product, quantity, unitPrice });
      return;
    }
    let combo = combos.get(item.combo_group_id);
    if (!combo) {
      combo = {
        key: item.combo_group_id,
        type: 'combo',
        combo: { id: item.combo_id, name: item.combo_name || 'Combo' },
        quantity: Number(item.combo_quantity) || 1,
        showBreakdown: item.combo_show_breakdown !== false,
        items: [],
      };
      combos.set(item.combo_group_id, combo);
      lines.push(combo);
    }
    combo.items.push({ product, perCombo: quantity / combo.quantity, unitPrice });
  });
  return lines;
}

const imageSrc = (product) => (product.image_url?.startsWith('http') ? product.image_url : `${getServerOrigin()}${product.image_url}`);

function ProductThumb({ product, onOpen }) {
  const [failed, setFailed] = useState(false);
  if (!product.image_url || failed) return null;
  return (
    <button type="button" onClick={() => onOpen(product)} title="Ver imagen"
      className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-rose-300 transition">
      <img src={imageSrc(product)} alt={product.name} loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />
    </button>
  );
}

function QtyStepper({ value, onChange }) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white shrink-0">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}
        className="p-2 text-gray-500 hover:text-gray-800 disabled:opacity-30" aria-label="Restar">
        <Minus size={14} />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="p-2 text-gray-500 hover:text-gray-800" aria-label="Sumar">
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function QuoteLinesEditor({ lines, onChange, readOnly = false, label = 'Productos de la cotización *' }) {
  const [productQuery, setProductQuery] = useState('');
  const [comboPickerOpen, setComboPickerOpen] = useState(false);
  const [preview, setPreview] = useState(null);

  const addProduct = (product) => {
    setProductQuery('');
    const idx = lines.findIndex(l => l.type === 'product' && l.product.id === product.id);
    onChange(idx >= 0
      ? lines.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + 1 } : l))
      : [...lines, { key: product.id, type: 'product', product, quantity: 1, unitPrice: toInteger(product.base_price, 0) }]);
  };

  const addCombo = ({ combo, quantity, show_breakdown, items }) => {
    const comboQty = quantity || 1;
    onChange([...lines, {
      key: newComboGroupId(),
      type: 'combo',
      combo,
      quantity: comboQty,
      showBreakdown: show_breakdown,
      items: items.map(it => ({ product: it.product, perCombo: it.quantity / comboQty, unitPrice: toInteger(it.unit_price, 0) })),
    }]);
    setComboPickerOpen(false);
  };

  const setLineQty = (key, quantity) => onChange(lines.map(l => (l.key === key ? { ...l, quantity } : l)));
  const removeLine = (key) => onChange(lines.filter(l => l.key !== key));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <ProductSearchInput value={productQuery} onChange={setProductQuery} onSelect={addProduct}
              onClear={() => setProductQuery('')} show={{ stock: true, price: true }}
              placeholder="Buscar producto por nombre, SKU o código..." />
          </div>
          <button type="button" onClick={() => setComboPickerOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition shrink-0">
            <Layers size={15} /> Combo
          </button>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-center">
          <Package size={26} className="text-gray-300" />
          <p className="text-sm text-gray-500">{readOnly ? 'Sin productos' : 'Agrega lo que el cliente quiere cotizar'}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {lines.map(l => (
            <li key={l.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
              <div className="basis-full sm:basis-0 sm:flex-1 min-w-0 flex items-center gap-3">
                {l.type === 'product' && <ProductThumb product={l.product} onOpen={setPreview} />}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800 break-words">
                    {l.type === 'combo' && <Layers size={14} className="text-emerald-600 shrink-0" />}
                    {l.type === 'combo' ? l.combo.name : l.product.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {l.type === 'combo'
                      ? l.items.map(it => `${it.perCombo} × ${it.product.name}`).join(' · ')
                      : `${l.product.sku ? `SKU ${l.product.sku} · ` : ''}${formatCurrency(l.unitPrice)} c/u`}
                  </p>
                </div>
              </div>
              {readOnly ? (
                <span className="text-sm text-gray-500 tabular-nums shrink-0">× {l.quantity}</span>
              ) : (
                <QtyStepper value={l.quantity} onChange={q => setLineQty(l.key, q)} />
              )}
              <span className="flex-1 sm:flex-none sm:w-28 text-right text-sm font-semibold text-gray-900 tabular-nums">
                {formatCurrency(lineTotal(l))}
              </span>
              {!readOnly && (
                <button type="button" onClick={() => removeLine(l.key)} title="Quitar"
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <ComboPickerModal isOpen={comboPickerOpen} onClose={() => setComboPickerOpen(false)} onConfirm={addCombo} lockPrices />
      )}

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <button type="button" onClick={() => setPreview(null)} aria-label="Cerrar"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={22} />
          </button>
          <img src={imageSrc(preview)} alt={preview.name} className="max-h-[85vh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

// Resumen fijo al pie del modal: totales + descuento (% o $) + acciones (children).
export function QuoteSummary({ totals, discount, onDiscountChange, readOnly = false, sticky = true, children }) {
  return (
    <div className={`${sticky ? 'sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-6 pb-4' : ''} border-t border-gray-100 bg-white pt-3 space-y-3`}>
      <dl className="space-y-1.5 text-sm">
        <div className={`${sticky ? 'hidden sm:flex' : 'flex'} justify-between gap-3 text-gray-500`}><dt>Subtotal</dt><dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd></div>
        <div className={`${sticky ? 'hidden sm:flex' : 'flex'} justify-between gap-3 text-gray-500`}><dt>IVA</dt><dd className="tabular-nums">{formatCurrency(totals.tax)}</dd></div>
        {readOnly ? (
          totals.discountAmount > 0 && (
            <div className="flex justify-between gap-3 text-emerald-600"><dt>Descuento</dt><dd className="tabular-nums">− {formatCurrency(totals.discountAmount)}</dd></div>
          )
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-gray-500">
              <dt>Descuento</dt>
              <dd className="flex items-center gap-2 min-w-0">
                {totals.discountAmount > 0 && (
                  <span className="hidden sm:inline text-emerald-600 tabular-nums">− {formatCurrency(totals.discountAmount)}</span>
                )}
                <div className="flex h-9 rounded-lg border border-gray-300 p-0.5 shrink-0">
                  {[['percentage', '%'], ['fixed', '$']].map(([type, label]) => (
                    <button key={type} type="button" onClick={() => onDiscountChange({ ...discount, type })}
                      className={`w-8 !p-0 rounded-md text-sm font-semibold transition ${discount.type === type ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <NumericInput className="input !h-9 !py-1 !w-24 sm:!w-32 text-right" value={discount.value} placeholder="0"
                  onChange={e => onDiscountChange({ ...discount, value: e.target.value })} />
              </dd>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex sm:hidden justify-end text-emerald-600 tabular-nums">− {formatCurrency(totals.discountAmount)}</div>
            )}
          </>
        )}
        <div className="flex justify-between gap-3 pt-1 text-base font-bold text-gray-900"><dt>Total</dt><dd className="tabular-nums">{formatCurrency(totals.grandTotal)}</dd></div>
      </dl>
      {children}
    </div>
  );
}
