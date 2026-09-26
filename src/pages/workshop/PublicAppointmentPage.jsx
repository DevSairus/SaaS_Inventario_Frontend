// frontend/src/pages/workshop/PublicAppointmentPage.jsx
// Página pública para que un cliente solicite una cita de taller sin
// autenticarse. Accesible en: /agendar/:slug
// Mismo criterio "standalone, sin layout autenticado" que WorkOrderPublicPage.jsx.
// Desde el portal del vehículo se llega con ?vehiculo=<portal_token>: el
// vehículo va precargado y fijo, y la cita queda vinculada a él y a su
// propietario (ver createAppointmentBody en workshopAppointments.controller.js).
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, CalendarDays, UserRound, ArrowLeft, Check } from 'lucide-react';
import { publicAppointmentsApi } from '../../api/workshopAppointments';
import { publicVehiclePortalApi } from '../../api/workshop';
import PhoneCountryCodeSelect, { DEFAULT_COUNTRY_CODE } from '../../components/common/PhoneCountryCodeSelect';
import {
  buildDayCarousel,
  sortBranchesPrincipalFirst,
  toDateKey,
} from '../../utils/publicBooking';

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fmtLongDate(isoOrKey) {
  const d = typeof isoOrKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrKey)
    ? new Date(`${isoOrKey}T12:00:00`)
    : new Date(isoOrKey);
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

const STEPS = [
  { key: 'branch', label: 'Sede', icon: MapPin },
  { key: 'slot', label: 'Fecha', icon: CalendarDays },
  { key: 'form', label: 'Datos', icon: UserRound },
];

export default function PublicAppointmentPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const portalToken = searchParams.get('vehiculo');
  const [lockedVehicle, setLockedVehicle] = useState(null); // { plate, brand, model }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(null);

  const [dayCount, setDayCount] = useState(14);
  const dayOptions = useMemo(() => buildDayCarousel(new Date(), dayCount), [dayCount]);
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_plate: '',
    vehicle_brand: '',
    vehicle_model: '',
    service_description: '',
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === branchId) || null,
    [branches, branchId]
  );

  const stepKey = !branchId ? 'branch' : !selectedSlot ? 'slot' : 'form';
  const stepIndex = STEPS.findIndex((s) => s.key === stepKey);

  useEffect(() => {
    (async () => {
      try {
        const res = await publicAppointmentsApi.getBranches(slug);
        const list = sortBranchesPrincipalFirst(res.data.data || []);
        setBranches(list);
        if (list.length === 1) {
          setAvailability(null);
          setLoadingSlots(true);
          setBranchId(list[0].id);
        }
      } catch {
        setError('No se encontró el taller o no tiene citas habilitadas.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Token inválido o de otro taller: se ignora y la agenda funciona normal.
  useEffect(() => {
    if (!portalToken) return;
    publicVehiclePortalApi.get(portalToken)
      .then((res) => {
        const v = res.data.data.vehicle;
        setLockedVehicle({ plate: v.plate, brand: v.brand, model: v.model });
        setForm((f) => ({ ...f, vehicle_plate: v.plate || '', vehicle_brand: [v.brand, v.model].filter(Boolean).join(' ') }));
      })
      .catch(() => setLockedVehicle(null));
  }, [portalToken]);

  useEffect(() => {
    if (!branchId) return;
    publicAppointmentsApi.getConfig(slug, branchId)
      .then((res) => {
        const days = Number(res.data?.data?.advance_booking_days);
        // Respeta la config del taller (default backend 30); acota a un rango razonable.
        setDayCount(Number.isFinite(days) && days > 0 ? Math.min(Math.max(days, 7), 90) : 14);
      })
      .catch(() => setDayCount(14));
  }, [slug, branchId]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setAvailability(null);
    publicAppointmentsApi.getAvailability(slug, branchId, date)
      .then((res) => {
        if (!cancelled) setAvailability(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setAvailability({ open: false, slots: [] });
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [slug, branchId, date]);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setSubmitError('Nombre y teléfono son requeridos.');
      return;
    }
    if (!selectedSlot?.scheduled_at) {
      setSubmitError('Selecciona un horario disponible.');
      return;
    }
    setSubmitting(true);
    try {
      // Meta/WhatsApp exige el número completo en E.164 -- se antepone el
      // indicativo elegido (Colombia por defecto) a los dígitos del celular
      // antes de guardarlo, ya que este campo es justamente el que se usa
      // para contactar al cliente por WhatsApp (ver sendWhatsApp en
      // workshopAppointments.controller.js).
      const phoneDigits = form.customer_phone.replace(/\D/g, '');
      const res = await publicAppointmentsApi.create(slug, branchId, {
        ...form,
        customer_phone: phoneDigits ? `${phoneCountryCode}${phoneDigits}` : phoneDigits,
        scheduled_at: selectedSlot.scheduled_at,
        ...(lockedVehicle ? { portal_token: portalToken } : {}),
      });
      setConfirmation(res.data.data);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'No se pudo agendar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Cargando agenda…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Enlace inválido</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Solicitud recibida</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Te confirmaremos tu cita del{' '}
            <span className="font-medium text-slate-900">
              {new Date(confirmation.scheduled_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
            </span>
            {selectedBranch?.name ? <> en <span className="font-medium">{selectedBranch.name}</span></> : null}
            {' '}por WhatsApp.
          </p>
          {lockedVehicle && (
            <Link to={`/portal/vehiculo/${portalToken}`} className="inline-block mt-4 text-sm font-medium text-sky-700 hover:text-sky-900">
              Volver a la hoja de vida de {lockedVehicle.plate}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 text-white">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-5">
          <p className="text-sky-100 text-xs font-medium tracking-wide uppercase mb-1">Agenda en línea</p>
          <h1 className="font-bold text-xl leading-tight">Agendar una cita</h1>
          <p className="text-sky-100/90 text-sm mt-1">Elige sede, horario y déjanos tus datos. Te confirmamos por WhatsApp.</p>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-4">
          <ol className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <li key={s.key} className="flex-1">
                  <div
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                      active ? 'bg-white text-sky-800 shadow-sm' : done ? 'bg-white/20 text-white' : 'bg-white/10 text-sky-100'
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                        active ? 'bg-sky-600 text-white' : done ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 space-y-4 pb-28">
        {/* Resumen compacto al avanzar */}
        {(branchId || selectedSlot) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
            {selectedBranch && (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Sede</p>
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {selectedBranch.name}
                    {selectedBranch.is_main ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-[10px] font-semibold">
                        Principal
                      </span>
                    ) : null}
                  </p>
                </div>
                {stepKey !== 'branch' && branches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => { setBranchId(null); setSelectedSlot(null); }}
                    className="text-xs font-medium text-sky-700 hover:text-sky-900 shrink-0"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            )}
            {selectedSlot && (
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Horario</p>
                  <p className="text-sm font-medium text-slate-900 capitalize">
                    {fmtLongDate(selectedSlot.scheduled_at)} · {fmtTime(selectedSlot.scheduled_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="text-xs font-medium text-sky-700 hover:text-sky-900 shrink-0"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paso 1: Sedes */}
        {stepKey === 'branch' && (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">¿En qué sede te atendemos?</h2>
              <p className="text-sm text-slate-500 mt-0.5">La sede principal aparece primero.</p>
            </div>
            <div className="space-y-2.5">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setAvailability(null);
                    setLoadingSlots(true);
                    setSelectedSlot(null);
                    setBranchId(b.id);
                  }}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                        {b.is_main ? (
                          <span className="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      {b.address ? <p className="text-xs text-slate-500 mt-1 leading-relaxed">{b.address}</p> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Paso 2: Carrusel de días + horas */}
        {stepKey === 'slot' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              {branches.length > 1 && (
                <button
                  type="button"
                  onClick={() => setBranchId(null)}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  aria-label="Volver a sedes"
                >
                  <ArrowLeft
                    size={28}
                    strokeWidth={2.75}
                    absoluteStrokeWidth
                    aria-hidden
                    className="shrink-0 !w-7 !h-7 overflow-visible"
                  />
                </button>
              )}
              <div>
                <h2 className="text-base font-semibold text-slate-900">Elige día y hora</h2>
                <p className="text-sm text-slate-500">Próximos {dayCount} días · desliza para ver más</p>
              </div>
            </div>

            <div
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin"
              role="listbox"
              aria-label="Días disponibles"
            >
              {dayOptions.map((day) => {
                const active = day.dateKey === date;
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setAvailability(null);
                      setLoadingSlots(true);
                      setSelectedSlot(null);
                      setDate(day.dateKey);
                    }}
                    className={`snap-start shrink-0 w-[4.5rem] rounded-2xl border px-2 py-3 text-center transition ${
                      active
                        ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'
                    }`}
                  >
                    <span className={`block text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-sky-100' : 'text-slate-400'}`}>
                      {day.isToday ? 'Hoy' : day.weekdayShort}
                    </span>
                    <span className="block text-xl font-bold leading-tight mt-0.5">{day.dayNumber}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 capitalize">
                {fmtLongDate(date)}
              </p>
              {loadingSlots || availability == null ? (
                <div className="py-8 text-center text-sm text-slate-400">Cargando horarios…</div>
              ) : !availability.open || !(availability.slots || []).some((s) => s.available) ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  No hay horarios disponibles ese día. Prueba con otra fecha.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availability.slots.filter((s) => s.available).map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className="text-sm py-2.5 rounded-xl border font-medium transition border-sky-200 text-sky-800 bg-sky-50 hover:bg-sky-100 hover:border-sky-300"
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Paso 3: Formulario */}
        {stepKey === 'form' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                aria-label="Volver a horarios"
              >
                <ArrowLeft
                  size={28}
                  strokeWidth={2.75}
                  absoluteStrokeWidth
                  aria-hidden
                  className="shrink-0 !w-7 !h-7 overflow-visible"
                />
              </button>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tus datos</h2>
                <p className="text-sm text-slate-500">Te contactamos por WhatsApp para confirmar</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
              <fieldset className="space-y-2.5">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contacto</legend>
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  autoComplete="name"
                />
                <div className="flex gap-2">
                  <PhoneCountryCodeSelect value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} />
                  <input
                    type="tel"
                    placeholder="Celular WhatsApp *"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  autoComplete="email"
                />
              </fieldset>

              <fieldset className="space-y-2.5">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vehículo</legend>
                {lockedVehicle ? (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
                    <span className="font-mono font-bold tracking-wide">{lockedVehicle.plate}</span>
                    {form.vehicle_brand && <span className="text-slate-500"> · {form.vehicle_brand}</span>}
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Placa"
                    value={form.vehicle_plate}
                    onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Marca / modelo"
                    value={form.vehicle_brand}
                    onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                )}
              </fieldset>

              <fieldset className="space-y-2.5">
                <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Motivo</legend>
                <textarea
                  placeholder="Motivo de la visita (opcional)"
                  value={form.service_description}
                  onChange={(e) => setForm({ ...form, service_description: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                />
              </fieldset>

              {submitError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{submitError}</p>
              )}
            </div>
          </section>
        )}
      </main>

      {stepKey === 'form' && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="max-w-lg mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-sky-600 text-white text-sm font-semibold rounded-xl py-3 disabled:opacity-60 hover:bg-sky-700 transition shadow-lg shadow-sky-600/20"
            >
              {submitting ? 'Enviando…' : 'Solicitar cita'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
