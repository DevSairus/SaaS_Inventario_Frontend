import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, FileText, Loader2, Lock, Plus, Receipt, Trash2, Unlock } from 'lucide-react';
import Modal from '../common/Modal';
import SignaturePad from '../tools/SignaturePad';
import RegisterAdvanceModal from '../finance/RegisterAdvanceModal';
import { usePermissions } from '../../store/tenantPermissionsStore';
import salesApi from '../../api/sales';
import api from '../../api/axios';
import {
  approveProjectCut, closeProjectContract, createProjectCut, deleteProjectCut, finalizeCutInvoice, getCutInvoicePayload, getProjectBilling,
  linkCutDraft, openCutActa, previewProjectCut, releaseProjectRetention, updateProjectCut,
} from '../../api/projects';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CONTRACT_OPEN, CONTRACT_STATUS } from './projectConstants';
import AiuFields, { aiuFormOf, aiuPayload } from './AiuFields';

const inputCls = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const STATUS = {
  draft: { label: 'Borrador', cls: 'bg-gray-100 text-gray-700' },
  approved: { label: 'Aprobado por el cliente', cls: 'bg-blue-100 text-blue-800' },
  invoicing: { label: 'Facturándose', cls: 'bg-amber-100 text-amber-800' },
  invoiced: { label: 'Facturado', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Anulado', cls: 'bg-gray-200 text-gray-500' },
};
const qtyFmt = (n) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 4 });
const todayLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const Stat = ({ label, value, sub }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
    {sub && <p className="text-xs text-gray-500">{sub}</p>}
  </div>
);

/** Editor de un corte: acumulado por línea (cantidad o %) o % global para un hito. */
function CutEditor({ isOpen, onClose, project, billing, cut, onSaved }) {
  const [form, setForm] = useState({ cut_date: todayLocal(), period_from: '', period_to: '', notes: '', global_pct: '' });
  // AIU del corte (1.6): arranca con el del proyecto y se puede cambiar o poner un concepto en 0.
  const [aiu, setAiu] = useState(aiuFormOf(null));
  const [mode, setMode] = useState('qty'); // qty | pct
  const [cum, setCum] = useState({}); // sale_item_id → valor (cantidad o %)
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      cut_date: cut?.cut_date || todayLocal(), period_from: cut?.period_from || '', period_to: cut?.period_to || '',
      notes: cut?.notes || '', global_pct: cut?.global_pct ?? '',
    });
    setAiu(aiuFormOf(cut || project));
    setMode('qty');
    const initial = {};
    for (const it of cut?.items || []) initial[it.sale_item_id] = String(Number(it.qty_cumulative));
    setCum(initial);
    setPreview(null);
  }, [isOpen, cut]);

  const body = useCallback(() => ({
    cut_id: cut?.id,
    ...form,
    ...aiuPayload(aiu),
    global_pct: form.global_pct === '' ? null : Number(form.global_pct),
    items: Object.entries(cum).filter(([, v]) => v !== '' && v !== undefined).map(([id, v]) => (
      mode === 'pct' ? { sale_item_id: id, pct_cumulative: Number(v) } : { sale_item_id: id, qty_cumulative: Number(v) }
    )),
  }), [cut, form, cum, mode, aiu]);

  const key = JSON.stringify(body());
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(async () => {
      try {
        setPreview((await previewProjectCut(project.id, JSON.parse(key))).data);
        setError(null);
      } catch (e) {
        setError(e.response?.data?.message || 'No se pudo calcular');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [isOpen, key, project.id]);

  const save = async () => {
    setSaving(true);
    try {
      const r = cut ? await updateProjectCut(project.id, cut.id, body()) : await createProjectCut(project.id, body());
      toast.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar el corte');
    } finally {
      setSaving(false);
    }
  };

  const lines = billing?.lines || [];
  const previewBy = new Map((preview?.items || []).map((i) => [i.sale_item_id, i]));
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cut ? `Corte ${cut.cut_no}` : 'Nuevo corte de obra'} size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Fecha del corte</label><input type="date" value={form.cut_date} onChange={(e) => setForm((f) => ({ ...f, cut_date: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Periodo desde</label><input type="date" value={form.period_from} onChange={(e) => setForm((f) => ({ ...f, period_from: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Periodo hasta</label><input type="date" value={form.period_to} onChange={(e) => setForm((f) => ({ ...f, period_to: e.target.value }))} className={inputCls} /></div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hito: % global acumulado</label>
            <input type="number" min="0" max="100" step="1" value={form.global_pct} onChange={(e) => setForm((f) => ({ ...f, global_pct: e.target.value }))} className={inputCls} placeholder="Ej. 20" />
          </div>
        </div>
        <AiuFields
          value={aiu}
          onChange={setAiu}
          fallback={project.aiu_enabled ? { admin_pct: project.aiu_admin_pct, unforeseen_pct: project.aiu_unforeseen_pct, profit_pct: project.aiu_profit_pct } : null}
          hint={`AIU de este corte; el del proyecto es ${billing?.project_aiu_label || 'sin AIU'}. Un concepto en 0 % no aplica en este corte.`}
        />

        <p className="text-xs text-gray-500">
          Escribe lo ejecutado <strong>acumulado</strong> hasta este corte; se factura solo la diferencia con lo anterior. El % global aplica a las líneas que no tengan valor propio.
        </p>

        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => { setMode('qty'); setCum({}); }} className={`px-3 py-1 rounded-full border ${mode === 'qty' ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300'}`}>Por cantidad</button>
          <button type="button" onClick={() => { setMode('pct'); setCum({}); }} className={`px-3 py-1 rounded-full border ${mode === 'pct' ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300'}`}>Por %</button>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2">Ítem del contrato</th>
                <th className="px-3 py-2 text-right">Contratado</th>
                <th className="px-3 py-2 text-right">Ya facturado</th>
                <th className="px-3 py-2 text-right w-32">Acumulado {mode === 'pct' ? '(%)' : ''}</th>
                <th className="px-3 py-2 text-right">Este corte</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {lines.map((l) => {
                const p = previewBy.get(l.sale_item_id);
                const done = l.qty_executed >= l.qty_contract - 0.0001;
                return (
                  <tr key={l.sale_item_id} className={done ? 'opacity-60' : ''}>
                    <td className="px-3 py-1.5">{l.description}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{qtyFmt(l.qty_contract)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{qtyFmt(l.qty_executed)} <span className="text-xs text-gray-500">({l.pct_executed}%)</span></td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number" min="0" step="any" disabled={done}
                        value={cum[l.sale_item_id] ?? ''}
                        placeholder={p ? (mode === 'pct' ? String(Math.round((p.qty_cumulative / l.qty_contract) * 10000) / 100) : qtyFmt(p.qty_cumulative)) : ''}
                        onChange={(e) => setCum((c) => ({ ...c, [l.sale_item_id]: e.target.value }))}
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{p && p.qty_this > 0 ? qtyFmt(p.qty_this) : '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{p && p.amount > 0 ? formatCurrency(p.amount) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{error}</p>}
        {preview && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Valor del corte" value={formatCurrency(preview.total_amount)} sub={`subtotal ${formatCurrency(preview.subtotal)} + IVA ${formatCurrency(preview.tax_amount)}${preview.aiu_amount ? ` · AIU ${formatCurrency(preview.aiu_amount)}` : ''}`} />
            <Stat label="Amortización anticipo" value={`- ${formatCurrency(preview.advance_amount)}`} sub={preview.advance_rate ? `${preview.advance_rate} % de cada factura` : 'sin anticipo del proyecto'} />
            <Stat label={`Retención de garantía (${preview.retention_pct} %)`} value={`- ${formatCurrency(preview.retention_amount)}`} sub="se cobra a la entrega" />
            <Stat label="Neto a cobrar" value={formatCurrency(preview.net_amount)} sub={`avance acumulado ${preview.progress_pct} %${preview.is_final ? ' · corte final' : ''}`} />
          </div>
        )}
        <div><label className="block text-xs text-gray-500 mb-1">Observaciones del acta</label><textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300">Cancelar</button>
          <button type="button" onClick={save} disabled={saving || Boolean(error) || !(preview?.direct_amount > 0)} className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar corte'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ApproveModal({ isOpen, onClose, project, cut, onDone }) {
  const [form, setForm] = useState({ approved_by_name: '', approved_by_document: '', approved_signature: null });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) setForm({ approved_by_name: '', approved_by_document: '', approved_signature: null }); }, [isOpen]);
  if (!cut) return null;
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await approveProjectCut(project.id, cut.id, form);
      toast.success(r.message);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo aprobar');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Aprobación del corte ${cut.cut_no}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">El cliente revisa el acta (PDF) y aprueba el avance. También puedes adjuntar el acta firmada en papel en Documentos.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">Aprueba (cliente) *</label><input value={form.approved_by_name} onChange={(e) => setForm((f) => ({ ...f, approved_by_name: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-sm font-medium mb-1">Documento</label><input value={form.approved_by_document} onChange={(e) => setForm((f) => ({ ...f, approved_by_document: e.target.value }))} className={inputCls} /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Firma</label><SignaturePad onChange={(sig) => setForm((f) => ({ ...f, approved_signature: sig }))} height={130} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Aprobar corte'}</button>
        </div>
      </form>
    </Modal>
  );
}

/** Cierre manual del contrato con saldo sin ejecutar. */
function CloseContractModal({ isOpen, onClose, project, billing, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);
  if (!billing?.contract) return null;
  const pending = Math.max(billing.contract.total - billing.invoiced_total, 0);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await closeProjectContract(project.id, reason);
      toast.success(r.message, { duration: 7000 });
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo cerrar el contrato');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cerrar contrato ${billing.contract.quote_number}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Se facturó el {billing.progress_pct} % del contrato. Al cerrarlo quedan <strong>{formatCurrency(pending)}</strong> sin ejecutar
          y no se pueden hacer más cortes. Las facturas emitidas no cambian; la retención de garantía y los anticipos se manejan igual.
        </p>
        <div>
          <label className="block text-sm font-medium mb-1">Motivo *</label>
          <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Ej. el cliente redujo el alcance; obra entregada sin el ítem X" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300">Cancelar</button>
          <button type="submit" disabled={saving || !reason.trim()} className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white disabled:opacity-50">{saving ? 'Cerrando…' : 'Cerrar contrato'}</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Cortes de obra y facturas parciales del proyecto: contrato (la cotización),
 * avance acumulado, anticipo amortizado y retención de garantía.
 */
export default function BillingTab({ project, onChanged }) {
  const can = usePermissions();
  const canBill = can('projects.billing');
  const closed = ['closed', 'cancelled'].includes(project.status);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // { cut } | { cut: null }
  const [approving, setApproving] = useState(null);
  const [busy, setBusy] = useState('');
  const [showAdvance, setShowAdvance] = useState(false);
  const [closingContract, setClosingContract] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await getProjectBilling(project.id)).data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar la facturación');
    }
  }, [project.id]);
  useEffect(() => { load(); }, [load]);

  const acta = (cut) => openCutActa(project.id, cut.id).catch(() => toast.error('No se pudo generar el acta'));

  // Factura del corte: borrador por ventas → confirmar → aplicar anticipo → cerrar el corte.
  const invoice = async (cut) => {
    setBusy(cut.id);
    let saleId = null;
    try {
      const p = (await getCutInvoicePayload(project.id, cut.id)).data;
      saleId = p.draft_sale_id;
      if (!saleId) {
        saleId = (await salesApi.create(p.sale)).data.data.id;
        await linkCutDraft(project.id, cut.id, saleId);
      }
      const sale = (await salesApi.getById(saleId)).data.data;
      if (sale.status === 'draft') await salesApi.confirm(saleId, p.confirm);
      const alreadyApplied = (sale.payment_history || []).some((x) => x.source === 'advance');
      if (p.applications.length && !alreadyApplied) {
        await api.post(`/sales/${saleId}/apply-advance`, { applications: p.applications });
      }
      const r = await finalizeCutInvoice(project.id, cut.id);
      toast.success(r.message);
      onChanged?.();
    } catch (e) {
      toast.error(`${e.response?.data?.message || 'No se pudo facturar el corte'}${saleId ? '. La factura quedó en proceso: corrige y usa «Continuar facturación».' : ''}`, { duration: 9000 });
    } finally {
      setBusy('');
      load();
    }
  };

  const remove = async (cut) => {
    if (!window.confirm(cut.status === 'draft' ? `¿Eliminar el corte ${cut.cut_no}?` : `¿Anular el corte ${cut.cut_no}? Ya estaba aprobado por el cliente.`)) return;
    try {
      const r = await deleteProjectCut(project.id, cut.id);
      toast.success(r.message);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const release = async () => {
    if (!window.confirm(`¿Liberar la retención de garantía (${formatCurrency(data.retention_held)})? Pasa a cobrarse: se hace al entregar la obra.`)) return;
    try {
      const r = await releaseProjectRetention(project.id);
      toast.success(r.message, { duration: 7000 });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo liberar');
    }
  };

  if (!data) return <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  if (!data.contract) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-600">
        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>{data.contract_error}</p>
      </div>
    );
  }

  const open = data.open_cut;
  const contractSt = CONTRACT_STATUS[data.contract.quote_status];
  const contractOpen = CONTRACT_OPEN.includes(data.contract.quote_status);
  const pendingAmount = Math.max(data.contract.total - data.invoiced_total, 0);
  const projectBillable = ['approved', 'in_progress', 'on_hold', 'completed'].includes(project.status);
  // Por qué no aparece «Nuevo corte» (mismas reglas que el backend al guardar un corte).
  let noCutReason = null;
  if (!canBill) noCutReason = 'Tu rol no tiene el permiso de cortes de obra y facturación.';
  else if (closed) noCutReason = 'El proyecto está cerrado o cancelado.';
  else if (open) noCutReason = `Termina primero el corte ${open.cut_no} (${STATUS[open.status]?.label.toLowerCase() || open.status}): factúralo o elimínalo para hacer el siguiente.`;
  else if (['facturada', 'cerrada'].includes(data.contract.quote_status)) noCutReason = null; // el estado del contrato ya lo explica
  else if (!contractOpen) noCutReason = `La cotización ${data.contract.quote_number} no está aprobada por el cliente: apruébala en Ventas → Cotizaciones para facturar por cortes.`;
  else if (!projectBillable) noCutReason = 'Los cortes se hacen con el proyecto aprobado o en ejecución: cambia su estado arriba.';
  else if (data.progress_pct >= 100) noCutReason = 'El contrato ya está facturado al 100 %.';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600">Contrato {data.contract.quote_number}:</span>
        {contractSt && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${contractSt.cls}`}>{contractSt.label}</span>}
        {data.contract.quote_status === 'facturada' && data.contract.closed_at && <span className="text-xs text-gray-500">desde el {formatDate(data.contract.closed_at)}</span>}
      </div>
      {data.contract.quote_status === 'cerrada' && (
        <p className="text-sm text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-lg px-4 py-2">
          Cerrado el {formatDate(data.contract.closed_at)} con {formatCurrency(data.contract.unexecuted_amount)} sin ejecutar. Motivo: {data.contract.close_reason}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Contrato" value={formatCurrency(data.contract.total)} sub={`Cotización ${data.contract.quote_number}${data.project_aiu ? ` · ${data.project_aiu_label}` : ''}`} />
        <Stat label="Avance facturado" value={`${data.progress_pct} %`} sub={`${formatCurrency(data.invoiced_total)} en ${data.cuts.filter((c) => c.status === 'invoiced').length} factura(s)`} />
        {data.contract.quote_status === 'cerrada'
          ? <Stat label="Sin ejecutar" value={formatCurrency(data.contract.unexecuted_amount)} sub="contrato cerrado" />
          : <Stat label="Por facturar" value={formatCurrency(pendingAmount)} />}
        <Stat label="Anticipo" value={formatCurrency(data.advances.received)} sub={`amortizado ${formatCurrency(data.advance_amortized)} · disponible ${formatCurrency(data.advances.available)}`} />
        <Stat label={`Retención de garantía (${data.retention_pct} %)`} value={formatCurrency(data.retention_held)} sub={data.retention_released_at ? `liberada el ${formatDate(data.retention_released_at)}` : 'retenida hasta la entrega'} />
      </div>

      {noCutReason && (
        <p className="text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40 rounded-lg px-4 py-2">
          No se puede hacer un corte nuevo: {noCutReason}
        </p>
      )}
      {canBill && !closed && (
        <div className="flex flex-wrap gap-2">
          {!open && contractOpen && projectBillable && data.progress_pct < 100 && (
            <button onClick={() => setEditing({ cut: null })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-orange-600 text-white hover:bg-orange-700"><Plus className="w-4 h-4" /> Nuevo corte</button>
          )}
          <button onClick={() => setShowAdvance(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Registrar anticipo del proyecto</button>
          {data.retention_held > 0 && (
            <button onClick={release} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"><Unlock className="w-4 h-4" /> Liberar retención (entrega de obra)</button>
          )}
        </div>
      )}
      {/* También con el proyecto cerrado: uno cerrado antes de existir esta opción deja su contrato abierto. */}
      {canBill && contractOpen && !open && data.progress_pct < 100 && data.cuts.some((c) => c.status === 'invoiced') && (
        <div>
          <button onClick={() => setClosingContract(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
            <Lock className="w-4 h-4" /> Cerrar contrato con saldo
          </button>
        </div>
      )}
      {data.retention_pct === 0 && <p className="text-xs text-gray-500">Este proyecto no tiene retención de garantía (se configura en Editar proyecto).</p>}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-2">Corte</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Avance acum.</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Anticipo</th>
              <th className="px-4 py-2 text-right">Retención</th>
              <th className="px-4 py-2 text-right">Neto</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.cuts.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Sin cortes. Cada corte registra el avance acumulado y genera su factura parcial.</td></tr>
            )}
            {data.cuts.map((c) => (
              <tr key={c.id} className={c.status === 'cancelled' ? 'opacity-50' : ''}>
                <td className="px-4 py-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Corte {c.cut_no}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(c.cut_date)}
                    {c.sale && <> · <Link to={`/sales/${c.sale.id}`} className="text-orange-700 hover:underline">{c.sale.sale_number}</Link></>}
                    {c.approved_by_name && ` · aprobó ${c.approved_by_name}`}
                  </p>
                </td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS[c.status]?.cls}`}>{STATUS[c.status]?.label}</span></td>
                <td className="px-4 py-2 text-right tabular-nums">{c.progress_pct != null ? `${Number(c.progress_pct)} %` : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(c.total_amount)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(c.advance_amount) > 0 ? `- ${formatCurrency(c.advance_amount)}` : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{Number(c.retention_amount) > 0 ? `- ${formatCurrency(c.retention_amount)}` : '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">{formatCurrency(c.net_amount)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                  <button onClick={() => acta(c)} className="text-orange-700 hover:underline text-xs inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Acta</button>
                  {canBill && c.status === 'draft' && (
                    <>
                      <button onClick={() => setEditing({ cut: c })} className="text-orange-700 hover:underline text-xs">Editar</button>
                      <button onClick={() => setApproving(c)} className="text-orange-700 hover:underline text-xs inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobar</button>
                    </>
                  )}
                  {canBill && ['approved', 'invoicing'].includes(c.status) && (
                    <button onClick={() => invoice(c)} disabled={busy === c.id} className="text-orange-700 hover:underline text-xs inline-flex items-center gap-1 disabled:opacity-50">
                      {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                      {c.status === 'invoicing' ? 'Continuar facturación' : 'Facturar'}
                    </button>
                  )}
                  {canBill && ['draft', 'approved'].includes(c.status) && (
                    <button onClick={() => remove(c)} className="text-gray-400 hover:text-red-600" title={c.status === 'draft' ? 'Eliminar' : 'Anular'}><Trash2 className="w-3.5 h-3.5 inline" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Avance por ítem del contrato</h3>
        <div className="space-y-2">
          {data.lines.map((l) => (
            <div key={l.sale_item_id} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-700 dark:text-gray-300">{l.description}</span>
                <span className="tabular-nums text-gray-600 whitespace-nowrap">{qtyFmt(l.qty_executed)} de {qtyFmt(l.qty_contract)} · {l.pct_executed} %</span>
              </div>
              <div className="h-1.5 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {l.pct_executed > 0 && <div className="h-full rounded bg-orange-500" style={{ width: `${Math.min(l.pct_executed, 100)}%` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CutEditor isOpen={Boolean(editing)} onClose={() => setEditing(null)} project={project} billing={data} cut={editing?.cut || null} onSaved={load} />
      <CloseContractModal isOpen={closingContract} onClose={() => setClosingContract(false)} project={project} billing={data} onDone={() => { load(); onChanged?.(); }} />
      <ApproveModal isOpen={Boolean(approving)} onClose={() => setApproving(null)} project={project} cut={approving} onDone={load} />
      <RegisterAdvanceModal
        isOpen={showAdvance}
        onClose={() => setShowAdvance(false)}
        onSuccess={load}
        presetCustomer={project.customer ? { ...project.customer, name: project.customer.business_name || [project.customer.first_name, project.customer.last_name].filter(Boolean).join(' ') } : null}
        presetProject={{ id: project.id, code: project.code, name: project.name }}
      />
    </div>
  );
}
