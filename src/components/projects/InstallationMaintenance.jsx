import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck, FileText, MapPin, Pause, Pencil, Play, Plus, Square, Wrench } from 'lucide-react';
import Modal from '../common/Modal';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { usersAPI } from '../../api/users';
import {
  createMaintenanceEquipment, createMaintenancePlan, getMaintenanceInstallation, openMaintenanceVisitPdf,
  updateMaintenanceEquipment, updateMaintenancePlan,
} from '../../api/projects';
import InstallationFormModal from './InstallationFormModal';
import { formatDate } from '../../utils/formatters';
import { CloseVisitModal, RescheduleVisitModal, VisitBadge } from './MaintenanceVisitModals';
import { userName } from './projectConstants';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const today = () => new Date().toLocaleDateString('en-CA');
const PLAN_STATUS = { active: 'Activo', paused: 'Pausado', ended: 'Finalizado' };
const FREQ = [[1, 'Mensual'], [2, 'Bimestral'], [3, 'Trimestral'], [6, 'Semestral'], [12, 'Anual'], [24, 'Cada 2 años']];

function EquipmentModal({ installationId, equipment, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (equipment) setForm({ name: '', brand: '', model: '', serial: '', location: '', installed_at: '', notes: '', ...Object.fromEntries(Object.entries(equipment).map(([k, v]) => [k, v ?? ''])) });
  }, [equipment]);
  if (!equipment) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: form.name, brand: form.brand, model: form.model, serial: form.serial, location: form.location, installed_at: form.installed_at || null, notes: form.notes };
      const r = equipment.id ? await updateMaintenanceEquipment(installationId, equipment.id, body) : await createMaintenanceEquipment(installationId, body);
      toast.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar el equipo');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={equipment.id ? 'Editar equipo' : 'Nuevo equipo'} size="md">
      <div className="space-y-3">
        <div><label className="block text-sm font-medium mb-1">Equipo *</label><input value={form.name || ''} onChange={set('name')} className={inputCls} placeholder="Ej. Inversor 10 kW" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Marca</label><input value={form.brand || ''} onChange={set('brand')} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Modelo</label><input value={form.model || ''} onChange={set('model')} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Serial</label><input value={form.serial || ''} onChange={set('serial')} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Ubicación</label><input value={form.location || ''} onChange={set('location')} className={inputCls} placeholder="Ej. Cuarto técnico" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Instalado el</label><input type="date" value={form.installed_at || ''} onChange={set('installed_at')} className={inputCls} /></div>
        </div>
        <div><label className="block text-xs text-gray-500 mb-1">Notas</label><textarea rows={2} value={form.notes || ''} onChange={set('notes')} className={inputCls} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">Guardar</button>
        </div>
      </div>
    </Modal>
  );
}

export function PlanModal({ installationId, plan, equipment, users, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!plan) return;
    setForm(plan.id ? {
      name: plan.name, equipment_id: plan.equipment_id || '', frequency_months: String(plan.frequency_months), tasks: (plan.tasks || []).join('\n'),
      alert_days_before: String(plan.alert_days_before), assigned_user_id: plan.assigned_user_id || '', notes: plan.notes || '',
    } : {
      name: '', equipment_id: '', frequency_months: '6', tasks: '', start_date: today(), alert_days_before: '15', assigned_user_id: '', notes: '',
    });
  }, [plan]);
  if (!plan) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name, frequency_months: Number(form.frequency_months), tasks: form.tasks.split('\n'),
        alert_days_before: Number(form.alert_days_before), assigned_user_id: form.assigned_user_id || null, notes: form.notes,
        ...(plan.id ? {} : { equipment_id: form.equipment_id || null, start_date: form.start_date }),
      };
      const r = plan.id ? await updateMaintenancePlan(plan.id, body) : await createMaintenancePlan(installationId, body);
      toast.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar el plan');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={plan.id ? 'Editar plan' : 'Nuevo plan de mantenimiento'} size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">Nombre *</label><input value={form.name || ''} onChange={set('name')} className={inputCls} placeholder="Ej. Limpieza y revisión preventiva" /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Sobre</label>
            <select value={form.equipment_id || ''} onChange={set('equipment_id')} disabled={Boolean(plan.id)} className={inputCls}>
              <option value="">Todo el sistema</option>
              {equipment.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.name}{e.serial ? ` · ${e.serial}` : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
            <select value={form.frequency_months || ''} onChange={set('frequency_months')} className={inputCls}>
              {FREQ.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
              {!FREQ.some(([m]) => String(m) === String(form.frequency_months)) && <option value={form.frequency_months}>Cada {form.frequency_months} meses</option>}
            </select>
          </div>
          {!plan.id && <div><label className="block text-xs text-gray-500 mb-1">Primera visita</label><input type="date" value={form.start_date || ''} onChange={set('start_date')} className={inputCls} /></div>}
          <div><label className="block text-xs text-gray-500 mb-1">Avisar (días antes)</label><input type="number" min="0" max="90" value={form.alert_days_before || ''} onChange={set('alert_days_before')} className={inputCls} /></div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Técnico responsable</label>
            <select value={form.assigned_user_id || ''} onChange={set('assigned_user_id')} className={inputCls}>
              <option value="">— Sin asignar —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{userName(u)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tareas (una por línea) *</label>
          <textarea rows={6} value={form.tasks || ''} onChange={set('tasks')} className={inputCls} placeholder={'Limpieza de paneles\nRevisión de conexiones y torque de bornes\nLectura de producción del inversor\nRevisión de protecciones del tablero'} />
          <p className="text-xs text-gray-500 mt-1">Son el checklist de cada visita.{plan.id ? ' Los cambios aplican a las visitas que se cierren de aquí en adelante.' : ''}</p>
        </div>
        <div><label className="block text-xs text-gray-500 mb-1">Notas</label><textarea rows={2} value={form.notes || ''} onChange={set('notes')} className={inputCls} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">{plan.id ? 'Guardar' : 'Crear plan'}</button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Mantenimiento de una instalación (Fase 4, req. 1.3): datos del sistema del
 * cliente, equipos, planes (frecuencia, tareas, aviso) e historial de visitas
 * con su acta. Se usa en el proyecto (pestaña Mantenimiento) y en
 * Mantenimientos → Instalaciones (instalaciones anteriores a Pitbox).
 */
export default function InstallationMaintenance({ installationId, initial = null, showHeader = true }) {
  const can = usePermissions();
  const canManage = can('projects.maintenance.manage');
  const canVisit = can('projects.maintenance.visit');
  const [data, setData] = useState(initial);
  const [users, setUsers] = useState([]);
  const [editEq, setEditEq] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [editInst, setEditInst] = useState(false);
  const [closing, setClosing] = useState(null);
  const [moving, setMoving] = useState(null);

  const load = useCallback(() => {
    getMaintenanceInstallation(installationId).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Error al cargar el mantenimiento'));
  }, [installationId]);
  useEffect(() => {
    if (!initial) load();
    usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true }).then((r) => setUsers(r.data?.users || [])).catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const setPlanStatus = async (plan, status) => {
    const msg = { paused: '¿Pausar el plan? No avisa ni programa la siguiente visita hasta reactivarlo.', ended: '¿Finalizar el plan? Se cancela la visita pendiente.', active: '¿Reactivar el plan?' }[status];
    if (!window.confirm(msg)) return;
    try {
      await updateMaintenancePlan(plan.id, { status });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cambiar el plan');
    }
  };

  if (!data) return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  const open = data.visits.filter((v) => v.status === 'scheduled');
  const history = data.visits.filter((v) => v.status !== 'scheduled');
  const inst = data.installation;

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{inst.name}{inst.is_active ? '' : ' · inactiva'}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{inst.customer?.name}{inst.customer?.tax_id ? ` · ${inst.customer.tax_id}` : ''}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" /> {[inst.site_address, inst.city].filter(Boolean).join(', ') || 'Sin dirección'}
              {inst.system_type ? ` · ${inst.system_type}` : ''}{inst.capacity ? ` · ${inst.capacity}` : ''}
              {inst.installed_at ? ` · instalada el ${formatDate(inst.installed_at)}` : ''}
              {inst.project ? ` · proyecto ${inst.project.code}` : ' · anterior a Pitbox'}
            </p>
          </div>
          {canManage && <button type="button" onClick={() => setEditInst(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Editar</button>}
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Planes de mantenimiento</h3>
          {canManage && <button type="button" onClick={() => setEditPlan({})} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"><Plus className="w-4 h-4" /> Plan</button>}
        </div>
        {data.plans.length === 0 ? (
          <p className="text-sm text-gray-500">Sin planes. Crea uno sobre todo el sistema o sobre un equipo: cada vez que se cierra una visita se programa la siguiente.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.plans.map((p) => (
              <div key={p.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{p.name} <span className="text-xs text-gray-500">· {PLAN_STATUS[p.status]}</span></p>
                  <p className="text-xs text-gray-500">
                    {p.equipment ? p.equipment.name : "Todo el sistema"} · cada {p.frequency_months} mes(es) · {(p.tasks || []).length} tarea(s) · aviso {p.alert_days_before} días antes
                  </p>
                  <p className="text-xs text-gray-500">
                    Próxima: {p.next_visit ? <>{formatDate(p.next_visit.scheduled_date)} <VisitBadge visit={p.next_visit} /></> : '—'}
                    {p.last_visit ? ` · Última: ${formatDate(p.last_visit.done_at)}` : ''}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <button type="button" onClick={() => setEditPlan(p)} title="Editar" disabled={p.status === 'ended'} className="hover:text-orange-700 disabled:opacity-40"><Pencil className="w-4 h-4" /></button>
                    {p.status === 'active' && <button type="button" onClick={() => setPlanStatus(p, 'paused')} title="Pausar" className="hover:text-amber-700"><Pause className="w-4 h-4" /></button>}
                    {p.status !== 'active' && <button type="button" onClick={() => setPlanStatus(p, 'active')} title="Reactivar" className="hover:text-green-700"><Play className="w-4 h-4" /></button>}
                    {p.status !== 'ended' && <button type="button" onClick={() => setPlanStatus(p, 'ended')} title="Finalizar" className="hover:text-red-700"><Square className="w-4 h-4" /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {open.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs text-gray-500 uppercase"><th className="px-4 py-2">Visita pendiente</th><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Técnico</th><th className="px-4 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {open.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2">{v.visit_no} <VisitBadge visit={v} /></td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(v.scheduled_date)}</td>
                  <td className="px-4 py-2">{v.plan?.name}{v.equipment ? ` · ${v.equipment.name}` : ''}</td>
                  <td className="px-4 py-2">{v.technician?.name || '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                    {canVisit && <button type="button" onClick={() => setClosing(v)} className="px-2.5 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700">Cerrar visita</button>}
                    {canManage && <button type="button" onClick={() => setMoving(v)} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Reprogramar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Wrench className="w-4 h-4" /> Equipos de la instalación</h3>
          {canManage && <button type="button" onClick={() => setEditEq({})} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Plus className="w-4 h-4" /> Equipo</button>}
        </div>
        {data.equipment.length === 0 ? (
          <p className="text-sm text-gray-500">Opcional: registra los equipos (inversor, paneles, tablero...) para programarles su propio mantenimiento.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.equipment.map((e) => (
              <li key={e.id} className={`py-2 flex items-center justify-between text-sm ${e.is_active ? '' : 'opacity-50'}`}>
                <span><strong>{e.name}</strong>{[e.brand, e.model].filter(Boolean).length ? ` · ${[e.brand, e.model].filter(Boolean).join(' ')}` : ''}{e.serial ? ` · S/N ${e.serial}` : ''}{e.location ? ` · ${e.location}` : ''}</span>
                {canManage && (
                  <span className="flex items-center gap-3">
                    <button type="button" onClick={() => updateMaintenanceEquipment(inst.id, e.id, { is_active: !e.is_active }).then(load).catch((er) => toast.error(er.response?.data?.message || 'Error'))} className="text-xs text-gray-500 hover:text-orange-700">{e.is_active ? 'Desactivar' : 'Activar'}</button>
                    <button type="button" onClick={() => setEditEq(e)} className="text-gray-400 hover:text-orange-700" title="Editar"><Pencil className="w-4 h-4" /></button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs text-gray-500 uppercase"><th className="px-4 py-2">Historial</th><th className="px-4 py-2">Programada</th><th className="px-4 py-2">Realizada</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Resultado</th><th className="px-4 py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.map((v) => {
                const pending = (v.checklist || []).filter((c) => !c.done).length;
                return (
                  <tr key={v.id}>
                    <td className="px-4 py-2">{v.visit_no} <VisitBadge visit={v} /></td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(v.scheduled_date)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{v.done_at ? formatDate(v.done_at) : '—'}</td>
                    <td className="px-4 py-2">{v.plan?.name}{v.equipment ? ` · ${v.equipment.name}` : ''}</td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
                      {v.status === 'cancelled' ? v.cancel_reason : pending ? `${pending} tarea(s) sin hacer` : 'Checklist completo'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => openMaintenanceVisitPdf(v.id).catch(() => toast.error('No se pudo abrir el acta'))} className="text-gray-400 hover:text-orange-700" title="Acta PDF"><FileText className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EquipmentModal installationId={inst.id} equipment={editEq} onClose={() => setEditEq(null)} onSaved={load} />
      <InstallationFormModal isOpen={editInst} installation={inst} onClose={() => setEditInst(false)} onSaved={load} />
      <PlanModal installationId={inst.id} plan={editPlan} equipment={data.equipment} users={users} onClose={() => setEditPlan(null)} onSaved={load} />
      <CloseVisitModal visit={closing} onClose={() => setClosing(null)} onDone={load} />
      <RescheduleVisitModal visit={moving} users={users} onClose={() => setMoving(null)} onDone={load} />
    </div>
  );
}
