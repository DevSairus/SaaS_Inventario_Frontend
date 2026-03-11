// frontend/src/components/dian/DianStatusBadge.jsx
/**
 * Badge que muestra el estado DIAN de una factura
 * y permite acciones rápidas: reenviar, consultar estado, enviar a set de pruebas
 */
import { useState } from 'react';
import { sendInvoiceToDian, checkDianStatus, sendToTestSet } from '../../api/dian';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '⏳',
    description: 'En cola para envío a DIAN',
  },
  not_applicable: {
    label: 'N/A',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: '—',
    description: 'Documento no aplica para DIAN (remisión/cotización)',
  },
  sending: {
    label: 'Enviando',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '📤',
    description: 'Enviando a DIAN...',
  },
  sent: {
    label: 'Enviado',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '📨',
    description: 'Enviado, esperando respuesta',
  },
  accepted: {
    label: 'Aceptado',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅',
    description: 'Aceptado por la DIAN',
  },
  rejected: {
    label: 'Rechazado',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: '❌',
    description: 'Rechazado por la DIAN',
  },
  test_set: {
    label: 'Set Pruebas',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🧪',
    description: 'Enviado al set de pruebas',
  },
};

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

  async function handleSend() {
    setLoading(true);
    try {
      await sendInvoiceToDian(sale.id);
      onUpdate?.();
    } catch (e) {
      alert(e.response?.data?.message || 'Error al enviar a DIAN');
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
      alert(e.response?.data?.message || 'Error al consultar DIAN');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSet() {
    setLoading(true);
    try {
      const r = await sendToTestSet(sale.id);
      alert(r.data.message);
      onUpdate?.();
    } catch (e) {
      alert(e.response?.data?.message || 'Error al enviar al set de pruebas');
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
          <span>{config.icon}</span>
          <span>DIAN: {config.label}</span>
          {loading && <span className="animate-spin">⟳</span>}
        </button>

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute bottom-full left-0 mb-1 z-10 bg-gray-900 text-white
            text-xs rounded px-2 py-1 whitespace-nowrap">
            {config.description}
            {sale.dian_invoice_number && (
              <div className="text-gray-300">#{sale.dian_invoice_number}</div>
            )}
            {sale.dian_error_message && (
              <div className="text-red-300 max-w-xs truncate">{sale.dian_error_message}</div>
            )}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      {showActions && (
        <div className="flex gap-1 flex-wrap">
          {(status === 'pending' || status === 'rejected') && (
            <button onClick={handleSend} disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50">
              Enviar a DIAN
            </button>
          )}
          {(status === 'pending' || status === 'rejected') && (
            <button onClick={handleTestSet} disabled={loading}
              className="text-xs text-purple-600 hover:text-purple-800 underline disabled:opacity-50">
              Set Pruebas
            </button>
          )}
          {(status === 'sent' || status === 'sending') && (
            <button onClick={handleCheck} disabled={loading}
              className="text-xs text-gray-600 hover:text-gray-800 underline disabled:opacity-50">
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
export function DianDetailPanel({ sale, onUpdate }) {
  const [loading, setLoading] = useState(false);

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

  async function handleAction(fn) {
    setLoading(true);
    try { await fn(); onUpdate?.(); }
    catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm">Facturación Electrónica DIAN</h4>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          border ${config.className}`}>
          {config.icon} {config.label}
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
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">CUFE</span>
            <span className="font-mono text-xs text-gray-700 max-w-xs truncate" title={sale.cufe}>
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
        {sale.dian_error_message && (
          <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
            <strong>Error:</strong> {sale.dian_error_message}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 pt-1 flex-wrap">
          {(status === 'pending' || status === 'rejected') && (
            <button disabled={loading}
              onClick={() => handleAction(() => sendInvoiceToDian(sale.id))}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg
                hover:bg-blue-700 disabled:opacity-50 font-medium">
              📤 Enviar a DIAN
            </button>
          )}
          {(status === 'pending' || status === 'rejected') && (
            <button disabled={loading}
              onClick={() => handleAction(() => sendToTestSet(sale.id))}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg
                hover:bg-purple-700 disabled:opacity-50 font-medium">
              🧪 Enviar Set Pruebas
            </button>
          )}
          {(status === 'sent' || status === 'sending') && (
            <button disabled={loading}
              onClick={() => handleAction(() => checkDianStatus(sale.id))}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg
                hover:bg-gray-50 disabled:opacity-50">
              🔄 Consultar Estado
            </button>
          )}
          {status === 'accepted' && sale.dian_qr_code && (
            <a href={sale.dian_qr_code.split('URL=')[1]}
              target="_blank" rel="noreferrer"
              className="px-3 py-1.5 border border-green-300 text-green-700 text-xs rounded-lg
                hover:bg-green-50">
              🔗 Ver en DIAN
            </a>
          )}
        </div>
      </div>
    </div>
  );
}