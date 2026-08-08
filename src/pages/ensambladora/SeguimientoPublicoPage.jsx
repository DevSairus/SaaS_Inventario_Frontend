// frontend/src/pages/ensambladora/SeguimientoPublicoPage.jsx
// Página pública para que el cliente consulte el estado de su revisión o
// garantía sin autenticarse -- mismo lenguaje visual que
// WorkOrderPublicPage.jsx (header de marca del taller, badge de estado,
// tarjetas redondeadas con íconos, contacto por WhatsApp/email/dirección).
// Accesible en: /ensambladora/seguimiento/:tipo/:token
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

const ESTADO_CONFIG = {
  completada: { label: 'Completada', color: '#10b981', bg: '#ecfdf5', desc: 'La revisión de tu vehículo fue completada.' },
  en_proceso: { label: 'En proceso', color: '#f59e0b', bg: '#fffbeb', desc: 'Tu garantía está siendo evaluada.' },
  cerrada: { label: 'Cerrada', color: '#6b7280', bg: '#f9fafb', desc: 'Tu garantía fue atendida y cerrada.' },
};

const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const fmt = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
};

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.en_proceso;
  return (
    <span
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
    >
      <span style={{ backgroundColor: cfg.color }} className="w-2 h-2 rounded-full animate-pulse" />
      {cfg.label}
    </span>
  );
}

export default function SeguimientoPublicoPage() {
  const { tipo, token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/public/ensambladora/comprobantes/${tipo}/${token}`);
        setData(res.data?.data ?? null);
      } catch (err) {
        setError(err.response?.data?.message || 'No se encontró el registro consultado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [tipo, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 text-sm">{error || 'No se encontró la información.'}</p>
        </div>
      </div>
    );
  }

  const cfg = ESTADO_CONFIG[data.estado] || ESTADO_CONFIG.en_proceso;
  const esGarantia = data.tipo === 'garantia';
  const workshop = data.workshop;
  const primaryColor = workshop?.primary_color || cfg.color;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      {/* ── Header del Taller / CSA ────────────────────────────────── */}
      <header style={{ backgroundColor: primaryColor }} className="text-white">
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
          {workshop?.logo_url ? (
            <img src={workshop.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="7" cy="17" r="2" stroke="white" strokeWidth="2" />
                <path d="M9 17h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="17" cy="17" r="2" stroke="white" strokeWidth="2" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">{workshop?.name || 'Centro de Servicio Autorizado'}</h1>
            {workshop?.phone && <p className="text-white/70 text-xs">{workshop.phone}</p>}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* ── Card Estado Principal ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div style={{ backgroundColor: cfg.bg }} className="px-5 py-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {esGarantia ? 'Garantía' : 'Revisión'}
              </p>
              <StatusBadge estado={data.estado} />
            </div>
            <h2 className="text-xl font-black tracking-widest text-gray-900">{data.vin}</h2>
            <p style={{ color: cfg.color }} className="text-sm font-medium mt-1">{cfg.desc}</p>
          </div>
        </div>

        {/* ── Detalle de revisión ──────────────────────────────────── */}
        {!esGarantia && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Detalle
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Fecha realizada</p>
                <p className="text-sm font-semibold text-gray-900">{fmt(data.fecha_realizada)}</p>
              </div>
              {data.kilometraje_registrado != null && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Kilometraje</p>
                  <p className="text-sm font-semibold text-gray-900">{Number(data.kilometraje_registrado).toLocaleString('es-CO')} km</p>
                </div>
              )}
              {data.valor_mano_obra != null && (
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-gray-500">Mano de obra</p>
                  <p className="text-sm font-semibold text-gray-900">{COP(data.valor_mano_obra)}</p>
                </div>
              )}
            </div>

            {data.observaciones && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Observaciones</p>
                <p className="text-sm text-gray-700 leading-relaxed">{data.observaciones}</p>
              </div>
            )}

            {data.piezas?.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Piezas usadas</p>
                {data.piezas.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{p.pieza_codigo}</span>
                    <span className="text-gray-500">× {p.cantidad || 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Ítems de garantía ─────────────────────────────────────── */}
        {esGarantia && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ítems reportados
            </h3>
            {data.fecha_cierre && (
              <div className="flex justify-between text-sm pb-2 border-b border-gray-100">
                <span className="text-gray-500">Fecha de cierre</span>
                <span className="font-semibold text-gray-900">{fmt(data.fecha_cierre)}</span>
              </div>
            )}
            {(data.items || []).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {item.pieza_codigo}{item.codigo_falla ? ` — ${item.codigo_falla}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">× {item.cantidad || 1}</p>
                </div>
                {item.costo_reconocido != null && (
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{COP(item.costo_reconocido)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Contacto del CSA ─────────────────────────────────────── */}
        {workshop && (workshop.phone || workshop.email) && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contactar</h3>
            <div className="space-y-2">
              {workshop.phone && (
                <a
                  href={`https://wa.me/${workshop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, consulto por mi ${esGarantia ? 'garantía' : 'revisión'} del VIN ${data.vin}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-sm font-semibold text-green-700">WhatsApp: {workshop.phone}</span>
                </a>
              )}
              {workshop.email && (
                <a
                  href={`mailto:${workshop.email}?subject=Consulta ${esGarantia ? 'garantía' : 'revisión'} ${data.vin}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="22,6 12,13 2,6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">{workshop.email}</span>
                </a>
              )}
              {workshop.address && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="3" stroke="#6b7280" strokeWidth="2" />
                  </svg>
                  <span className="text-sm text-gray-600">{workshop.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 pb-8">
          <p className="text-xs text-gray-400">Esta página se actualiza automáticamente con el estado de tu consulta.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs font-medium underline"
            style={{ color: primaryColor }}
          >
            Actualizar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
