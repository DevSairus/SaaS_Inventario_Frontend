import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import ProductSearchInput from '../common/ProductSearchInput';
import NumericInput from '../inputs/NumericInput';
import { formatCurrency } from '../../utils/formatters';
import { suggestedSalePrice, maxMarginFor, MARGIN_METHOD_LABELS } from '../../utils/salePricing';
import { createPriceAdjustment, getPriceAdjustmentProductsInfo } from '../../api/priceAdjustments';

// Ajuste de precio de venta (AJP-) para uno o varios productos. Solo cambia
// el precio: costo, stock y contabilidad quedan igual. Por cada producto se
// puede escribir un costo de referencia (por ejemplo, el de una compra que
// todavía no se ha registrado); el sugerido sale del margen y el método del
// negocio, y el precio nuevo lo decide el usuario. También se puede cambiar el
// margen del producto: queda como su margen propio para las próximas compras.
// Backend: services/inventory/priceAdjustment.service.js.

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const pct = (v) => `${v > 0 ? '+' : ''}${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

// El precio nuevo arranca en el actual: nada cambia hasta que el usuario
// escriba un costo de referencia, use el sugerido o escriba el precio.
function toLine(info) {
  return {
    ...info,
    reference_cost: info.default_cost ?? '',
    margin: info.margin_pct ?? '',
    new_price: info.current_price || '',
  };
}

export default function PriceAdjustmentModal({ isOpen, onClose, productIds = [], onSaved }) {
  const [lines, setLines] = useState([]);
  const [method, setMethod] = useState('on_sale');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const addProducts = async (ids) => {
    const fresh = ids.filter((id) => !lines.some((l) => l.id === id));
    if (!fresh.length) return;
    setLoading(true);
    try {
      const res = await getPriceAdjustmentProductsInfo(fresh);
      setMethod(res.data.margin_method);
      setLines((prev) => [...prev, ...res.data.products.filter((p) => !prev.some((l) => l.id === p.id)).map(toLine)]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLines([]);
    setReason('');
    setNotes('');
    setSearch('');
    if (productIds.length) addProducts(productIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const update = (id, patch) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id) => setLines((prev) => prev.filter((l) => l.id !== id));

  const maxMargin = maxMarginFor(method);
  const marginInvalid = (l) => num(l.margin) !== null && !(num(l.margin) >= 0 && num(l.margin) <= maxMargin);
  const marginChanged = (l) => num(l.margin) !== null && (l.margin_pct === null || Math.abs(num(l.margin) - l.margin_pct) >= 0.005);

  const suggestedFor = (l) => {
    const cost = num(l.reference_cost);
    const margin = num(l.margin);
    return cost > 0 && margin > 0 && !marginInvalid(l) ? suggestedSalePrice(cost, margin, l, method) : null;
  };

  // Al cambiar el costo de referencia o el margen, el precio nuevo sigue al sugerido.
  const changeAndSuggest = (l, patch) => {
    const s = suggestedFor({ ...l, ...patch });
    update(l.id, { ...patch, ...(s !== null ? { new_price: s } : {}) });
  };

  const priceChanged = (l) => num(l.new_price) > 0 && Math.abs(num(l.new_price) - l.current_price) >= 0.005;
  const changed = lines.filter((l) => priceChanged(l) || marginChanged(l));
  const invalid = lines.some((l) => !(num(l.new_price) > 0) || marginInvalid(l));
  const canSave = !saving && reason.trim() && changed.length > 0 && !invalid;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await createPriceAdjustment({
        reason: reason.trim(),
        notes: notes.trim() || null,
        items: changed.map((l) => ({
          product_id: l.id,
          new_price: num(l.new_price),
          reference_cost: num(l.reference_cost),
          margin_pct: marginChanged(l) ? num(l.margin) : null,
        })),
      });
      toast.success(res.message || 'Ajuste guardado');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el ajuste');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar precio de venta" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Solo cambia el <strong>precio de venta</strong>: el stock, el costo promedio, el último costo de compra y la contabilidad quedan igual.
          Si el costo real es otro (por ejemplo, una compra que todavía no has registrado), escríbelo en <strong>Costo de referencia</strong> y
          Pitbox sugiere el precio con el margen del producto ({MARGIN_METHOD_LABELS[method]?.toLowerCase()}); también puedes cambiar el margen. El ajuste queda registrado con su número, tu usuario y el motivo.
        </p>

        <div className="max-w-xl">
          <ProductSearchInput
            value={search}
            onChange={setSearch}
            onSelect={(p) => { setSearch(''); addProducts([p.id]); }}
            onClear={() => setSearch('')}
            placeholder="Agregar producto por SKU, código o nombre..."
            show={{ price: true, cost: true }}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border dark:border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-right">Precio actual</th>
                <th className="px-3 py-2 text-right">Costos registrados</th>
                <th className="px-3 py-2 text-right w-36">Costo de referencia</th>
                <th className="px-3 py-2 text-right w-32">Margen</th>
                <th className="px-3 py-2 text-right">Sugerido</th>
                <th className="px-3 py-2 text-right w-36">Precio nuevo</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-gray-500">
                    {loading ? 'Cargando…' : 'Busca y agrega los productos a los que les vas a cambiar el precio.'}
                  </td>
                </tr>
              ) : lines.map((l) => {
                const s = suggestedFor(l);
                const np = num(l.new_price);
                const variation = np > 0 && l.current_price > 0 ? ((np - l.current_price) / l.current_price) * 100 : null;
                return (
                  <tr key={l.id} className="align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{l.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{l.sku}{l.price_includes_tax ? ' · precio con IVA' : ''}</div>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(l.current_price)}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500 whitespace-nowrap">
                      <div>Último: {l.last_purchase_cost > 0 ? formatCurrency(l.last_purchase_cost) : '—'}</div>
                      <div>Promedio: {l.average_cost > 0 ? formatCurrency(l.average_cost) : '—'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <NumericInput value={l.reference_cost} onChange={(e) => changeAndSuggest(l, { reference_cost: e.target.value })} decimals={2} className={inputCls} placeholder="Sin costo" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <NumericInput value={l.margin} onChange={(e) => changeAndSuggest(l, { margin: e.target.value })} decimals={2} className={inputCls} placeholder="Sin margen" />
                        <span className="text-gray-500">%</span>
                      </div>
                      {marginInvalid(l) ? (
                        <div className="mt-0.5 text-right text-xs text-red-600">Entre 0 y {maxMargin.toLocaleString('es-CO')} %</div>
                      ) : marginChanged(l) && (
                        <div className="mt-0.5 text-right text-xs text-amber-700">
                          Antes {l.margin_pct === null ? 'sin margen' : `${l.margin_pct.toLocaleString('es-CO')} %`}
                          {l.margin_inherited && ' · deja de seguir la categoría'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {s !== null ? (
                        <button type="button" className="text-blue-600 hover:text-blue-800" title="Usar el sugerido" onClick={() => update(l.id, { new_price: s })}>
                          {formatCurrency(s)}
                        </button>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <NumericInput value={l.new_price} onChange={(e) => update(l.id, { new_price: e.target.value })} decimals={2} className={inputCls} />
                      {variation !== null && Math.abs(variation) >= 0.05 && (
                        <div className={`mt-0.5 text-right text-xs ${variation > 0 ? 'text-green-700' : 'text-red-700'}`}>{pct(variation)}</div>
                      )}
                      {!(np > 0) && <div className="mt-0.5 text-right text-xs text-red-600">Mayor a 0</div>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove(l.id)} className="text-gray-400 hover:text-red-600" title="Quitar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo *</label>
            <input
              type="text" maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Ej.: compra FV-1234 de Auteco a $12.000, aún sin registrar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
            <input
              type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 dark:border-white/10">
          <p className="text-sm text-gray-500">
            {changed.length} de {lines.length} producto(s) cambian de precio o margen
            {lines.length > changed.length && changed.length > 0 && ' (los que quedan igual no se incluyen)'}
            {changed.some(marginChanged) && <span className="block text-xs text-amber-700">El margen nuevo queda guardado en el producto y se usa en las próximas compras.</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:bg-graphite">
              Cancelar
            </button>
            <button type="button" disabled={!canSave} onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar ajuste'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
