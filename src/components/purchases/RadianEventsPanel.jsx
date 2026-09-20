// frontend/src/components/purchases/RadianEventsPanel.jsx
/**
 * Panel de eventos RADIAN (030 Acuse, 032 Recibo, 031 Reclamo, 033
 * Aceptación expresa) sobre una compra importada desde factura electrónica
 * del proveedor. Ver 00 - Documentación/RADIAN-Analisis-y-Plan.md §5.6.
 *
 * Solo se muestra si la compra tiene CUFE (factura electrónica DIAN
 * importada con XML válido) — sin CUFE no hay nada que acusar/aceptar.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Send, CheckCircle2, XCircle, Clock, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  emitRadianAcuse, emitRadianRecibo, emitRadianAceptacion, emitRadianReclamo, getRadianEvents,
} from '../../api/radian';

const EVENT_LABELS = {
  '030': 'Acuse de recibo',
  '032': 'Recibo del bien/servicio',
  '031': 'Reclamo',
  '033': 'Aceptación expresa',
};

const STATUS_CONFIG = {
  accepted: { label: 'Aceptado', className: 'bg-green-100 text-green-800 border-green-200', Icon: CheckCircle2 },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200', Icon: XCircle },
  sending: { label: 'Enviando', className: 'bg-blue-100 text-blue-800 border-blue-200', Icon: Send },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 border-red-200', Icon: XCircle },
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', Icon: Clock },
};

export default function RadianEventsPanel({ purchase }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimReasonCode, setClaimReasonCode] = useState('');
  const [claimReasonText, setClaimReasonText] = useState('');

  const load = useCallback(() => {
    if (!purchase?.id) return;
    setLoading(true);
    getRadianEvents(purchase.id)
      .then(res => setEvents(res.data?.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [purchase?.id]);

  useEffect(() => { load(); }, [load]);

  if (!purchase?.cufe) return null;

  const status = purchase.radian_status || 'none';
  const deadline = purchase.radian_deadline_at ? new Date(purchase.radian_deadline_at) : null;
  const deadlineExpired = deadline ? deadline.getTime() < Date.now() : false;

  const run = async (action, successMsg) => {
    setActing(true);
    try {
      const res = await action();
      const accepted = res.data?.data?.accepted;
      toast[accepted ? 'success' : 'error'](res.data?.message || (accepted ? successMsg : 'Rechazado por la DIAN'));
      load();
      // El backend actualiza purchase.radian_status/radian_deadline_at, pero
      // esta página no vuelve a pedir la compra sola — recarga completa,
      // simple y suficiente para una acción que no se hace seguido.
      if (accepted) setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al emitir el evento');
    } finally {
      setActing(false);
    }
  };

  const handleClaim = async () => {
    if (!claimReasonText.trim()) {
      toast.error('El motivo del reclamo es obligatorio');
      return;
    }
    await run(() => emitRadianReclamo(purchase.id, claimReasonCode, claimReasonText), 'Reclamo (031) aceptado por la DIAN');
    setShowClaimForm(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
          <Send className="w-4 h-4" /> Eventos RADIAN
        </h4>
        <span className="text-xs text-gray-500">Estado: {status === 'none' ? 'sin acuse' : status}</span>
      </div>

      <div className="p-4 space-y-3">
        {deadline && (
          <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${deadlineExpired ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {deadlineExpired
              ? `Plazo de 3 días hábiles vencido el ${deadline.toLocaleDateString('es-CO')} — ya no se puede reclamar ni aceptar expresamente.`
              : `Plazo para reclamar o aceptar expresamente: hasta el ${deadline.toLocaleDateString('es-CO')}.`}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {status === 'none' && (
            <button disabled={acting} onClick={() => run(() => emitRadianAcuse(purchase.id), 'Acuse de recibo (030) aceptado por la DIAN')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              <Send className="w-3.5 h-3.5" /> Emitir Acuse de Recibo (030)
            </button>
          )}
          {status === '030' && (
            <button disabled={acting} onClick={() => run(() => emitRadianRecibo(purchase.id), 'Recibo (032) aceptado por la DIAN')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              <Send className="w-3.5 h-3.5" /> Emitir Recibo del bien/servicio (032)
            </button>
          )}
          {status === '032' && !deadlineExpired && (
            <>
              <button disabled={acting} onClick={() => run(() => emitRadianAceptacion(purchase.id), 'Aceptación expresa (033) aceptada por la DIAN')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                <ThumbsUp className="w-3.5 h-3.5" /> Aceptación Expresa (033)
              </button>
              <button disabled={acting} onClick={() => setShowClaimForm(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
                <ThumbsDown className="w-3.5 h-3.5" /> Reclamo (031)
              </button>
            </>
          )}
        </div>

        {showClaimForm && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <input
              type="text"
              value={claimReasonCode}
              onChange={e => setClaimReasonCode(e.target.value)}
              placeholder="Código del motivo (opcional)"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              value={claimReasonText}
              onChange={e => setClaimReasonText(e.target.value)}
              placeholder="Motivo del reclamo (obligatorio)"
              rows="2"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClaimForm(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button disabled={acting} onClick={handleClaim}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                Enviar Reclamo
              </button>
            </div>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial</h5>
            {events.map(ev => {
              const config = STATUS_CONFIG[ev.dian_status] || STATUS_CONFIG.pending;
              const { Icon } = config;
              const showReason = ['rejected', 'error'].includes(ev.dian_status) && ev.error_message;
              return (
                <div key={ev.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <span className="font-mono font-medium">{ev.event_code}</span>
                      <span className="text-gray-400">·</span>
                      <span>{EVENT_LABELS[ev.event_code] || ev.event_code}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${config.className}`}>
                      <Icon className="w-3 h-3" /> {config.label}
                    </span>
                  </div>
                  {showReason && (
                    <p className="text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
                      {ev.error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
