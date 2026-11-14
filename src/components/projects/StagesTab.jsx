import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, FileText, Layers, Lock, Pencil, PenLine, Plus, Trash2, Truck, Unlock } from 'lucide-react';
import SignRoleModal from './SignRoleModal';
import StageFormModal from './StageFormModal';
import DispatchModal from './DispatchModal';
import {
  getProjectStages, updateProjectStage, deleteProjectStage, getProjectDispatches, signProjectDispatch,
  openDispatchActa, getProjectBom,
} from '../../api/projects';
import { qty, DISPATCH_ROLES } from './projectConstants';

const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50';
const fmtDay = (v) => (v ? new Date(`${v}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function StageBadge({ stage }) {
  const done = stage.totals.planned > 0 && stage.totals.pending === 0;
  if (stage.status === 'closed') return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">Cerrada</span>;
  if (done) return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Completa</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">Abierta</span>;
}

/**
 * Etapas de obra: reparte la lista de materiales por etapas, despacha cada una
 * con su saldo y lleva las actas de despacho con sus firmas.
 */
export default function StagesTab({ project, canManage, canStock, onChanged }) {
  const [data, setData] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [bomLines, setBomLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState(null);          // { stage } al abrir el modal de etapa
  const [dispatchFor, setDispatchFor] = useState(null); // { stageId }
  const [signTarget, setSignTarget] = useState(null);

  const closed = ['closed', 'cancelled'].includes(project.status);
  const finished = ['completed', 'closed', 'cancelled'].includes(project.status);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, dp, bom] = await Promise.all([getProjectStages(project.id), getProjectDispatches(project.id), getProjectBom(project.id)]);
      setData(st.data); setDispatches(dp.data || []); setBomLines(bom.data?.lines || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar las etapas');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);
  const refresh = () => { load(); onChanged?.(); };

  const toggleStatus = async (stage) => {
    try {
      const res = await updateProjectStage(project.id, stage.id, { status: stage.status === 'open' ? 'closed' : 'open' });
      toast.success(res.message); setData(res.data);
    } catch (e) { toast.error(e.response?.data?.message || 'No se pudo cambiar la etapa'); }
  };
  const remove = async (stage) => {
    if (!window.confirm(`¿Eliminar la etapa ${stage.stage_no} · ${stage.name}?`)) return;
    try {
      const res = await deleteProjectStage(project.id, stage.id);
      toast.success(res.message); setData(res.data);
    } catch (e) { toast.error(e.response?.data?.message || 'No se pudo eliminar la etapa'); }
  };
  const acta = (d) => openDispatchActa(project.id, d.id).catch(() => toast.error('No se pudo generar el acta'));

  if (loading && !data) {
    return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  }

  const stages = data?.stages || [];
  const unassigned = data?.unassigned || [];
  const usedStageIds = new Set(dispatches.filter((d) => d.stage).map((d) => d.stage.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Reparte los materiales por etapas y despacha cada una con su saldo. Cada despacho deja un acta con firmas.
        </p>
        {canManage && !closed && (
          <button onClick={() => setForm({ stage: null })} className={`${btn} bg-orange-600 text-white hover:bg-orange-700`}><Plus className="w-4 h-4" /> Nueva etapa</button>
        )}
      </div>

      {unassigned.length > 0 && stages.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {unassigned.length} línea(s) del BOM tienen cantidad sin asignar a ninguna etapa.
        </p>
      )}

      {stages.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Este proyecto aún no tiene etapas.</p>
          {canManage && <p className="text-sm mt-1">Crea una etapa y asígnale cantidades de la lista de materiales para despachar por partes.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((s) => {
            const open = Boolean(expanded[s.id]);
            const canDispatch = canStock && !finished && s.status === 'open' && s.totals.pending > 0 && project.warehouse_id;
            return (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        Etapa {s.stage_no} · {s.name} <StageBadge stage={s} />
                      </p>
                      <p className="text-xs text-gray-500">{[s.planned_date && `Prevista ${fmtDay(s.planned_date)}`, s.description].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {canDispatch && <button onClick={() => setDispatchFor({ stageId: s.id })} className={`${btn} border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100`}><Truck className="w-4 h-4" /> Despachar</button>}
                      {canManage && !closed && s.status === 'open' && <button onClick={() => setForm({ stage: s })} className={`${btn} text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700`}><Pencil className="w-4 h-4" /> Editar</button>}
                      {canManage && !closed && (
                        <button onClick={() => toggleStatus(s)} className={`${btn} text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                          {s.status === 'open' ? <><Lock className="w-4 h-4" /> Cerrar</> : <><Unlock className="w-4 h-4" /> Reabrir</>}
                        </button>
                      )}
                      {canManage && !closed && !usedStageIds.has(s.id) && <button onClick={() => remove(s)} title="Eliminar etapa" className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Despachado {qty(s.totals.dispatched)} de {qty(s.totals.planned)}</span>
                      <span>{s.totals.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${Math.min(s.totals.pct, 100)}%` }} />
                    </div>
                  </div>

                  <button onClick={() => setExpanded((e) => ({ ...e, [s.id]: !open }))} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900">
                    {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} {s.items.length} línea(s)
                  </button>
                </div>

                {open && (
                  <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-3 py-2">#</th><th className="px-3 py-2">Material</th>
                          <th className="px-3 py-2 text-right">Planeado</th><th className="px-3 py-2 text-right">Despachado</th><th className="px-3 py-2 text-right">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {s.items.map((i) => (
                          <tr key={i.bom_item_id}>
                            <td className="px-3 py-2 text-gray-400">{i.line_no}</td>
                            <td className="px-3 py-2">{i.description}</td>
                            <td className="px-3 py-2 text-right">{qty(i.qty_planned)} <span className="text-xs text-gray-500">{i.unit}</span></td>
                            <td className="px-3 py-2 text-right">{i.qty_dispatched ? qty(i.qty_dispatched) : '—'}</td>
                            <td className={`px-3 py-2 text-right font-medium ${i.qty_pending > 0 ? 'text-gray-800 dark:text-gray-100' : 'text-green-700'}`}>{i.qty_pending > 0 ? qty(i.qty_pending) : '✓'}</td>
                          </tr>
                        ))}
                        {s.items.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">La etapa no tiene materiales asignados.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Actas de despacho</p>
          <span className="text-xs text-gray-500">{dispatches.length}</span>
        </div>
        {dispatches.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">Aún no hay despachos. Cada vez que despaches materiales a la obra se crea un acta aquí.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2">Acta</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Etapa</th>
                  <th className="px-3 py-2">Traslado</th><th className="px-3 py-2 text-right">Líneas</th><th className="px-3 py-2">Firmas</th><th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {dispatches.map((d) => (
                  <tr key={d.id} className="align-top">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{d.dispatch_no}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtDateTime(d.dispatched_at)}</td>
                    <td className="px-3 py-2">{d.stage ? `${d.stage.stage_no} · ${d.stage.name}` : <span className="text-gray-400">Sin etapa</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {d.transfer ? <>{d.transfer.transfer_number}{d.transfer.status === 'cancelled' && <span className="ml-1 text-xs text-red-600">cancelado</span>}</> : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">{d.lines}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {d.signatures.map((sg) => (sg.signed ? (
                          <span key={sg.role} title={`${sg.signed_name} · ${fmtDateTime(sg.signed_at)}`} className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">✓ {sg.label}</span>
                        ) : canStock ? (
                          <button key={sg.role} onClick={() => setSignTarget({ dispatch: d, role: sg.role })} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-700">
                            <PenLine className="w-3 h-3" /> {sg.label}
                          </button>
                        ) : (
                          <span key={sg.role} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">{sg.label} pendiente</span>
                        )))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => acta(d)} className="text-orange-700 hover:underline text-xs inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Acta</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StageFormModal isOpen={Boolean(form)} onClose={() => setForm(null)} project={project} stage={form?.stage || null} unassigned={unassigned} onSaved={(d) => setData(d)} />
      <DispatchModal isOpen={Boolean(dispatchFor)} onClose={() => setDispatchFor(null)} project={project} lines={bomLines} initialStageId={dispatchFor?.stageId || ''} onDone={refresh} />
      {signTarget && (() => {
        const [, label, action] = DISPATCH_ROLES.find(([r]) => r === signTarget.role);
        return (
          <SignRoleModal
            title={`Firmar acta ${signTarget.dispatch.dispatch_no}`} label={label} action={action}
            onClose={() => setSignTarget(null)}
            onSign={async (v) => {
              const res = await signProjectDispatch(project.id, signTarget.dispatch.id, { role: signTarget.role, name: v.name, document: v.document, signature: v.signature });
              toast.success(res.message);
              setDispatches(res.data);
            }}
          />
        );
      })()}
    </div>
  );
}
