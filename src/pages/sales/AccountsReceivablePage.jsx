// frontend/src/pages/sales/AccountsReceivablePage.jsx
import React, { useState, useEffect } from 'react';
import { accountsReceivableAPI } from '../../api/accountsReceivable';
import salesApi from '../../api/sales';
import { openingBalancesAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { 
  CreditCardIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';
import NumericInput from '../../components/inputs/NumericInput';
import ApplyAdvanceModal from '../../components/finance/ApplyAdvanceModal';
import BankAccountSelect from '../../components/accounting/BankAccountSelect';

const AccountsReceivablePage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [byCustomer, setByCustomer] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [excessToAdvance, setExcessToAdvance] = useState(false);
  const [view, setView] = useState('by-customer'); // 'by-customer' o 'all-invoices'
  const [applyAdvanceTarget, setApplyAdvanceTarget] = useState(null);
  const [filters, setFilters] = useState({
    customer_id: '',
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
      const response = await accountsReceivableAPI.getSummary(filters);
      setSummary(response.data.summary);
      setByCustomer(response.data.by_customer);
      setAllInvoices(response.data.all_invoices);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  };

  // Pago mayor al saldo: la diferencia puede quedar como anticipo del cliente
  const paymentExcess = selectedInvoice && !selectedInvoice.is_opening_balance
    ? Math.max(0, Math.round((parseFloat(paymentAmount || 0) - parseFloat(selectedInvoice.balance || 0)) * 100) / 100)
    : 0;

  const handleRegisterPayment = async () => {
    if (!selectedInvoice || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast('Por favor ingrese un monto válido');
      return;
    }
    if (paymentExcess > 0 && !excessToAdvance) {
      toast.error(`El monto supera el saldo en ${formatCurrency(paymentExcess)}. Ajusta el monto o marca "dejar como anticipo".`);
      return;
    }

    try {
      if (selectedInvoice.is_opening_balance) {
        // Saldo inicial (Contabilidad → Saldos Iniciales): no es una venta,
        // se abona en su propio registro con su asiento contra cartera.
        await openingBalancesAPI.registerPayment(selectedInvoice.id, {
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          bank_account_id: paymentMethod !== 'Efectivo' ? bankAccountId : null,
          notes: paymentNotes
        });
      } else {
        const res = await salesApi.registerPayment(selectedInvoice.id, {
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          bank_account_id: paymentMethod !== 'Efectivo' ? bankAccountId : null,
          notes: paymentNotes,
          excess_to_advance: paymentExcess > 0 && excessToAdvance ? true : undefined,
        });
        if (res?.data?.advance) toast.success(res.data.message, { duration: 6000 });
      }
      
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      setBankAccountId(null);
      setPaymentNotes('');
      setExcessToAdvance(false);
      toast.success('Pago registrado');
      loadData();
    } catch (error) {
      // Causas típicas: caja cerrada en la sede, venta ya pagada, monto inválido.
      toast.error(error.response?.data?.message || 'Error al registrar el pago');
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Filtrar por nombre o documento
  const searchLower = search.toLowerCase().trim();
  const filteredByCustomer = searchLower
    ? byCustomer.filter(c =>
        (c.customer_name || '').toLowerCase().includes(searchLower) ||
        (c.customer?.tax_id || '').toLowerCase().includes(searchLower)
      )
    : byCustomer;
  const filteredAllInvoices = searchLower
    ? allInvoices.filter(inv =>
        (inv.customer_name || '').toLowerCase().includes(searchLower) ||
        (inv.customer?.tax_id || '').toLowerCase().includes(searchLower)
      )
    : allInvoices;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Cargando cartera...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartera (Cuentas por Cobrar)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de facturas pendientes de pago
          </p>
        </div>
        <button
          onClick={loadData}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Actualizar
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o documento (NIT/cédula)..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total por Cobrar
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatCurrency(summary?.total_receivable)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt
                    className="text-sm font-medium text-gray-500 truncate"
                    title="Pasada la fecha de vencimiento de la factura; si no tiene, 30 días desde la venta"
                  >
                    Vencido
                  </dt>
                  <dd className="text-lg font-semibold text-red-600">
                    {formatCurrency(summary?.total_overdue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Facturas Pendientes
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary?.total_invoices || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Clientes con Saldo
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary?.total_customers || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setView('by-customer')}
            className={`${
              view === 'by-customer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Por Cliente
          </button>
          <button
            onClick={() => setView('all-invoices')}
            className={`${
              view === 'all-invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Todas las Facturas
          </button>
        </nav>
      </div>

      {/* Vista por Cliente */}
      {view === 'by-customer' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facturas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencido
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredByCustomer.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-400">
                    {search ? 'No hay resultados para la búsqueda.' : 'No hay clientes con saldo pendiente.'}
                  </td>
                </tr>
              )}
              {filteredByCustomer.map((customer) => (
                <React.Fragment key={customer.customer_id || 'sin_cliente'}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.customer_name}
                      </div>
                      {customer.customer?.email && (
                        <div className="text-sm text-gray-500">
                          {customer.customer.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.invoice_count ?? customer.total_invoices}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(customer.balance ?? customer.total_balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(customer.overdue_amount ?? customer.overdue_balance) > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(customer.overdue_amount ?? customer.overdue_balance)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedCustomer(
                          selectedCustomer?.customer_id === customer.customer_id
                            ? null
                            : customer
                        )}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {selectedCustomer?.customer_id === customer.customer_id
                          ? 'Ocultar'
                          : 'Ver Facturas'}
                      </button>
                    </td>
                  </tr>
                  {selectedCustomer?.customer_id === customer.customer_id && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-2">
                          {customer.invoices.map((invoice) => (
                            <div
                              key={invoice.id}
                              className="flex items-center justify-between bg-white p-3 rounded border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-4">
                                  <span className="font-medium">{invoice.sale_number}</span>
                                  {invoice.is_opening_balance && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                      Saldo inicial
                                    </span>
                                  )}
                                  <span className="text-sm text-gray-500">
                                    {formatDate(invoice.sale_date)}
                                  </span>
                                  {invoice.is_overdue && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <ClockIcon className="h-3 w-3 mr-1" />
                                      Vencido {invoice.days_overdue} días
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-gray-600">
                                  Total: {formatCurrency(invoice.total_amount)} | 
                                  Pagado: {formatCurrency(invoice.paid_amount)} | 
                                  <span className="font-medium text-red-600">
                                    {' '}Saldo: {formatCurrency(invoice.balance)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                                {/* Los anticipos son por cliente: sin cliente no hay qué aplicar. */}
                                {invoice.customer_id && !invoice.is_opening_balance && (
                                  <button
                                    onClick={() => setApplyAdvanceTarget(invoice)}
                                    className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                                  >
                                    Aplicar Anticipo
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    setPaymentAmount(invoice.balance.toString());
                                    setShowPaymentModal(true);
                                  }}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  <CreditCardIcon className="h-4 w-4 mr-1" />
                                  Registrar Pago
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Vista Todas las Facturas */}
      {view === 'all-invoices' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAllInvoices.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-sm text-gray-400">
                    {search ? 'No hay resultados para la búsqueda.' : 'No hay facturas pendientes.'}
                  </td>
                </tr>
              )}
              {filteredAllInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.sale_number}
                    {invoice.is_opening_balance && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Saldo inicial
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invoice.sale_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.paid_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(invoice.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invoice.is_overdue ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {invoice.days_overdue} días
                      </span>
                    ) : (
                      <span className="text-gray-500">{invoice.days_overdue} días</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    {invoice.customer_id && !invoice.is_opening_balance && (
                      <button
                        onClick={() => setApplyAdvanceTarget(invoice)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        Aplicar Anticipo
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setPaymentAmount(invoice.balance.toString());
                        setShowPaymentModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Registrar Pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Modal de Registro de Pago */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Registrar Pago - {selectedInvoice.sale_number}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Cliente: {selectedInvoice.customer_name}</p>
                    <p className="text-sm text-gray-600">
                      Saldo Pendiente: <span className="font-bold text-red-600">
                        {formatCurrency(selectedInvoice.balance)}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Monto a Pagar
                    </label>
                    <NumericInput
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Método de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option>Efectivo</option>
                      <option>Tarjeta de Crédito</option>
                      <option>Tarjeta de Débito</option>
                      <option>Transferencia</option>
                      <option>Cheque</option>
                    </select>
                  </div>

                  {paymentMethod !== 'Efectivo' && (
                    <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} />
                  )}

                  {paymentExcess > 0 && (
                    <label className={`flex items-start gap-3 rounded-lg border-2 px-3 py-2.5 cursor-pointer ${excessToAdvance ? 'border-teal-400 bg-teal-50' : 'border-amber-300 bg-amber-50'}`}>
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        checked={excessToAdvance}
                        onChange={(e) => setExcessToAdvance(e.target.checked)}
                      />
                      <span className="text-sm">
                        <span className="font-semibold text-gray-900">
                          Dejar {formatCurrency(paymentExcess)} como anticipo del cliente
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          El pago supera el saldo. Se abona {formatCurrency(selectedInvoice.balance)} a la factura y la diferencia queda como anticipo con el mismo medio de pago ({paymentMethod}).
                        </span>
                      </span>
                    </label>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notas (Opcional)
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Notas adicionales..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleRegisterPayment}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Registrar Pago
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                    setPaymentAmount('');
                    setPaymentNotes('');
                    setExcessToAdvance(false);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aplicar Anticipo */}
      <ApplyAdvanceModal
        isOpen={!!applyAdvanceTarget}
        onClose={() => setApplyAdvanceTarget(null)}
        onSuccess={loadData}
        sale={applyAdvanceTarget}
      />
      </div>
    </Layout>
  );
};

export default AccountsReceivablePage;