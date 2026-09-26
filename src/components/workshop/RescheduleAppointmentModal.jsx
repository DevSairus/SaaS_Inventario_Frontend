// frontend/src/components/workshop/RescheduleAppointmentModal.jsx
// Reagendar una cita desde la agenda del staff. Mismo flujo visual que la
// agenda pública (/agendar): carrusel de días + grilla de horarios, pero con
// reglas de staff -- se puede mover a hoy mismo o más allá de la ventana que
// ve el cliente; solo se respeta horario, fechas bloqueadas y cupo.
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsApi } from '../../api/workshopAppointments';
import { buildDayCarousel, toDateKey } from '../../utils/publicBooking';
import DayCarousel from './booking/DayCarousel';
import SlotGrid from './booking/SlotGrid';

const STAFF_DAYS = 45;

const fmtLong = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function RescheduleAppointmentModal({ appointment, onClose, onRescheduled }) {
  const days = useMemo(() => buildDayCarousel(new Date(), STAFF_DAYS), []);
  const currentAt = new Date(appointment.scheduled_at).toISOString();

  // Arranca en el día actual de la cita si es futuro; si ya pasó, en hoy.
  const [date, setDate] = useState(() => {
    const key = toDateKey(new Date(appointment.scheduled_at));
    return key >= toDateKey(new Date()) ? key : toDateKey(new Date());
  });
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    appointmentsApi.getAvailability(date, appointment.id)
      .then((res) => { if (!cancelled) setAvailability(res.data.data); })
      .catch(() => { if (!cancelled) setAvailability({ open: false, slots: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, appointment.id, reloadKey]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await appointmentsApi.reschedule(appointment.id, selected.scheduled_at);
      let wa = null;
      if (notify) {
        try {
          wa = (await appointmentsApi.sendWhatsApp(appointment.id, 'reagendamiento')).data;
        } catch {
          toast.error('La cita se reagendó, pero no se pudo generar el aviso por WhatsApp.');
        }
      }
      toast.success('Cita reagendada');
      onRescheduled(wa, selected.scheduled_at);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo reagendar la cita');
      // Si la franja se llenó mientras tanto, refrescar la grilla.
      if (e.response?.status === 409) setReloadKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  const hasFreeSlots = (availability?.slots || []).some((s) => s.available && s.scheduled_at !== currentAt);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-slate-50 dark:bg-ink w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (mismo lenguaje visual que /agendar) */}
        <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 text-white px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sky-100 text-[11px] font-semibold tracking-wide uppercase">Reagendar cita</p>
              <h2 className="font-bold text-lg leading-tight truncate">{appointment.customer_name}</h2>
              {appointment.vehicle_plate && (
                <p className="text-sky-100/90 text-xs mt-0.5 font-mono tracking-wide">{appointment.vehicle_plate}</p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {/* De → a */}
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="rounded-xl bg-white/15 px-3 py-2 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-sky-100 font-semibold">Actual</p>
              <p className="text-sm font-medium capitalize truncate">{fmtLong(appointment.scheduled_at)}</p>
              <p className="text-sm font-bold">{fmtTime(appointment.scheduled_at)}</p>
            </div>
            <ArrowRight size={18} className="text-sky-100" />
            <div className={`rounded-xl px-3 py-2 min-w-0 ${selected ? 'bg-white text-sky-900 shadow-sm' : 'bg-white/10 border border-dashed border-white/40'}`}>
              <p className={`text-[10px] uppercase tracking-wide font-semibold ${selected ? 'text-sky-600' : 'text-sky-100'}`}>Nueva</p>
              {selected ? (
                <>
                  <p className="text-sm font-medium capitalize truncate">{fmtLong(selected.scheduled_at)}</p>
                  <p className="text-sm font-bold">{fmtTime(selected.scheduled_at)}</p>
                </>
              ) : (
                <p className="text-xs text-sky-100 py-2">Elige día y hora</p>
              )}
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <DayCarousel days={days} value={date} onChange={setDate} dark ariaLabel="Días para reagendar" />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-graphite dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-3 capitalize">
              {fmtLong(`${date}T12:00:00`)}
            </p>
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Cargando horarios…</div>
            ) : !availability?.open ? (
              <p className="text-sm text-slate-500 dark:text-gray-400 py-6 text-center">
                {availability?.reason === 'blocked'
                  ? 'Ese día está bloqueado en la configuración de horarios.'
                  : availability?.reason === 'no_config'
                    ? 'Esta sede no tiene horario de citas configurado.'
                    : 'El taller no atiende ese día. Elige otra fecha.'}
              </p>
            ) : (
              <>
                <SlotGrid
                  slots={availability.slots}
                  onSelect={setSelected}
                  selectedAt={selected?.scheduled_at}
                  currentAt={currentAt}
                  showUnavailable
                  dark
                />
                {!hasFreeSlots && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-3 text-center">No quedan franjas libres este día.</p>
                )}
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-3">
                  El número bajo cada hora es la ocupación (citas / cupo). Como taller puedes agendar fuera de la ventana que ve el cliente.
                </p>
              </>
            )}
          </div>

          <label className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 cursor-pointer dark:bg-graphite dark:border-white/10">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 w-4 h-4 accent-sky-600" />
            <span className="text-sm text-slate-700 dark:text-gray-300">
              Avisar al cliente por WhatsApp
              <span className="block text-xs text-slate-400 dark:text-gray-500">Le llega la nueva fecha y la anterior.</span>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-graphite px-5 py-3 flex gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="flex-[2] inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 shadow-lg shadow-sky-600/20"
          >
            <CalendarClock size={16} />
            {saving ? 'Reagendando…' : 'Reagendar cita'}
          </button>
        </div>
      </div>
    </div>
  );
}
