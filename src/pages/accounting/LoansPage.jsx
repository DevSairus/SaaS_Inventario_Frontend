// frontend/src/pages/accounting/LoansPage.jsx
//
// Créditos — Fase 2 del plan de Contabilidad Pitbox: listado, alta y
// resumen de saldo pendiente / próximas cuotas a vencer.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loansAPI, chartOfAccountsAPI, LOAN_TYPE_LABELS } from '../../api/accounting';
import { branchesService } from '../../api/branches';
import Layout from '../../components/layout/Layout';
import NumericInput from '../../components/inputs/NumericInput';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';
import { PlusIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  activo: { label: 'Activo', className: 'bg-green-100 text-green-800' },
  pagado: { label: 'Pagado', className: 'bg-blue-100 text-blue-800' },
  cancelado: { label: 'Cancelado', className: 'bg-gray-200 text-gray-700' },
};

const emptyForm = {
  lender_name: '', loan_type: 'bancario', branch_id: '', principal_amount: '', annual_interest_rate: '',
  term_months: '', disbursement_date: '', first_payment_date: '', liability_account_id: '', interest_expense_account_id: '',
};

const LoansPage = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [report, setReport] = useState(null);
  const [liabilityAccounts, setLiabilityAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('activo');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [loansRes, reportRes, accountsRes, branchesRes] = await Promise.all([
        loansAPI.getAll(statusFilter ? { status: statusFilter } : {}),
        loansAPI.getReport(),
        chartOfAccountsAPI.getAll(),
        branchesService.getAll(),
      ]);
      setLoans(loansRes.data || []);
      setReport(reportRes.data || null);
      const accounts = accountsRes.data || [];
      setLiabilityAccounts(accounts.filter((a) => a.account_type === 'pasivo' && a.accepts_entries));
      setExpenseAccounts(accounts.filter((a) => a.account_type === 'gasto' && a.accepts_entries));
      setBranches(branchesRes.data || branchesRes || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando los créditos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.lender_name.trim()) return toast.error('El nombre de la entidad/tercero es obligatorio');
    if (!form.principal_amount || parseFloat(form.principal_amount) <= 0) return toast.error('El monto del crédito debe ser mayor a 0');
    if (form.annual_interest_rate === '' || parseFloat(form.annual_interest_rate) < 0) return toast.error('La tasa de interés anual es obligatoria (puede ser 0)');
    if (!form.term_months || parseInt(form.term_months, 10) <= 0) return toast.error('El plazo (meses) debe ser mayor a 0');
    if (!form.disbursement_date) return toast.error('La fecha de desembolso es obligatoria');
    if (!form.first_payment_date) return toast.error('La fecha de la primera cuota es obligatoria');
    if (!form.liability_account_id || !form.interest_expense_account_id) return toast.error('Selecciona la cuenta del pasivo y la de gasto por intereses');

    try {
      setSaving(true);
      await loansAPI.create({ ...form, branch_id: form.branch_id || null });
      toast.success('Crédito creado, tabla de amortización generada');
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creando el crédito');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Créditos</h1>
            <p className="text-sm text-gray-500 mt-1">Amortización en sistema francés (cuota fija)</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="w-4 h-4" /> Nuevo Crédito
          </button>
        </div>

        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo total pendiente</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(report.total_pending_balance)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cuotas por vencer (30 días)</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{report.upcoming_installments.length}</p>
            </div>
          </div>
        )}

        {report && report.upcoming_installments.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">Próximas cuotas a vencer</p>
            <ul className="text-sm text-amber-900 space-y-1">
              {report.upcoming_installments.slice(0, 5).map((i) => (
                <li key={i.id}>
                  {formatDate(i.due_date)} — {i.loan?.lender_name} (cuota {i.installment_number}): {formatCurrency(i.total_amount)}
                  {i.status === 'vencida' && <span className="ml-2 text-red-600 font-medium">Vencida</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <label className="text-sm text-gray-600">Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Entidad/Tercero', 'Tipo', 'Monto', 'Tasa anual', 'Plazo', 'Saldo pendiente', 'Estado'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && loans.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin créditos registrados</td></tr>
                )}
                {!loading && loans.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/accounting/loans/${l.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{l.lender_name}</td>
                    <td className="px-4 py-3 text-gray-600">{LOAN_TYPE_LABELS[l.loan_type] || l.loan_type}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(l.principal_amount)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatPercentage(l.annual_interest_rate)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.term_months} meses</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatCurrency(l.pending_balance)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[l.status]?.className || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[l.status]?.label || l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Nuevo Crédito</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Entidad financiera o tercero</label>
                    <input name="lender_name" value={form.lender_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                    <select name="loan_type" value={form.loan_type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="bancario">Bancario</option>
                      <option value="tercero">Con Tercero</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sede (opcional)</label>
                    <select name="branch_id" value={form.branch_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Sin sede específica</option>
                      {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
                    <NumericInput name="principal_amount" value={form.principal_amount} onChange={handleChange} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tasa anual (%)</label>
                    <NumericInput name="annual_interest_rate" value={form.annual_interest_rate} onChange={handleChange} decimals={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Plazo (meses)</label>
                    <input type="number" min="1" name="term_months" value={form.term_months} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de desembolso</label>
                    <input type="date" name="disbursement_date" value={form.disbursement_date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha primera cuota</label>
                    <input type="date" name="first_payment_date" value={form.first_payment_date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta del pasivo financiero</label>
                  <select name="liability_account_id" value={form.liability_account_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecciona una cuenta...</option>
                    {liabilityAccounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta de gasto por intereses</label>
                  <select name="interest_expense_account_id" value={form.interest_expense_account_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecciona una cuenta...</option>
                    {expenseAccounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>))}
                  </select>
                </div>
                <p className="text-xs text-gray-400">
                  Al guardar se genera la tabla de amortización completa (sistema francés, cuota fija). No se puede editar después.
                </p>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LoansPage;
