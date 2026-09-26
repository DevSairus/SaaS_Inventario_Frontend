// frontend/src/pages/workshop/VehiclePortalPage.jsx
// Portal público del vehículo (hoja de vida + próximo mantenimiento), sin
// autenticarse. Accesible en: /portal/vehiculo/:token -- es el destino del
// sticker QR permanente que se pega en el vehículo (el sticker no lleva la
// fecha del próximo servicio impresa; se consulta acá, siempre al día).
// Mismo layout/branding que WorkOrderPublicPage.jsx.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicVehiclePortalApi } from '../../api/workshop';
import { publicAppointmentsApi } from '../../api/workshopAppointments';
import {
  MAINTENANCE_STATUS, VEHICLE_TYPE_LABELS, fmtKm, fmtDateOnly, describeRemaining, fmtKmPerDay,
} from '../../components/workshop/maintenanceStatus';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

// Vencimiento de SOAT / tecnomecánica.
function docStatus(expiry) {
  if (!expiry) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(`${expiry}T12:00:00`) - today) / 86400000);
  if (days < 0) return { ...MAINTENANCE_STATUS.vencido, text: `Venció hace ${-days} días` };
  if (days <= 30) return { ...MAINTENANCE_STATUS.proximo, text: `Vence en ${days} días` };
  return { ...MAINTENANCE_STATUS.al_dia, text: 'Vigente' };
}

function Card({ title, children, right }) {
  return (
    <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function UpcomingCard({ item }) {
  const st = MAINTENANCE_STATUS[item.status] || MAINTENANCE_STATUS.sin_historial;
  const next = [fmtKm(item.next_due_mileage), fmtDateOnly(item.next_due_date)].filter(Boolean);
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: `${st.color}33`, backgroundColor: st.bg }}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">{item.name}</p>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: st.color }}>
          {st.label}
        </span>
      </div>
      {item.status === 'sin_historial' ? (
        <p className="text-xs text-gray-500 mt-1">Aún no tenemos registro de este servicio en tu vehículo.</p>
      ) : (
        <>
          <p className="text-sm text-gray-800 mt-2">
            Próximo: <span className="font-bold">{next.join(' o ') || '—'}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: st.color }}>{describeRemaining(item)}</p>
          {item.estimated_km_due_date && (
            <p className="text-xs text-gray-600 mt-0.5">
              A tu ritmo de uso llegarías a los {fmtKm(item.next_due_mileage)} hacia el <b>{fmtDateOnly(item.estimated_km_due_date)}</b>
            </p>
          )}
          {item.last && (
            <p className="text-xs text-gray-500 mt-1">
              Último: {fmtDateOnly(item.last.performed_at)}{item.last.mileage_at_service ? ` · ${fmtKm(item.last.mileage_at_service)}` : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function HistoryEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const items = entry.items || [];
  return (
    <div className="relative pl-5 pb-4 last:pb-0">
      <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300" />
      <span className="absolute left-[4.5px] top-4 bottom-0 w-px bg-gray-200" />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{fmtDate(entry.date)}</p>
        {entry.mileage && <p className="text-xs text-gray-500 shrink-0">{fmtKm(entry.mileage)}</p>}
      </div>
      {entry.maintenance?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {entry.maintenance.map(m => (
            <span key={m} className="text-[11px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{m}</span>
          ))}
        </div>
      )}
      {entry.work_performed && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{entry.work_performed}</p>}
      {items.length > 0 && (
        <>
          <button onClick={() => setOpen(o => !o)} className="text-xs text-gray-500 underline mt-1">
            {open ? 'Ocultar detalle' : `Ver detalle (${items.length})`}
          </button>
          {open && (
            <ul className="mt-1 space-y-0.5">
              {items.map((i, idx) => (
                <li key={idx} className="text-xs text-gray-600">
                  {i.quantity && i.quantity !== 1 ? `${i.quantity} × ` : ''}{i.product_name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {entry.technician && <p className="text-[11px] text-gray-400 mt-1">Técnico: {entry.technician}</p>}
    </div>
  );
}

export default function VehiclePortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await publicVehiclePortalApi.get(token);
        const d = res.data.data;
        setData(d);
        // "Agendar cita" solo si alguna sede tiene la reserva pública
        // habilitada (getPublicBranches ya filtra is_public_booking_enabled).
        if (d.workshop?.slug) {
          publicAppointmentsApi.getBranches(d.workshop.slug)
            .then(r => setBranches(r.data.data || []))
            .catch(() => setBranches([]));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'No se encontró el vehículo.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Cargando la hoja de vida de tu vehículo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { vehicle, upcoming = [], history = [], workshop, usage } = data;
  const primaryColor = workshop?.primary_color || '#2563eb';
  const soat = docStatus(vehicle.soat_expiry);
  const tecno = docStatus(vehicle.tecnomecanica_expiry);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      {/* ── Header del taller ── */}
      <header style={{ backgroundColor: primaryColor }} className="text-white">
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
          {workshop?.logo_url ? (
            <img src={workshop.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">{workshop?.name || 'Taller'}</h1>
            {workshop?.phone && <p className="text-white/70 text-xs">{workshop.phone}</p>}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* ── Ficha del vehículo ── */}
        <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hoja de vida</p>
          <h2 className="font-mono text-3xl font-black text-gray-900 dark:text-gray-100 tracking-wide mt-1">{vehicle.plate}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
            {vehicle.vehicle_type && <span className="text-gray-400"> · {VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}</span>}
          </p>
          {(vehicle.current_mileage != null || usage) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {vehicle.current_mileage != null && (
                <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                  <p className="text-[11px] text-gray-500">Último km registrado</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtKm(vehicle.current_mileage)}</p>
                  {usage?.last_reading && <p className="text-[11px] text-gray-400">{fmtDateOnly(usage.last_reading.date)}</p>}
                </div>
              )}
              {usage && (
                <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: `${primaryColor}12` }}>
                  <p className="text-[11px] text-gray-500">Km estimado hoy</p>
                  <p className="text-sm font-bold" style={{ color: primaryColor }}>≈ {fmtKm(usage.estimated_km)}</p>
                  <p className="text-[11px] text-gray-400">Según tu uso: {fmtKmPerDay(usage)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Próximos mantenimientos ── */}
        {upcoming.length > 0 && (
          <Card title="Próximo mantenimiento">
            <div className="space-y-2">
              {/* Ya viene ordenado por urgencia (vencido → sin historial) */}
              {upcoming.map(u => <UpcomingCard key={u.name} item={u} />)}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Lo que ocurra primero: kilometraje o fecha. Calculado según tu último servicio en {workshop?.name || 'el taller'}.
            </p>
          </Card>
        )}

        {/* ── Agendar cita ── */}
        {/* Lleva a la agenda pública (/agendar/:slug) con el vehículo ya
            resuelto -- ahí se precarga y la cita queda vinculada a él. */}
        {branches.length > 0 && workshop?.slug && (
          <Link
            to={`/agendar/${workshop.slug}?vehiculo=${token}`}
            style={{ backgroundColor: primaryColor }}
            className="block w-full text-center text-white text-sm font-semibold rounded-2xl py-3 shadow-sm hover:opacity-90 transition"
          >
            Agendar una cita
          </Link>
        )}

        {/* ── Documentos ── */}
        {(soat || tecno) && (
          <Card title="Documentos">
            <div className="space-y-2">
              {[['SOAT', vehicle.soat_expiry, soat], ['Técnico-mecánica', vehicle.tecnomecanica_expiry, tecno]]
                .filter(([, , st]) => st)
                .map(([label, expiry, st]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{label}</p>
                      <p className="text-xs text-gray-500">Vence: {fmtDateOnly(expiry)}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.bg }}>
                      {st.text}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* ── Historial ── */}
        <Card title="Historial de servicios" right={<span className="text-xs text-gray-400">{history.length}</span>}>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aún no hay servicios registrados.</p>
          ) : (
            <div>{history.map(h => <HistoryEntry key={h.order_number} entry={h} />)}</div>
          )}
        </Card>

        {(workshop?.address || workshop?.email) && (
          <p className="text-center text-xs text-gray-400 pb-4">
            {[workshop.address, workshop.email].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
