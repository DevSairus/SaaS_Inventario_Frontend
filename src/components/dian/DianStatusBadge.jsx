// frontend/src/components/dian/DianStatusBadge.jsx
/**
 * Badge que muestra el estado DIAN de una factura
 * y permite acciones rápidas: reenviar, consultar estado
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Minus, Send, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { sendInvoice, checkDianStatus } from '../../api/dian';

// Nota: 'test_set' se deja solo para mostrar el estado histórico de ventas
// que ya se enviaron al set de pruebas de habilitación -- esa acción no se
// expone aquí porque es un flujo de certificación DIAN (ver DianConfigPage /
// DianEventsPage), no algo que se haga desde el detalle de una venta.
const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/40',
    Icon: Clock,
    description: 'En cola para envío a DIAN',
  },
  not_applicable: {
    label: 'N/A',
    className: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-500 dark:border-white/10',
    Icon: Minus,
    description: 'Documento no aplica para DIAN (remisión/cotización)',
  },
  sending: {
    label: 'Enviando',
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40',
    Icon: Send,
    description: 'Enviando a DIAN...',
  },
  sent: {
    label: 'Enviado',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40',
    Icon: Send,
    description: 'Enviado, esperando respuesta',
  },
  accepted: {
    label: 'Aceptado',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/40',
    Icon: CheckCircle2,
    description: 'Aceptado por la DIAN',
  },
  rejected: {
    label: 'Rechazado',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40',
    Icon: XCircle,
    description: 'Rechazado por la DIAN',
  },
  test_set: {
    label: 'Set Pruebas',
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/40',
    Icon: Clock,
    description: 'Enviado al set de pruebas',
  },
};

// La DIAN devuelve el motivo de rechazo como una cadena que puede traer
// varios errores concatenados (uno por línea, o separados por ". "). Solo
// el primero suele ser el motivo real; el resto son códigos/derivados.
// Se exporta para poder reusarla donde se necesite mostrar solo el resumen.
export function getPrimaryDianReason(msg) {
  if (!msg) return '';
  const firstLine = msg.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0] || msg.trim();
  if (firstLine.length > 220) {
    const cut = firstLine.indexOf('. ');
    if (cut > 30) return firstLine.slice(0, cut + 1);
  }
  return firstLine;
}

export default function DianStatusBadge({
  sale,
  showActions = false,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  // Solo se muestra para facturas
  if (sale.document_type !== 'factura') return null;

  const status = sale.dian_status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const { Icon } = config;
  const primaryReason = getPrimaryDianReason(sale.dian_error_message);

  async function handleSend() {
    setLoading(true);
    try {
      await sendInvoice(sale.id);
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al enviar a DIAN');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    setLoading(true);
    try {
      await checkDianStatus(sale.id);
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al consultar DIAN');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      {/* Badge */}
      <div className="relative">
        <button
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            border cursor-pointer ${config.className} ${loading ? 'opacity-50' : ''}`}
          onMouseEnter={() => setTooltip(true)}
          onMouseLeave={() => setTooltip(false)}
          disabled={loading}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>DIAN: {config.label}</span>
          {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
        </button>

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute bottom-full left-0 mb-1 z-10 bg-gray-900 text-white
            text-xs rounded px-2 py-1 whitespace-nowrap">
            {config.description}
            {sale.dian_invoice_number && (
              <div className="text-gray-300">#{sale.dian_invoice_number}</div>
            )}
            {primaryReason && (
              <div className="text-red-300 max-w-xs truncate">{primaryReason}</div>
            )}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      {showActions && (
        <div className="flex gap-2 flex-wrap">
          {(status === 'pending' || status === 'rejected') && (
            <button onClick={handleSend} disabled={loading}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50">
              <Send className="w-3 h-3" />
              {status === 'rejected' ? 'Reenviar factura' : 'Enviar a DIAN'}
            </button>
          )}
          {(status === 'sent' || status === 'sending') && (
            <button onClick={handleCheck} disabled={loading}
              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 underline disabled:opacity-50">
              <RefreshCw className="w-3 h-3" />
              Consultar estado
            </button>
          )}
          {status === 'accepted' && sale.cufe && (
            <span className="text-xs text-green-700 font-mono">
              CUFE: {sale.cufe.substring(0, 12)}...
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Panel DIAN expandido (para la vista de detalle de factura) ──── */
export function DianDetailPanel({ sale, onUpdate, onCustomerIncomplete }) {
  const [loading, setLoading] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  if (sale.document_type !== 'factura') {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
        Este documento es una <strong>{sale.document_type}</strong> y no se envía a la DIAN.
        Solo las <strong>facturas</strong> se reportan electrónicamente.
      </div>
    );
  }

  const status = sale.dian_status || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const { Icon } = config;
  const primaryReason = getPrimaryDianReason(sale.dian_error_message);
  const hasExtraDetail = !!sale.dian_error_message && sale.dian_error_message.trim() !== primaryReason.trim();

  async function handleAction(fn, okMessage) {
    setLoading(true);
    try {
      const res = await fn();
      toast.success(typeof okMessage === 'function' ? okMessage(res) : (res?.data?.message || okMessage));
      onUpdate?.();
    } catch (e) {
      const data = e.response?.data || {};
      if (data.code === 'DIAN_CUSTOMER_INCOMPLETE' && onCustomerIncomplete) {
        onCustomerIncomplete(data);
      } else {
        toast.error(data.message || 'Error al comunicarse con la DIAN');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm">Facturación Electrónica DIAN</h4>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          border ${config.className}`}>
          <Icon className="w-3.5 h-3.5" /> {config.label}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {sale.dian_invoice_number && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Número DIAN</span>
            <span className="font-mono font-medium">{sale.dian_invoice_number}</span>
          </div>
        )}
        {sale.cufe && (
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500 flex-shrink-0">CUFE</span>
            <span className="font-mono text-xs text-gray-700 text-right break-all" title={sale.cufe}>
              {sale.cufe}
            </span>
          </div>
        )}
        {sale.dian_sent_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Enviado</span>
            <span>{new Date(sale.dian_sent_at).toLocaleString('es-CO')}</span>
          </div>
        )}
        {sale.dian_accepted_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Aceptado</span>
            <span className="text-green-700">{new Date(sale.dian_accepted_at).toLocaleString('es-CO')}</span>
          </div>
        )}

        {/* Motivo de rechazo: solo el primero, con detalle completo expandible */}
        {status === 'rejected' && sale.dian_error_message && (
          <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
            <p><span className="font-medium">Motivo:</span> {primaryReason}</p>
            {hasExtraDetail && (
              <>
                <button
                  type="button"
                  onClick={() => setShowErrorDetail(v => !v)}
                  className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
                >
                  {showErrorDetail ? 'Ocultar detalle completo' : 'Ver detalle completo'}
                </button>
                {showErrorDetail && (
                  <pre className="mt-2 whitespace-pre-wrap break-words bg-white border border-red-200 rounded-lg p-3 text-xs text-red-800 font-mono">
                    {sale.dian_error_message}
                  </pre>
                )}
              </>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 pt-1 flex-wrap">
          {(status === 'pending' || status === 'rejected') && (
            <button disabled={loading}
              onClick={() => handleAction(
                () => sendInvoice(sale.id),
                (res) => res?.data?.message || (res?.data?.data?.accepted ? 'Factura aceptada por la DIAN' : 'Factura enviada (pendiente de aceptación)')
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg
                hover:bg-blue-700 disabled:opacity-50 font-medium">
              <Send className="w-3.5 h-3.5" />
              {status === 'rejected' ? 'Reenviar factura' : 'Enviar a DIAN'}
            </button>
          )}
          {(status === 'sent' || status === 'sending') && (
            <button disabled={loading}
              onClick={() => handleAction(() => checkDianStatus(sale.id), 'Estado actualizado')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg
                hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw className="w-3.5 h-3.5" />
              Consultar Estado
            </button>
          )}
          {status === 'accepted' && sale.dian_qr_code && (
            <a href={sale.dian_qr_code.split('URL=')[1]}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 text-xs rounded-lg
                hover:bg-green-50">
              <ExternalLink className="w-3.5 h-3.5" />
              Ver en DIAN
            </a>
          )}
        </div>
      </div>
    </div>
  );
}