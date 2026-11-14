import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Pencil, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import { usePermissions } from '../../store/tenantPermissionsStore';
import HoursDistributionTable from '../../components/projects/HoursDistributionTable';
import { createWorkShift, getHoursDistribution, getWorkShifts, updateWorkShift } from '../../api/projects';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const today = () => new Date().toLocaleDateString('en-CA');
const monthStart = () => `${today().slice(0, 8)}01`;
const hhmm = (t) => String(t || '').slice(0, 5);

function ShiftModal({ shift, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', start_time: '07:00', end_time: '16:00', break_minutes: '60' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (shift) setForm(shift.id ? { name: shift.name, start_time: hhmm(shift.start_time), end_time: hhmm(shift.end_time), break_minutes: String(shift.break_minutes) } : { name: '', start_time: '07:00', end_time: '16:00', break_minutes: '60' });
  }, [shift]);
  if (!shift) return null;
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...form, break_minutes: Number(form.break_minutes) || 0 };
      const r = shift.id ? await updateWorkShift(shift.id, body) : await createWorkShift(body);
      toast.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar el turno');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={shift.id ? 'Editar turno' : 'Nuevo turno'} size="sm">
      <div className="space-y-3">
        <div><label className="block text-sm font-medium mb-1">Nombre</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ej. Diurno obra" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Entrada</label><input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Salida</label><input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Descanso (min)</label><input type="number" min="0" max="480" step="5" value={form.break_minutes} onChange={(e) => setForm((f) => ({ ...f, break_minutes: e.target.value }))} className={inputCls} /></div>
        </div>
        <p className="text-xs text-gray-500">Si la salida es menor que la entrada, el turno pasa la medianoche (turno nocturno).</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Horarios de obra (Fase 4, req. 1.1): distribución de horas por empleado y
 * proyecto, clasificadas en ordinarias, extra y recargos, y turnos de la empresa.
 */
export default function WorkHoursPage() {
  const can = usePermissions();
  const canManage = can('projects.manage');
  const [range, setRange] = useState({ from: monthStart(), to: today() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [editing, setEditing] = useState(null);

  const loadShifts = useCallback(() => {
    getWorkShifts({ all: true }).then((r) => setShifts(r.data || [])).catch(() => setShifts([]));
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);
  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return;
    setLoading(true);
    getHoursDistribution(range)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || 'No se pudo cargar la distribución'))
      .finally(() => setLoading(false));
  }, [range]);

  const toggleShift = async (s) => {
    try {
      await updateWorkShift(s.id, { is_active: !s.is_active });
      loadShifts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar el turno');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Clock className="w-6 h-6" /> Horarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Horas de la planilla de las obras por empleado y proyecto. La hora extra se cuenta sumando todas las obras del trabajador en el día;
            se pasan a la nómina desde el período ("Horas de proyectos").
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div><label className="block text-xs text-gray-500 mb-1">Desde</label><input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className={inputCls} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Hasta</label><input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className={inputCls} /></div>
            {loading && <span className="text-sm text-gray-500 sm:pb-2">Cargando…</span>}
          </div>
          <HoursDistributionTable data={data} />
          <p className="text-xs text-gray-500">Toca un empleado para ver sus horas por proyecto.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Turnos</h2>
              <p className="text-xs text-gray-500">Precargan la entrada, la salida y el descanso en la planilla diaria de la obra.</p>
            </div>
            {canManage && (
              <button type="button" onClick={() => setEditing({})} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"><Plus className="w-4 h-4" /> Turno</button>
            )}
          </div>
          {shifts.length === 0 ? (
            <p className="text-sm text-gray-500">Sin turnos. La planilla igual permite escribir el horario a mano.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {shifts.map((s) => (
                <li key={s.id} className={`flex items-center justify-between py-2 text-sm ${s.is_active ? '' : 'opacity-50'}`}>
                  <span><strong>{s.name}</strong> · {hhmm(s.start_time)}–{hhmm(s.end_time)}{s.break_minutes ? ` · descanso ${s.break_minutes} min` : ''}</span>
                  {canManage && (
                    <span className="flex items-center gap-3">
                      <button type="button" onClick={() => toggleShift(s)} className="text-xs text-gray-500 hover:text-orange-700">{s.is_active ? 'Desactivar' : 'Activar'}</button>
                      <button type="button" onClick={() => setEditing(s)} className="text-gray-400 hover:text-orange-700" title="Editar"><Pencil className="w-4 h-4" /></button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ShiftModal shift={editing} onClose={() => setEditing(null)} onSaved={loadShifts} />
    </Layout>
  );
}
