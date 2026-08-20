// frontend/src/pages/sales/QuotePublicPage.jsx
// Página pública para que el cliente revise y apruebe/rechace su cotización
// sin autenticarse. Accesible en: /public/quote/:token
// Mismo patrón que WorkOrderPublicPage.jsx (Taller), pero para Sale/cotización.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

const STATUS_CONFIG = {
  borrador:  { label: 'Borrador',  color: '#6b7280', bg: '#f9fafb' },
  enviada:   { label: 'Enviada',   color: '#2563eb', bg: '#eff6ff' },
  aprobada:  { label: 'Aprobada',  color: '#16a34a', bg: '#ecfdf5' },
  parcial:   { label: 'Parcial',   color: '#9333ea', bg: '#faf5ff' },
  rechazada: { label: 'Rechazada', color: '#dc2626', bg: '#fef2f2' },
  vencida:   { label: 'Vencida',   color: '#d97706', bg: '#fffbeb' },
};

// Esta página se comparte para cotización, factura y remisión por igual
// (mismo endpoint /public/sales/:token, ver sales.controller.js) -- el
// texto debe reflejar el tipo real del documento, no asumir "cotización".
const DOC_LABELS = { factura: 'Factura', remision: 'Remisión', cotizacion: 'Cotización' };
const docLabelOf = (documentType) => DOC_LABELS[documentType] || 'Cotización';

// El cliente aprueba/rechaza cada ítem por separado (mismo patrón que
// QuoteApprovalSection en WorkOrderPublicPage.jsx) — mezclar aprobados y
// rechazados deja la cotización en 'parcial'.
function ApprovalForm({ token, items, onResponded }) {
  const [checks, setChecks] = useState(() =>
    Object.fromEntries(items.map(i => [i.id, true]))
  );
  const [name, setName] = useState('');
  const [document_, setDocument] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (itemId) => setChecks(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !document_.trim()) {
      setError('Nombre y documento son requeridos.');
      return;
    }
    setSubmitting(true);
    try {
      const approvals = items.map(i => ({ item_id: i.id, approved: !!checks[i.id] }));
      await api.post(`/public/sales/${token}/respond`, {
        approvals,
        approved_by_name: name.trim(),
        approved_by_document: document_.trim(),
      });
      onResponded();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar tu respuesta. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const total = items.reduce((s, i) => s + (checks[i.id] ? parseFloat(i.total || 0) : 0), 0);

  return (
    <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm overflow-hidden border-2 border-blue-500">
      <div className="bg-blue-50 px-5 py-3">
        <h3 className="text-sm font-bold text-blue-700">Tu decisión sobre esta cotización</h3>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">Revisa cada ítem y marca los que apruebas antes de enviar tu decisión.</p>
      </div>
      <div className="p-5 space-y-3">
        {items.map(item => (
          <label key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-graphite-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!checks[item.id]}
              onChange={() => toggle(item.id)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.product_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.quantity} × {COP(item.unit_price)}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">{COP(item.total)}</span>
          </label>
        ))}

        <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-100 dark:border-white/10">
          <span>Total aprobado</span>
          <span>{COP(total)}</span>
        </div>

        <div className="pt-2 space-y-2">
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Documento de identidad (cédula)"
            value={document_}
            onChange={e => setDocument(e.target.value)}
            className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-blue-600 text-white text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60 hover:bg-blue-700 transition"
          >
            {submitting ? 'Enviando...' : 'Enviar mi decisión'}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
            Tu respuesta queda registrada de forma definitiva y no se puede modificar después.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function QuotePublicPage() {
  const { token } = useParams();
  const [quote, setQuote]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetchQuote();
  }, [token]);

  const fetchQuote = async () => {
    try {
      const res = await api.get(`/public/sales/${token}`);
      setQuote(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se encontró el documento.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-500 text-sm">Cargando tu documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-ink flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 dark:text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // quote_status (borrador/enviada/aprobada/...) es un concepto exclusivo de
  // cotización -- una factura/remisión no tiene ese flujo, así que el badge
  // de estado coloreado solo aplica a document_type === 'cotizacion'.
  const isQuoteDoc = (quote.document_type || 'cotizacion') === 'cotizacion';
  const docLabel = docLabelOf(quote.document_type);
  const statusCfg = isQuoteDoc ? (STATUS_CONFIG[quote.quote_status] || STATUS_CONFIG.borrador) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      <header style={{ backgroundColor: '#2563eb' }} className="text-white">
        <div className="max-w-lg mx-auto px-4 py-5">
          <h1 className="font-bold text-base leading-tight">{quote.tenant?.company_name || docLabel}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm overflow-hidden">
          <div style={{ backgroundColor: statusCfg?.bg || '#f9fafb' }} className="px-5 py-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">{docLabel}</p>
              {statusCfg && (
                <span style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold">
                  {statusCfg.label}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{quote.sale_number}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Para {quote.customer_name} · {fmt(quote.sale_date)}</p>
          </div>
        </div>

        {quote.quote_status === 'enviada' && (
          <ApprovalForm token={token} items={quote.items || []} onResponded={fetchQuote} />
        )}

        {['aprobada', 'parcial', 'rechazada'].includes(quote.quote_status) && (
          <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5 text-center">
            <p className="text-sm font-semibold" style={{ color: statusCfg.color }}>
              Cotización {statusCfg.label.toLowerCase()} por {quote.quote_approved_by_name} el {fmt(quote.quote_responded_at)}
            </p>
          </div>
        )}

        {quote.items && quote.items.length > 0 && (
          <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-3">Ítems cotizados</h3>
            <div className="space-y-2">
              {quote.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/10 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{item.quantity} × {COP(item.unit_price)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{COP(item.total)}</p>
                    {quote.quote_status !== 'enviada' && item.approval_status && item.approval_status !== 'pendiente' && (
                      <p className={`text-xs font-medium ${item.approval_status === 'aprobado' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {item.approval_status === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 space-y-1.5">
              {parseFloat(quote.subtotal) > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-500">
                  <span>Subtotal</span>
                  <span>{COP(quote.subtotal)}</span>
                </div>
              )}
              {parseFloat(quote.tax_amount) > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-500">
                  <span>IVA</span>
                  <span>{COP(quote.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 pt-1">
                <span>Total</span>
                <span>{COP(quote.total_amount)}</span>
              </div>
            </div>
          </div>
        )}

        {quote.notes && (
          <div className="bg-white dark:bg-graphite rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-2">Observaciones</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{quote.notes}</p>
          </div>
        )}

        <div className="text-center py-2">
          <a href={quote.pdf_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 underline">
            Descargar PDF
          </a>
        </div>

      </div>
    </div>
  );
}
