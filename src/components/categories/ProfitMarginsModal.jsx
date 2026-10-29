import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { productsAPI } from '../../api/products';
import { formatCurrency } from '../../utils/formatters';
import { MAX_MARGIN } from '../../utils/salePricing';

// Márgenes de ganancia por categoría y global (backend:
// services/inventory/productMargin.service.js). Cambiar un margen solo afecta
// a los productos que lo heredan; "forzar" hace que los de margen propio
// también pasen a heredarlo. Siempre con vista previa antes de aplicar.

const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`);

const ACTION_LABELS = {
  sube: { text: 'Sube', cls: 'text-green-700 dark:text-green-400' },
  baja: { text: 'Baja', cls: 'text-red-700 dark:text-red-400' },
  se_conserva: { text: 'Bajaría: se conserva', cls: 'text-amber-700 dark:text-amber-400' },
  igual: { text: 'Igual', cls: 'text-gray-500' },
  sin_costo: { text: 'Sin costo', cls: 'text-gray-500' },
  margen: { text: 'Solo margen', cls: 'text-gray-500' },
};

// Categorías en orden de árbol (padre y luego sus hijas), con su profundidad.
function treeOrder(categories) {
  const byParent = new Map();
  const ids = new Set(categories.map((c) => c.id));
  for (const c of categories) {
    const key = c.parent_id && ids.has(c.parent_id) ? c.parent_id : null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  }
  const out = [];
  const seen = new Set();
  const walk = (parentId, depth) => {
    for (const c of byParent.get(parentId) || []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const c of categories) if (!seen.has(c.id)) out.push({ ...c, depth: 0 });
  return out;
}

function ProfitMarginsModal({ isOpen, onClose, initialTarget = null, onApplied }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(null); // { scope, category_id, name, current }
  const [form, setForm] = useState({ margin: '', force: false, recalc_prices: true, allow_decrease: false });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getMargins();
      setOverview(res.data);
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar los márgenes');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openTarget = (data, scope, categoryId = null) => {
    if (!data) return;
    const cat = categoryId ? data.categories.find((c) => c.id === categoryId) : null;
    if (scope === 'category' && !cat) return;
    const current = scope === 'global' ? data.global_margin : cat.own_margin;
    setTarget({ scope, category_id: categoryId, name: scope === 'global' ? 'Margen global' : cat.name, current, cat });
    setForm({ margin: current ?? '', force: false, recalc_prices: true, allow_decrease: false });
    setPreview(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setTarget(null);
    setPreview(null);
    load().then((data) => {
      if (initialTarget) openTarget(data, initialTarget.scope, initialTarget.category_id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const ordered = useMemo(() => treeOrder(overview?.categories || []), [overview]);

  const params = () => ({
    scope: target.scope,
    category_id: target.category_id,
    margin: form.margin === '' ? null : parseFloat(form.margin),
    force: form.force,
    recalc_prices: form.recalc_prices,
    allow_decrease: form.recalc_prices && form.allow_decrease,
  });

  const marginInvalid = form.margin !== '' && !(parseFloat(form.margin) >= 0 && parseFloat(form.margin) <= MAX_MARGIN);

  const changeForm = (patch) => { setForm((f) => ({ ...f, ...patch })); setPreview(null); };

  const handlePreview = async () => {
    if (marginInvalid) return;
    setBusy(true);
    try {
      const res = await productsAPI.previewMargin(params());
      setPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al calcular la vista previa');
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    const s = preview.stats;
    const priceChanges = s.price_up + s.price_down;
    if (!window.confirm(
      `¿Aplicar ${form.margin === '' ? 'herencia' : `margen de ${pct(form.margin)}`} a "${target.name}"?\n\n`
      + `${preview.affected} producto(s) afectado(s)`
      + (priceChanges ? `, ${priceChanges} cambian de precio` : '')
      + '.'
    )) return;
    setBusy(true);
    try {
      const res = await productsAPI.applyMargin(params());
      const r = res.data;
      toast.success(`Margen aplicado: ${r.margins_synced} margen(es) y ${r.prices_updated} precio(s) actualizados`);
      setTarget(null);
      setPreview(null);
      await load();
      onApplied?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aplicar el margen');
    } finally {
      setBusy(false);
    }
  };

  const inheritsFromText = (c) => {
    if (c.source === 'own') return null;
    if (c.source === 'parent') return `de ${c.source_name}`;
    return 'global';
  };

  const inputCls = 'w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100';
  const btnSecondary = 'px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:bg-graphite dark:hover:bg-white/5 disabled:opacity-50';
  const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Márgenes de ganancia" size="xl">
      {loading && !overview ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
        </div>
      ) : !target ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            El margen es sobre el precio de venta. Cada producto usa su margen propio o hereda el de su categoría;
            una categoría sin margen hereda el de su categoría padre y, al final, el margen global.
            Cambiar un margen solo afecta a los productos que lo heredan.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800/40 dark:bg-purple-900/20">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Margen global</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{pct(overview?.global_margin)}</p>
              <p className="text-xs text-gray-500">
                Para categorías sin margen y productos sin categoría
                ({overview?.uncategorized_products.inherited ?? 0} sin categoría heredan, {overview?.uncategorized_products.own ?? 0} con margen propio)
              </p>
            </div>
            <button type="button" className={btnPrimary} onClick={() => openTarget(overview, 'global')}>Cambiar</button>
          </div>

          <div className="overflow-x-auto rounded-lg border dark:border-white/10">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2 text-right">Margen propio</th>
                  <th className="px-4 py-2 text-right">Margen que aplica</th>
                  <th className="px-4 py-2 text-right">Productos que heredan</th>
                  <th className="px-4 py-2 text-right">Con margen propio</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {ordered.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">No hay categorías</td></tr>
                ) : ordered.map((c) => (
                  <tr key={c.id} className={c.is_active ? '' : 'opacity-60'}>
                    <td className="px-4 py-2" style={{ paddingLeft: `${1 + c.depth * 1.25}rem` }}>
                      {c.depth > 0 && <span className="text-gray-400">└ </span>}{c.name}
                      {!c.is_active && <span className="ml-2 text-xs text-gray-400">(inactiva)</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{c.own_margin === null ? <span className="text-gray-400">hereda</span> : pct(c.own_margin)}</td>
                    <td className="px-4 py-2 text-right">
                      {pct(c.effective_margin)}
                      {inheritsFromText(c) && <span className="ml-1 text-xs text-gray-400">({inheritsFromText(c)})</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{c.products.inherited}</td>
                    <td className="px-4 py-2 text-right">{c.products.own}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-800" onClick={() => openTarget(overview, 'category', c.id)}>
                        Cambiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" className="text-sm text-blue-600 hover:text-blue-800" onClick={() => { setTarget(null); setPreview(null); }}>
            ← Volver a todos los márgenes
          </button>

          <div>
            <h4 className="text-lg font-semibold">{target.scope === 'global' ? 'Margen global' : `Categoría: ${target.name}`}</h4>
            <p className="text-sm text-gray-500">
              Margen actual: {target.current === null || target.current === undefined
                ? (target.scope === 'global' ? 'sin margen global' : `hereda (${pct(target.cat?.effective_margin)})`)
                : pct(target.current)}
              {target.scope === 'category' && ' · también aplica a sus subcategorías que no tengan margen propio'}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nuevo margen sobre la venta</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max={MAX_MARGIN} step="0.01" onWheel={(e) => e.target.blur()}
                  value={form.margin}
                  onChange={(e) => changeForm({ margin: e.target.value })}
                  placeholder={target.scope === 'global' ? 'Sin margen' : 'Hereda'}
                  className={inputCls}
                />
                <span className="text-gray-500">%</span>
              </div>
              {marginInvalid && <p className="mt-1 text-xs text-red-600">Debe estar entre 0 y 99,99 %.</p>}
              <p className="mt-1 text-xs text-gray-400">
                {target.scope === 'global' ? 'Vacío = sin margen global.' : 'Vacío = la categoría vuelve a heredar de su padre o del global.'}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={form.force} onChange={(e) => changeForm({ force: e.target.checked })} />
                <span>
                  Aplicar también a los productos con margen propio
                  <span className="block text-xs text-gray-500">Dejan su margen propio y pasan a seguir este margen.</span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={form.recalc_prices} onChange={(e) => changeForm({ recalc_prices: e.target.checked })} />
                <span>
                  Recalcular el precio de venta
                  <span className="block text-xs text-gray-500">Sobre el último costo de compra (o el costo promedio si nunca se ha comprado).</span>
                </span>
              </label>
              {form.recalc_prices && (
                <label className="ml-6 flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5" checked={form.allow_decrease} onChange={(e) => changeForm({ allow_decrease: e.target.checked })} />
                  <span>
                    Permitir que el precio baje
                    <span className="block text-xs text-gray-500">Sin marcar, los precios que bajarían se conservan, igual que al recibir compras.</span>
                  </span>
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" className={btnSecondary} disabled={busy || marginInvalid} onClick={handlePreview}>
              {busy && !preview ? 'Calculando…' : 'Vista previa'}
            </button>
            {preview && (
              <button type="button" className={btnPrimary} disabled={busy || preview.affected === 0} onClick={handleApply}>
                {busy ? 'Aplicando…' : 'Aplicar'}
              </button>
            )}
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Productos afectados" value={preview.affected} />
                <Stat label="Heredan" value={preview.stats.inherited} />
                <Stat label={form.force ? 'Con margen propio (forzados)' : 'Con margen propio (no cambian)'} value={form.force ? preview.stats.forced : preview.stats.own_kept} />
                <Stat label="Cambian de margen" value={preview.stats.margin_changes} />
                {form.recalc_prices && (
                  <>
                    <Stat label="Precio sube" value={preview.stats.price_up} tone="green" />
                    <Stat label={form.allow_decrease ? 'Precio baja' : 'Bajaría: se conserva'} value={form.allow_decrease ? preview.stats.price_down : preview.stats.price_held} tone={form.allow_decrease ? 'red' : 'amber'} />
                    <Stat label="Precio igual" value={preview.stats.price_same} />
                    <Stat label="Sin costo (no se recalcula)" value={preview.stats.no_cost} />
                  </>
                )}
              </div>

              {preview.affected === 0 ? (
                <p className="text-sm text-gray-500">Ningún producto cambia. {preview.stats.own_kept > 0 && !form.force && 'Los productos de esta categoría tienen margen propio: marca "Aplicar también a los productos con margen propio" para incluirlos.'}</p>
              ) : (
                <>
                  {preview.affected > preview.rows.length && (
                    <p className="text-xs text-gray-500">Se muestran los {preview.rows.length} con mayor cambio de precio de {preview.affected}.</p>
                  )}
                  <div className="max-h-96 overflow-auto rounded-lg border dark:border-white/10">
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-graphite-2">
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                          <th className="px-3 py-2">Código</th>
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2 text-right">Margen</th>
                          <th className="px-3 py-2 text-right">Costo</th>
                          <th className="px-3 py-2 text-right">Precio actual</th>
                          <th className="px-3 py-2 text-right">Precio nuevo</th>
                          <th className="px-3 py-2">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {preview.rows.map((r) => {
                          const action = ACTION_LABELS[r.action] || ACTION_LABELS.margen;
                          return (
                            <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                              <td className="px-3 py-1.5 whitespace-nowrap">{r.sku}</td>
                              <td className="px-3 py-1.5">{r.name}{r.forced && <span className="ml-1 text-xs text-purple-600">(tenía margen propio)</span>}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{pct(r.old_margin)} → {pct(r.new_margin)}</td>
                              <td className="px-3 py-1.5 text-right">{r.cost > 0 ? formatCurrency(r.cost, { decimals: 2 }) : '—'}</td>
                              <td className="px-3 py-1.5 text-right">{formatCurrency(r.current_price, { decimals: 2 })}</td>
                              <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(r.final_price, { decimals: 2 })}</td>
                              <td className={`px-3 py-1.5 whitespace-nowrap ${action.cls}`}>{action.text}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, tone }) {
  const toneCls = { green: 'text-green-700 dark:text-green-400', red: 'text-red-700 dark:text-red-400', amber: 'text-amber-700 dark:text-amber-400' }[tone] || 'text-gray-900 dark:text-gray-100';
  return (
    <div className="rounded-lg border p-3 dark:border-white/10">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

export default ProfitMarginsModal;
