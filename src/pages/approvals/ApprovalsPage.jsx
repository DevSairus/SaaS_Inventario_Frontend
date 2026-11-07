import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, Inbox, Settings, XCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { getApprovalsInbox, decideApproval } from '../../api/approvals';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const STATUS = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800', Icon: Clock },
  approved: { label: 'Aprobada', cls: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  rejected: { label: 'Rechazada', cls: 'bg-red-100 text-red-700', Icon: XCircle },
  cancelled: { label: 'Anulada', cls: 'bg-gray-100 text-gray-600', Icon: XCircle },
};
const userName = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '');

function DecideRow({ request, onDone }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const decide = async (decision) => {
    if (decision === 'reject' && !comment.trim()) { toast('Escribe el motivo del rechazo'); return; }
    setBusy(true);
    try {
      const res = await decideApproval(request.id, decision, comment);
      toast.success(res.message);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la decisión');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {request.document_label} <Link to={request.document_path} className="text-orange-600 hover:underline">{request.document_number}</Link>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Pide {userName(request.requester)} · {formatDateTime(request.created_at)}
            {request.project && <> · Proyecto {request.project.code}</>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {request.current_step_label}{request.steps.length > 1 ? ` · paso ${request.current_step + 1} de ${request.steps.length}` : ''}
          </p>
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(request.amount)}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (obligatorio para rechazar)"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
        <button onClick={() => decide('approve')} disabled={busy} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">Aprobar</button>
        <button onClick={() => decide('reject')} disabled={busy} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-60">Rechazar</button>
      </div>
    </div>
  );
}

/**
 * Bandeja de aprobaciones: lo que me toca decidir y lo que yo pedí.
 */
export default function ApprovalsPage() {
  const can = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'mine' ? 'mine' : 'decide';
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    getApprovalsInbox().then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Error al cargar las aprobaciones'));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Aprobaciones</h1>
            <p className="text-sm text-gray-500 mt-0.5">Órdenes de compra que esperan tu visto bueno y las que tú pediste.</p>
          </div>
          {can('approvals.configure') && (
            <Link to="/settings/approvals" className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50">
              <Settings className="w-4 h-4" /> Reglas de aprobación
            </Link>
          )}
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 flex gap-1">
          {[['decide', `Por decidir${data ? ` (${data.to_decide.length})` : ''}`], ['mine', 'Mis solicitudes']].map(([key, label]) => (
            <button key={key} onClick={() => setSearchParams(key === 'mine' ? { tab: 'mine' } : {})}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {!data ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
        ) : tab === 'decide' ? (
          data.to_decide.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No tienes aprobaciones pendientes.</p>
            </div>
          ) : (
            <div className="space-y-3">{data.to_decide.map((r) => <DecideRow key={r.id} request={r} onDone={load} />)}</div>
          )
        ) : data.mine.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no has pedido aprobaciones.</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Documento</th><th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.mine.map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2">{r.document_label} <Link to={r.document_path} className="text-orange-600 hover:underline">{r.document_number}</Link></td>
                      <td className="px-4 py-2">{formatDateTime(r.created_at)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}><st.Icon className="w-3.5 h-3.5" /> {st.label}</span>
                        {r.status === 'pending' && <span className="block text-xs text-gray-500">{r.current_step_label} · {r.current_approver}</span>}
                        {r.comment && r.status !== 'pending' && <span className="block text-xs text-gray-500">"{r.comment}"</span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
