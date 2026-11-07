import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Send, XCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import AttachmentsPanel from '../../components/attachments/AttachmentsPanel';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { getPaymentBatch, batchAction, downloadBatchFile } from '../../api/paymentBatches';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { BATCH_STATUS } from './PaymentBatchesPage';

const userName = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : '');
const ACCOUNT_TYPES = { savings: 'Ahorros', checking: 'Corriente', other: 'Otra' };

export default function PaymentBatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const [batch, setBatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState(null);

  const load = useCallback(() => {
    getPaymentBatch(id).then((r) => setBatch(r.data)).catch((e) => {
      toast.error(e.response?.data?.message || 'Error al cargar el lote');
      if (e.response?.status === 404) navigate('/payment-batches');
    });
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);

  const run = async (action, body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await batchAction(id, action, body);
      toast.success(res.message);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo completar la acción', { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    setProblems(null);
    try {
      const res = await downloadBatchFile(id);
      const name = /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] || '')?.[1] || `${batch.batch_number}.txt`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast.success('Archivo generado: cárgalo en el portal del banco');
      load();
    } catch (e) {
      // El error llega como blob (responseType: 'blob').
      let data = e.response?.data;
      if (data instanceof Blob) { try { data = JSON.parse(await data.text()); } catch { data = null; } }
      if (data?.code === 'MISSING_BANK_DATA') setProblems(data.data);
      toast.error(data?.message || 'No se pudo generar el archivo', { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };

  if (!batch) return <Layout><div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div></Layout>;

  const st = BATCH_STATUS[batch.status];
  const canSchedule = can('payments.schedule');
  const canApproveRole = can('payments.approve');

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <Link to="/payment-batches" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-1"><ArrowLeft className="w-4 h-4" /> Pagos programados</Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Lote {batch.batch_number}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st?.cls}`}>{st?.label}</span>
              <span>· Pago {formatDate(batch.payment_date)}</span>
              <span>· Desde {batch.bankAccount ? `${batch.bankAccount.account_alias || batch.bankAccount.bank_name} ${batch.bankAccount.account_number}` : '—'} ({ACCOUNT_TYPES[batch.debit_account_type]})</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {batch.status === 'draft' && canSchedule && (
              <button disabled={busy} onClick={() => run('submit')} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60"><Send className="w-4 h-4" /> Enviar a aprobación</button>
            )}
            {batch.status === 'pending_approval' && batch.can_approve && (
              <>
                <button disabled={busy} onClick={() => run('approve')} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"><CheckCircle2 className="w-4 h-4" /> Aprobar</button>
                <button disabled={busy} onClick={() => { const reason = window.prompt('Motivo del rechazo'); if (reason) run('reject', { reason }); }} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Rechazar</button>
              </>
            )}
            {['approved', 'exported'].includes(batch.status) && canApproveRole && (
              <button disabled={busy} onClick={download} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"><Download className="w-4 h-4" /> {batch.status === 'exported' ? 'Descargar de nuevo' : 'Generar archivo del banco'}</button>
            )}
            {batch.status === 'exported' && canSchedule && (
              <button disabled={busy} onClick={() => run('paid', {}, `¿El banco ya confirmó los pagos del lote ${batch.batch_number}? Se registran ${batch.items.length} abono(s) con sus asientos contables.`)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"><CheckCircle2 className="w-4 h-4" /> Marcar pagado</button>
            )}
            {['draft', 'pending_approval', 'approved', 'exported'].includes(batch.status) && canSchedule && (
              <button disabled={busy} onClick={() => run('cancel', {}, `¿Anular el lote ${batch.batch_number}? Los documentos vuelven a quedar disponibles para otro lote.`)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4" /> Anular</button>
            )}
          </div>
        </div>

        {batch.rejection_reason && batch.status === 'draft' && (
          <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-2">Rechazado: {batch.rejection_reason}. Corrígelo y envíalo de nuevo.</p>
        )}
        {batch.status === 'pending_approval' && !batch.can_approve && (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-2">Esperando la aprobación de alguien con permiso para aprobar pagos (distinto de quien armó el lote).</p>
        )}
        {batch.status === 'exported' && (
          <p className="text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-lg px-4 py-2">Archivo generado {formatDateTime(batch.exported_at)}. Cárgalo en el portal del banco; cuando el banco confirme, márcalo pagado para registrar los abonos.</p>
        )}
        {problems && (
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3">
            <p className="font-medium flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Proveedores sin datos bancarios completos</p>
            <ul className="list-disc ml-5 mt-1">{problems.map((p, i) => <li key={i}>{p.beneficiary} ({p.reference}): falta {p.missing.join(', ')}</li>)}</ul>
            <p className="mt-1">Complétalos en Inventario → Proveedores, anula este lote y arma uno nuevo (los datos bancarios se toman al armar el lote).</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Total', formatCurrency(batch.total_amount)], ['Pagos', batch.items.length], ['Armó', userName(batch.creator) || '—'], ['Aprobó', batch.approver ? `${userName(batch.approver)} · ${formatDate(batch.approved_at)}` : '—']].map(([label, value]) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2">Proveedor</th><th className="px-4 py-2">Documento</th><th className="px-4 py-2">Cuenta destino</th><th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {batch.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2">{i.beneficiary_name}<span className="block text-xs text-gray-500">{i.beneficiary_tax_id || 'Sin documento'}</span></td>
                  <td className="px-4 py-2">
                    <Link to={i.document_type === 'purchase' ? `/purchases/${i.document_id}` : '/expenses'} className="text-orange-600 hover:underline">{i.document_number}</Link>
                    <span className="block text-xs text-gray-500">{i.document_type === 'purchase' ? 'Compra' : 'Gasto'}</span>
                  </td>
                  <td className="px-4 py-2">
                    {i.bank_name && i.account_number
                      ? <>{i.bank_name} · {ACCOUNT_TYPES[i.account_type] || i.account_type || '?'}<span className="block text-xs text-gray-500">{i.account_number}</span></>
                      : <span className="text-amber-700">Sin datos bancarios</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AttachmentsPanel entityType="payment_batch" entityId={batch.id} title="Soportes del pago (comprobante del banco)" defaultKind="payment_proof" />
      </div>
    </Layout>
  );
}
