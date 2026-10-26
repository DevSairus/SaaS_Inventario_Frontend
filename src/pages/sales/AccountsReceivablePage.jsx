// frontend/src/pages/sales/AccountsReceivablePage.jsx
import React, { useState, useEffect } from 'react';
import { accountsReceivableAPI } from '../../api/accountsReceivable';
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
import ApplyAdvanceModal from '../../components/finance/ApplyAdvanceModal';
import RegisterSalePaymentModal from '../../components/sales/RegisterSalePaymentModal';

const AccountsReceivablePage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [byCustomer, setByCustomer] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
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
      {selectedInvoice && (
        <RegisterSalePaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={() => { setSelectedInvoice(null); loadData(); }}
        />
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