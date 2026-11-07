// frontend/src/components/inventory/KardexRecalcModal.jsx
//
// Recalcular el costo promedio ponderado en orden de fecha (movimientos con
// fecha atrasada). Primero muestra qué cambia; al aplicar corrige el costo de
// las salidas y genera el asiento de ajuste por mes. Backend:
// services/inventory/kardexRecalc.service.js.
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import ProductSearchInput from '../common/ProductSearchInput';
import { movementsAPI } from '../../api/movements';
import { formatCurrency } from '../../utils/formatters';
import { getMovementReasonLabel } from '../../constants/movementReasons';

const ACCOUNT_LABELS = {
  sale_cogs_product: 'Costo de ventas',
  internal_consumption_expense: 'Consumo interno',
  inventory_adjustment_shortage: 'Faltantes de inventario',
};
const firstOfMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

export default function KardexRecalcModal({ isOpen, onClose, onApplied }) {
  const [from, setFrom] = useState(firstOfMonth());
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');

  const close = () => { setPreview(null); setResult(null); setProduct(null); setSearch(''); onClose(); };
  const params = () => (product ? { product_id: product.id } : { from });

  const run = async (dryRun) => {
    setBusy(dryRun ? 'preview' : 'apply');
    try {
      const r = await movementsAPI.recalculateKardex({ ...params(), dry_run: dryRun });
      if (dryRun) setPreview(r.data);
      else { setResult(r.data); toast.success('Costos recalculados'); onApplied?.(); }
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo recalcular');
    } finally {
      setBusy('');
    }
  };

  const data = result || preview;
  return (
    <Modal isOpen={isOpen} onClose={close} title="Recalcular costos (kardex)" size="lg">
      <div className="space-y-4 text-sm">
        {!result && (
          <>
            <p className="text-gray-600">
              Si registraste una compra o un ajuste con fecha atrasada, las salidas de esos días quedaron con el costo anterior.
              Esto recorre los movimientos en orden de fecha, recalcula el costo promedio ponderado y corrige el costo de cada salida.
              Primero ves qué cambia; al aplicar se genera el asiento de ajuste por mes.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Productos con movimientos desde</label>
                <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreview(null); }} disabled={Boolean(product)} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">O un solo producto</label>
                <ProductSearchInput
                  value={search}
                  onChange={setSearch}
                  onSelect={(p) => { setProduct(p); setSearch(`${p.sku} — ${p.name}`); setPreview(null); }}
                  onClear={() => { setProduct(null); setSearch(''); setPreview(null); }}
                  hasSelection={Boolean(product)}
                  show={{ stock: true, cost: true }}
                />
              </div>
            </div>
          </>
        )}

        {data && (
          <div className="space-y-3">
            <p className="font-medium text-gray-900">
              {result ? 'Recálculo aplicado' : 'Vista previa (todavía no se ha cambiado nada)'}: {data.totals.products} producto(s), {data.totals.changed} movimiento(s) con otro costo,
              diferencia en resultados {formatCurrency(data.totals.cost_difference)}.
            </p>
            {data.totals.locked > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                {data.totals.locked} movimiento(s) de períodos contables cerrados no se modifican: esos meses ya fueron revisados.
                El costo nuevo solo se aplica a movimientos de períodos abiertos.
              </p>
            )}
            {data.products.length === 0 && <p className="text-green-700">Los costos están al día: no hay nada que corregir.</p>}
            {data.products.length > 0 && (
              <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr><th className="px-2 py-1.5 text-left">Producto</th><th className="px-2 py-1.5 text-left">Movimientos que cambian</th><th className="px-2 py-1.5 text-right">Promedio</th><th className="px-2 py-1.5 text-right">Diferencia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.products.map((p) => (
                      <tr key={p.product.id} className="align-top">
                        <td className="px-2 py-1.5"><p className="font-medium">{p.product.name}</p><p className="text-gray-500">{p.product.sku}</p></td>
                        <td className="px-2 py-1.5">
                          {p.changes.map((c) => (
                            <p key={c.movement_number}>
                              {c.movement_number} · {new Date(c.date).toLocaleDateString('es-CO')} · {getMovementReasonLabel(c.type)} · {Number(c.quantity).toLocaleString('es-CO')} × {formatCurrency(c.old_cost)} → <strong>{formatCurrency(c.new_cost)}</strong>
                              {!c.accounted && <span className="text-gray-500"> (sin asiento: bodega de obra o tipo sin cuenta)</span>}
                            </p>
                          ))}
                          {p.movements_changed > p.changes.length && <p className="text-gray-500">y {p.movements_changed - p.changes.length} más</p>}
                          {(p.locked || []).map((c) => (
                            <p key={`l-${c.movement_number}`} className="text-gray-400">
                              {c.movement_number} · {new Date(c.date).toLocaleDateString('es-CO')} · {getMovementReasonLabel(c.type)} · período cerrado: queda en {formatCurrency(c.old_cost)}
                            </p>
                          ))}
                        </td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatCurrency(p.average_before)} → {formatCurrency(p.average_after)}</td>
                        <td className={`px-2 py-1.5 text-right whitespace-nowrap ${p.cost_difference > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(p.cost_difference)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.entries?.length > 0 && !result && (
              <div className="text-xs text-gray-700">
                <p className="font-medium">Asientos de ajuste que se generarán:</p>
                {data.entries.map((e) => (
                  <p key={`${e.month}-${e.account_key}`}>{e.month} · {ACCOUNT_LABELS[e.account_key] || e.account_key}: {e.amount > 0 ? 'más gasto' : 'menos gasto'} de {formatCurrency(Math.abs(e.amount))} contra inventario</p>
                ))}
                <p className="text-gray-500 mt-1">Cada asiento queda en su mes; si el período está cerrado, se registra hoy con la nota del mes.</p>
              </div>
            )}
            {result?.journal_entries?.length > 0 && (
              <div className="text-xs text-gray-700">
                {result.journal_entries.map((e) => <p key={e.entry_number}>Asiento {e.entry_number} del {e.date} ({e.month}): {formatCurrency(e.amount)}</p>)}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
          <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">{result ? 'Cerrar' : 'Cancelar'}</button>
          {!result && (preview && preview.totals.changed > 0 ? (
            <button type="button" onClick={() => run(false)} disabled={Boolean(busy)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
              {busy === 'apply' ? 'Aplicando…' : 'Aplicar recálculo'}
            </button>
          ) : (
            <button type="button" onClick={() => run(true)} disabled={Boolean(busy) || (!product && !from)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {busy === 'preview' ? 'Revisando…' : 'Ver qué cambia'}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
