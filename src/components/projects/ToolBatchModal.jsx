import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import Modal from '../common/Modal';
import SignatureField from '../tools/SignatureField';
import { getTools, getToolResponsibles, createToolBatch } from '../../api/tools';
import { getProjectStages } from '../../api/projects';
import { BATCH_ROLES } from './projectConstants';
import { inputCls, todayLocal, CONDITIONS } from '../tools/toolConstants';

const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;
const cellInput = 'px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800';

/**
 * Checklist masivo de herramientas de una obra: entrega (kind 'delivery', herramientas
 * disponibles en bodega) o devolución (kind 'return', entregas activas del proyecto),
 * en un solo paso y dentro de una etapa opcional. Todo el lote se registra o ninguno.
 * Las firmas de almacén, transportador y encargado de obra se pueden tomar aquí o después.
 *
 * rows: entregas del proyecto (GET /tools/project/:id) — para la devolución.
 */
export default function ToolBatchModal({ isOpen, onClose, project, kind, rows = [], onDone }) {
  const isReturn = kind === 'return';
  const [stages, setStages] = useState([]);
  const [stageId, setStageId] = useState('');
  const [available, setAvailable] = useState([]);
  const [people, setPeople] = useState({ employees: [], users: [] });
  const [responsible, setResponsible] = useState('');
  const [otherName, setOtherName] = useState('');
  const [otherDoc, setOtherDoc] = useState('');
  const [batchDate, setBatchDate] = useState(todayLocal());
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [sel, setSel] = useState({});       // id → { quantity, condition, lost, notes } (solo las marcadas)
  const [search, setSearch] = useState('');
  const [sigs, setSigs] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStageId(''); setResponsible(''); setOtherName(''); setOtherDoc(''); setBatchDate(todayLocal());
    setExpectedReturn(''); setNotes(''); setSel({}); setSearch(''); setSigs({});
    getProjectStages(project.id)
      .then((r) => setStages((r.data?.stages || []).filter((s) => isReturn || s.status === 'open')))
      .catch(() => setStages([]));
    if (isReturn) return;
    getTools({ state: 'available' }).then((r) => setAvailable(r.data?.tools || [])).catch(() => setAvailable([]));
    getToolResponsibles().then((r) => setPeople(r.data || { employees: [], users: [] })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kind]);

  // Filas del checklist: herramientas disponibles (entrega) o entregas activas (devolución).
  const list = useMemo(() => {
    const base = isReturn
      ? rows.filter((r) => r.status === 'active').map((r) => ({
        id: r.id, code: r.tool.code, name: r.tool.name, serial: r.tool.serial_number, tracking: r.tool.tracking,
        quantity: r.quantity, extra: `${r.responsible_name} · ${r.number}`,
      }))
      : available.map((t) => ({
        id: t.id, code: t.code, name: t.name, serial: t.serial_number, tracking: t.tracking,
        quantity: t.available_quantity, extra: t.category || '',
      }));
    const q = search.trim().toLowerCase();
    return q ? base.filter((r) => `${r.code} ${r.name} ${r.serial || ''} ${r.extra}`.toLowerCase().includes(q)) : base;
  }, [isReturn, rows, available, search]);

  const toggle = (r) => setSel((s) => {
    const next = { ...s };
    if (next[r.id]) delete next[r.id];
    else next[r.id] = { quantity: isReturn ? r.quantity : 1, condition: 'good', lost: 0, notes: '' };
    return next;
  });
  const patch = (id, p) => setSel((s) => ({ ...s, [id]: { ...s[id], ...p } }));
  const allVisibleOn = list.length > 0 && list.every((r) => sel[r.id]);
  const toggleAll = () => setSel((s) => {
    const next = { ...s };
    list.forEach((r) => { if (allVisibleOn) delete next[r.id]; else if (!next[r.id]) next[r.id] = { quantity: isReturn ? r.quantity : 1, condition: 'good', lost: 0, notes: '' }; });
    return next;
  });

  const count = Object.keys(sel).length;
  const signed = Object.values(sigs).filter((s) => s?.signature).length;
  const roles = BATCH_ROLES[kind];

  const submit = async () => {
    const [rk, rid] = (responsible || '').split(':');
    if (!isReturn) {
      if (!responsible || (rk === 'other' && !otherName.trim())) { toast('Indica quién recibe en obra'); return; }
    }
    if (!count) { toast('Marca al menos una herramienta'); return; }
    const byId = new Map(list.concat(isReturn ? [] : available.map((t) => ({ id: t.id, code: t.code, name: t.name }))).map((r) => [r.id, r]));
    const items = [];
    for (const [id, v] of Object.entries(sel)) {
      const r = byId.get(id) || {};
      if (isReturn) {
        const lost = v.condition === 'lost' ? 0 : Number(v.lost) || 0;
        if ((v.condition !== 'good' || lost > 0) && !v.notes.trim()) { toast.error(`${r.code || ''} ${r.name || ''}: describe el daño o la pérdida`); return; }
        items.push({ assignment_id: id, return_condition: v.condition, lost_quantity: lost, return_notes: v.notes.trim() || undefined });
      } else {
        items.push({ tool_id: id, quantity: Number(v.quantity) || 1, delivery_condition: v.condition, delivery_notes: v.notes.trim() || undefined });
      }
    }
    setBusy(true);
    try {
      const res = await createToolBatch(project.id, {
        kind, stage_id: stageId || undefined, batch_date: batchDate, notes: notes.trim() || undefined, items,
        ...(isReturn ? {} : {
          employee_id: rk === 'employee' ? rid : undefined,
          user_id: rk === 'user' ? rid : undefined,
          responsible_name: rk === 'other' ? otherName.trim() : undefined,
          responsible_document: rk === 'other' ? (otherDoc.trim() || undefined) : undefined,
          expected_return_date: expectedReturn || undefined,
        }),
        signatures: Object.entries(sigs).filter(([, v]) => v?.signature)
          .map(([role, v]) => ({ role, name: v.name, document: v.document, signature: v.signature })),
      });
      toast.success(res.message);
      onDone?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar el lote');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isReturn ? 'Devolución de herramientas por lote' : 'Entrega de herramientas por lote'} size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {isReturn
            ? 'Marca las herramientas que regresan de la obra y su estado. Se genera una sola acta del lote; si alguna falla, no se registra ninguna.'
            : 'Marca las herramientas que salen hacia la obra. Se genera una sola acta del lote; si alguna falla (ya asignada, en mantenimiento…), no se registra ninguna.'}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Etapa <span className="font-normal text-gray-400">(opcional)</span></Label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputCls}>
              <option value="">Sin etapa</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.stage_no} · {s.name}{s.status === 'closed' ? ' (cerrada)' : ''}</option>)}
            </select>
          </div>
          <div>
            <Label>Fecha</Label>
            <input type="date" value={batchDate} max={todayLocal()} onChange={(e) => setBatchDate(e.target.value)} className={inputCls} />
          </div>
          {!isReturn && (
            <div>
              <Label>Devolución esperada <span className="font-normal text-gray-400">(opcional)</span></Label>
              <input type="date" value={expectedReturn} min={batchDate} onChange={(e) => setExpectedReturn(e.target.value)} className={inputCls} />
            </div>
          )}
        </div>

        {!isReturn && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={responsible === 'other:' ? '' : 'sm:col-span-3'}>
              <Label>Encargado de obra que recibe *</Label>
              <select value={responsible} onChange={(e) => setResponsible(e.target.value)} className={inputCls}>
                <option value="">— Selecciona —</option>
                {people.employees.length > 0 && <optgroup label="Empleados">{people.employees.map((p) => <option key={p.id} value={`employee:${p.id}`}>{p.name}{p.document_number ? ` · ${p.document_number}` : ''}</option>)}</optgroup>}
                {people.users.length > 0 && <optgroup label="Usuarios">{people.users.map((p) => <option key={p.id} value={`user:${p.id}`}>{p.name}</option>)}</optgroup>}
                <option value="other:">Otra persona (contratista)…</option>
              </select>
            </div>
            {responsible === 'other:' && (
              <>
                <div><Label>Nombre *</Label><input value={otherName} onChange={(e) => setOtherName(e.target.value)} className={inputCls} /></div>
                <div><Label>Documento</Label><input value={otherDoc} onChange={(e) => setOtherDoc(e.target.value)} className={inputCls} /></div>
              </>
            )}
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium">{isReturn ? 'Herramientas en obra' : 'Herramientas disponibles'} <span className="font-normal text-gray-500">· {count} marcada(s)</span></p>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar código, nombre o S/N" className="pl-7 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 w-56" />
            </div>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
              {isReturn ? 'No hay herramientas en obra para devolver.' : 'No hay herramientas disponibles (o ninguna coincide con la búsqueda).'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[38vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-3 py-2 w-8"><input type="checkbox" checked={allVisibleOn} onChange={toggleAll} aria-label="Marcar todas" /></th>
                    <th className="px-3 py-2">Herramienta</th>
                    <th className="px-3 py-2 text-right">{isReturn ? 'Cant.' : 'Disp.'}</th>
                    {!isReturn && <th className="px-3 py-2 text-right">Entregar</th>}
                    <th className="px-3 py-2">Estado</th>
                    {isReturn && <th className="px-3 py-2 text-right">Perdidas</th>}
                    <th className="px-3 py-2">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {list.map((r) => {
                    const v = sel[r.id];
                    return (
                      <tr key={r.id} className={v ? 'bg-orange-50/40 dark:bg-orange-900/10' : ''}>
                        <td className="px-3 py-2"><input type="checkbox" checked={Boolean(v)} onChange={() => toggle(r)} aria-label={`Marcar ${r.name}`} /></td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.code}{r.serial ? ` · S/N ${r.serial}` : ''}{r.extra ? ` · ${r.extra}` : ''}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{r.quantity}</td>
                        {!isReturn && (
                          <td className="px-3 py-2 text-right">
                            {r.tracking === 'quantity' && v
                              ? <input type="number" min="1" max={r.quantity} value={v.quantity} onChange={(e) => patch(r.id, { quantity: e.target.value })} className={`${cellInput} w-20 text-right`} />
                              : (v ? 1 : '')}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          {v && (
                            <select value={v.condition} onChange={(e) => patch(r.id, { condition: e.target.value })} className={cellInput}>
                              <option value="good">{CONDITIONS.good}</option>
                              <option value="damaged">{CONDITIONS.damaged}</option>
                              {isReturn && <option value="lost">{CONDITIONS.lost}</option>}
                            </select>
                          )}
                        </td>
                        {isReturn && (
                          <td className="px-3 py-2 text-right">
                            {v && r.tracking === 'quantity' && v.condition !== 'lost'
                              ? <input type="number" min="0" max={r.quantity} value={v.lost} onChange={(e) => patch(r.id, { lost: e.target.value })} className={`${cellInput} w-16 text-right`} />
                              : (v?.condition === 'lost' ? r.quantity : '')}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          {v && <input value={v.notes} onChange={(e) => patch(r.id, { notes: e.target.value })} maxLength={500} placeholder={v.condition !== 'good' || Number(v.lost) > 0 ? 'Describe el daño o la pérdida *' : 'Opcional'} className={`${cellInput} w-full min-w-[10rem]`} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <Label>Notas del acta <span className="font-normal text-gray-400">(opcional)</span></Label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Ej. Piso 3, entrega en portería" className={inputCls} />
        </div>

        <details className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Firmas del acta <span className="font-normal text-gray-400">(opcional{signed ? ` · ${signed} tomada(s)` : ''}; puedes completarlas después desde Herramientas)</span>
          </summary>
          <div className="grid gap-3 sm:grid-cols-3 mt-3">
            {roles.map(([role, label, action]) => (
              <SignatureField key={role} label={label} role={action} askDocument value={sigs[role] || null} onChange={(v) => setSigs((s) => ({ ...s, [role]: v }))} />
            ))}
          </div>
        </details>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={submit} disabled={busy || !count} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Registrando...' : `${isReturn ? 'Recibir' : 'Entregar'} ${count} herramienta(s)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
