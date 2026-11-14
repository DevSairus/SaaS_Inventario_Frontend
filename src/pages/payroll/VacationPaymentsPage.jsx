// frontend/src/pages/payroll/VacationPaymentsPage.jsx
//
// 6.5 — Liquidación y pago directo de vacaciones fuera de un período de nómina.
// Flujo: crear (borrador) → pagar (contabiliza) → agregar al período de nómina
// donde cae la fecha de pago (ahí la reporta la DIAN y se descuenta el anticipo).
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import BankAccountSelect from '../../components/accounting/BankAccountSelect';
import { employeesAPI, payrollPeriodsAPI, payrollVacationPaymentsAPI } from '../../api/payroll';
import { formatCurrency } from '../../utils/formatters';

const STATUS = {
  borrador: { label: 'Borrador', cls: 'bg-amber-100 text-amber-800' },
  pagada: { label: 'Pagada', cls: 'bg-green-100 text-green-800' },
  anulada: { label: 'Anulada', cls: 'bg-gray-200 text-gray-600' },
};
const today = () => new Date().toISOString().slice(0, 10);
const empName = (e) => [e?.first_name, e?.other_names, e?.first_surname, e?.second_surname].filter(Boolean).join(' ');
const emptyForm = { employee_id: '', days_enjoyed: '', days_compensated: '', start_date: '', end_date: '', base_override: '', notes: '' };
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';

const VacationPaymentsPage = () => {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null); // { type: 'pay'|'attach'|'void', row }
  const [actionData, setActionData] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await payrollVacationPaymentsAPI.list();
      setRows(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando las liquidaciones de vacaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    employeesAPI.getAll({ is_active: true, limit: 200, sort_by: 'first_name', sort_order: 'ASC' }).then((r) => setEmployees(r.data || [])).catch(() => {});
    payrollPeriodsAPI.getAll({ status: 'abierto', limit: 50 }).then((r) => setPeriods((r.data || []).filter((p) => p.period_type !== 'liquidacion'))).catch(() => {});
  }, [load]);

  const setField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const run = async (fn, okMessage) => {
    try {
      setBusy(true);
      await fn();
      toast.success(okMessage);
      setAction(null);
      setActionData({});
      await load();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo completar la acción');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.employee_id) return toast.error('Seleccione el empleado');
    const ok = await run(() => payrollVacationPaymentsAPI.create({
      employee_id: form.employee_id,
      days_enjoyed: Number(form.days_enjoyed) || 0,
      days_compensated: Number(form.days_compensated) || 0,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      base_override: form.base_override ? Number(form.base_override) : undefined,
      notes: form.notes || undefined,
    }), 'Liquidación creada');
    if (ok) { setForm(emptyForm); setShowForm(false); }
  };

  const openPdf = async (row) => {
    try {
      const res = await payrollVacationPaymentsAPI.downloadPdf(row.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      toast.error('No se pudo generar el PDF');
    }
  };

  const confirmAction = () => {
    const { type, row } = action;
    if (type === 'pay') {
      if (!actionData.payment_date) return toast.error('Indique la fecha de pago');
      return run(() => payrollVacationPaymentsAPI.pay(row.id, { payment_date: actionData.payment_date, bank_account_id: actionData.bank_account_id || undefined, reference: actionData.reference || undefined }), 'Vacaciones pagadas y contabilizadas');
    }
    if (type === 'attach') {
      if (!actionData.period_id) return toast.error('Seleccione el período');
      return run(() => payrollVacationPaymentsAPI.attach(row.id, actionData.period_id), 'Agregada al período de nómina');
    }
    if (!String(actionData.reason || '').trim()) return toast.error('Indique el motivo');
    return run(() => payrollVacationPaymentsAPI.void(row.id, actionData.reason), 'Liquidación anulada');
  };

  const startAction = (type, row) => {
    setAction({ type, row });
    setActionData(type === 'pay' ? { payment_date: today() } : {});
  };

  const btn = 'px-2.5 py-1 text-xs font-medium rounded-lg';

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pago de vacaciones</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Liquide y pague vacaciones sin esperar a la nómina. Al pagarlas queda un anticipo al empleado; luego agréguelas al período de nómina donde cae la fecha de pago: ahí se reportan a la DIAN y se descuenta el anticipo.
            </p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            {showForm ? 'Cerrar' : 'Nueva liquidación'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submitCreate} className="bg-white rounded-xl border border-gray-200 p-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Empleado</label>
              <select name="employee_id" value={form.employee_id} onChange={setField} className={inputCls}>
                <option value="">Seleccione...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{empName(e)} — {e.document_number}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Días a disfrutar</label><input name="days_enjoyed" type="number" min="0" step="0.5" value={form.days_enjoyed} onChange={setField} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Primer día</label><input name="start_date" type="date" value={form.start_date} onChange={setField} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Último día</label><input name="end_date" type="date" value={form.end_date} onChange={setField} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Días compensados en dinero</label><input name="days_compensated" type="number" min="0" step="0.5" value={form.days_compensated} onChange={setField} className={inputCls} /></div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base mensual (opcional)</label>
              <input name="base_override" type="number" min="0" value={form.base_override} onChange={setField} className={inputCls} placeholder="Por defecto, el salario básico" />
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label><input name="notes" value={form.notes} onChange={setField} className={inputCls} /></div>
            <div className="md:col-span-3">
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Calcular y guardar borrador</button>
            </div>
          </form>
        )}

        {action && (
          <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3 max-w-xl">
            <p className="text-sm font-semibold text-gray-900">
              {action.type === 'pay' && `Pagar VAC-${action.row.doc_number}: ${formatCurrency(action.row.total_value)}`}
              {action.type === 'attach' && `Agregar VAC-${action.row.doc_number} a un período de nómina`}
              {action.type === 'void' && `Anular VAC-${action.row.doc_number}`}
            </p>
            {action.type === 'pay' && (
              <>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago</label><input type="date" value={actionData.payment_date || ''} onChange={(e) => setActionData((d) => ({ ...d, payment_date: e.target.value }))} className={inputCls} /></div>
                <BankAccountSelect value={actionData.bank_account_id} onChange={(v) => setActionData((d) => ({ ...d, bank_account_id: v }))} />
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Referencia (opcional)</label><input value={actionData.reference || ''} onChange={(e) => setActionData((d) => ({ ...d, reference: e.target.value }))} className={inputCls} /></div>
              </>
            )}
            {action.type === 'attach' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Período abierto (debe contener la fecha de pago {action.row.payment_date})</label>
                <select value={actionData.period_id || ''} onChange={(e) => setActionData((d) => ({ ...d, period_id: e.target.value }))} className={inputCls}>
                  <option value="">Seleccione...</option>
                  {periods.map((p) => <option key={p.id} value={p.id}>{p.start_date} — {p.end_date}</option>)}
                </select>
              </div>
            )}
            {action.type === 'void' && (
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label><input value={actionData.reason || ''} onChange={(e) => setActionData((d) => ({ ...d, reason: e.target.value }))} className={inputCls} /></div>
            )}
            <div className="flex gap-2">
              <button onClick={confirmAction} disabled={busy} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Confirmar</button>
              <button onClick={() => setAction(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>{['N.º', 'Empleado', 'Días', 'Valor', 'Pago', 'Período', 'Estado', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin liquidaciones de vacaciones</td></tr>}
                {!loading && rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">VAC-{r.doc_number}</td>
                    <td className="px-4 py-3 text-gray-700">{empName(r.employee)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {Number(r.days_enjoyed) > 0 && `${Number(r.days_enjoyed)} disfr.`}
                      {Number(r.days_enjoyed) > 0 && Number(r.days_compensated) > 0 && ' · '}
                      {Number(r.days_compensated) > 0 && `${Number(r.days_compensated)} comp.`}
                    </td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{formatCurrency(r.total_value)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.payment_date || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.payroll_period_id ? 'En nómina' : (r.status === 'pagada' ? 'Pendiente de agregar' : '—')}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label || r.status}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap space-x-1">
                      <button onClick={() => openPdf(r)} className={`${btn} text-gray-700 bg-gray-100 hover:bg-gray-200`}>PDF</button>
                      {r.status === 'borrador' && <button onClick={() => startAction('pay', r)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700`}>Pagar</button>}
                      {r.status === 'pagada' && !r.payroll_period_id && <button onClick={() => startAction('attach', r)} className={`${btn} text-indigo-700 bg-indigo-50 hover:bg-indigo-100`}>Agregar a nómina</button>}
                      {r.status !== 'anulada' && <button onClick={() => startAction('void', r)} className={`${btn} text-red-700 bg-red-50 hover:bg-red-100`}>Anular</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VacationPaymentsPage;
