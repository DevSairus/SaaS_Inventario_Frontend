// frontend/src/pages/sales/QuotePublicPage.jsx
// Página pública que recibe el cliente, sin autenticarse:
//   /cotizacion/:token  -> cotización: revisa, aprueba o rechaza por ítem.
//   /documento/:token   -> factura / remisión: solo consulta y PDF.
//   /public/quote/:token -> enlaces viejos (mismo componente).
// Diseño propio de documento comercial (encabezado blanco con la marca del
// negocio, hoja con la tabla de ítems, condiciones y vigencia) -- a
// propósito distinto de WorkOrderPublicPage.jsx, que es el seguimiento de una
// orden de Taller.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

// Fechas de solo día ('YYYY-MM-DD') al mediodía: new Date() las toma como UTC
// y en Colombia mostraban el día anterior.
const toDate = (value) => {
  if (!value) return null;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
};
const fmt = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
};

const HEX = /^#[0-9a-f]{6}$/i;
const accentOf = (tenant) => (HEX.test(tenant?.primary_color || '') ? tenant.primary_color : '#1e3a8a');

const STATUS_CONFIG = {
  borrador:  { label: 'En preparación',          color: '#6b7280' },
  enviada:   { label: 'Pendiente de tu respuesta', color: '#2563eb' },
  aprobada:  { label: 'Aprobada',                color: '#059669' },
  parcial:   { label: 'Aprobada parcialmente',   color: '#7c3aed' },
  rechazada: { label: 'Rechazada',               color: '#dc2626' },
  vencida:   { label: 'Vencida',                 color: '#d97706' },
};

const DOC_LABELS = { factura: 'Factura', remision: 'Remisión', cotizacion: 'Cotización' };

// Celular colombiano (10 dígitos, empieza en 3) -> enlace de WhatsApp.
const whatsappLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^57/, '');
  return /^3\d{9}$/.test(digits) ? `https://wa.me/57${digits}` : null;
};

function ItemThumb({ src, alt, onClick, size = 'w-12 h-12' }) {
  if (!src) {
    return (
      <div className={`${size} rounded-md shrink-0 bg-stone-100 flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-stone-300" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="M21 15l-5-5-9 9" />
        </svg>
      </div>
    );
  }
  return (
    <button type="button" onClick={onClick} title="Ver imagen" className={`${size} rounded-md shrink-0 overflow-hidden bg-stone-100 ring-1 ring-stone-200 hover:ring-2 hover:ring-stone-400 transition`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
    </button>
  );
}

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
      <img src={src} alt={alt} className="max-h-[85vh] max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function Toggle({ checked, onChange, accent, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: checked ? accent : '#d6d3d1' }}
    >
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

// El cliente aprueba/rechaza cada ítem (mezclar deja la cotización
// 'parcial'), o rechaza todo de una vez.
function ApprovalPanel({ token, items, accent, onResponded, onImageClick }) {
  const [checks, setChecks] = useState(() => Object.fromEntries(items.map(i => [i.id, true])));
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [submitting, setSubmitting] = useState(null); // null | 'approve' | 'reject'
  const [error, setError] = useState(null);

  const selectedTotal = items.reduce((s, i) => s + (checks[i.id] ? parseFloat(i.total || 0) : 0), 0);
  const selectedCount = items.filter(i => checks[i.id]).length;

  const submit = async (mode) => {
    setError(null);
    if (!name.trim() || !documentId.trim()) {
      setError('Escribe tu nombre y documento para registrar la respuesta.');
      return;
    }
    if (mode === 'approve' && selectedCount === 0) {
      setError('Marca al menos un ítem para aprobar, o rechaza la cotización.');
      return;
    }
    setSubmitting(mode);
    try {
      await api.post(`/public/sales/${token}/respond`, {
        approvals: items.map(i => ({ item_id: i.id, approved: mode === 'approve' && !!checks[i.id] })),
        approved_by_name: name.trim(),
        approved_by_document: documentId.trim(),
      });
      onResponded();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar tu respuesta. Intenta de nuevo.');
      if (err.response?.status === 409) onResponded();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section id="aprobar" className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden scroll-mt-4">
      <div className="px-5 py-4 border-b border-stone-100" style={{ backgroundColor: `${accent}0d` }}>
        <h2 className="text-base font-semibold text-stone-900">Tu respuesta</h2>
        <p className="text-sm text-stone-500 mt-0.5">Desmarca lo que no quieras incluir y aprueba el resto.</p>
      </div>

      <ul className="divide-y divide-stone-100">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
            <ItemThumb src={item.image_url} alt={item.product_name} size="w-10 h-10" onClick={() => onImageClick(item)} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${checks[item.id] ? 'text-stone-900' : 'text-stone-400 line-through'}`}>{item.product_name}</p>
              <p className="text-xs text-stone-500">{parseFloat(item.quantity)} × {COP(item.unit_price)}</p>
            </div>
            <span className={`text-sm font-semibold tabular-nums ${checks[item.id] ? 'text-stone-900' : 'text-stone-400'}`}>{COP(item.total)}</span>
            <Toggle
              checked={!!checks[item.id]}
              accent={accent}
              label={`Incluir ${item.product_name}`}
              onChange={() => setChecks(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
            />
          </li>
        ))}
      </ul>

      <div className="px-5 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
        <span className="text-sm text-stone-600">{selectedCount} de {items.length} ítems</span>
        <span className="text-lg font-bold text-stone-900 tabular-nums">{COP(selectedTotal)}</span>
      </div>

      <div className="px-5 py-5 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-stone-600">Nombre completo</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': accent }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-600">Documento de identidad</span>
            <input
              type="text"
              inputMode="numeric"
              value={documentId}
              onChange={e => setDocumentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': accent }}
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={() => submit('reject')}
            disabled={!!submitting}
            className="sm:w-auto w-full px-4 py-3 rounded-lg text-sm font-semibold text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-60"
          >
            {submitting === 'reject' ? 'Enviando...' : 'Rechazar cotización'}
          </button>
          <button
            type="button"
            onClick={() => submit('approve')}
            disabled={!!submitting}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {submitting === 'approve' ? 'Enviando...' : `Aprobar ${selectedCount === items.length ? 'cotización' : 'selección'} · ${COP(selectedTotal)}`}
          </button>
        </div>
        <p className="text-xs text-stone-400 text-center">Tu respuesta queda registrada con tu nombre, documento y fecha, y no se puede modificar después.</p>
      </div>
    </section>
  );
}

export default function QuotePublicPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerItem, setViewerItem] = useState(null);
  const approvalRef = useRef(null);

  const fetchDoc = async () => {
    try {
      const res = await api.get(`/public/sales/${token}`);
      setDoc(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se encontró el documento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoc(); }, [token]);

  useEffect(() => {
    if (!doc) return;
    const label = DOC_LABELS[doc.document_type] || 'Documento';
    document.title = `${label} ${doc.sale_number} · ${doc.tenant?.company_name || ''}`;
  }, [doc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-xl ring-1 ring-stone-200 p-8">
          <p className="text-4xl mb-3">📄</p>
          <h1 className="text-lg font-semibold text-stone-900 mb-1">Enlace no disponible</h1>
          <p className="text-sm text-stone-500">{error}</p>
        </div>
      </div>
    );
  }

  const tenant = doc.tenant || {};
  const accent = accentOf(tenant);
  const isQuote = (doc.document_type || 'cotizacion') === 'cotizacion';
  const docLabel = DOC_LABELS[doc.document_type] || 'Documento';
  const status = isQuote ? (STATUS_CONFIG[doc.quote_status] || STATUS_CONFIG.borrador) : null;
  const canRespond = isQuote && doc.quote_status === 'enviada';
  const responded = isQuote && ['aprobada', 'parcial', 'rechazada'].includes(doc.quote_status);
  const items = doc.items || [];

  const validUntil = toDate(doc.quote_valid_until);
  const daysLeft = validUntil ? Math.ceil((validUntil.setHours(23, 59, 59) - Date.now()) / 86400000) : null;
  const wa = whatsappLink(tenant.phone);
  const vehicle = [doc.vehicle_brand, doc.vehicle_model, doc.vehicle_year].filter(Boolean).join(' ');
  const taxes = doc.tax_breakdown?.length ? doc.tax_breakdown : (parseFloat(doc.tax_amount) > 0 ? [{ name: 'IVA', amount: doc.tax_amount }] : []);
  // Subtotal antes de descuentos de línea, desde lo que cuenta (lo rechazado
  // no suma): el subtotal guardado ya es neto y, seguido de "Descuentos",
  // restaba el descuento dos veces a la vista.
  const counted = items.filter(i => i.approval_status !== 'rechazado');
  const num = (v) => parseFloat(v) || 0;
  const lineDiscounts = counted.reduce((s, i) => s + num(i.discount_amount), 0);
  const grossSubtotal = counted.reduce((s, i) => s + num(i.total) - num(i.tax_amount) - num(i.inc_amount), 0) + lineDiscounts;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-28 sm:pb-10">
      <div className="h-1.5" style={{ backgroundColor: accent }} />

      {/* ── Marca del negocio ─────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.company_name} className="h-12 w-auto max-w-[140px] object-contain" />
          ) : (
            <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: accent }}>
              {(tenant.company_name || '?').charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 truncate">{tenant.company_name}</p>
            <p className="text-xs text-stone-500 truncate">
              {[tenant.tax_id && `NIT ${tenant.tax_id}`, tenant.address].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#25d366] hover:opacity-90">WhatsApp</a>
            )}
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">Llamar</a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Encabezado del documento ─────────────────────────────── */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{docLabel}</p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">{doc.sale_number}</h1>
            <p className="text-sm text-stone-500 mt-1">
              Para <span className="font-medium text-stone-700">{doc.customer_name}</span> · {fmt(doc.sale_date)}
            </p>
          </div>
          {status && (
            <span className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ color: status.color, backgroundColor: `${status.color}14` }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
              {status.label}
            </span>
          )}
        </section>

        {/* ── Vigencia / resultado ─────────────────────────────────── */}
        {isQuote && canRespond && validUntil && (
          <div className="rounded-xl bg-white ring-1 ring-stone-200 px-4 py-3 flex items-center gap-3 text-sm">
            <span className="text-xl">⏳</span>
            <p className="text-stone-600">
              Oferta válida hasta el <span className="font-semibold text-stone-900">{fmt(doc.quote_valid_until)}</span>
              {daysLeft !== null && daysLeft >= 0 && (
                <span className={daysLeft <= 2 ? 'text-amber-700 font-medium' : ''}> · {daysLeft === 0 ? 'vence hoy' : `quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}</span>
              )}
            </p>
          </div>
        )}
        {isQuote && doc.quote_status === 'vencida' && (
          <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-sm text-amber-900">
            Esta cotización venció el {fmt(doc.quote_valid_until)}. Escríbenos para actualizar precios y disponibilidad.
          </div>
        )}
        {responded && (
          <div className="rounded-xl px-4 py-3 text-sm ring-1" style={{ color: status.color, backgroundColor: `${status.color}0f`, '--tw-ring-color': `${status.color}40` }}>
            <span className="font-semibold">{status.label}</span> por {doc.quote_approved_by_name} el {fmt(doc.quote_responded_at)}.
            {doc.quote_status !== 'rechazada' && ' Gracias, nos pondremos en contacto contigo para continuar.'}
          </div>
        )}

        {/* ── Hoja del documento ───────────────────────────────────── */}
        <article className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
          {(doc.vehicle_plate || vehicle) && (
            <div className="px-5 py-3 border-b border-stone-100 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {doc.vehicle_plate && <p><span className="text-stone-500">Placa</span> <span className="font-semibold font-mono">{doc.vehicle_plate}</span></p>}
              {vehicle && <p><span className="text-stone-500">Vehículo</span> <span className="font-medium">{vehicle}</span></p>}
            </div>
          )}

          {/* Escritorio: tabla */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500 border-b border-stone-200">
                <th className="px-5 py-3 font-medium">Descripción</th>
                <th className="px-3 py-3 font-medium text-center">Cant.</th>
                <th className="px-3 py-3 font-medium text-right">Vr. unitario</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(item => {
                const rejected = item.approval_status === 'rechazado';
                return (
                  <tr key={item.id} className={rejected ? 'text-stone-400' : ''}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <ItemThumb src={item.image_url} alt={item.product_name} onClick={() => setViewerItem(item)} />
                        <div>
                          <p className={`font-medium ${rejected ? 'line-through' : 'text-stone-900'}`}>{item.product_name}</p>
                          <p className="text-xs text-stone-500">
                            {parseFloat(item.discount_percentage) > 0 && `Desc. ${parseFloat(item.discount_percentage)}% · `}
                            {parseFloat(item.tax_percentage) > 0 ? `IVA ${parseFloat(item.tax_percentage)}%` : item.iva_status === 'excluido' ? 'Excluido de IVA' : 'Exento de IVA'}
                            {parseFloat(item.inc_rate) > 0 && ` · INC ${parseFloat(item.inc_rate)}%`}
                            {responded && item.approval_status === 'aprobado' && <span className="text-emerald-600"> · Aprobado</span>}
                            {rejected && <span className="text-red-500"> · No incluido</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums">{parseFloat(item.quantity)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{COP(item.unit_price)}</td>
                    <td className={`px-5 py-3 text-right font-semibold tabular-nums ${rejected ? 'line-through' : ''}`}>{COP(item.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Celular: lista */}
          <ul className="sm:hidden divide-y divide-stone-100">
            {items.map(item => {
              const rejected = item.approval_status === 'rechazado';
              return (
                <li key={item.id} className={`flex gap-3 px-4 py-3 ${rejected ? 'text-stone-400' : ''}`}>
                  <ItemThumb src={item.image_url} alt={item.product_name} onClick={() => setViewerItem(item)} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${rejected ? 'line-through' : 'text-stone-900'}`}>{item.product_name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{parseFloat(item.quantity)} × {COP(item.unit_price)}</p>
                    {rejected && <p className="text-xs text-red-500">No incluido</p>}
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${rejected ? 'line-through' : ''}`}>{COP(item.total)}</p>
                </li>
              );
            })}
          </ul>

          {/* Totales */}
          <div className="border-t border-stone-200 bg-stone-50 px-5 py-4">
            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd className="tabular-nums">{COP(grossSubtotal)}</dd></div>
              {lineDiscounts > 0 && (
                <div className="flex justify-between text-stone-600"><dt>Descuentos</dt><dd className="tabular-nums">- {COP(lineDiscounts)}</dd></div>
              )}
              {taxes.map((t, i) => (
                <div key={i} className="flex justify-between text-stone-600">
                  <dt>{t.code === '04' ? 'INC (impoconsumo)' : t.name}{t.rate ? ` ${parseFloat(t.rate)}%` : ''}</dt>
                  <dd className="tabular-nums">{COP(t.amount)}</dd>
                </div>
              ))}
              {parseFloat(doc.global_discount_amount) > 0 && (
                <div className="flex justify-between text-stone-600"><dt>Descuento adicional</dt><dd className="tabular-nums">- {COP(doc.global_discount_amount)}</dd></div>
              )}
              <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-stone-200">
                <dt className="font-semibold">{isQuote ? 'Total cotizado' : 'Total'}</dt>
                <dd className="text-2xl font-bold tabular-nums" style={{ color: accent }}>{COP(doc.total_amount)}</dd>
              </div>
            </dl>
          </div>
        </article>

        {/* ── Condiciones y observaciones ──────────────────────────── */}
        {(doc.notes || (isQuote && tenant.quote_terms)) && (
          <section className="grid sm:grid-cols-2 gap-4">
            {doc.notes && (
              <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Observaciones</h2>
                <p className="text-sm text-stone-700 whitespace-pre-line">{doc.notes}</p>
              </div>
            )}
            {isQuote && tenant.quote_terms && (
              <div className="bg-white rounded-xl ring-1 ring-stone-200 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">Condiciones</h2>
                <p className="text-sm text-stone-700 whitespace-pre-line">{tenant.quote_terms}</p>
              </div>
            )}
          </section>
        )}

        {/* ── Aprobación ───────────────────────────────────────────── */}
        {canRespond && items.length > 0 && (
          <div ref={approvalRef}>
            <ApprovalPanel token={token} items={items} accent={accent} onResponded={fetchDoc} onImageClick={setViewerItem} />
          </div>
        )}

        {/* ── Pie: PDF y contacto ──────────────────────────────────── */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-sm">
          <a href={doc.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ring-1 ring-stone-300 bg-white hover:bg-stone-50">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Descargar PDF
          </a>
          <div className="flex items-center gap-3 text-stone-500">
            {tenant.email && <a href={`mailto:${tenant.email}`} className="hover:text-stone-800">{tenant.email}</a>}
            {tenant.phone && <a href={`tel:${tenant.phone}`} className="hover:text-stone-800 sm:hidden">{tenant.phone}</a>}
          </div>
        </footer>
      </main>

      {/* Barra fija en celular mientras el cliente no ha respondido */}
      {canRespond && items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-xs text-stone-500">Total cotizado</p>
            <p className="text-lg font-bold tabular-nums">{COP(doc.total_amount)}</p>
          </div>
          <button
            type="button"
            onClick={() => approvalRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-5 py-3 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Responder
          </button>
        </div>
      )}

      {viewerItem && (
        <ImageLightbox src={viewerItem.image_url} alt={viewerItem.product_name} onClose={() => setViewerItem(null)} />
      )}
    </div>
  );
}
