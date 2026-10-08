// frontend/src/components/workshop/WorkOrderPaymentsPanel.jsx
//
// Abonos cobrados en una OT antes de facturarla. Cada abono genera recibo y
// asiento (Caja/Bancos vs 2805 Anticipos); al facturar la OT pasan a la
// venta, y si la OT se cancela quedan como anticipo del cliente.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { workOrdersApi } from '../../api/workshop';
import NumericInput from '../inputs/NumericInput';
import BankAccountSelect from '../accounting/BankAccountSelect';

const METHODS = ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque'];
const METHOD_LABELS = { cash: 'Efectivo', transfer: 'Transferencia', credit_card: 'T. Crédito', debit_card: 'T. Débito', check: 'Cheque' };

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const isCash = (m) => /efectivo|cash/i.test(m || '');

export default function WorkOrderPaymentsPanel({ order, onChanged }) {
  const [history, setHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const total = parseFloat(order.total_amount || 0);
  const paid = parseFloat(order.paid_amount || 0);
  const balance = Math.max(total - paid, 0);
  const canRegister = order.status !== 'cancelado' && !order.sale_id;

  useEffect(() => {
    let cancelled = false;
    workOrdersApi.getPayments(order.id)
      .then((res) => { if (!cancelled) setHistory(res.data?.data?.payment_history || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [order.id, order.paid_amount, order.status, order.sale_id]);

  const openForm = () => {
    setAmount(balance > 0 ? String(balance) : '');
    setMethod('Efectivo');
    setBankAccountId(null);
    setNotes('');
    setShowForm(true);
  };

  const printReceipt = async (p) => {
    try {
      const res = await workOrdersApi.getPDF(order.id, 'receipt', {
        amount: p.amount, method: p.method, notes: p.notes || '', date: p.date, receipt_number: p.receipt_number,
      });
      window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
    } catch {
      toast.error('No se pudo generar el recibo');
    }
  };

  const handleSubmit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return toast.error('Ingresa un monto válido');
    setSaving(true);
    try {
      const res = await workOrdersApi.registerPayment(order.id, {
        amount: value,
        payment_method: method,
        bank_account_id: isCash(method) ? null : bankAccountId,
        notes: notes || undefined,
      });
      const { receipt_number, amount_applied } = res.data?.data || {};
      toast.success(`Abono registrado${receipt_number ? ` — recibo ${receipt_number}` : ''}`);
      setShowForm(false);
      onChanged?.();
      if (receipt_number && window.confirm('¿Imprimir el recibo del abono?')) {
        printReceipt({ amount: amount_applied ?? value, method, notes, date: new Date().toISOString(), receipt_number });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error registrando el abono');
    } finally {
      setSaving(false);
    }
  };

  if (!canRegister && history.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Abonos</h4>
        {canRegister && !showForm && (
          <button onClick={openForm} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            + Registrar abono
          </button>
        )}
      </div>

      {(paid > 0 || history.length > 0) && (
        <div className="space-y-1 mb-2">
          <div className="flex justify-between text-xs text-green-700 dark:text-green-400">
            <span>Abonado</span><span>{COP(paid)}</span>
          </div>
          {!order.sale_id && order.status !== 'cancelado' && (
            <div className="flex justify-between text-xs font-semibold text-gray-900 dark:text-gray-100">
              <span>Saldo</span><span>{COP(balance)}</span>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-white/10 text-xs">
          {history.map((p, i) => {
            const moved = parseFloat(p.moved_to_advance_amount || 0);
            return (
              <li key={p.payment_id || i} className="py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-gray-700 dark:text-gray-300">
                    {new Date(p.date).toLocaleDateString('es-CO')} · {METHOD_LABELS[p.method] || p.method}
                    {p.receipt_number && <span className="text-gray-400"> · {p.receipt_number}</span>}
                  </div>
                  {moved > 0 && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400">
                      {moved >= parseFloat(p.amount) - 0.01 ? 'Pasó a anticipo del cliente' : `${COP(moved)} pasó a anticipo del cliente`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{COP(p.amount)}</span>
                  {p.receipt_number && (
                    <button onClick={() => printReceipt(p)} className="text-blue-600 hover:text-blue-800" title="Imprimir recibo">
                      Recibo
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {order.sale_id && history.length > 0 && (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Los abonos se aplicaron al documento generado.</p>
      )}

      {showForm && (
        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 dark:border-white/10 p-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Monto</label>
            <NumericInput
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100"
            />
            {total > 0 && <p className="mt-0.5 text-[11px] text-gray-500">Saldo de la OT: {COP(balance)}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Método</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100"
            >
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          {!isCash(method) && <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} />}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nota (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} disabled={saving} className="text-xs text-gray-500 px-3 py-1.5 hover:text-gray-700">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Registrar abono'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
