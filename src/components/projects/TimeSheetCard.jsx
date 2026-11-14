import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { getWorkShifts, saveProjectTimeSheet } from '../../api/projects';
import { qty } from './projectConstants';

const inputCls = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const today = () => new Date().toLocaleDateString('en-CA');
const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

/** Horas trabajadas de una fila (mismo cálculo que el backend: pasa la medianoche si la salida es menor). */
function rowHours(r) {
  const s = toMin(r.start_time); const e = toMin(r.end_time);
  if (s === null || e === null || s === e) return 0;
  const span = e > s ? e - s : e + 1440 - s;
  return Math.max(span - (Number(r.break_minutes) || 0), 0) / 60;
}

const emptyRow = (shift) => ({
  employee_id: '', shift_id: shift?.id || '', start_time: shift?.start_time?.slice(0, 5) || '07:00',
  end_time: shift?.end_time?.slice(0, 5) || '16:00', break_minutes: shift ? String(shift.break_minutes) : '60', notes: '',
});

/**
 * Planilla diaria de la obra (Fase 4, req. 1.1): el encargado registra la
 * entrada y salida de su cuadrilla. Guardar reemplaza los horarios de esos
 * trabajadores en esta obra y fecha. Pitbox clasifica después las horas en
 * ordinarias, extra y recargos.
 */
export default function TimeSheetCard({ project, employees, onSaved }) {
  const [shifts, setShifts] = useState([]);
  const [workDate, setWorkDate] = useState(today());
  const [shiftId, setShiftId] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWorkShifts().then((r) => setShifts(r.data || [])).catch(() => setShifts([]));
  }, []);

  const shift = shifts.find((s) => s.id === shiftId) || null;
  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const applyShift = (id) => {
    setShiftId(id);
    const s = shifts.find((x) => x.id === id);
    if (s) setRows((rs) => rs.map((r) => ({ ...r, shift_id: s.id, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), break_minutes: String(s.break_minutes) })));
  };

  const addAll = () => {
    const used = new Set(rows.map((r) => r.employee_id));
    setRows((rs) => [...rs, ...employees.filter((e) => !used.has(e.id)).map((e) => ({ ...emptyRow(shift), employee_id: e.id }))]);
  };

  const save = async () => {
    const valid = rows.filter((r) => r.employee_id);
    if (!valid.length) { toast('Agrega al menos un trabajador'); return; }
    setBusy(true);
    try {
      const res = await saveProjectTimeSheet(project.id, {
        work_date: workDate,
        rows: valid.map((r) => ({ ...r, break_minutes: Number(r.break_minutes) || 0, shift_id: r.shift_id || null })),
      });
      toast.success(res.message);
      setRows([]);
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la planilla');
    } finally {
      setBusy(false);
    }
  };

  const total = rows.reduce((s, r) => s + (r.employee_id ? rowHours(r) : 0), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Planilla diaria (entrada y salida)</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Las horas se clasifican solas en ordinarias, extra y recargos (nocturno desde las 7:00 p. m., domingos y festivos) y se pueden llevar a la nómina como novedades.
          Si la salida es menor que la entrada, el turno pasa la medianoche. Guardar reemplaza el horario de esos trabajadores en esta obra ese día.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha</label>
          <input type="date" value={workDate} max={today()} onChange={(e) => setWorkDate(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:w-64">
          <label className="block text-xs text-gray-500 mb-1">Turno</label>
          <select value={shiftId} onChange={(e) => applyShift(e.target.value)} className={inputCls}>
            <option value="">Horario manual</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow(shift)])} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Trabajador</button>
          <button type="button" onClick={addAll} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Todos</button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-2 py-2 min-w-[180px]">Trabajador</th><th className="px-2 py-2">Entrada</th><th className="px-2 py-2">Salida</th>
                <th className="px-2 py-2">Descanso (min)</th><th className="px-2 py-2 text-right">Horas</th><th className="px-2 py-2 min-w-[140px]">Actividad</th><th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((r, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <select value={r.employee_id} onChange={(e) => setRow(i, { employee_id: e.target.value })} className={inputCls}>
                      <option value="">Elige...</option>
                      {employees.map((e) => <option key={e.id} value={e.id} disabled={rows.some((x, j) => j !== i && x.employee_id === e.id)}>{e.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input type="time" value={r.start_time} onChange={(e) => setRow(i, { start_time: e.target.value, shift_id: '' })} className={inputCls} /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.end_time} onChange={(e) => setRow(i, { end_time: e.target.value, shift_id: '' })} className={inputCls} /></td>
                  <td className="px-2 py-1.5"><input type="number" min="0" max="480" step="5" value={r.break_minutes} onChange={(e) => setRow(i, { break_minutes: e.target.value })} className={`${inputCls} w-20`} /></td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{qty(rowHours(r))}</td>
                  <td className="px-2 py-1.5"><input value={r.notes} onChange={(e) => setRow(i, { notes: e.target.value })} className={inputCls} placeholder="Opcional" /></td>
                  <td className="px-2 py-1.5 text-right">
                    <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" title="Quitar"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">{rows.filter((r) => r.employee_id).length} trabajador(es) · {qty(total)} h</p>
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Guardando…' : 'Guardar planilla'}
          </button>
        </div>
      )}
    </div>
  );
}
