// frontend/src/pages/workshop/PublicAppointmentPage.jsx
// Página pública para que un cliente solicite una cita de taller sin
// autenticarse. Accesible en: /agendar/:slug
// Mismo criterio "standalone, sin layout autenticado" que WorkOrderPublicPage.jsx.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicAppointmentsApi } from '../../api/workshopAppointments';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function PublicAppointmentPage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(null);

  const [date, setDate] = useState(todayStr());
  const [availability, setAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', vehicle_plate: '', vehicle_brand: '', vehicle_model: '', service_description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await publicAppointmentsApi.getBranches(slug);
        const list = res.data.data || [];
        setBranches(list);
        if (list.length === 1) setBranchId(list[0].id);
      } catch {
        setError('No se encontró el taller o no tiene citas habilitadas.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!branchId) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    publicAppointmentsApi.getAvailability(slug, branchId, date)
      .then(res => setAvailability(res.data.data))
      .catch(() => setAvailability({ open: false, slots: [] }))
      .finally(() => setLoadingSlots(false));
  }, [slug, branchId, date]);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setSubmitError('Nombre y teléfono son requeridos.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await publicAppointmentsApi.create(slug, branchId, {
        ...form,
        scheduled_at: selectedSlot.scheduled_at,
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
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 dark:text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-graphite rounded-2xl shadow-sm p-6 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Solicitud recibida</h2>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Te confirmaremos tu cita del {new Date(confirmation.scheduled_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })} por WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink">
      <header className="bg-blue-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-5">
          <h1 className="font-bold text-base leading-tight">Agendar una cita</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {branches.length > 1 && !branchId && (
          <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Elige la sede</h3>
            <div className="space-y-2">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBranchId(b.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</p>
                  {b.address && <p className="text-xs text-gray-500 dark:text-gray-500">{b.address}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {branchId && !selectedSlot && (
          <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Elige fecha y hora</h3>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
            {loadingSlots ? (
              <div className="py-6 text-center text-sm text-gray-400">Cargando horarios...</div>
            ) : !availability?.open ? (
              <p className="text-sm text-gray-500 dark:text-gray-500 py-4 text-center">No hay horarios disponibles ese día. Elige otra fecha.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availability.slots.map(slot => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`text-sm py-2 rounded-lg border ${
                      slot.available
                        ? 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800/40 dark:text-blue-300 dark:hover:bg-blue-900/20'
                        : 'border-gray-100 text-gray-300 dark:border-white/5 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedSlot && (
          <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {new Date(selectedSlot.scheduled_at).toLocaleDateString('es-CO', { dateStyle: 'long' })} · {fmtTime(selectedSlot.scheduled_at)}
              </h3>
              <button onClick={() => setSelectedSlot(null)} className="text-xs text-blue-600 underline">Cambiar</button>
            </div>

            <input type="text" placeholder="Nombre completo" value={form.customer_name}
              onChange={e => setForm({ ...form, customer_name: e.target.value })}
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm" />
            <input type="tel" placeholder="Teléfono (WhatsApp)" value={form.customer_phone}
              onChange={e => setForm({ ...form, customer_phone: e.target.value })}
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm" />
            <input type="email" placeholder="Email (opcional)" value={form.customer_email}
              onChange={e => setForm({ ...form, customer_email: e.target.value })}
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Placa" value={form.vehicle_plate}
                onChange={e => setForm({ ...form, vehicle_plate: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="Marca/modelo" value={form.vehicle_brand}
                onChange={e => setForm({ ...form, vehicle_brand: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Motivo de la visita (opcional)" value={form.service_description}
              onChange={e => setForm({ ...form, service_description: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm" />

            {submitError && <p className="text-xs text-red-500 dark:text-red-400">{submitError}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60 hover:bg-blue-700 transition"
            >
              {submitting ? 'Enviando...' : 'Solicitar cita'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
