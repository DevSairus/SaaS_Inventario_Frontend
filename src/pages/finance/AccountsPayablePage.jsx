// frontend/src/pages/finance/AccountsPayablePage.jsx
import React, { useState, useEffect, useRef } from 'react';
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
import { formatCurrency } from '../../utils/formatters';
import NumericInput from '../../components/inputs/NumericInput';
import BankAccountSelect from '../../components/accounting/BankAccountSelect';
import api from '../../api/axios';
import Pagination from '../../components/common/Pagination';
import usePaginatedList from '../../hooks/usePaginatedList';

// Compras pendientes de un proveedor (detalle desplegable), paginadas en
// el servidor. supplierId null = compras sin proveedor.
const SupplierPurchases = ({ supplierId, filters, refreshKey, children }) => {
  const list = usePaginatedList(
    (params, opts) => accountsPayableAPI.getDocuments(params, opts),
    { filters: { ...filters, supplier_id: supplierId ?? 'none' }, syncUrl: false },
  );
  const firstKey = useRef(refreshKey);
  useEffect(() => { if (refreshKey !== firstKey.current) list.reload(); }, [refreshKey]);
  return children(list);
};

const AccountsPayablePage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  // Saldos a favor con proveedores (devoluciones) sin aplicar todavía.
  const [supplierCredits, setSupplierCredits] = useState([]);
  const [applyingCreditId, setApplyingCreditId] = useState(null);
  const [bySupplier, setBySupplier] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [view, setView] = useState('by-supplier'); // 'by-supplier' o 'all-purchases'
  const [filters, setFilters] = useState({
    supplier_id: '',
    from_date: '',
    to_date: ''
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Sube tras cada pago/abono para recargar los listados paginados.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // "Todas las compras": paginado en el servidor (el resumen solo trae
  // totales y la agrupación por proveedor).
  const purchasesList = usePaginatedList(
    (params, opts) => accountsPayableAPI.getDocuments(params, opts),
    {
      filters: { ...filters, search: debouncedSearch },
      enabled: view === 'all-purchases',
      onError: (error) => toast.error(error.response?.data?.message || 'Error cargando las compras pendientes'),
    },
  );

  useEffect(() => { if (refreshKey) purchasesList.reload(); }, [refreshKey]);

  // Tras un pago o un saldo a favor aplicado: resumen + listados paginados.
  const refreshAfterChange = () => {
    loadData();
    setRefreshKey((k) => k + 1);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await accountsPayableAPI.getSummary({ ...filters, lite: true });
      setSummary(response.data.summary);
      setBySupplier(response.data.by_supplier);
      setSupplierCredits(response.data.supplier_credits || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando cuentas por pagar');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCredit = async (credit) => {
    setApplyingCreditId(credit.supplier_return_id);
    try {
      const res = await api.post(`/inventory/supplier-returns/${credit.supplier_return_id}/apply-credit`);
      toast.success(res.data?.message || 'Saldo a favor aplicado');
      refreshAfterChange();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al aplicar el saldo a favor');
    } finally {
      setApplyingCreditId(null);
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
        bank_account_id: paymentMethod !== 'Efectivo' ? bankAccountId : null,
        notes: paymentNotes
      });
      toast.success('Pago registrado');
      setBankAccountId(null);

      setShowPaymentModal(false);
      setSelectedPurchase(null);
      setPaymentAmount('');
      setPaymentNotes('');
      refreshAfterChange();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error al registrar el pago');
    }
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
  const filteredPurchases = purchasesList.rows;

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

        {supplierCredits.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-emerald-900">Saldo a favor con proveedores (por devoluciones)</p>
            {supplierCredits.map((c) => (
              <div key={c.supplier_return_id} className="flex items-center justify-between gap-3 flex-wrap text-sm">
                <span className="text-emerald-900">
                  {c.supplier_name} · {formatCurrency(c.available)}
                  <span className="text-emerald-700"> (devolución {c.return_number})</span>
                </span>
                <button
                  onClick={() => handleApplyCredit(c)}
                  disabled={applyingCreditId === c.supplier_return_id}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  Aplicar a compras pendientes
                </button>
              </div>
            ))}
          </div>
        )}

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
                <SupplierPurchases supplierId={selectedSupplier} filters={filters} refreshKey={refreshKey}>
                {(supplierList) => (<>
                <div className="space-y-2">
                  {supplierList.loading && supplierList.rows.length === 0 && <p className="text-sm text-gray-400">Cargando...</p>}
                  {supplierList.rows.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.purchase_number}{p.invoice_number ? ` · Fact. ${p.invoice_number}` : ''}</div>
                        <div className="text-xs text-gray-500">{formatDate(p.purchase_date)} {p.effective_due_date ? `· Vence ${formatDate(p.effective_due_date)}${p.due_date ? '' : ' (30 días)'}` : ''}</div>
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
                <Pagination {...supplierList.paginationProps} onPageSizeChange={undefined} className="mt-3" />
                </>)}
                </SupplierPurchases>
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
                  {purchasesList.loading && filteredPurchases.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                  )}
                  {!purchasesList.loading && filteredPurchases.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin compras pendientes</td></tr>
                  )}
                  {filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.purchase_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.purchase_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {p.due_date
                          ? formatDate(p.due_date)
                          : p.effective_due_date
                            ? <span title="Sin fecha de vencimiento: se asume plazo de 30 días desde la compra">{formatDate(p.effective_due_date)} <span className="text-xs text-gray-400">(30 días)</span></span>
                            : '—'}
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
            <div className="px-4 py-3 border-t border-gray-200">
              <Pagination {...purchasesList.paginationProps} />
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
              {selectedPurchase.total_retentions > 0 && (
                <div className="text-xs text-orange-600 mt-0.5">
                  Neto de retenciones ({formatCurrency(selectedPurchase.total_retentions)} se pagan a la DIAN, no al proveedor)
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
              <NumericInput
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
            {paymentMethod !== 'Efectivo' && (
              <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} />
            )}
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
