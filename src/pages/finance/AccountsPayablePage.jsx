// frontend/src/pages/finance/AccountsPayablePage.jsx
import React, { useState, useEffect } from 'react';
import { accountsPayableAPI } from '../../api/accountsPayable';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import {
  CreditCardIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const AccountsPayablePage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [bySupplier, setBySupplier] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [view, setView] = useState('by-supplier'); // 'by-supplier' o 'all-purchases'
  const [filters, setFilters] = useState({
    supplier_id: '',
    from_date: '',
    to_date: ''
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await accountsPayableAPI.getSummary(filters);
      setSummary(response.data.summary);
      setBySupplier(response.data.by_supplier);
      setAllPurchases(response.data.all_purchases);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedPurchase || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast('Por favor ingrese un monto válido');
      return;
    }

    try {
      await accountsPayableAPI.registerPayment(selectedPurchase.id, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes
      });

      setShowPaymentModal(false);
      setSelectedPurchase(null);
      setPaymentAmount('');
      setPaymentNotes('');
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error al registrar el pago');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const searchLower = search.toLowerCase().trim();
  const filteredBySupplier = searchLower
    ? bySupplier.filter(s => (s.supplier_name || '').toLowerCase().includes(searchLower))
    : bySupplier;
  const filteredPurchases = searchLower
    ? allPurchases.filter(p =>
        (p.supplier_name || '').toLowerCase().includes(searchLower) ||
        (p.purchase_number || '').toLowerCase().includes(searchLower) ||
        (p.invoice_number || '').toLowerCase().includes(searchLower)
      )
    : allPurchases;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cuentas por Pagar</h1>
            <p className="text-sm text-gray-500 mt-1">Saldos pendientes con proveedores</p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowPathIcon className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CreditCardIcon className="w-4 h-4" /> Total por Pagar
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total_payable)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
              <ExclamationTriangleIcon className="w-4 h-4" /> Vencido
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.total_overdue)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DocumentTextIcon className="w-4 h-4" /> Compras Pendientes
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary?.total_purchases ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <BuildingStorefrontIcon className="w-4 h-4" /> Proveedores
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary?.total_suppliers ?? 0}</div>
          </div>
        </div>

        {/* Filtros + búsqueda + toggle de vista */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FunnelIcon className="w-4 h-4" /> Filtros
            </div>
            <input
              type="date"
              value={filters.from_date}
              onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-400 text-sm">a</span>
            <input
              type="date"
              value={filters.to_date}
              onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Buscar proveedor / # compra..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('by-supplier')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${view === 'by-supplier' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Por Proveedor
            </button>
            <button
              onClick={() => setView('all-purchases')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${view === 'all-purchases' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Todas las Compras
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : view === 'by-supplier' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Proveedor', 'Compras', 'Total', 'Pagado', 'Saldo', 'Vencido'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBySupplier.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin saldos pendientes</td></tr>
                  )}
                  {filteredBySupplier.map(s => (
                    <tr key={s.supplier_id || 'sin_proveedor'} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedSupplier(selectedSupplier === s.supplier_id ? null : s.supplier_id)}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.purchase_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(s.total_amount)}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(s.paid_amount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(s.balance)}</td>
                      <td className="px-4 py-3 text-sm">
                        {s.overdue_amount > 0
                          ? <span className="text-red-600 font-medium">{formatCurrency(s.overdue_amount)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSupplier && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Compras pendientes</h3>
                <div className="space-y-2">
                  {(bySupplier.find(s => s.supplier_id === selectedSupplier)?.purchases || []).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.purchase_number}{p.invoice_number ? ` · Fact. ${p.invoice_number}` : ''}</div>
                        <div className="text-xs text-gray-500">{formatDate(p.purchase_date)} {p.due_date ? `· Vence ${formatDate(p.due_date)}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.balance)}</span>
                        <button
                          onClick={() => { setSelectedPurchase(p); setPaymentAmount(String(p.balance)); setShowPaymentModal(true); }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['# Compra', 'Proveedor', 'Fecha', 'Vence', 'Total', 'Saldo', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPurchases.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin compras pendientes</td></tr>
                  )}
                  {filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.purchase_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.purchase_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.due_date ? formatDate(p.due_date) : '—'}
                        {p.is_overdue && <span className="ml-1 text-xs text-red-600">({p.days_overdue}d)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(p.total_amount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(p.balance)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedPurchase(p); setPaymentAmount(String(p.balance)); setShowPaymentModal(true); }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de registro de pago */}
      {showPaymentModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Registrar Pago</h3>
            </div>
            <div className="text-sm text-gray-500">
              {selectedPurchase.purchase_number} · Saldo: <span className="font-semibold text-gray-900">{formatCurrency(selectedPurchase.balance)}</span>
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedPurchase(null); }}
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

export default AccountsPayablePage;
