import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { getDocumentApprovals, decideApproval } from '../../api/approvals';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const STATUS = {
  pending: { label: 'Pendiente de aprobación', cls: 'bg-amber-50 border-amber-200 text-amber-900', Icon: Clock },
  approved: { label: 'Aprobada', cls: 'bg-green-50 border-green-200 text-green-900', Icon: CheckCircle2 },
  rejected: { label: 'Rechazada', cls: 'bg-red-50 border-red-200 text-red-900', Icon: XCircle },
};

/**
 * Estado de aprobación de un documento (hoy, órdenes de compra): pasos,
 * quién decidió y, si al usuario le toca, aprobar o rechazar aquí mismo.
 * No muestra nada si el documento nunca necesitó aprobación.
 * refreshKey: cambiarlo recarga (p. ej. tras un intento de confirmar).
 */
export default function ApprovalStatusPanel({ documentType, documentId, refreshKey, onDecided }) {
  const [requests, setRequests] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getDocumentApprovals(documentType, documentId)
      .then((r) => setRequests(r.data || []))
      .catch(() => setRequests([]));
  }, [documentType, documentId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const current = (requests || []).find((r) => r.status !== 'cancelled');
  if (!current) return null;
  const st = STATUS[current.status];

  const decide = async (decision) => {
    if (decision === 'reject' && !comment.trim()) { toast('Escribe el motivo del rechazo'); return; }
    setBusy(true);
    try {
      const res = await decideApproval(current.id, decision, comment);
      toast.success(res.message);
      setComment('');
      load();
      onDecided?.(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la decisión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${st.cls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold flex items-center gap-2"><st.Icon className="w-5 h-5" /> {st.label} · {formatCurrency(current.amount)}</p>
        <p className="text-xs">Solicitada {formatDateTime(current.created_at)}</p>
      </div>
      <ol className="mt-3 space-y-1.5">
        {current.steps.map((s, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${s.status === 'approved' ? 'text-green-700' : s.status === 'rejected' ? 'text-red-700' : 'opacity-50'}`} />
            <span>
              <strong>Paso {i + 1}:</strong> {s.rule_name}
              {s.status === 'pending' && i === current.current_step && current.status === 'pending' && ' — esperando'}
              {s.status !== 'pending' && (
                <> — {s.status === 'approved' ? 'aprobó' : 'rechazó'} {s.decided_by_name || ''}{s.via === 'email' ? ' (desde el correo)' : ''}, {formatDateTime(s.decided_at)}{s.comment ? `: "${s.comment}"` : ''}</>
              )}
            </span>
          </li>
        ))}
      </ol>
      {current.status === 'rejected' && (
        <p className="text-sm mt-2">Edita la compra para corregirla; al confirmarla de nuevo se pide otra aprobación.</p>
      )}
      {current.can_decide && (
        <div className="mt-3 pt-3 border-t border-current/20 flex flex-col sm:flex-row gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario (obligatorio para rechazar)"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900"
          />
          <button onClick={() => decide('approve')} disabled={busy} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">Aprobar</button>
          <button onClick={() => decide('reject')} disabled={busy} className="px-4 py-2 text-sm bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-60">Rechazar</button>
        </div>
      )}
    </div>
  );
}
