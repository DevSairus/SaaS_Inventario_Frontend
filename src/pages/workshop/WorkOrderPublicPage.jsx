// frontend/src/pages/workshop/WorkOrderPublicPage.jsx
// Página pública para que el cliente consulte el estado de su OT sin autenticarse.
// Accesible en: /ot/:token
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const STATUS_CONFIG = {
  recibido:   { label: 'Recibido',    step: 0, color: '#3b82f6', bg: '#eff6ff', desc: 'Tu vehículo fue recibido en el taller.' },
  en_proceso: { label: 'En proceso',  step: 1, color: '#f59e0b', bg: '#fffbeb', desc: 'Estamos trabajando en tu vehículo.' },
  en_espera:  { label: 'En espera',   step: 1, color: '#f97316', bg: '#fff7ed', desc: 'Esperando repuesto o aprobación.' },
  listo:      { label: '¡Listo!',     step: 2, color: '#10b981', bg: '#ecfdf5', desc: 'Tu vehículo está listo para ser recogido.' },
  entregado:  { label: 'Entregado',   step: 3, color: '#6b7280', bg: '#f9fafb', desc: 'Vehículo entregado. ¡Gracias por tu confianza!' },
  cancelado:  { label: 'Cancelado',   step: -1, color: '#ef4444', bg: '#fef2f2', desc: 'La orden fue cancelada.' },
};

const STEPS = [
  { key: 'recibido',   label: 'Recibido'   },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'listo',      label: 'Listo'      },
  { key: 'entregado',  label: 'Entregado'  },
];

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.recibido;
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold">
      <span style={{ backgroundColor: cfg.color }} className="w-2 h-2 rounded-full animate-pulse" />
      {cfg.label}
    </span>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────
function Timeline({ status }) {
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  const cancelled = status === 'cancelado';

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = currentStep > i;
        const active = currentStep === i && !cancelled;
        const last = i === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center" style={{ flex: last ? 'none' : 1 }}>
            {/* Dot */}
            <div className="flex flex-col items-center">
              <div
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  backgroundColor: done || active ? '#2563eb' : '#e5e7eb',
                  border: active ? '3px solid #93c5fd' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                  boxShadow: active ? '0 0 0 4px #dbeafe' : 'none',
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: active ? 'white' : '#9ca3af',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 10,
                marginTop: 4,
                fontWeight: active || done ? 600 : 400,
                color: active || done ? '#2563eb' : '#9ca3af',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {/* Line between dots */}
            {!last && (
              <div style={{
                flex: 1,
                height: 3,
                backgroundColor: done ? '#2563eb' : '#e5e7eb',
                marginBottom: 18,
                transition: 'background-color 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Photo Gallery ────────────────────────────────────────────────────────────
function PhotoGallery({ photos, title }) {
  const [selected, setSelected] = useState(null);
  if (!photos || photos.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <button
            key={i}
            onClick={() => setSelected(photo)}
            className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 hover:opacity-90 transition"
          >
            <img
              src={photo.url || photo}
              alt={photo.caption || `Foto ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setSelected(null)}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={selected.url || selected}
            alt={selected.caption || 'Foto'}
            className="max-w-full max-h-[85vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          {selected.caption && (
            <p className="absolute bottom-6 text-white/70 text-sm">{selected.caption}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkOrderPublicPage() {
  const { token } = useParams();
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`${API}/api/public/work-orders/${token}`);
        setOrder(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'No se encontró la orden de trabajo.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [token]);

  const statusCfg = order ? (STATUS_CONFIG[order.status] || STATUS_CONFIG.recibido) : null;

  const partes    = order?.items?.filter(i => i.item_type === 'repuesto')   || [];
  const servicios = order?.items?.filter(i => i.item_type !== 'repuesto')   || [];
  const primaryColor = order?.workshop?.primary_color || '#2563eb';

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Cargando información de tu orden...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>

      {/* ── Header del Taller ─────────────────────────────────────────── */}
      <header style={{ backgroundColor: primaryColor }} className="text-white">
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
          {order.workshop?.logo_url ? (
            <img src={order.workshop.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <div>
            <h1 className="font-bold text-base leading-tight">{order.workshop?.name || 'Taller'}</h1>
            {order.workshop?.phone && (
              <p className="text-white/70 text-xs">{order.workshop.phone}</p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Card Estado Principal ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div style={{ backgroundColor: statusCfg?.bg || '#eff6ff' }} className="px-5 py-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Orden de trabajo</p>
              <StatusBadge status={order.status} />
            </div>
            <h2 className="text-2xl font-black text-gray-900">{order.order_number}</h2>
            <p style={{ color: statusCfg?.color }} className="text-sm font-medium mt-1">
              {statusCfg?.desc}
            </p>
          </div>

          {/* Timeline */}
          {order.status !== 'cancelado' && (
            <div className="px-5 py-4 border-t border-gray-100">
              <Timeline status={order.status} />
            </div>
          )}
        </div>

        {/* ── Datos del Vehículo ─────────────────────────────────────── */}
        {order.vehicle && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v4" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="17" r="2" stroke="#6b7280" strokeWidth="2"/>
                <path d="M9 17h6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="17" cy="17" r="2" stroke="#6b7280" strokeWidth="2"/>
              </svg>
              Vehículo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-gray-500">Placa</p>
                <p className="text-xl font-black tracking-widest text-gray-900">{order.vehicle.plate}</p>
              </div>
              {order.vehicle.brand && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Marca / Modelo</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {order.vehicle.brand} {order.vehicle.model}
                  </p>
                </div>
              )}
              {order.vehicle.year && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Año</p>
                  <p className="text-sm font-semibold text-gray-900">{order.vehicle.year}</p>
                </div>
              )}
              {order.mileage_in && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Kilometraje entrada</p>
                  <p className="text-sm font-semibold text-gray-900">{order.mileage_in.toLocaleString('es-CO')} km</p>
                </div>
              )}
              {order.mileage_out && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Kilometraje salida</p>
                  <p className="text-sm font-semibold text-gray-900">{order.mileage_out.toLocaleString('es-CO')} km</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Fechas ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6b7280" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Fechas
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Ingreso',          val: order.received_at  },
              { label: 'Entrega estimada', val: order.promised_at  },
              { label: 'Completado',       val: order.completed_at },
              { label: 'Entregado',        val: order.delivered_at },
            ].filter(f => f.val).map(({ label, val }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-800">{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Descripción y diagnóstico ─────────────────────────────── */}
        {(order.problem_description || order.diagnosis || order.work_performed) && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            {order.problem_description && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Problema reportado</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{order.problem_description}</p>
              </div>
            )}
            {order.diagnosis && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Diagnóstico técnico</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{order.diagnosis}</p>
              </div>
            )}
            {order.work_performed && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trabajo realizado</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{order.work_performed}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Repuestos y Servicios ─────────────────────────────────── */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Repuestos y servicios
            </h3>

            {/* Repuestos */}
            {partes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> Repuestos
                </p>
                <div className="space-y-2">
                  {partes.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                        {item.product_sku && (
                          <p className="text-xs text-gray-400">{item.product_sku}</p>
                        )}
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{COP(item.total)}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Servicios */}
            {servicios.length > 0 && (
              <div>
                <p className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" /> Servicios / Mano de obra
                </p>
                <div className="space-y-2">
                  {servicios.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <p className="text-sm font-medium text-gray-900 flex-1 truncate">{item.product_name}</p>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{COP(item.total)}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totales */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
              {parseFloat(order.subtotal) > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{COP(order.subtotal)}</span>
                </div>
              )}
              {parseFloat(order.tax_amount) > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>IVA</span>
                  <span>{COP(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                <span>Total</span>
                <span>{COP(order.total_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Técnico ───────────────────────────────────────────────── */}
        {order.technician && (
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div style={{ backgroundColor: `${primaryColor}20` }}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Técnico asignado</p>
              <p className="text-sm font-semibold text-gray-900">{order.technician}</p>
            </div>
          </div>
        )}

        {/* ── Fotos de ingreso ──────────────────────────────────────── */}
        {(order.photos_in?.length > 0 || order.photos_out?.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="4" stroke="#6b7280" strokeWidth="2"/>
              </svg>
              Fotografías
            </h3>
            <PhotoGallery photos={order.photos_in}  title="Al ingreso"  />
            <PhotoGallery photos={order.photos_out} title="Al entregar" />
          </div>
        )}

        {/* ── Observaciones del taller ──────────────────────────────── */}
        {order.notes && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observaciones</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{order.notes}</p>
          </div>
        )}

        {/* ── Contacto del taller ───────────────────────────────────── */}
        {order.workshop && (order.workshop.phone || order.workshop.email) && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contactar al taller</h3>
            <div className="space-y-2">
              {order.workshop.phone && (
                <a
                  href={`https://wa.me/${order.workshop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, consulto por mi orden ${order.order_number}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-sm font-semibold text-green-700">WhatsApp: {order.workshop.phone}</span>
                </a>
              )}
              {order.workshop.email && (
                <a
                  href={`mailto:${order.workshop.email}?subject=Consulta orden ${order.order_number}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="22,6 12,13 2,6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-semibold text-blue-700">{order.workshop.email}</span>
                </a>
              )}
              {order.workshop.address && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="10" r="3" stroke="#6b7280" strokeWidth="2"/>
                  </svg>
                  <span className="text-sm text-gray-600">{order.workshop.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 pb-8">
          <p className="text-xs text-gray-400">
            Esta página se actualiza automáticamente con el estado de tu orden.
          </p>
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