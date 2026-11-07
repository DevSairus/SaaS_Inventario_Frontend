// frontend/src/pages/approvals/ApprovalPublicPage.jsx
// Página pública /aprobar/:token: el enlace que le llega por correo al
// aprobador para decidir desde el celular sin iniciar sesión. El enlace es de
// un solo uso y vence en 7 días (backend: services/approvals/approvals.service.js).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getPublicApproval, decidePublicApproval } from '../../api/approvals';

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
// Una fecha sin hora (AAAA-MM-DD) se lee como local: new Date('2026-11-05') es
// medianoche UTC y en Colombia mostraría el día anterior.
const date = (d) => {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
  const value = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  return value.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ApprovalPublicPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'approve' | 'reject'
  const [formError, setFormError] = useState('');

  useEffect(() => {
    getPublicApproval(token)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'No se pudo cargar la solicitud.'));
  }, [token]);

  const decide = async (decision) => {
    if (decision === 'reject' && !comment.trim()) { setFormError('Escribe el motivo del rechazo.'); return; }
    setBusy(true);
    setFormError('');
    try {
      await decidePublicApproval(token, decision, comment);
      setDone(decision);
    } catch (e) {
      setFormError(e.response?.data?.message || 'No se pudo registrar la decisión.');
    } finally {
      setBusy(false);
    }
  };

  const shell = (children) => (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">{children}</div>
    </div>
  );

  if (error) return shell(<p className="text-gray-700 text-center">{error}</p>);
  if (!data) return shell(<div className="py-10 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>);
  if (done) {
    return shell(
      <div className="text-center py-6">
        {done === 'approve' ? <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" /> : <XCircle className="w-14 h-14 text-red-600 mx-auto" />}
        <p className="text-lg font-semibold mt-3">{done === 'approve' ? 'Aprobaste la solicitud' : 'Rechazaste la solicitud'}</p>
        <p className="text-sm text-gray-500 mt-1">{data.document_label} {data.document.number} · {money(data.amount)}. Ya puedes cerrar esta página.</p>
      </div>
    );
  }

  const d = data.document;
  return shell(
    <div className="space-y-4">
      <div>
        {data.company && <p className="text-xs uppercase tracking-wide text-gray-500">{data.company}</p>}
        <h1 className="text-xl font-bold text-gray-900">{data.document_label} {d.number}</h1>
        <p className="text-sm text-gray-600">
          {data.approver}, {data.requested_by ? `${data.requested_by} pide` : 'se pide'} tu aprobación
          {data.steps > 1 ? ` (paso ${data.step} de ${data.steps}: ${data.rule})` : ` (${data.rule})`}.
        </p>
      </div>

      <div className="rounded-xl bg-orange-50 border border-orange-200 p-4">
        <p className="text-3xl font-bold text-gray-900">{money(d.total)}</p>
        <p className="text-sm text-gray-600">Subtotal {money(d.subtotal)} · IVA {money(d.tax)}</p>
      </div>

      <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-gray-500">Proveedor</dt><dd className="col-span-2 text-gray-900">{d.supplier || '—'}{d.supplier_tax_id ? ` · ${d.supplier_tax_id}` : ''}</dd>
        <dt className="text-gray-500">Fecha</dt><dd className="col-span-2 text-gray-900">{date(d.date)}</dd>
        {d.project && (<><dt className="text-gray-500">Proyecto</dt><dd className="col-span-2 text-gray-900">{d.project}</dd></>)}
        {d.notes && (<><dt className="text-gray-500">Notas</dt><dd className="col-span-2 text-gray-900">{d.notes}</dd></>)}
      </dl>

      {d.items?.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {d.items.map((i, idx) => (
            <div key={idx} className="px-3 py-2 flex justify-between gap-3 text-sm">
              <span className="text-gray-800">{i.name} <span className="text-gray-500">× {i.quantity}</span></span>
              <span className="tabular-nums text-gray-900 whitespace-nowrap">{money(i.total)}</span>
            </div>
          ))}
        </div>
      )}

      {data.previous?.length > 0 && (
        <div className="text-xs text-gray-600 space-y-0.5">
          {data.previous.map((p, i) => <p key={i}>✓ {p.rule}: aprobó {p.by} {date(p.at)}{p.comment ? ` — "${p.comment}"` : ''}</p>)}
        </div>
      )}

      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Comentario (obligatorio si rechazas)"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => decide('reject')} disabled={busy} className="py-3 rounded-xl border border-red-300 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-60">Rechazar</button>
        <button onClick={() => decide('approve')} disabled={busy} className="py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60">Aprobar</button>
      </div>
      <p className="text-xs text-gray-400 text-center">Este enlace es personal y sirve una sola vez.</p>
    </div>
  );
}
