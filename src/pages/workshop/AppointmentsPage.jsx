// frontend/src/pages/workshop/AppointmentsPage.jsx
// Agenda de citas del taller (staff). Mismo lenguaje visual que la agenda
// pública (/agendar): encabezado sky, tarjetas rounded-2xl, chips de estado.
// Desde acá se crea (NewAppointmentModal, sin pasar por el link público),
// confirma, reagenda (RescheduleAppointmentModal), recuerda, cancela y
// convierte a OT.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarClock, CalendarDays, Check, Clock, Copy, MessageCircle, Phone,
  Settings, Wrench, X, BellRing, Globe, UserRound, RotateCcw, Inbox, CalendarPlus,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import AppointmentMiniCalendar from '../../components/workshop/AppointmentMiniCalendar';
import RescheduleAppointmentModal from '../../components/workshop/RescheduleAppointmentModal';
import NewAppointmentModal from '../../components/workshop/NewAppointmentModal';
import { appointmentsApi } from '../../api/workshopAppointments';
import { toLocalDateString } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';

const STATUS = {
  pendiente:  { label: 'Por confirmar', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/40', bar: 'bg-amber-400' },
  confirmada: { label: 'Confirmada',    dot: 'bg-sky-500',   cls: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/40', bar: 'bg-sky-500' },
  completada: { label: 'Atendida',      dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/40', bar: 'bg-emerald-500' },
  cancelada:  { label: 'Cancelada',     dot: 'bg-red-400',   cls: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/40', bar: 'bg-red-300' },
  no_asistio: { label: 'No asistió',    dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-gray-400 dark:ring-white/10', bar: 'bg-slate-300' },
};
const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'pendiente', label: 'Por confirmar' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'completada', label: 'Atendidas' },
  { key: 'cancelada', label: 'Canceladas' },
];

const dayKeyOf = (scheduled_at) => (scheduled_at ? toLocalDateString(new Date(scheduled_at)) : null);
const timeOf = (d) => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
const shortDateOf = (d) => new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

// ── Modales ────────────────────────────────────────────────────────────────

// Completar placa + datos del vehículo cuando la cita se agendó sin esa
// información (la reserva pública no la exige) y el staff la convierte a OT.
function VehicleDataModal({ onSubmit, onClose, submitting }) {
  const [form, setForm] = useState({ vehicle_plate: '', vehicle_brand: '', vehicle_model: '' });
  const [error, setError] = useState(null);
  const inputCls = 'w-full text-sm border border-slate-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500';

  const handleSubmit = () => {
    if (!form.vehicle_plate.trim()) { setError('La placa es requerida.'); return; }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-graphite rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100">Registrar vehículo</h3>
        <p className="text-xs text-slate-500 dark:text-gray-500">Esta cita no tiene placa registrada. Ingresa los datos del vehículo para crear la Orden de Trabajo.</p>
        <input type="text" placeholder="Placa *" value={form.vehicle_plate} className={`${inputCls} uppercase`}
          onChange={e => setForm({ ...form, vehicle_plate: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Marca" value={form.vehicle_brand} className={inputCls}
            onChange={e => setForm({ ...form, vehicle_brand: e.target.value })} />
          <input type="text" placeholder="Modelo" value={form.vehicle_model} className={inputCls}
            onChange={e => setForm({ ...form, vehicle_model: e.target.value })} />
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-gray-400 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60">
            {submitting ? 'Creando…' : 'Registrar y crear OT'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Reemplaza el window.prompt anterior: motivo + opción de avisar al cliente.
function CancelAppointmentModal({ appointment, onConfirm, onClose, submitting }) {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-graphite rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100">Cancelar cita</h3>
        <p className="text-xs text-slate-500 dark:text-gray-500 capitalize">
          {appointment.customer_name} · {shortDateOf(appointment.scheduled_at)} · {timeOf(appointment.scheduled_at)}
        </p>
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (opcional, se le envía al cliente)"
          className="w-full text-sm border border-slate-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 accent-sky-600" />
          Avisar al cliente por WhatsApp
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-gray-400 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5">Volver</button>
          <button onClick={() => onConfirm(reason, notify)} disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60">
            {submitting ? 'Cancelando…' : 'Cancelar cita'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de cita ────────────────────────────────────────────────────────
function AppointmentCard({ appointment, busy, onConfirm, onReschedule, onReminder, onCancel, onConvert, onOpenOrder }) {
  const st = STATUS[appointment.status] || STATUS.pendiente;
  const active = ['pendiente', 'confirmada'].includes(appointment.status);
  const vehicle = [appointment.vehicle_brand, appointment.vehicle_model].filter(Boolean).join(' ');
  const phoneDigits = String(appointment.customer_phone || '').replace(/\D/g, '');
  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition disabled:opacity-50';
  const btnGhost = `${btn} text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 dark:text-gray-300 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5`;

  return (
    <div className={`relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-graphite dark:border-white/10 ${!active ? 'opacity-80' : ''}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${st.bar}`} />
      <div className="flex gap-4 p-4 pl-5">
        {/* Hora */}
        <div className="shrink-0 w-16 text-center">
          <p className={`text-lg font-bold leading-tight text-slate-900 dark:text-gray-100 ${appointment.status === 'cancelada' ? 'line-through decoration-2 text-slate-400' : ''}`}>
            {timeOf(appointment.scheduled_at)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 inline-flex items-center gap-1">
            <Clock size={11} /> {appointment.duration_minutes} min
          </p>
        </div>

        {/* Detalle */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-gray-100 truncate">{appointment.customer_name}</p>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ${st.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-gray-500" title={appointment.source === 'public' ? 'Agendada por el cliente desde el link público' : 'Agendada por el taller'}>
              {appointment.source === 'public' ? <Globe size={11} /> : <UserRound size={11} />}
              {appointment.source === 'public' ? 'Web' : 'Taller'}
            </span>
            {appointment.rescheduled_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full dark:bg-violet-900/30 dark:text-violet-300"
                title={appointment.previous_scheduled_at ? `Antes: ${shortDateOf(appointment.previous_scheduled_at)} ${timeOf(appointment.previous_scheduled_at)}` : undefined}>
                <RotateCcw size={11} /> Reagendada{appointment.rescheduled_count > 1 ? ` ×${appointment.rescheduled_count}` : ''}
              </span>
            )}
            {appointment.reminder_sent_at && active && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-gray-500">
                <BellRing size={11} /> Recordada
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-gray-400">
            {phoneDigits && (
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-600">
                <Phone size={12} /> {appointment.customer_phone}
              </a>
            )}
            {appointment.vehicle_plate ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono font-bold tracking-wide text-slate-800 bg-yellow-100 border border-yellow-300 rounded px-1.5 py-px dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700/50">
                  {appointment.vehicle_plate}
                </span>
                {vehicle && <span className="truncate">{vehicle}</span>}
              </span>
            ) : (
              <span className="italic text-slate-400">Sin placa</span>
            )}
          </div>

          {appointment.service_description && (
            <p className="text-xs text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 line-clamp-2">{appointment.service_description}</p>
          )}
          {appointment.status === 'cancelada' && appointment.cancelled_reason && (
            <p className="text-xs text-red-600 dark:text-red-400">Motivo: {appointment.cancelled_reason}</p>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-1">
            {appointment.status === 'pendiente' && (
              <button disabled={busy} onClick={onConfirm} className={`${btn} text-white bg-sky-600 hover:bg-sky-700 shadow-sm shadow-sky-600/20`}>
                <Check size={14} /> Confirmar
              </button>
            )}
            {appointment.status === 'confirmada' && (
              <button disabled={busy} onClick={onConvert} className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20`}>
                <Wrench size={14} /> Recibir · Crear OT
              </button>
            )}
            {active && (
              <button disabled={busy} onClick={onReschedule} className={btnGhost}>
                <CalendarClock size={14} /> Reagendar
              </button>
            )}
            {appointment.status === 'confirmada' && (
              <button disabled={busy} onClick={onReminder} className={btnGhost}>
                <MessageCircle size={14} /> Recordatorio
              </button>
            )}
            {active && (
              <button disabled={busy} onClick={onCancel} className={`${btn} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20`}>
                <X size={14} /> Cancelar
              </button>
            )}
            {appointment.converted_to_work_order_id && (
              <button onClick={onOpenOrder} className={`${btn} text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/20`}>
                <Wrench size={14} /> Ver OT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tenantSlug } = useTenantStore();
  const canConfigure = ['admin', 'manager'].includes(user?.role);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [monthAppointments, setMonthAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [plateModalFor, setPlateModalFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const todayKey = toLocalDateString(new Date());

  // Trae todo el mes visible (incluye días del mes anterior/siguiente que
  // completan la semana) sin filtrar por estado -- el estado se distingue
  // por el color del punto; filtrar aquí escondería citas del calendario.
  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const from = format(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const to = format(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const res = await appointmentsApi.list({ from_date: from, to_date: `${to}T23:59:59` });
      setMonthAppointments(res.data.data);
    } catch {
      toast.error('No se pudieron cargar las citas');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map();
    for (const a of monthAppointments) {
      const key = dayKeyOf(a.scheduled_at);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [monthAppointments]);

  const selectedDayKey = selectedDay ? toLocalDateString(selectedDay) : null;
  const dayAll = (selectedDayKey ? (appointmentsByDay.get(selectedDayKey) || []) : [])
    .slice()
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const dayVisible = dayAll.filter(a => !statusFilter || a.status === statusFilter);
  const countBy = (list, status) => list.filter(a => a.status === status).length;

  // Resumen del encabezado: hoy + lo que falta por confirmar (a futuro).
  const now = new Date();
  const todayList = appointmentsByDay.get(todayKey) || [];
  const upcomingPending = monthAppointments
    .filter(a => a.status === 'pendiente' && new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const goToDay = (date) => {
    const d = new Date(date);
    setSelectedDay(d);
    if (!isSameMonth(d, month)) setMonth(startOfMonth(d));
  };

  // Si el tenant tiene WhatsApp Cloud API conectado el mensaje ya salió
  // directo (channel: 'cloud_api', sin waLink); si no, abre el link wa.me
  // para que el asesor lo mande desde su propio WhatsApp.
  const openWaLink = (wa) => {
    if (wa?.channel === 'cloud_api') toast.success('Mensaje enviado por WhatsApp');
    else if (wa?.waLink) window.open(wa.waLink, '_blank');
  };

  const handleConfirm = async (appointment) => {
    setBusyId(appointment.id);
    try {
      await appointmentsApi.confirm(appointment.id);
      const wa = await appointmentsApi.sendWhatsApp(appointment.id, 'confirmacion');
      openWaLink(wa.data);
      toast.success('Cita confirmada');
      loadMonth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al confirmar la cita');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (reason, notify) => {
    const appointment = cancelFor;
    setBusyId(appointment.id);
    try {
      await appointmentsApi.cancel(appointment.id, reason);
      if (notify) {
        const wa = await appointmentsApi.sendWhatsApp(appointment.id, 'cancelacion');
        openWaLink(wa.data);
      }
      toast.success('Cita cancelada');
      setCancelFor(null);
      loadMonth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cancelar la cita');
    } finally {
      setBusyId(null);
    }
  };

  const handleReminder = async (appointment) => {
    setBusyId(appointment.id);
    try {
      const wa = await appointmentsApi.sendWhatsApp(appointment.id, 'recordatorio');
      openWaLink(wa.data);
      loadMonth();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al generar el recordatorio');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreated = (wa, scheduledAt) => {
    setShowNew(false);
    openWaLink(wa);
    setStatusFilter('');
    goToDay(scheduledAt);
    loadMonth();
  };

  const handleRescheduled = (wa, newAt) => {
    setRescheduleFor(null);
    openWaLink(wa);
    goToDay(newAt);
    loadMonth();
  };

  const doConvert = async (appointment, extra = {}) => {
    setBusyId(appointment.id);
    try {
      const res = await appointmentsApi.convertToWorkOrder(appointment.id, extra);
      setPlateModalFor(null);
      toast.success('Orden de trabajo creada');
      navigate(`/workshop/work-orders/${res.data.data.id}`);
    } catch (e) {
      if (e.response?.data?.code === 'VEHICLE_PLATE_REQUIRED') setPlateModalFor(appointment);
      else toast.error(e.response?.data?.message || 'Error al convertir la cita');
    } finally {
      setBusyId(null);
    }
  };

  const handleConvert = (appointment) => {
    if (!appointment.vehicle_plate) { setPlateModalFor(appointment); return; }
    doConvert(appointment);
  };

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/agendar/${tenantSlug}`);
      toast.success('Link de agenda copiado');
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  const pillCls = (activeKey) => (key) => `px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
    activeKey === key
      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-graphite dark:text-gray-400 dark:border-white/10 dark:hover:bg-white/5'
  }`;
  const pill = pillCls(statusFilter);

  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Encabezado (mismo lenguaje que /agendar) ── */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 text-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sky-100 text-xs font-semibold tracking-wide uppercase">Taller · Agenda</p>
              <h1 className="font-bold text-2xl leading-tight mt-0.5">Agenda de citas</h1>
              <p className="text-sky-100/90 text-sm mt-1">Confirma, reagenda y recibe a tus clientes.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-sky-800 hover:bg-sky-50 text-xs font-bold shadow-sm">
                <CalendarPlus size={14} /> Nueva cita
              </button>
              {tenantSlug && (
                <button onClick={copyPublicLink} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold">
                  <Copy size={14} /> Link de agenda
                </button>
              )}
              {canConfigure && (
                <Link to="/workshop/appointments/settings" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold">
                  <Settings size={14} /> Horarios
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
            {[
              { label: 'Citas hoy', value: todayList.filter(a => a.status !== 'cancelada').length, onClick: () => goToDay(new Date()) },
              { label: 'Por confirmar', value: upcomingPending.length, onClick: upcomingPending[0] ? () => { goToDay(upcomingPending[0].scheduled_at); setStatusFilter('pendiente'); } : null },
              { label: 'Confirmadas (mes)', value: countBy(monthAppointments.filter(a => isSameMonth(new Date(a.scheduled_at), month)), 'confirmada') },
            ].map(s => (
              <button key={s.label} type="button" onClick={s.onClick || undefined} disabled={!s.onClick}
                className="text-left rounded-2xl bg-white/15 px-3 py-2.5 sm:px-4 sm:py-3 enabled:hover:bg-white/25 transition disabled:cursor-default">
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-sky-100 mt-1">{s.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
          {/* ── Columna izquierda: calendario + por confirmar ── */}
          <div className="space-y-4">
            <AppointmentMiniCalendar
              month={month}
              onMonthChange={setMonth}
              appointmentsByDay={appointmentsByDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              todayKey={todayKey}
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
              {['pendiente', 'confirmada', 'completada', 'cancelada'].map(k => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${STATUS[k].dot}`} /> {STATUS[k].label}
                </span>
              ))}
            </div>

            {upcomingPending.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:bg-amber-900/10 dark:border-amber-800/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 px-1 mb-2">
                  Por confirmar ({upcomingPending.length})
                </p>
                <div className="space-y-1">
                  {upcomingPending.slice(0, 6).map(a => (
                    <button key={a.id} onClick={() => { goToDay(a.scheduled_at); setStatusFilter(''); }}
                      className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-white/5">
                      <span className="text-sm text-slate-800 dark:text-gray-200 truncate">{a.customer_name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-gray-500 shrink-0 capitalize">{shortDateOf(a.scheduled_at)} · {timeOf(a.scheduled_at)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Columna derecha: día seleccionado ── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 px-1">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-gray-500 font-semibold">
                  {selectedDayKey === todayKey ? 'Hoy' : 'Día seleccionado'}
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100 capitalize">
                  {selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
                </h2>
              </div>
              {selectedDayKey !== todayKey && (
                <button onClick={() => goToDay(new Date())} className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 dark:text-sky-300">
                  <CalendarDays size={14} /> Ir a hoy
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {FILTERS.map(f => {
                const n = f.key ? countBy(dayAll, f.key) : dayAll.length;
                return (
                  <button key={f.key || 'all'} onClick={() => setStatusFilter(f.key)} className={pill(f.key)}>
                    {f.label}{n > 0 ? ` · ${n}` : ''}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 rounded-2xl border border-slate-200 bg-white dark:bg-graphite dark:border-white/10">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dayVisible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4 rounded-2xl border border-dashed border-slate-300 bg-white dark:bg-graphite dark:border-white/10">
                <span className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 dark:bg-sky-900/30 dark:text-sky-300">
                  <Inbox size={22} />
                </span>
                <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  {dayAll.length > 0 ? 'No hay citas con ese estado este día' : 'No hay citas para este día'}
                </p>
                {dayAll.length === 0 && selectedDayKey >= todayKey && (
                  <button onClick={() => setShowNew(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 shadow-sm shadow-sky-600/20">
                    <CalendarPlus size={14} /> Agendar en este día
                  </button>
                )}
                {dayAll.length === 0 && tenantSlug && (
                  <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">O comparte tu link de agenda para que tus clientes reserven solos.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {dayVisible.map(appointment => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    busy={busyId === appointment.id}
                    onConfirm={() => handleConfirm(appointment)}
                    onReschedule={() => setRescheduleFor(appointment)}
                    onReminder={() => handleReminder(appointment)}
                    onCancel={() => setCancelFor(appointment)}
                    onConvert={() => handleConvert(appointment)}
                    onOpenOrder={() => navigate(`/workshop/work-orders/${appointment.converted_to_work_order_id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {plateModalFor && (
        <VehicleDataModal
          submitting={busyId === plateModalFor.id}
          onClose={() => setPlateModalFor(null)}
          onSubmit={(data) => doConvert(plateModalFor, data)}
        />
      )}
      {cancelFor && (
        <CancelAppointmentModal
          appointment={cancelFor}
          submitting={busyId === cancelFor.id}
          onClose={() => setCancelFor(null)}
          onConfirm={handleCancel}
        />
      )}
      {showNew && (
        <NewAppointmentModal
          initialDate={selectedDay}
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
      {rescheduleFor && (
        <RescheduleAppointmentModal
          appointment={rescheduleFor}
          onClose={() => setRescheduleFor(null)}
          onRescheduled={handleRescheduled}
        />
      )}
    </Layout>
  );
}
