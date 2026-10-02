// frontend/src/components/payroll/PayrollAccountingPanel.jsx
//
// Contabilidad de un periodo ya emitido (ver payrollAccountingService.js):
//  - Comprobantes: nómina por empleado y aportes/provisiones por fondo (uno
//    o dos asientos según Configuración de Nómina). Si el periodo no los
//    tiene (emitido antes de esta contabilización, o falló un mapeo), se
//    pueden generar desde aquí.
//  - Desembolsos: pago del neto a los empleados y de la seguridad social a
//    los fondos, desde una cuenta bancaria. Anular un pago reversa su asiento.
//    Lo pendiente sale de los saldos de los asientos: si una Nota de Ajuste
//    cambia el neto después de pagar, la diferencia queda por pagar (o a
//    favor de la empresa) sin tocar el pago ya registrado.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { payrollAccountingAPI } from '../../api/payroll';
import { bankAccountsAPI } from '../../api/accounting';
import {
  ArrowPathIcon,
  BanknotesIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ENTRY_TYPE_LABELS = {
  payroll: 'Comprobante de nómina',
  payroll_provisions: 'Aportes y provisiones',
};

const PAYMENT_TYPE_LABELS = {
  net_pay: 'Neto a empleados',
  social_security: 'Seguridad social',
};

const ENTRY_STATUS_LABELS = { draft: 'Borrador', posted: 'Contabilizado' };

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const PaymentForm = ({ type, period, pendingDocuments, pendingSocialSecurity, bankAccounts, onCancel, onSubmit, submitting }) => {
  const [form, setForm] = useState({
    payment_date: period.payment_date || todayISO(),
    bank_account_id: bankAccounts[0]?.id || '',
    reference: '',
  });
  const [selected, setSelected] = useState(() => new Set(pendingDocuments.map((d) => d.employee_id)));

  const toggle = (employeeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
      return next;
    });
  };

  const total = type === 'net_pay'
    ? pendingDocuments.filter((d) => selected.has(d.employee_id)).reduce((s, d) => s + d.pending, 0)
    : pendingSocialSecurity;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'net_pay' && selected.size === 0) {
      toast.error('Seleccione al menos un empleado');
      return;
    }
    onSubmit({
      payment_type: type,
      payment_date: form.payment_date,
      bank_account_id: form.bank_account_id || null,
      reference: form.reference || undefined,
      employee_ids: type === 'net_pay' ? [...selected] : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Registrar pago — {PAYMENT_TYPE_LABELS[type]}
        </h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha de pago</label>
          <input type="date" required value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cuenta de origen</label>
          <select value={form.bank_account_id} onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))} className={inputClass}>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>{b.bank_name} {b.account_alias || b.account_number}</option>
            ))}
            <option value="">Cuenta de bancos por defecto (Mapeo de Cuentas)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Referencia</label>
          <input
            type="text"
            maxLength={100}
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder={type === 'net_pay' ? 'N° de transferencia/lote' : 'N° de planilla PILA'}
            className={inputClass}
          />
        </div>
      </div>

      {type === 'net_pay' && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-graphite divide-y divide-gray-100 dark:divide-white/5">
          {pendingDocuments.map((d) => (
            <label key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
              <input type="checkbox" checked={selected.has(d.employee_id)} onChange={() => toggle(d.employee_id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="flex-1 text-gray-700 dark:text-gray-300">
                {d.employee_name}
                {d.employee_document && <span className="text-xs text-gray-400 ml-1.5">{d.employee_document}</span>}
              </span>
              <span className="text-right">
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrencyCOP(d.pending)}</span>
                {d.paid > 0 && <span className="block text-xs text-gray-400">diferencia — ya pagado {formatCurrencyCOP(d.paid)}</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total a pagar: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyCOP(total)}</span>
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <BanknotesIcon className="h-4 w-4" />}
          Registrar pago
        </button>
      </div>
    </form>
  );
};

const PayrollAccountingPanel = ({ period, canRegenerate = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentType, setPaymentType] = useState(null); // 'net_pay' | 'social_security' | null
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAccountingAPI.getPeriod(period.id);
      setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando la contabilidad del periodo');
    } finally {
      setLoading(false);
    }
  }, [period.id]);

  useEffect(() => { load(); }, [load, period.status]);

  useEffect(() => {
    // Sin módulo de contabilidad (o sin cuentas registradas) se paga contra
    // la cuenta de bancos del Mapeo de Cuentas.
    bankAccountsAPI.getAll()
      .then((res) => setBankAccounts((res.data || []).filter((b) => b.is_active !== false)))
      .catch(() => setBankAccounts([]));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await payrollAccountingAPI.generate(period.id);
      toast.success(res.message || 'Comprobantes generados');
      setWarnings(res.data?.warnings || []);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron generar los comprobantes');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Se reemplazarán los comprobantes del periodo por unos recalculados con la configuración, los fondos y las notas de ajuste vigentes. Los borradores se anulan; si alguno ya estaba contabilizado se reversa. Los pagos registrados no cambian. ¿Continuar?')) return;
    setRegenerating(true);
    try {
      const res = await payrollAccountingAPI.regenerate(period.id);
      toast.success(res.message || 'Comprobantes regenerados');
      setWarnings(res.data?.warnings || []);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron regenerar los comprobantes');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePayment = async (payload) => {
    setSubmitting(true);
    try {
      const res = await payrollAccountingAPI.createPayment(period.id, payload);
      toast.success(`Pago registrado (${res.data?.entry_number})`);
      setPaymentType(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async (payment) => {
    if (!window.confirm(`¿Anular el pago de ${PAYMENT_TYPE_LABELS[payment.payment_type].toLowerCase()} por ${formatCurrencyCOP(payment.amount)}? Se reversa su asiento contable.`)) return;
    try {
      await payrollAccountingAPI.voidPayment(period.id, payment.id);
      toast.success('Pago anulado');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo anular el pago');
    }
  };

  const pendingDocuments = (data?.documents || []).filter((d) => d.pending > 0.5);
  const pendingNet = pendingDocuments.reduce((s, d) => s + d.pending, 0);
  const overpaid = (data?.documents || []).filter((d) => d.pending < -0.5);
  const adjusted = (data?.documents || []).filter((d) => d.adjustment).length;
  const hasEntries = (data?.entries || []).length > 0;

  return (
    <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contabilidad y pagos</h2>
        </div>
        <button onClick={load} disabled={loading} title="Actualizar" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5">
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!data && loading && <div className="py-10 text-center text-sm text-gray-400">Cargando...</div>}

      {data && (
        <div className="p-4 space-y-5">
          {data.mappingError && (
            <div className="flex gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              {data.mappingError}
            </div>
          )}

          {/* Comprobantes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Comprobantes contables
                {adjusted > 0 && <span className="ml-2 normal-case font-normal text-gray-400">· {adjusted} con nota de ajuste aplicada</span>}
              </h3>
              {hasEntries && canRegenerate && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} /> Regenerar
                </button>
              )}
            </div>
            {hasEntries ? (
              <div className="divide-y divide-gray-100 dark:divide-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                {data.entries.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
                    <span className="font-mono text-gray-800 dark:text-gray-200">{e.entry_number}</span>
                    <span className="text-gray-600 dark:text-gray-400">{ENTRY_TYPE_LABELS[e.source_type] || e.source_type}</span>
                    <span className="text-xs text-gray-400">{e.line_count} líneas · {ENTRY_STATUS_LABELS[e.status] || e.status}</span>
                    <span className="ml-auto font-medium text-gray-800 dark:text-gray-200">{formatCurrencyCOP(e.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
                  Este periodo no tiene comprobante contable. Revise los fondos de los empleados y el Mapeo de Cuentas, y genérelo.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {generating && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                  Generar comprobantes
                </button>
              </div>
            )}
            {warnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300 list-disc pl-5">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
          </section>

          {/* Desembolsos */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Desembolsos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Neto pendiente a empleados</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyCOP(pendingNet)}</p>
                <p className="text-xs text-gray-400">{pendingDocuments.length} de {data.documents.length} empleado(s) con saldo por pagar</p>
                <button
                  onClick={() => setPaymentType('net_pay')}
                  disabled={!hasEntries || pendingDocuments.length === 0 || paymentType !== null}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800/40"
                >
                  <BanknotesIcon className="h-4 w-4" /> Registrar pago de nómina
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Seguridad social pendiente (empleado + empleador)</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyCOP(data.pendingSocialSecurity)}</p>
                <p className="text-xs text-gray-400">
                  EPS, pensión, ARL y parafiscales{data.paidSocialSecurity > 0 ? ` · ya pagado ${formatCurrencyCOP(data.paidSocialSecurity)}` : ''}
                </p>
                <button
                  onClick={() => setPaymentType('social_security')}
                  disabled={!hasEntries || data.pendingSocialSecurity <= 0 || paymentType !== null}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800/40"
                >
                  <BanknotesIcon className="h-4 w-4" /> Registrar pago de seguridad social
                </button>
              </div>
            </div>

            {overpaid.length > 0 && (
              <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                <span>
                  Saldo a favor de la empresa (se pagó más de lo que quedó tras una nota de ajuste):{' '}
                  {overpaid.map((d) => `${d.employee_name} ${formatCurrencyCOP(-d.pending)}`).join(', ')}.
                  Descuéntelo en una nómina siguiente o regístrelo con un asiento manual.
                </span>
              </div>
            )}

            {paymentType && (
              <div className="mt-3">
                <PaymentForm
                  type={paymentType}
                  period={period}
                  pendingDocuments={pendingDocuments}
                  pendingSocialSecurity={data.pendingSocialSecurity}
                  bankAccounts={bankAccounts}
                  submitting={submitting}
                  onCancel={() => setPaymentType(null)}
                  onSubmit={handlePayment}
                />
              </div>
            )}

            {data.payments.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                      <th className="px-2 py-1.5 font-medium">Fecha</th>
                      <th className="px-2 py-1.5 font-medium">Tipo</th>
                      <th className="px-2 py-1.5 font-medium">Cuenta</th>
                      <th className="px-2 py-1.5 font-medium">Referencia</th>
                      <th className="px-2 py-1.5 font-medium">Asiento</th>
                      <th className="px-2 py-1.5 font-medium text-right">Valor</th>
                      <th className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {data.payments.map((p) => (
                      <tr key={p.id} className={p.status === 'voided' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}>
                        <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{PAYMENT_TYPE_LABELS[p.payment_type]}</td>
                        <td className="px-2 py-1.5">{p.bank || 'Bancos (mapeo)'}</td>
                        <td className="px-2 py-1.5">{p.reference || '—'}</td>
                        <td className="px-2 py-1.5 font-mono">{p.entry_number || '—'}</td>
                        <td className="px-2 py-1.5 text-right font-medium">{formatCurrencyCOP(p.amount)}</td>
                        <td className="px-2 py-1.5 text-right">
                          {p.status === 'active' ? (
                            <button onClick={() => handleVoid(p)} className="text-xs text-red-600 hover:underline dark:text-red-400">Anular</button>
                          ) : (
                            <span className="text-xs no-underline">Anulado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default PayrollAccountingPanel;
