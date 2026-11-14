import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Layers, PenLine, Wrench } from 'lucide-react';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { AssignToolModal, ReturnToolModal } from '../tools/ToolActionModals';
import ToolBatchModal from './ToolBatchModal';
import SignRoleModal from './SignRoleModal';
import {
  getProjectTools, getTools, openToolActa, getProjectToolBatches, signToolBatch, openToolBatchActa,
} from '../../api/tools';
import { BATCH_ROLES } from './projectConstants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CONDITIONS, inputCls } from '../tools/toolConstants';

/**
 * Herramientas entregadas para un proyecto: quién tiene qué, desde cuándo y
 * el cargo por uso (si la herramienta tiene tarifa por día).
 */
export default function ToolsTab({ project, canSeeCosts }) {
  const can = usePermissions();
  const canAssign = can('tools.assign');
  const closed = ['closed', 'cancelled'].includes(project.status);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [available, setAvailable] = useState([]);
  const [toolId, setToolId] = useState('');
  const [assignTool, setAssignTool] = useState(null);
  const [returning, setReturning] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchKind, setBatchKind] = useState(null); // 'delivery' | 'return'
  const [signTarget, setSignTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tools, lots] = await Promise.all([getProjectTools(project.id), getProjectToolBatches(project.id)]);
      setRows(tools.data || []);
      setBatches(lots.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar las herramientas');
    } finally {
      setLoading(false);
    }
  }, [project.id]);
  useEffect(() => { load(); }, [load]);

  const startPick = async () => {
    setPicking(true);
    try {
      setAvailable((await getTools({ state: 'available' })).data.tools || []);
    } catch { setAvailable([]); }
  };

  const active = rows.filter((r) => r.status === 'active');
  const usage = rows.reduce((s, r) => s + r.usage_cost, 0);
  const acta = (a, kind) => openToolActa(a.id, kind).catch(() => toast.error('No se pudo abrir el acta'));
  const batchActa = (b) => openToolBatchActa(b.id).catch(() => toast.error('No se pudo abrir el acta del lote'));
  const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {active.length ? `${active.length} entrega(s) en obra` : rows.length ? 'Ninguna herramienta en obra en este momento.' : 'No se han entregado herramientas para esta obra.'}
          {canSeeCosts && usage > 0 && <> · Cargo por uso acumulado: <strong>{formatCurrency(usage)}</strong></>}
        </p>
        {canAssign && !closed && (
          <div className="flex flex-wrap items-center gap-2">
            {!picking && (
              <>
                <button onClick={() => setBatchKind('delivery')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100">
                  <Layers className="w-4 h-4" /> Entrega por lote
                </button>
                {active.length > 0 && (
                  <button onClick={() => setBatchKind('return')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Layers className="w-4 h-4" /> Devolución por lote
                  </button>
                )}
              </>
            )}
          {picking ? (
            <div className="flex gap-2">
              <select value={toolId} onChange={(e) => setToolId(e.target.value)} className={`${inputCls} sm:w-80`}>
                <option value="">— Herramienta disponible —</option>
                {available.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}{t.tracking === 'quantity' ? ` (${t.available_quantity} disp.)` : ''}</option>)}
              </select>
              <button disabled={!toolId} onClick={() => { setAssignTool(available.find((t) => t.id === toolId)); setPicking(false); setToolId(''); }} className="px-3 py-2 rounded-lg text-sm bg-orange-600 text-white disabled:opacity-50">Continuar</button>
              <button onClick={() => setPicking(false)} className="px-3 py-2 rounded-lg text-sm border border-gray-300">Cancelar</button>
            </div>
          ) : (
            <button onClick={startPick} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-orange-600 text-white hover:bg-orange-700">
              <PenLine className="w-4 h-4" /> Entregar herramienta
            </button>
          )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Entrega herramientas a los técnicos de esta obra para saber quién tiene qué.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2">Herramienta</th>
                <th className="px-4 py-2">Responsable</th>
                <th className="px-4 py-2">Entrega</th>
                <th className="px-4 py-2">Estado</th>
                {canSeeCosts && <th className="px-4 py-2 text-right">Cargo por uso</th>}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">
                    <Link to={`/tools/${a.tool.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-orange-700">{a.tool.name}</Link>
                    <p className="text-xs text-gray-500">{a.tool.code}{a.tool.serial_number ? ` · S/N ${a.tool.serial_number}` : ''}{a.quantity > 1 ? ` · ${a.quantity} unidades` : ''}</p>
                  </td>
                  <td className="px-4 py-2">{a.responsible_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{a.number} · {formatDate(a.assigned_at)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {a.status === 'active'
                      ? <span className={a.overdue ? 'text-red-600' : 'text-blue-700'}>En obra{a.overdue ? ' · devolución vencida' : ''} ({a.days} d)</span>
                      : <span className="text-gray-600">Devuelta {formatDate(a.returned_at)} · {CONDITIONS[a.return_condition]}{a.lost_quantity && a.return_condition !== 'lost' ? ` · ${a.lost_quantity} perdida(s)` : ''}</span>}
                  </td>
                  {canSeeCosts && <td className="px-4 py-2 text-right tabular-nums">{a.usage_cost > 0 ? formatCurrency(a.usage_cost) : '—'}</td>}
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => acta(a, a.status === 'returned' ? 'devolucion' : 'entrega')} className="text-orange-700 hover:underline text-xs">Acta</button>
                    {a.status === 'active' && canAssign && <button onClick={() => setReturning(a)} className="ml-3 text-orange-700 hover:underline text-xs">Recibir</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {batches.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Actas por lote</p>
            <span className="text-xs text-gray-500">{batches.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2">Acta</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Etapa</th><th className="px-4 py-2 text-right">Herr.</th><th className="px-4 py-2">Firmas</th><th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {batches.map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{b.batch_no}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{b.kind === 'return' ? 'Devolución' : 'Entrega'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(b.batch_date)}</td>
                  <td className="px-4 py-2">{b.stage ? `${b.stage.stage_no} · ${b.stage.name}` : <span className="text-gray-400">Sin etapa</span>}</td>
                  <td className="px-4 py-2 text-right">{b.items_count}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {b.signatures.map((sg) => (sg.signed ? (
                        <span key={sg.role} title={`${sg.signed_name} · ${fmtDateTime(sg.signed_at)}`} className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">✓ {sg.label.split(' (')[0]}</span>
                      ) : canAssign ? (
                        <button key={sg.role} onClick={() => setSignTarget({ batch: b, role: sg.role })} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-700">
                          <PenLine className="w-3 h-3" /> {sg.label.split(' (')[0]}
                        </button>
                      ) : (
                        <span key={sg.role} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">{sg.label.split(' (')[0]} pendiente</span>
                      )))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => batchActa(b)} className="text-orange-700 hover:underline text-xs inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Acta</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToolBatchModal isOpen={Boolean(batchKind)} onClose={() => setBatchKind(null)} project={project} kind={batchKind || 'delivery'} rows={rows} onDone={load} />
      {signTarget && (() => {
        const [, label, action] = BATCH_ROLES[signTarget.batch.kind].find(([r]) => r === signTarget.role);
        return (
          <SignRoleModal
            title={`Firmar acta ${signTarget.batch.batch_no}`} label={label} action={action}
            onClose={() => setSignTarget(null)}
            onSign={async (v) => {
              const res = await signToolBatch(signTarget.batch.id, { role: signTarget.role, name: v.name, document: v.document, signature: v.signature });
              toast.success(res.message);
              setBatches(res.data);
            }}
          />
        );
      })()}
      <AssignToolModal isOpen={Boolean(assignTool)} onClose={() => setAssignTool(null)} tool={assignTool} defaultProject={project} onDone={load} />
      <ReturnToolModal isOpen={Boolean(returning)} onClose={() => setReturning(null)} assignment={returning} tool={returning?.tool} onDone={load} />
    </div>
  );
}
