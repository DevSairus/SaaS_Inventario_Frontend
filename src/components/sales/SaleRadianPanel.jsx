// frontend/src/components/sales/SaleRadianPanel.jsx
/**
 * Panel RADIAN del lado Ventas (emisor) — Fase 3 (ver
 * 00 - Documentación/RADIAN-Analisis-y-Plan.md §5.6). A diferencia del
 * panel de Compras, acá no hay botones para "emitir" 032/033/031: esos los
 * emite el CLIENTE con su propio software. Lo único que Pitbox controla es:
 *   1) Registrar que llegó un evento del cliente (mientras no haya polling
 *      confirmado — ver radianService.js#recordSaleReceivedEvent).
 *   2) Emitir el 034 (Aceptación tácita) una vez vence el plazo sin 033/031.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Inbox, CheckCircle2, XCircle, Clock, AlertTriangle, Gavel } from 'lucide-react';
import { emitRadianTacita, recordSaleRadianEvent, getSaleRadianEvents } from '../../api/radian';

const EVENT_LABELS = {
  '032': 'Recibo del bien/servicio (cliente)',
  '031': 'Reclamo (cliente)',
  '033': 'Aceptación expresa (cliente)',
  '034': 'Aceptación tácita (nuestra)',
};

const STATUS_CONFIG = {
  accepted: { label: 'Aceptado', className: 'bg-green-100 text-green-800 border-green-200', Icon: CheckCircle2 },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200', Icon: XCircle },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 border-red-200', Icon: XCircle },
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', Icon: Clock },
};

export default function SaleRadianPanel({ sale }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordCode, setRecordCode] = useState('032');
  const [recordNote, setRecordNote] = useState('');

  const load = useCallback(() => {
    if (!sale?.id) return;
    setLoading(true);
    getSaleRadianEvents(sale.id)
      .then(res => setEvents(res.data?.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [sale?.id]);

  useEffect(() => { load(); }, [load]);

  if (!sale?.cufe) return null;

  const status = sale.radian_status || 'none';
  const deadline = sale.radian_deadline_at ? new Date(sale.radian_deadline_at) : null;
  const deadlineExpired = deadline ? deadline.getTime() < Date.now() : false;

  const handleRecord = async () => {
    setActing(true);
    try {
      const res = await recordSaleRadianEvent(sale.id, recordCode, recordNote);
      toast.success(`Evento ${recordCode} registrado`);
      setShowRecordForm(false);
      setRecordNote('');
      load();
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al registrar el evento');
    } finally {
      setActing(false);
    }
  };

  const handleTacita = async () => {
    setActing(true);
    try {
      const res = await emitRadianTacita(sale.id);
      const accepted = res.data?.data?.accepted;
      toast[accepted ? 'success' : 'error'](res.data?.message || (accepted ? 'Aceptación tácita (034) aceptada' : 'Rechazado por la DIAN'));
      load();
      if (accepted) setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al emitir el 034');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden no-print">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
          <Inbox className="w-4 h-4" /> Eventos RADIAN del cliente
        </h4>
        <span className="text-xs text-gray-500">Estado: {status === 'none' ? 'sin eventos' : status}</span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">
          Estos eventos los emite el cliente con su propio software. Si te llegó por correo o portal, regístralo aquí para
          que Pitbox controle el plazo de 3 días hábiles y habilite la aceptación tácita si no responde.
        </p>

        {deadline && (
          <div className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${deadlineExpired ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {deadlineExpired
              ? `Plazo vencido el ${deadline.toLocaleDateString('es-CO')} sin respuesta del cliente — ya se puede emitir el 034.`
              : `Plazo para que el cliente responda (033/031): hasta el ${deadline.toLocaleDateString('es-CO')}.`}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(status === 'none' || status === '032_received') && (
            <button disabled={acting} onClick={() => setShowRecordForm(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
              <Inbox className="w-3.5 h-3.5" /> Registrar evento recibido
            </button>
          )}
          {status === '032_received' && deadlineExpired && (
            <button disabled={acting} onClick={handleTacita}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              <Gavel className="w-3.5 h-3.5" /> Emitir Aceptación Tácita (034)
            </button>
          )}
        </div>

        {showRecordForm && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <select value={recordCode} onChange={e => setRecordCode(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              {status === 'none' && <option value="032">032 — Recibo del bien/servicio</option>}
              {status === '032_received' && <option value="033">033 — Aceptación expresa</option>}
              {status === '032_received' && <option value="031">031 — Reclamo</option>}
            </select>
            <textarea
              value={recordNote}
              onChange={e => setRecordNote(e.target.value)}
              placeholder="Nota (opcional) — ej. referencia del correo/portal donde llegó"
              rows="2"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRecordForm(false)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button disabled={acting} onClick={handleRecord}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Registrar
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
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{ev.direction === 'received' ? 'recibido' : 'emitido'}</span>
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
