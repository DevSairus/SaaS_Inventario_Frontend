// frontend/src/pages/workshop/productivity/TechnicianProductivityPage.jsx
//
// Productividad de técnicos = horas tempario de las OT terminadas (listo o
// entregado) en el periodo ÷ horas disponibles según su jornada, sin festivos
// ni ausencias. No depende de nómina. Backend: services/workshop/laborTimes.service.js.
import { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp, Calendar, ChevronDown, ChevronUp, Loader2, AlertTriangle, CalendarClock, Trash2, Plus, Save } from 'lucide-react';
import Layout from '../../../components/layout/Layout';
import Modal from '../../../components/common/Modal';
import { laborTimesAPI, WEEKDAYS, ABSENCE_REASONS } from '../../../api/laborTimes';
import { formatCurrency } from '../../../utils/formatters';

const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fmtH = (h) => Number(h || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 });
const pctColor = (p) => (p == null ? 'bg-gray-300' : p >= 85 ? 'bg-green-500' : p >= 60 ? 'bg-amber-500' : 'bg-red-500');
const pctText = (p) => (p == null ? 'text-gray-400' : p >= 85 ? 'text-green-700' : p >= 60 ? 'text-amber-700' : 'text-red-600');

function Detail({ techId, from, to }) {
  const [lines, setLines] = useState(null);
  useEffect(() => {
    laborTimesAPI.productivityDetail(techId, { from, to }).then((r) => setLines(r.data.data)).catch(() => setLines([]));
  }, [techId, from, to]);
  if (!lines) return <div className="py-4 text-center text-gray-400 text-sm">Cargando…</div>;
  if (!lines.length) return <div className="py-4 text-center text-gray-400 text-sm">Sin trabajos terminados en el periodo.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-graphite-2">
          <tr>{['Terminada', 'OT', 'Servicio', 'Cant.', 'Horas c/u', 'Horas', 'Valor'].map((h, i) => (
            <th key={h} className={`px-2 py-1.5 font-medium text-gray-500 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/10">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="px-2 py-1.5 whitespace-nowrap">{l.finished_on}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{l.order_number}</td>
              <td className="px-2 py-1.5">{l.product_name}</td>
              <td className="px-2 py-1.5 text-right">{fmtH(l.quantity)}</td>
              <td className="px-2 py-1.5 text-right">{l.standard_hours != null ? fmtH(l.standard_hours) : <span className="text-amber-600">sin tiempo</span>}</td>
              <td className="px-2 py-1.5 text-right font-medium">{fmtH(l.hours)}</td>
              <td className="px-2 py-1.5 text-right">{formatCurrency(l.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchedulesModal({ isOpen, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [form, setForm] = useState({ user_id: '', start_date: '', end_date: '', reason: 'vacaciones', notes: '' });

  const load = async () => {
    try {
      const [s, a] = await Promise.all([laborTimesAPI.listSchedules(), laborTimesAPI.listAbsences()]);
      setData(s.data.data);
      setAbsences(a.data.data);
    } catch {
      toast.error('No se pudieron cargar las jornadas');
    }
  };
  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  const setTech = (userId, patch) => setData((d) => ({ ...d, technicians: d.technicians.map((t) => (t.user_id === userId ? { ...t, ...patch, dirty: true } : t)) }));
  const saveTech = async (t) => {
    setSavingId(t.user_id);
    try {
      await laborTimesAPI.saveSchedule(t.user_id, { hours_by_weekday: t.hours_by_weekday, skip_holidays: t.skip_holidays, is_active: t.is_active });
      setTech(t.user_id, { dirty: false, configured: true });
      toast.success('Jornada guardada');
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingId(null);
    }
  };
  const addAbsence = async () => {
    try {
      await laborTimesAPI.createAbsence(form);
      setForm({ ...form, start_date: '', end_date: '', notes: '' });
      setAbsences((await laborTimesAPI.listAbsences()).data.data);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la ausencia');
    }
  };
  const removeAbsence = async (id) => {
    try {
      await laborTimesAPI.deleteAbsence(id);
      setAbsences((a) => a.filter((x) => x.id !== id));
      onChanged();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };
  const nameOf = (id) => data?.technicians.find((t) => t.user_id === id)?.name || '—';
  const input = 'border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm dark:bg-graphite-2';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Jornadas y ausencias de técnicos" size="xl">
      {!data ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div> : (
        <div className="space-y-6 text-sm">
          <section>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Horas por día de cada técnico. Sin jornada propia se usa la de la empresa (Tempario). Aparecen los usuarios con rol Técnico;
              para medir a otra persona, asígnala como técnico en una OT y configúrale la jornada aquí.
            </p>
            {data.technicians.length === 0 ? <p className="text-gray-400">No hay usuarios con rol Técnico.</p> : (
              <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-graphite-2">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs text-gray-500">Técnico</th>
                      {WEEKDAYS.map(([d, l]) => <th key={d} className="px-1 py-1.5 text-xs text-gray-500">{l}</th>)}
                      <th className="px-2 py-1.5 text-xs text-gray-500" title="Descontar festivos de Colombia">Festivos</th>
                      <th className="px-2 py-1.5 text-xs text-gray-500" title="Medir su productividad">Medir</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {data.technicians.map((t) => (
                      <tr key={t.user_id}>
                        <td className="px-2 py-1.5 whitespace-nowrap">{t.name}{!t.configured && <span className="block text-[11px] text-gray-400">jornada de la empresa</span>}</td>
                        {WEEKDAYS.map(([d]) => (
                          <td key={d} className="px-1 py-1.5">
                            <input type="number" min="0" max="24" step="0.5" value={t.hours_by_weekday[d] ?? 0}
                              onChange={(e) => setTech(t.user_id, { hours_by_weekday: { ...t.hours_by_weekday, [d]: e.target.value === '' ? 0 : Number(e.target.value) } })}
                              className={`${input} w-14 text-center`} />
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={t.skip_holidays} onChange={(e) => setTech(t.user_id, { skip_holidays: e.target.checked })} /></td>
                        <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={t.is_active} onChange={(e) => setTech(t.user_id, { is_active: e.target.checked })} /></td>
                        <td className="px-2 py-1.5 text-right">
                          {t.dirty && (
                            <button onClick={() => saveTech(t)} disabled={savingId === t.user_id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-60">
                              {savingId === t.user_id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Ausencias</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-2">Vacaciones, incapacidades o permisos: esos días no cuentan como horas disponibles.</p>
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className={input}>
                <option value="">Técnico…</option>
                {data.technicians.map((t) => <option key={t.user_id} value={t.user_id}>{t.name}</option>)}
              </select>
              <label className="text-xs text-gray-500">Desde<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={`${input} block`} /></label>
              <label className="text-xs text-gray-500">Hasta<input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={`${input} block`} /></label>
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={input}>
                {Object.entries(ABSENCE_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Nota (opcional)" className={`${input} flex-1 min-w-[140px]`} />
              <button onClick={addAbsence} disabled={!form.user_id || !form.start_date || !form.end_date}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"><Plus size={14} /> Agregar</button>
            </div>
            {absences.length === 0 ? <p className="text-gray-400">Sin ausencias registradas.</p> : (
              <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg divide-y divide-gray-100 dark:divide-white/10">
                {absences.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-1.5">
                    <span>{nameOf(a.user_id)} · {ABSENCE_REASONS[a.reason] || a.reason} · {a.start_date}{a.end_date !== a.start_date ? ` a ${a.end_date}` : ''}{a.notes ? ` · ${a.notes}` : ''}</span>
                    <button onClick={() => removeAbsence(a.id)} className="text-gray-400 hover:text-red-600" title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

export default function TechnicianProductivityPage() {
  const today = localToday();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showSchedules, setShowSchedules] = useState(false);

  const load = async () => {
    setLoading(true);
    setExpanded(null);
    try {
      const res = await laborTimesAPI.productivity({ from, to });
      setData(res.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo calcular la productividad');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = data?.totals;
  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl"><TrendingUp size={22} className="text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Productividad de técnicos</h1>
              <p className="text-sm text-gray-500">Horas del tempario en trabajos terminados ÷ horas disponibles de su jornada</p>
            </div>
          </div>
          <button onClick={() => setShowSchedules(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5">
            <CalendarClock size={15} /> Jornadas y ausencias
          </button>
        </div>

        <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2" />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2" />
          </label>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            <Calendar size={15} /> {loading ? 'Calculando…' : 'Aplicar'}
          </button>
          {data && data.available_until < data.to && (
            <p className="text-xs text-gray-500">Horas disponibles contadas hasta hoy ({data.available_until}).</p>
          )}
        </div>

        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Horas tempario', fmtH(totals.tempario_hours), 'trabajos terminados'],
              ['Horas disponibles', fmtH(totals.available_hours), 'jornada sin festivos ni ausencias'],
              ['Productividad', totals.productivity_pct != null ? `${fmtH(totals.productivity_pct)} %` : '—', 'del taller'],
              ['Mano de obra', formatCurrency(totals.labor_value), 'antes de IVA'],
            ].map(([label, value, sub]) => (
              <div key={label} className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {(totals?.lines_without_hours > 0 || data?.unassigned?.lines > 0) && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              {totals.lines_without_hours > 0 && <p>{totals.lines_without_hours} línea(s) de mano de obra sin tiempo de tempario: no suman horas. Configura el tiempo del servicio en Tempario (las OT nuevas lo tomarán).</p>}
              {data.unassigned.lines > 0 && <p>{data.unassigned.lines} línea(s) sin técnico asignado ({fmtH(data.unassigned.tempario_hours)} h, {formatCurrency(data.unassigned.labor_value)}).</p>}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
          {loading && !data ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : !data?.rows?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">Sin técnicos ni trabajos en el periodo. Los técnicos son los usuarios con rol Técnico o los asignados en las OT.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-graphite-2">
                  <tr>{['Técnico', 'OT', 'Horas tempario', 'Horas disponibles', 'Productividad', 'Mano de obra', ''].map((h, i) => (
                    <th key={h || i} className={`px-3 py-2 text-xs font-medium text-gray-500 uppercase ${i === 0 ? 'text-left' : i === 4 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {data.rows.map((r) => {
                    const open = expanded === r.technician_id;
                    return (
                      <Fragment key={r.technician_id}>
                        <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => setExpanded(open ? null : r.technician_id)}>
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                            {r.lines_without_hours > 0 && <span className="ml-2 text-xs text-amber-600" title="Líneas sin tiempo de tempario">{r.lines_without_hours} sin tiempo</span>}
                          </td>
                          <td className="px-3 py-2 text-right">{r.orders}</td>
                          <td className="px-3 py-2 text-right font-medium">{fmtH(r.tempario_hours)}</td>
                          <td className="px-3 py-2 text-right" title={r.absent_hours ? `${fmtH(r.absent_hours)} h de ausencias descontadas` : ''}>
                            {fmtH(r.available_hours)}{r.absent_hours > 0 && <span className="block text-[11px] text-gray-400">−{fmtH(r.absent_hours)} ausencias</span>}
                          </td>
                          <td className="px-3 py-2 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full ${pctColor(r.productivity_pct)}`} style={{ width: `${Math.min(r.productivity_pct || 0, 100)}%` }} />
                              </div>
                              <span className={`text-sm font-semibold w-14 text-right ${pctText(r.productivity_pct)}`}>{r.productivity_pct != null ? `${fmtH(r.productivity_pct)}%` : '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(r.labor_value)}</td>
                          <td className="px-3 py-2 text-right text-gray-400">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                        </tr>
                        {open && (
                          <tr><td colSpan={7} className="px-3 pb-3 bg-gray-50/50 dark:bg-white/5"><Detail techId={r.technician_id} from={data.from} to={data.to} /></td></tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Cuentan las OT en estado Listo o Entregado según su fecha de terminación, con el técnico de cada línea (o el de la OT). Verde ≥ 85 %, ámbar 60–85 %, rojo &lt; 60 %.
        </p>
      </div>
      <SchedulesModal isOpen={showSchedules} onClose={() => setShowSchedules(false)} onChanged={() => {}} />
    </Layout>
  );
}
