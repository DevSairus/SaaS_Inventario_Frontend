// frontend/src/pages/accounting/LoanDetailPage.jsx
//
// Detalle de un Crédito: tabla de amortización completa, columnas
// capital/interés/saldo, y registro de pago por cuota.
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loansAPI, LOAN_TYPE_LABELS } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  activo: { label: 'Activo', className: 'bg-green-100 text-green-800' },
  pagado: { label: 'Pagado', className: 'bg-blue-100 text-blue-800' },
  cancelado: { label: 'Cancelado', className: 'bg-gray-200 text-gray-700' },
};

const INSTALLMENT_STATUS_LABELS = {
  pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
  pagada: { label: 'Pagada', className: 'bg-green-100 text-green-800' },
  vencida: { label: 'Vencida', className: 'bg-red-100 text-red-800' },
};

const LoanDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);

  const [payTarget, setPayTarget] = useState(null); // installment | null
  const [payForm, setPayForm] = useState({ payment_method: 'Efectivo', payment_date: new Date().toISOString().slice(0, 10) });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await loansAPI.getById(id);
      setLoan(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando el crédito');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openPay = (installment) => {
    setPayForm({ payment_method: 'Efectivo', payment_date: new Date().toISOString().slice(0, 10) });
    setPayTarget(installment);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      setPaying(true);
      await loansAPI.payInstallment(loan.id, payTarget.id, payForm);
      toast.success(`Cuota ${payTarget.installment_number} registrada como pagada`);
      setPayTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error registrando el pago');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">Cargando...</div>
      </Layout>
    );
  }

  if (!loan) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">Crédito no encontrado</div>
      </Layout>
    );
  }

  const paidCount = (loan.installments || []).filter((i) => i.status === 'pagada').length;
  const progressPct = loan.term_months > 0 ? (paidCount / loan.term_months) * 100 : 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting/loans')} className="text-gray-400 hover:text-gray-700">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{loan.lender_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{LOAN_TYPE_LABELS[loan.loan_type] || loan.loan_type} · Sistema francés</p>
          </div>
          <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${STATUS_LABELS[loan.status]?.className || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[loan.status]?.label || loan.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Monto del crédito</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(loan.principal_amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo pendiente</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(loan.pending_balance)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tasa anual</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatPercentage(loan.annual_interest_rate)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Plazo</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{loan.term_months} meses</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Cuotas pagadas</span>
            <span>{paidCount} / {loan.term_months}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">Fecha de desembolso:</span> <span className="text-gray-900">{formatDate(loan.disbursement_date)}</span></div>
          <div><span className="text-gray-500">Primera cuota:</span> <span className="text-gray-900">{formatDate(loan.first_payment_date)}</span></div>
          <div><span className="text-gray-500">Cuenta pasivo:</span> <span className="text-gray-900">{loan.liability_account ? `${loan.liability_account.code} — ${loan.liability_account.name}` : '—'}</span></div>
          <div><span className="text-gray-500">Cuenta intereses:</span> <span className="text-gray-900">{loan.interest_expense_account ? `${loan.interest_expense_account.code} — ${loan.interest_expense_account.name}` : '—'}</span></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-sm">Tabla de amortización</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Vencimiento', 'Capital', 'Interés', 'Cuota', 'Saldo', 'Estado', 'Asiento', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(loan.installments || []).map((inst) => (
                  <tr key={inst.id} className={inst.status === 'vencida' ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 text-gray-500">{inst.installment_number}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatDate(inst.due_date)}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(inst.principal_amount)}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(inst.interest_amount)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{formatCurrency(inst.total_amount)}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(inst.balance_after)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${INSTALLMENT_STATUS_LABELS[inst.status]?.className || 'bg-gray-100 text-gray-700'}`}>
                        {INSTALLMENT_STATUS_LABELS[inst.status]?.label || inst.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {inst.journal_entry ? (
                        <Link to="/accounting/journal-entries" className="text-indigo-600 hover:underline text-xs">{inst.journal_entry.entry_number}</Link>
                      ) : inst.status === 'pagada' ? (
                        <span className="text-amber-600 text-xs">Sin asiento</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {inst.status !== 'pagada' && (
                        <button
                          onClick={() => openPay(inst)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {payTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <form onSubmit={handlePay}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Registrar pago — Cuota {payTarget.installment_number}</h3>
                <p className="text-sm text-gray-500 mt-1">{formatCurrency(payTarget.total_amount)} (capital {formatCurrency(payTarget.principal_amount)} + interés {formatCurrency(payTarget.interest_amount)})</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400">Se registra la cuota completa; no se admiten pagos parciales o anticipados en esta fase.</p>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setPayTarget(null)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={paying} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {paying ? 'Guardando...' : 'Confirmar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LoanDetailPage;
