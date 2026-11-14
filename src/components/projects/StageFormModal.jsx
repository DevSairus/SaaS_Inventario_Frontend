import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import Modal from '../common/Modal';
import { createProjectStage, updateProjectStage } from '../../api/projects';
import { qty } from './projectConstants';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';

/**
 * Crear o editar una etapa y repartir en ella cantidades de la lista de materiales.
 * Por línea se puede asignar hasta lo que aún no está en otras etapas.
 *
 * stage: etapa a editar (de GET /stages) o null para crear.
 * unassigned: líneas del BOM con cantidad sin asignar (de GET /stages).
 */
export default function StageFormModal({ isOpen, onClose, project, stage, unassigned, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState('');
  const [onlyAssigned, setOnlyAssigned] = useState(false);
  const [busy, setBusy] = useState(false);

  // Una fila por línea asignable: las que ya están en la etapa + las que aún tienen saldo sin asignar.
  const rows = useMemo(() => {
    const byId = new Map();
    (stage?.items || []).forEach((i) => byId.set(i.bom_item_id, {
      id: i.bom_item_id, line_no: i.line_no, description: i.description, unit: i.unit,
      max: i.qty_planned, min: i.qty_dispatched, // max se completa abajo con lo no asignado
    }));
    (unassigned || []).forEach((u) => {
      const cur = byId.get(u.bom_item_id);
      if (cur) cur.max = Math.round((cur.max + u.qty_unassigned) * 10000) / 10000;
      else byId.set(u.bom_item_id, { id: u.bom_item_id, line_no: u.line_no, description: u.description, unit: u.unit, max: u.qty_unassigned, min: 0 });
    });
    return [...byId.values()].sort((a, b) => a.line_no - b.line_no);
  }, [stage, unassigned]);

  useEffect(() => {
    if (!isOpen) return;
    setName(stage?.name || '');
    setDescription(stage?.description || '');
    setPlannedDate(stage?.planned_date || '');
    setQuantities(Object.fromEntries((stage?.items || []).map((i) => [i.bom_item_id, String(i.qty_planned)])));
    setSearch(''); setOnlyAssigned(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stage?.id]);

  const items = rows
    .map((r) => ({ item_id: r.id, qty_planned: Number(quantities[r.id]) || 0 }))
    .filter((i) => i.qty_planned > 0);

  const visible = rows.filter((r) => {
    if (onlyAssigned && !(Number(quantities[r.id]) > 0)) return false;
    const q = search.trim().toLowerCase();
    return !q || `${r.line_no} ${r.description}`.toLowerCase().includes(q);
  });

  const submit = async () => {
    if (!name.trim()) { toast('Ponle un nombre a la etapa'); return; }
    for (const r of rows) {
      const v = Number(quantities[r.id]) || 0;
      if (v > r.max + 0.00005) { toast.error(`Línea ${r.line_no}: máximo ${qty(r.max)}`); return; }
      if (v > 0 && v < r.min - 0.00005) { toast.error(`Línea ${r.line_no}: ya se despachó ${qty(r.min)}, no puede planearse menos`); return; }
      if (v === 0 && r.min > 0) { toast.error(`Línea ${r.line_no}: ya tiene despachos en esta etapa, no puede quitarse`); return; }
    }
    setBusy(true);
    try {
      const body = { name: name.trim(), description: description.trim(), planned_date: plannedDate || null, items };
      const res = stage ? await updateProjectStage(project.id, stage.id, body) : await createProjectStage(project.id, body);
      toast.success(res.message);
      onSaved?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la etapa');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={stage ? `Editar etapa ${stage.stage_no}` : 'Nueva etapa'} size="lg">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="Ej. Cimentación" className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha prevista <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción <span className="font-normal text-gray-400">(opcional)</span></label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium">Materiales de la etapa <span className="font-normal text-gray-500">· {items.length} línea(s)</span></p>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" checked={onlyAssigned} onChange={(e) => setOnlyAssigned(e.target.checked)} /> Solo asignadas</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar línea" className="pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 w-44" />
              </div>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
              No hay materiales por asignar. Carga la lista de materiales en la pestaña Materiales (o quedan todas las cantidades repartidas en otras etapas).
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[40vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Por asignar</th>
                    <th className="px-3 py-2 text-right">En esta etapa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-400">{r.line_no}</td>
                      <td className="px-3 py-2">{r.description}{r.min > 0 && <span className="ml-2 text-xs text-amber-700">despachado {qty(r.min)}</span>}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setQuantities((q) => ({ ...q, [r.id]: String(r.max) }))} className="text-orange-700 hover:underline" title="Asignar todo a esta etapa">
                          {qty(r.max)} {r.unit && <span className="text-xs text-gray-500">{r.unit}</span>}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number" min={r.min || 0} max={r.max} step="any"
                          value={quantities[r.id] ?? ''}
                          onChange={(e) => setQuantities((q) => ({ ...q, [r.id]: e.target.value }))}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right bg-white dark:bg-gray-800"
                        />
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Ninguna línea coincide.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Toca la cantidad "Por asignar" para llevar todo a esta etapa. Lo que no se asigne queda libre para otras etapas.</p>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Guardando...' : stage ? 'Guardar cambios' : 'Crear etapa'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
