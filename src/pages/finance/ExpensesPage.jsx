// frontend/src/pages/finance/ExpensesPage.jsx
import React, { useState, useEffect } from 'react';
import { expensesAPI, EXPENSE_CATEGORIES } from '../../api/expenses';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  TrashIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const emptyForm = {
  category: 'otro',
  description: '',
  total_amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  due_date: '',
  payment_method: 'Efectivo',
  is_recurring: false,
  notes: '',
  paid_now: true
};

const ExpensesPage = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ category: '', payment_status: '', search: '' });
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  useEffect(() => {
    loadData();
  }, [filters.category, filters.payment_status]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesRes, summaryRes] = await Promise.all([
        expensesAPI.getAll({ category: filters.category, payment_status: filters.payment_status, limit: 100 }),
        expensesAPI.getSummary()
      ]);
      setExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.description || !form.total_amount || parseFloat(form.total_amount) <= 0) {
      toast('Descripción y monto son obligatorios');
      return;
    }
    try {
      await expensesAPI.create({ ...form, total_amount: parseFloat(form.total_amount) });
      toast.success('Gasto registrado');
      setShowFormModal(false);
      setForm(emptyForm);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error registrando el gasto');
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`¿Eliminar el gasto "${expense.description}"?`)) return;
    try {
      await expensesAPI.delete(expense.id);
      toast.success('Gasto eliminado');
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedExpense || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast('Ingrese un monto válido');
      return;
    }
    try {
      await expensesAPI.registerPayment(selectedExpense.id, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod
      });
      toast.success('Pago registrado');
      setShowPaymentModal(false);
      setSelectedExpense(null);
      setPaymentAmount('');
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error registrando el pago');
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(`${String(date).split('T')[0]}T12:00:00`);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const categoryLabel = (value) => EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;

  const searchLower = filters.search.toLowerCase().trim();
  const filteredExpenses = searchLower
    ? expenses.filter(e =>
        (e.description || '').toLowerCase().includes(searchLower) ||
        (e.expense_number || '').toLowerCase().includes(searchLower)
      )
    : expenses;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Gastos Operativos</h1>
            <p className="text-sm text-gray-500 mt-1">Arriendo, servicios, nómina y demás gastos del negocio</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowPathIcon className="w-4 h-4" /> Actualizar
            </button>
            <button
              onClick={() => { setForm(emptyForm); setShowFormModal(true); }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4" /> Nuevo Gasto
            </button>
          </div>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <BanknotesIcon className="w-4 h-4" /> Total Gastado
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total_amount)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <CurrencyDollarIcon className="w-4 h-4" /> Pendiente por Pagar
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.total_pending)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-gray-500 text-sm mb-1">Total de Gastos</div>
            <div className="text-2xl font-bold text-gray-900">{summary?.total_expenses ?? 0}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filters.payment_status}
            onChange={e => setFilters(f => ({ ...f, payment_status: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="partial">Parcial</option>
            <option value="paid">Pagado</option>
          </select>
          <input
            type="text"
            placeholder="Buscar descripción / # gasto..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['# Gasto', 'Descripción', 'Categoría', 'Fecha', 'Total', 'Saldo', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                )}
                {!loading && filteredExpenses.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin gastos registrados</td></tr>
                )}
                {filteredExpenses.map(e => {
                  const balance = parseFloat(e.total_amount) - parseFloat(e.paid_amount || 0);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.expense_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.description}
                        {e.supplier?.name && <div className="text-xs text-gray-400">{e.supplier.name}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{categoryLabel(e.category)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(e.expense_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(e.total_amount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(balance)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          e.payment_status === 'paid' ? 'bg-green-100 text-green-700'
                          : e.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {e.payment_status === 'paid' ? 'Pagado' : e.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {e.payment_status !== 'paid' && (
                          <button
                            onClick={() => { setSelectedExpense(e); setPaymentAmount(String(balance)); setShowPaymentModal(true); }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 mr-2"
                          >
                            Pagar
                          </button>
                        )}
                        {parseFloat(e.paid_amount || 0) === 0 && (
                          <button onClick={() => handleDelete(e)} className="text-gray-400 hover:text-red-600">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de nuevo gasto */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">Nuevo Gasto</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ej. Arriendo local julio 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  value={form.total_amount}
                  onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="paid_now"
                type="checkbox"
                checked={form.paid_now}
                onChange={e => setForm(f => ({ ...f, paid_now: e.target.checked }))}
              />
              <label htmlFor="paid_now" className="text-sm text-gray-700">Ya está pagado (registrar de una vez el pago completo)</label>
            </div>

            {!form.paid_now && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento (opcional)</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Cheque</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_recurring"
                type="checkbox"
                checked={form.is_recurring}
                onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
              />
              <label htmlFor="is_recurring" className="text-sm text-gray-700">Gasto recurrente (arriendo, nómina, servicios...)</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de registrar pago */}
      {showPaymentModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Registrar Pago</h3>
            </div>
            <div className="text-sm text-gray-500">{selectedExpense.description}</div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Cheque</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedExpense(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPayment}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ExpensesPage;
