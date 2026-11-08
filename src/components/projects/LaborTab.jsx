import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Trash2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { usePermissions } from '../../store/tenantPermissionsStore';
import {
  getProjectTimeEntries, addProjectTimeEntry, deleteProjectTimeEntry, getLaborEmployees, getLaborPeriods, allocateLaborPeriod,
} from '../../api/projects';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { qty } from './projectConstants';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const empName = (e) => (e ? [e.first_name, e.other_names, e.first_surname, e.second_surname].filter(Boolean).join(' ') : '');
const today = () => new Date().toLocaleDateString('en-CA');

/**
 * Mano de obra del proyecto: horas por empleado y, para quien ve costos, el
 * reparto de la nómina (services/projects/projectLabor.service.js).
 */
export default function LaborTab({ project, canSeeCosts, onChanged }) {
  const user = useAuthStore((s) => s.user);
  const can = usePermissions();
  const canWrite = can('projects.time.write') && !['closed', 'cancelled'].includes(project.status);
  const canAllocate = can('projects.manage');
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [form, setForm] = useState({ employee_id: '', work_date: today(), hours: '8', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getProjectTimeEntries(project.id).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Error al cargar las horas'));
  }, [project.id]);

  useEffect(() => {
    load();
    if (canWrite) getLaborEmployees().then((r) => setEmployees(r.data || [])).catch(() => {});
    if (canAllocate && canSeeCosts) getLaborPeriods().then((r) => { setPeriods(r.data || []); setPeriodId(r.data?.[0]?.id || ''); }).catch(() => {});
  }, [load, canWrite, canAllocate, canSeeCosts]);

  const add = async () => {
    if (!form.employee_id) { toast('Elige el empleado'); return; }
    setBusy(true);
    try {
      await addProjectTimeEntry(project.id, { ...form, hours: Number(form.hours) });
      toast.success('Horas registradas');
      setForm((f) => ({ ...f, notes: '' }));
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron registrar las horas');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry) => {
    if (!window.confirm('¿Eliminar este registro de horas?')) return;
    try {
      await deleteProjectTimeEntry(project.id, entry.id);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const allocate = async () => {
    if (!periodId) return;
    const p = periods.find((x) => x.id === periodId);
    if (p?.allocated && !window.confirm('Ese periodo ya se repartió. ¿Repartirlo de nuevo con las horas actuales? Reemplaza el reparto anterior en todos los proyectos.')) return;
    setBusy(true);
    try {
      const res = await allocateLaborPeriod(periodId);
      const d = res.data;
      // Sin horas con fecha dentro del periodo no hay nada que repartir: decir qué fechas se buscaron.
      if (!d.employees) {
        toast.error(`No hay horas registradas entre el ${formatDate(d.period.start_date)} y el ${formatDate(d.period.end_date)} en ningún proyecto. Elige el periodo de nómina que cubre las fechas de las horas.`, { duration: 9000 });
        getLaborPeriods().then((r) => setPeriods(r.data || [])).catch(() => {});
        return;
      }
      toast.success(`${res.message}. Repartido ${formatCurrency(d.allocated)}; queda como gasto general ${formatCurrency(d.overhead)}.`, { duration: 6000 });
      // Contabilidad: asiento de reclasificación a las obras (o por qué no se hizo).
      if (d.accounting?.status === 'posted') toast.success(`Contabilidad: ${d.accounting.message}`, { duration: 7000 });
      else if (d.accounting?.status === 'error') toast.error(`Contabilidad: ${d.accounting.message}`, { duration: 8000 });
      else if (d.accounting?.message && !/Sin módulo/.test(d.accounting.message)) toast(`Contabilidad: ${d.accounting.message}`, { duration: 8000 });
      if (d.employees_without_payroll) toast(`${d.employees_without_payroll} empleado(s) con horas no tienen nómina en ese periodo`, { icon: '⚠️' });
      load();
      getLaborPeriods().then((r) => setPeriods(r.data || [])).catch(() => {});
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo repartir la nómina');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  const totalHours = data.entries.reduce((s, e) => s + Number(e.hours), 0);
  const totalLabor = data.allocations.reduce((s, a) => s + Number(a.amount), 0);
  const pending = data.pending;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-xs text-gray-500">Horas registradas</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{qty(totalHours)} h</p>
        </div>
        {canSeeCosts && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-xs text-gray-500">Costo repartido de la nómina</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(totalLabor)}</p>
          </div>
        )}
        {canSeeCosts && pending?.hours > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/40 px-4 py-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">Estimado de {qty(pending.hours)} h sin nómina repartida</p>
            <p className="text-xl font-bold text-amber-900 dark:text-amber-200 tabular-nums">{formatCurrency(pending.amount)}</p>
          </div>
        )}
      </div>

      {canSeeCosts && pending?.by_employee?.length > 0 && (
        <div className="text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 rounded-lg px-4 py-3">
          <p>
            Estas horas todavía no tienen costo real: se estiman con el costo por hora de cada empleado
            (salario + aportes + prestaciones de un mes completo / horas del mes) y ya cuentan en el estado de resultados del proyecto.
            Al liquidar la nómina y repartir el periodo, se reemplazan por el costo real.
          </p>
          <ul className="mt-1 text-xs space-y-0.5">
            {pending.by_employee.map((e) => (
              <li key={e.employee_id}>{e.name}: {qty(e.hours)} h × {formatCurrency(e.hourly_cost)} = <strong>{formatCurrency(e.amount)}</strong></li>
            ))}
          </ul>
        </div>
      )}

      {canWrite && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Registrar horas</h3>
          {employees.length === 0 ? (
            <p className="text-sm text-gray-500">No hay empleados activos. Créalos en Nómina → Empleados para registrarles horas.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Empleado</label>
                <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className={inputCls}>
                  <option value="">Elige...</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                <input type="date" value={form.work_date} max={today()} onChange={(e) => setForm((f) => ({ ...f, work_date: e.target.value }))} className={inputCls} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Horas</label>
                <input type="number" min="0.25" max="24" step="0.25" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} className={inputCls} />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Actividad</label>
                <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Ej. Montaje de estructura" />
              </div>
              <div className="md:col-span-2">
                <button onClick={add} disabled={busy} className="w-full px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">Registrar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {canAllocate && canSeeCosts && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Repartir la nómina entre proyectos</h3>
          <p className="text-sm text-gray-500 mb-3">
            El costo de cada empleado en el periodo (devengado + aportes del empleador + provisiones) se reparte entre los proyectos según sus horas.
            La base es la jornada del periodo: lo que no cubren las horas registradas queda como gasto general. Afecta a todos los proyectos del periodo.
          </p>
          {periods.length === 0 ? (
            <p className="text-sm text-gray-500">No hay periodos de nómina liquidados.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className={`${inputCls} sm:max-w-md`}>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.start_date)} a {formatDate(p.end_date)} · {p.status}{p.allocated ? ` · repartido ${formatCurrency(p.allocated)}` : ' · sin repartir'}
                  </option>
                ))}
              </select>
              <button onClick={allocate} disabled={busy} className="px-4 py-2 text-sm border border-orange-300 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-60">Repartir periodo</button>
            </div>
          )}
        </div>
      )}

      {canSeeCosts && data.allocations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2">Periodo</th><th className="px-4 py-2">Empleado</th><th className="px-4 py-2 text-right">Horas</th>
                <th className="px-4 py-2 text-right">% de su costo</th><th className="px-4 py-2 text-right">Costo del periodo</th><th className="px-4 py-2 text-right">Al proyecto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.allocations.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{a.period ? `${formatDate(a.period.start_date)} – ${formatDate(a.period.end_date)}` : formatDate(a.period_end)}</td>
                  <td className="px-4 py-2">{empName(a.employee)}</td>
                  <td className="px-4 py-2 text-right">{qty(a.hours)} <span className="text-xs text-gray-500">/ {qty(a.base_hours)}</span></td>
                  <td className="px-4 py-2 text-right">{Number(a.percentage).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums" title={`Devengado ${formatCurrency(a.breakdown?.devengado)} · aportes ${formatCurrency(a.breakdown?.aportes)} · provisiones ${formatCurrency(a.breakdown?.provisiones)}`}>{formatCurrency(a.employee_cost)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatCurrency(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Empleado</th><th className="px-4 py-2 text-right">Horas</th><th className="px-4 py-2">Actividad</th><th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.entries.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Sin horas registradas.</td></tr>}
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2 whitespace-nowrap">{formatDate(e.work_date)}</td>
                <td className="px-4 py-2">{empName(e.employee)}</td>
                <td className="px-4 py-2 text-right">{qty(e.hours)}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{e.notes || '—'}</td>
                <td className="px-4 py-2 text-right">
                  {canWrite && (can('projects.manage') || e.created_by === user?.id) && (
                    <button onClick={() => remove(e)} className="text-gray-400 hover:text-red-600" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
