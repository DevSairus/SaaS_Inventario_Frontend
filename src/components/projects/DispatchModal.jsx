import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import SignatureField from '../tools/SignatureField';
import { warehousesService } from '../../api/warehouses';
import { dispatchProjectBom, getProjectStages } from '../../api/projects';
import { qty, DISPATCH_ROLES } from './projectConstants';

// Líneas despachables: con producto de inventario y algo pendiente. Con etapa, solo las
// de la etapa y hasta su saldo (lo mismo que valida el backend).
function buildCandidates(lines, stage) {
  const saldo = stage ? new Map(stage.items.map((i) => [i.bom_item_id, i.qty_pending])) : null;
  return lines
    .filter((l) => l.product_id && l.product?.track_inventory !== false && (!saldo || saldo.has(l.id)))
    .map((l) => ({ line: l, max: Math.min(l.qty_required - l.qty_delivered, saldo ? saldo.get(l.id) : Infinity) }))
    .filter((c) => c.max > 0);
}
const defaultQty = (c) => (c.line.qty_reserved > 0 ? String(Math.min(c.line.qty_reserved, c.max)) : '');

/**
 * Despacho de materiales a la bodega de la obra. Con etapa (opcional) solo se
 * despacha lo planeado en ella. Deja un acta DSP-xxxxxx; las firmas (almacén,
 * transportador, encargado de obra) se pueden tomar aquí o después desde Etapas.
 */
export default function DispatchModal({ isOpen, onClose, project, lines, initialStageId = '', onDone }) {
  const [warehouses, setWarehouses] = useState([]);
  const [stages, setStages] = useState([]);
  const [from, setFrom] = useState('');
  const [stageId, setStageId] = useState('');
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [sigs, setSigs] = useState({});
  const [busy, setBusy] = useState(false);

  const stage = useMemo(() => stages.find((s) => s.id === stageId) || null, [stages, stageId]);
  const candidates = useMemo(() => buildCandidates(lines, stage), [lines, stage]);

  useEffect(() => {
    if (!isOpen) return;
    setNotes(''); setSigs({}); setStageId(initialStageId || '');
    warehousesService.getAll().then((r) => {
      const list = (r.data || []).filter((w) => w.id !== project.warehouse_id && !w.project_id);
      setWarehouses(list);
      setFrom((prev) => prev || list.find((w) => w.is_main)?.id || list[0]?.id || '');
    }).catch(() => setWarehouses([]));
    getProjectStages(project.id)
      .then((r) => setStages((r.data?.stages || []).filter((s) => s.status === 'open' && s.totals.pending > 0)))
      .catch(() => setStages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cantidades sugeridas: lo reservado, sin pasarse de lo que falta (o del saldo de la etapa).
  useEffect(() => {
    if (!isOpen) return;
    setQuantities(Object.fromEntries(candidates.map((c) => [c.line.id, defaultQty(c)])));
  }, [isOpen, candidates]);

  const items = candidates
    .map((c) => ({ item_id: c.line.id, quantity: Number(quantities[c.line.id]) || 0 }))
    .filter((i) => i.quantity > 0);
  const signed = Object.values(sigs).filter((s) => s?.signature).length;

  const submit = async () => {
    if (!from) { toast('Elige la bodega de origen'); return; }
    if (!items.length) { toast('Indica al menos una cantidad'); return; }
    setBusy(true);
    try {
      const payload = {
        from_warehouse_id: from,
        items,
        ...(stageId ? { stage_id: stageId } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        signatures: Object.entries(sigs).filter(([, v]) => v?.signature)
          .map(([role, v]) => ({ role, name: v.name, document: v.document, signature: v.signature })),
      };
      const res = await dispatchProjectBom(project.id, payload);
      toast.success(`${res.message}${res.data?.dispatch_no ? ` · Acta ${res.data.dispatch_no}` : ''}`);
      onDone?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo despachar');
    } finally {
      setBusy(false);
    }
  };

  const selectCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Despachar materiales a la obra" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Se crea un traslado <strong>en tránsito</strong> hacia la bodega del proyecto y un <strong>acta de despacho</strong>. Cuando el material llegue, recíbelo desde Traslados:
          a partir de ahí cuenta como costo de materiales de la obra.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Bodega de origen</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}{w.branch?.name ? ` · ${w.branch.name}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Etapa</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={selectCls}>
              <option value="">Sin etapa (todo el BOM)</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.stage_no} · {s.name} (faltan {qty(s.totals.pending)})</option>)}
            </select>
          </div>
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm text-gray-500">{stage ? 'Esta etapa no tiene líneas pendientes de despacho.' : 'No hay líneas pendientes de despacho.'}</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[40vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">{stage ? 'Saldo etapa' : 'Pendiente'}</th>
                  <th className="px-3 py-2 text-right">Reservado</th>
                  <th className="px-3 py-2 text-right">A despachar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {candidates.map(({ line: l, max }) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.product?.name} <span className="text-xs text-gray-500">{l.product?.sku}</span></td>
                    <td className="px-3 py-2 text-right">{qty(max)}</td>
                    <td className="px-3 py-2 text-right">{qty(l.qty_reserved)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" min="0" step="any" max={max}
                        value={quantities[l.id] ?? ''}
                        onChange={(e) => setQuantities((q) => ({ ...q, [l.id]: e.target.value }))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right bg-white dark:bg-gray-800"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className={labelCls}>Notas del acta <span className="font-normal text-gray-400">(opcional)</span></label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Ej. Entrega en portería, camión placa XYZ" className={selectCls} />
        </div>

        <details className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Firmas del acta <span className="font-normal text-gray-400">(opcional{signed ? ` · ${signed} tomada(s)` : ''}; puedes completarlas después desde Etapas)</span>
          </summary>
          <div className="grid gap-3 sm:grid-cols-3 mt-3">
            {DISPATCH_ROLES.map(([role, label, action]) => (
              <SignatureField
                key={role} label={label} role={action} askDocument
                value={sigs[role] || null}
                onChange={(v) => setSigs((s) => ({ ...s, [role]: v }))}
              />
            ))}
          </div>
        </details>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={submit} disabled={busy || !items.length} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Despachando...' : `Despachar ${items.length} línea(s)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
