// frontend/src/components/workshop/NewAppointmentModal.jsx
// "Nueva cita" desde la agenda del staff (llamada, walk-in, WhatsApp...) sin
// pasar por el link público. Mismo flujo visual que /agendar y que
// RescheduleAppointmentModal: carrusel de días + grilla de horarios, con
// reglas de staff (ver buildDaySlots en el backend).
//
// Si se elige un vehículo o cliente ya registrado, la cita queda vinculada
// (vehicle_id / customer_id, validados en el backend) y sus datos se
// precargan; si no, se escriben a mano como en la agenda pública.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarPlus, Car, Search, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsApi } from '../../api/workshopAppointments';
import { vehiclesApi } from '../../api/workshop';
import customersApi from '../../api/customers';
import PhoneCountryCodeSelect, { DEFAULT_COUNTRY_CODE } from '../common/PhoneCountryCodeSelect';
import { buildDayCarousel, toDateKey } from '../../utils/publicBooking';
import DayCarousel from './booking/DayCarousel';
import SlotGrid from './booking/SlotGrid';

const STAFF_DAYS = 45;
const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:disabled:bg-white/5';

const fmtLong = (iso) => new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
const customerName = (c) => (c ? (c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) : '');

// Teléfono de WhatsApp de un cliente ya registrado, completo (con indicativo)
// -- mismo criterio que backend/src/utils/customerWhatsappPhone.js.
function customerPhone(c) {
  const mobile = String(c?.mobile || '').replace(/\D/g, '');
  if (mobile) {
    const code = String(c.mobile_country_code || '57').replace(/\D/g, '') || '57';
    return mobile.startsWith(code) ? mobile : `${code}${mobile}`;
  }
  return String(c?.phone || '').replace(/\D/g, '');
}

export default function NewAppointmentModal({ initialDate, onClose, onCreated }) {
  const days = useMemo(() => buildDayCarousel(new Date(), STAFF_DAYS), []);
  const todayKey = toDateKey(new Date());
  const [date, setDate] = useState(() => {
    const key = initialDate ? toDateKey(new Date(initialDate)) : todayKey;
    return key >= todayKey ? key : todayKey;
  });

  // ── Cliente / vehículo ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ vehicles: [], customers: [] });
  const [searching, setSearching] = useState(false);
  const [linked, setLinked] = useState(null); // { type: 'vehicle'|'customer', label, sub }
  const [form, setForm] = useState({
    vehicle_id: null, customer_id: null,
    customer_name: '', customer_phone: '', customer_email: '',
    vehicle_plate: '', vehicle_brand: '', service_description: '',
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneIsFull, setPhoneIsFull] = useState(false); // ya trae indicativo (cliente registrado)
  const debounceRef = useRef(null);

  // ── Horario ──
  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selected, setSelected] = useState(null);

  const [confirmNow, setConfirmNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSelected(null);
    appointmentsApi.getAvailability(date)
      .then((res) => { if (!cancelled) setAvailability(res.data.data); })
      .catch(() => { if (!cancelled) setAvailability({ open: false, slots: [] }); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [date]);

  // Búsqueda de vehículos (placa/marca/modelo) y clientes (nombre/doc/teléfono).
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults({ vehicles: [], customers: [] }); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const [v, c] = await Promise.all([
          vehiclesApi.list({ search: q, limit: 5 }).catch(() => null),
          customersApi.getAll({ search: q, limit: 5 }).catch(() => null),
        ]);
        setResults({ vehicles: v?.data?.data || [], customers: c?.data?.data || [] });
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pickVehicle = (v) => {
    const c = v.customer;
    setForm((f) => ({
      ...f,
      vehicle_id: v.id,
      customer_id: c?.id || null,
      vehicle_plate: v.plate || '',
      vehicle_brand: [v.brand, v.model].filter(Boolean).join(' '),
      customer_name: c ? customerName(c) : f.customer_name,
      customer_phone: c ? customerPhone(c) : f.customer_phone,
    }));
    setPhoneIsFull(!!(c && customerPhone(c)));
    setLinked({ type: 'vehicle', label: v.plate, sub: [[v.brand, v.model].filter(Boolean).join(' '), customerName(c)].filter(Boolean).join(' · ') });
    setQuery('');
  };

  const pickCustomer = (c) => {
    setForm((f) => ({
      ...f,
      customer_id: c.id,
      vehicle_id: null,
      customer_name: customerName(c),
      customer_phone: customerPhone(c),
      customer_email: c.email || f.customer_email,
    }));
    setPhoneIsFull(!!customerPhone(c));
    setLinked({ type: 'customer', label: customerName(c), sub: c.mobile || c.phone || '' });
    setQuery('');
  };

  const unlink = () => {
    setLinked(null);
    setPhoneIsFull(false);
    setForm((f) => ({ ...f, vehicle_id: null, customer_id: null }));
  };

  const handleSave = async () => {
    setError(null);
    if (!form.customer_name.trim() || !form.customer_phone.trim()) { setError('Nombre y teléfono del cliente son requeridos.'); return; }
    if (!selected) { setError('Elige un horario.'); return; }
    setSaving(true);
    try {
      // Mismo criterio que la agenda pública: el número se guarda completo
      // (E.164) porque es el que se usa para escribirle por WhatsApp.
      const digits = form.customer_phone.replace(/\D/g, '');
      // Ya trae indicativo si viene de un cliente registrado, o si se pegó
      // completo (más de 10 dígitos empezando por el indicativo elegido).
      const alreadyFull = phoneIsFull || (digits.startsWith(phoneCountryCode) && digits.length > 10);
      const phone = alreadyFull ? digits : `${phoneCountryCode}${digits}`;
      const res = await appointmentsApi.create({
        ...form,
        customer_name: form.customer_name.trim(),
        customer_phone: phone,
        vehicle_plate: form.vehicle_plate.trim().toUpperCase() || null,
        vehicle_brand: form.vehicle_brand.trim() || null,
        scheduled_at: selected.scheduled_at,
      });
      const created = res.data.data;

      let wa = null;
      if (confirmNow) {
        try {
          await appointmentsApi.confirm(created.id);
          wa = (await appointmentsApi.sendWhatsApp(created.id, 'confirmacion')).data;
        } catch {
          toast.error('La cita se creó, pero no se pudo confirmar/avisar. Hazlo desde la agenda.');
        }
      }
      toast.success(confirmNow ? 'Cita creada y confirmada' : 'Cita creada');
      onCreated(wa, created.scheduled_at);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo crear la cita');
    } finally {
      setSaving(false);
    }
  };

  const hasResults = results.vehicles.length > 0 || results.customers.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-slate-50 dark:bg-ink w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 text-white px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sky-100 text-[11px] font-semibold tracking-wide uppercase">Agenda del taller</p>
              <h2 className="font-bold text-lg leading-tight">Nueva cita</h2>
              <p className="text-sky-100/90 text-xs mt-0.5">
                {selected ? <span className="capitalize">{fmtLong(selected.scheduled_at)} · {fmtTime(selected.scheduled_at)}</span> : 'Cliente, horario y motivo.'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15" aria-label="Cerrar"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ── 1. Cliente y vehículo ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 dark:bg-graphite dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">Cliente y vehículo</p>

            {linked ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2.5 dark:bg-sky-900/20 dark:border-sky-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-white text-sky-700 flex items-center justify-center shrink-0 dark:bg-sky-900/40 dark:text-sky-200">
                    {linked.type === 'vehicle' ? <Car size={16} /> : <UserRound size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold text-slate-900 dark:text-gray-100 truncate ${linked.type === 'vehicle' ? 'font-mono tracking-wide' : ''}`}>{linked.label}</p>
                    {linked.sub && <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{linked.sub}</p>}
                  </div>
                </div>
                <button onClick={unlink} className="text-xs font-semibold text-sky-700 hover:text-sky-900 dark:text-sky-300 shrink-0">Cambiar</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por placa, cliente o teléfono…"
                  className={`${inputCls} pl-9`} autoFocus />
                {query.trim().length >= 2 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-graphite-2 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {searching && !hasResults ? (
                      <p className="text-xs text-slate-400 text-center py-3">Buscando…</p>
                    ) : !hasResults ? (
                      <p className="text-xs text-slate-400 text-center py-3">Sin resultados · escribe los datos abajo</p>
                    ) : (
                      <>
                        {results.vehicles.map((v) => (
                          <button key={`v-${v.id}`} onClick={() => pickVehicle(v)}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-sky-50 dark:hover:bg-white/5">
                            <Car size={14} className="text-slate-400 shrink-0" />
                            <span className="font-mono text-xs font-bold bg-yellow-100 border border-yellow-300 rounded px-1.5 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-200">{v.plate}</span>
                            <span className="text-xs text-slate-600 dark:text-gray-400 truncate">
                              {[[v.brand, v.model].filter(Boolean).join(' '), customerName(v.customer)].filter(Boolean).join(' · ')}
                            </span>
                          </button>
                        ))}
                        {results.customers.map((c) => (
                          <button key={`c-${c.id}`} onClick={() => pickCustomer(c)}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-sky-50 dark:hover:bg-white/5">
                            <UserRound size={14} className="text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-800 dark:text-gray-200 truncate">{customerName(c)}</span>
                            {(c.mobile || c.phone) && <span className="text-xs text-slate-400 shrink-0">{c.mobile || c.phone}</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="Nombre del cliente *" className={inputCls} />
              <div className="flex gap-2">
                {!phoneIsFull && <PhoneCountryCodeSelect value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} />}
                <input value={form.customer_phone} inputMode="tel"
                  onChange={(e) => { set('customer_phone', e.target.value); setPhoneIsFull(false); }}
                  placeholder="Celular WhatsApp *" className={`${inputCls} flex-1 min-w-0`} />
              </div>
              <input value={form.vehicle_plate} onChange={(e) => set('vehicle_plate', e.target.value)} placeholder="Placa"
                disabled={!!form.vehicle_id} className={`${inputCls} uppercase`} />
              <input value={form.vehicle_brand} onChange={(e) => set('vehicle_brand', e.target.value)} placeholder="Marca / modelo"
                disabled={!!form.vehicle_id} className={inputCls} />
            </div>
          </section>

          {/* ── 2. Fecha y hora ── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 px-1">Fecha y hora</p>
            <DayCarousel days={days} value={date} onChange={setDate} dark ariaLabel="Días para la cita" />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-graphite dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 mb-3 capitalize">{fmtLong(`${date}T12:00:00`)}</p>
              {loadingSlots ? (
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
                <SlotGrid slots={availability.slots} onSelect={setSelected} selectedAt={selected?.scheduled_at} showUnavailable dark />
              )}
            </div>
          </section>

          {/* ── 3. Motivo y opciones ── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 dark:bg-graphite dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">Motivo</p>
            <textarea rows={2} value={form.service_description} onChange={(e) => set('service_description', e.target.value)}
              placeholder="Ej: cambio de aceite, revisión de frenos…" className={`${inputCls} resize-none`} />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={confirmNow} onChange={(e) => setConfirmNow(e.target.checked)} className="mt-0.5 w-4 h-4 accent-sky-600" />
              <span className="text-sm text-slate-700 dark:text-gray-300">
                Dejarla confirmada y avisar por WhatsApp
                <span className="block text-xs text-slate-400 dark:text-gray-500">Si no, queda "por confirmar", como las que llegan por el link.</span>
              </span>
            </label>
          </section>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 dark:bg-red-900/20 dark:border-red-800/40 dark:text-red-300">{error}</p>}
        </div>

        <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-graphite px-5 py-3 flex gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 shadow-lg shadow-sky-600/20">
            <CalendarPlus size={16} />
            {saving ? 'Creando…' : 'Crear cita'}
          </button>
        </div>
      </div>
    </div>
  );
}
