import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import SignaturePad from '../tools/SignaturePad';
import { cancelMaintenanceVisit, completeMaintenanceVisit, rescheduleMaintenanceVisit } from '../../api/projects';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const today = () => new Date().toLocaleDateString('en-CA');

export const ALERT_BADGE = {
  overdue: ['Vencida', 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'],
  due_soon: ['Por vencer', 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'],
  scheduled: ['Programada', 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'],
};
export const VISIT_STATUS = { scheduled: 'Programada', done: 'Realizada', cancelled: 'Cancelada' };

/** Insignia del estado de una visita (con la alerta si está pendiente). */
export function VisitBadge({ visit }) {
  if (visit.status !== 'scheduled') {
    const cls = visit.status === 'done' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{VISIT_STATUS[visit.status]}</span>;
  }
  const [label, cls] = ALERT_BADGE[visit.alert] || ['Plan pausado', 'bg-gray-100 text-gray-600'];
  return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{label}</span>;
}

/** Cerrar una visita: checklist de las tareas del plan, observaciones y firma del cliente. */
export function CloseVisitModal({ visit, onClose, onDone }) {
  const [checks, setChecks] = useState([]);
  const [form, setForm] = useState({ done_date: today(), observations: '', client_name: '', client_document: '' });
  const [signature, setSignature] = useState(null);
  const [busy, setBusy] = useState(false);
  const tasks = visit?.plan?.tasks || [];

  useEffect(() => {
    if (!visit) return;
    setChecks(tasks.map(() => ({ done: true, note: '' })));
    setForm({ done_date: today(), observations: '', client_name: visit.installation?.customer || '', client_document: '' });
    setSignature(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit]);
  if (!visit) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await completeMaintenanceVisit(visit.id, { ...form, checklist: checks, client_signature: signature || null });
      toast.success(r.message, { duration: 6000 });
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cerrar la visita');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Cerrar visita ${visit.visit_no}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {visit.installation?.customer} · {visit.installation?.name}{visit.equipment ? ` — ${visit.equipment.name}` : ''} · {visit.plan?.name}
        </p>
        <div className="max-w-xs">
          <label className="block text-xs text-gray-500 mb-1">Fecha de la visita</label>
          <input type="date" value={form.done_date} max={today()} onChange={(e) => setForm((f) => ({ ...f, done_date: e.target.value }))} className={inputCls} />
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          {tasks.map((t, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="px-3 py-2 space-y-1">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={Boolean(checks[i]?.done)} onChange={(e) => setChecks((c) => c.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />
                <span className={checks[i]?.done ? '' : 'text-red-700 dark:text-red-300'}>{t}</span>
              </label>
              {!checks[i]?.done && (
                <input value={checks[i]?.note || ''} onChange={(e) => setChecks((c) => c.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} className={`${inputCls} text-xs`} placeholder="¿Por qué no se hizo? / hallazgo" />
              )}
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Observaciones y hallazgos</label>
          <textarea rows={3} value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Recibe (cliente)</label><input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Documento</label><input value={form.client_document} onChange={(e) => setForm((f) => ({ ...f, client_document: e.target.value }))} className={inputCls} /></div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Firma del cliente (opcional)</label>
          <SignaturePad onChange={setSignature} height={130} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancelar</button>
          <button type="button" onClick={submit} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Guardando…' : 'Cerrar visita'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Reprogramar (fecha y técnico) o cancelar una visita pendiente. */
export function RescheduleVisitModal({ visit, users = [], onClose, onDone }) {
  const [date, setDate] = useState('');
  const [tech, setTech] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visit) return;
    setDate(String(visit.scheduled_date).slice(0, 10));
    setTech(visit.technician?.id || '');
    setReason('');
  }, [visit]);
  if (!visit) return null;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(r.message || okMsg);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar la visita');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Visita ${visit.visit_no}`} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Fecha programada</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Técnico</label>
            <select value={tech} onChange={(e) => setTech(e.target.value)} className={inputCls}>
              <option value="">— Sin asignar —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}</option>)}
            </select>
          </div>
          <button type="button" disabled={busy} onClick={() => run(() => rescheduleMaintenanceVisit(visit.id, { scheduled_date: date, technician_user_id: tech || null }), 'Visita reprogramada')} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">Guardar</button>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
          <label className="block text-xs text-gray-500">Cancelar esta visita (se programa la siguiente según la frecuencia)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Motivo" />
          <button type="button" disabled={busy || !reason.trim()} onClick={() => run(() => cancelMaintenanceVisit(visit.id, { reason }), 'Visita cancelada')} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50">Cancelar visita</button>
        </div>
      </div>
    </Modal>
  );
}
