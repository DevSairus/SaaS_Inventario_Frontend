// frontend/src/pages/sales/AccountsReceivablePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { accountsReceivableAPI } from '../../api/accountsReceivable';
import salesApi from '../../api/sales';
import Layout from '../../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

/* ─── helpers ─────────────────────────────────────────────── */
const formatCurrency = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const formatDate = (d) => new Date(d).toLocaleDateString('es-CO');

const docLabel = (t) => t === 'remision' ? 'Remisión' : t === 'factura' ? 'Factura' : 'Cotización';
const docColor = (t) => t === 'remision' ? 'bg-blue-100 text-blue-800' : t === 'factura' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700';

/* ─── componente principal ─────────────────────────────────── */
const AccountsReceivablePage = () => {
  const navigate = useNavigate();

  /* datos del servidor */
  const [loading, setLoading]         = useState(true);
  const [summary, setSummary]         = useState(null);
  const [byCustomer, setByCustomer]   = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);

  /* ui state */
  const [view, setView]                           = useState('all-invoices');
  const [expandedCustomer, setExpandedCustomer]   = useState(null);
  const [showPaymentModal, setShowPaymentModal]   = useState(false);
  const [selectedInvoice, setSelectedInvoice]     = useState(null);
  const [paymentAmount, setPaymentAmount]         = useState('');
  const [paymentMethod, setPaymentMethod]         = useState('Efectivo');
  const [paymentNotes, setPaymentNotes]           = useState('');
  const [savingPayment, setSavingPayment]         = useState(false);
  const [showFilters, setShowFilters]             = useState(false);

  /* filtros servidor (requieren recarga) */
  const [serverFilters, setServerFilters] = useState({ from_date: '', to_date: '' });

  /* búsqueda y filtros locales */
  const [search, setSearch]               = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  /* ── carga ── */
  useEffect(() => { loadData(); }, [serverFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await accountsReceivableAPI.getSummary(serverFilters);
      setSummary(res.data.summary);
      setByCustomer(res.data.by_customer);
      setAllInvoices(res.data.all_invoices);
    } catch (e) {
      console.error('Error cargando cartera:', e);
    } finally {
      setLoading(false);
    }
  };

  /* ── filtrado local (sin llamada al servidor) ── */
  const normalizeQ = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredInvoices = useMemo(() => {
    const q = normalizeQ(search);
    return allInvoices.filter((inv) => {
      if (q) {
        const haystack = [
          inv.customer_name,
          inv.customer?.tax_id,
          inv.vehicle_plate,
          inv.sale_number,
        ].map(normalizeQ).join(' ');
        if (!haystack.includes(q)) return false;
      }
      if (filterDocType && inv.document_type !== filterDocType) return false;
      if (filterStatus  && inv.payment_status !== filterStatus)  return false;
      if (filterOverdue && !inv.is_overdue)                      return false;
      return true;
    });
  }, [allInvoices, search, filterDocType, filterStatus, filterOverdue]);

  const filteredByCustomer = useMemo(() => {
    const q = normalizeQ(search);
    return byCustomer.map((c) => ({
      ...c,
      invoices: c.invoices.filter((inv) => {
        if (q) {
          const haystack = [c.customer_name, c.customer?.tax_id].map(normalizeQ).join(' ');
          if (!haystack.includes(q)) return false;
        }
        if (filterDocType && inv.document_type !== filterDocType) return false;
        if (filterStatus  && inv.payment_status !== filterStatus)  return false;
        if (filterOverdue && !inv.is_overdue)                      return false;
        return true;
      }),
    })).filter((c) => c.invoices.length > 0);
  }, [byCustomer, search, filterDocType, filterStatus, filterOverdue]);

  const activeFiltersCount = [filterDocType, filterStatus, filterOverdue, serverFilters.from_date, serverFilters.to_date].filter(Boolean).length;

  /* ── pago ── */
  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance.toString());
    setPaymentMethod('Efectivo');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleRegisterPayment = async () => {
    if (!selectedInvoice || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }
    try {
      setSavingPayment(true);
      await salesApi.registerPayment(selectedInvoice.id, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes,
      });
      closePaymentModal();
      loadData();
    } catch (e) {
      console.error('Error registrando pago:', e);
      alert('Error al registrar el pago');
    } finally {
      setSavingPayment(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterDocType('');
    setFilterStatus('');
    setFilterOverdue(false);
    setServerFilters({ from_date: '', to_date: '' });
  };

  /* ─── render ──────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64 gap-3">
        <ArrowPathIcon className="h-7 w-7 animate-spin text-blue-500" />
        <span className="text-gray-600">Cargando cartera...</span>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cartera</h1>
            <p className="text-sm text-gray-500 mt-0.5">Cuentas por cobrar — facturas y remisiones pendientes</p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 self-start sm:self-auto"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {/* ── Tarjetas resumen ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CurrencyDollarIcon,      color: 'text-blue-600 bg-blue-50',    label: 'Total por Cobrar',     value: formatCurrency(summary?.total_receivable) },
            { icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50',      label: 'Vencido (+30 días)',   value: formatCurrency(summary?.total_overdue), valueColor: 'text-red-600' },
            { icon: DocumentTextIcon,        color: 'text-violet-600 bg-violet-50',label: 'Docs. Pendientes',     value: summary?.total_invoices || 0 },
            { icon: UserGroupIcon,           color: 'text-emerald-600 bg-emerald-50',label: 'Clientes con Saldo', value: summary?.total_customers || 0 },
          ].map(({ icon: Icon, color, label, value, valueColor }) => (
            <div key={label} className="bg-white shadow rounded-xl p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2.5 flex-shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                <p className={`text-lg font-bold truncate ${valueColor || 'text-gray-900'}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Búsqueda + filtros ── */}
        <div className="bg-white shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Input de búsqueda */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, NIT / CC, placa o N° documento..."
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Botón mostrar filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                activeFiltersCount > 0
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold leading-none">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Limpiar todo */}
            {(search || activeFiltersCount > 0) && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 transition-colors flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          {/* Panel de filtros avanzados */}
          {showFilters && (
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de documento</label>
                <select
                  value={filterDocType}
                  onChange={(e) => setFilterDocType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="factura">Factura</option>
                  <option value="remision">Remisión</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Estado de pago</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="pending">A Crédito</option>
                  <option value="partial">Pago Parcial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha desde</label>
                <input
                  type="date"
                  value={serverFilters.from_date}
                  onChange={(e) => setServerFilters(f => ({ ...f, from_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha hasta</label>
                <input
                  type="date"
                  value={serverFilters.to_date}
                  onChange={(e) => setServerFilters(f => ({ ...f, to_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
                <input
                  id="chk-overdue"
                  type="checkbox"
                  checked={filterOverdue}
                  onChange={(e) => setFilterOverdue(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-gray-300"
                />
                <label htmlFor="chk-overdue" className="text-sm text-gray-700 cursor-pointer select-none">
                  Mostrar solo vencidos (+30 días)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 gap-0">
          {[
            { key: 'all-invoices', label: 'Por documento', count: filteredInvoices.length },
            { key: 'by-customer',  label: 'Por cliente',   count: filteredByCustomer.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                view === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                view === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            Vista: Todos los documentos
        ══════════════════════════════════════════════ */}
        {view === 'all-invoices' && (
          <div className="bg-white shadow rounded-xl overflow-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <DocumentTextIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron documentos con los filtros aplicados</p>
                {(search || activeFiltersCount > 0) && (
                  <button onClick={clearFilters} className="mt-2 text-blue-600 text-sm hover:underline">Limpiar filtros</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                      <th className="px-4 py-3 text-left whitespace-nowrap">N° Documento</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Tipo</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Cliente</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Pagado</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Saldo</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                      {/* columna sticky */}
                      <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">

                        {/* N° */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/sales/${inv.id}`)}
                            className="font-mono text-sm font-semibold text-blue-700 hover:underline"
                          >
                            {inv.sale_number}
                          </button>
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${docColor(inv.document_type)}`}>
                            {docLabel(inv.document_type)}
                          </span>
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 max-w-[200px] truncate leading-tight">{inv.customer_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {inv.customer?.tax_id && (
                              <span className="text-xs text-gray-400">{inv.customer.tax_id}</span>
                            )}
                            {inv.vehicle_plate && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                {inv.vehicle_plate}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-600">{formatDate(inv.sale_date)}</p>
                          {inv.is_overdue && (
                            <p className="text-xs font-semibold text-red-500">{inv.days_overdue}d vencido</p>
                          )}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700 font-medium">
                          {formatCurrency(inv.total_amount)}
                        </td>

                        {/* Pagado */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {inv.paid_amount > 0
                            ? <span className="text-emerald-600 font-semibold">{formatCurrency(inv.paid_amount)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>

                        {/* Saldo */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-bold text-red-600">{formatCurrency(inv.balance)}</span>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {inv.payment_status === 'partial'
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pago Parcial</span>
                            : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">A Crédito</span>
                          }
                        </td>

                        {/* Acción sticky */}
                        <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                          >
                            <BanknotesIcon className="h-3.5 w-3.5" />
                            Abonar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Fila de totales */}
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 text-sm font-bold">
                      <td colSpan={4} className="px-4 py-3 text-gray-500 font-normal">
                        {filteredInvoices.length} documento{filteredInvoices.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {formatCurrency(filteredInvoices.reduce((s, i) => s + i.total_amount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {formatCurrency(filteredInvoices.reduce((s, i) => s + i.paid_amount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700">
                        {formatCurrency(filteredInvoices.reduce((s, i) => s + i.balance, 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            Vista: Por cliente
        ══════════════════════════════════════════════ */}
        {view === 'by-customer' && (
          <div className="bg-white shadow rounded-xl overflow-hidden divide-y divide-gray-100">
            {filteredByCustomer.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <UserGroupIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron clientes con los filtros aplicados</p>
                {(search || activeFiltersCount > 0) && (
                  <button onClick={clearFilters} className="mt-2 text-blue-600 text-sm hover:underline">Limpiar filtros</button>
                )}
              </div>
            ) : (
              filteredByCustomer.map((cust) => {
                const isOpen = expandedCustomer === cust.customer_id;

                return (
                  <div key={cust.customer_id}>
                    {/* ─ Fila resumen cliente ─ */}
                    <button
                      onClick={() => setExpandedCustomer(isOpen ? null : cust.customer_id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                        {cust.customer_name?.[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate leading-tight">{cust.customer_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {cust.invoices.length} doc{cust.invoices.length !== 1 ? 's' : ''}
                          {cust.overdue_amount > 0 && (
                            <span className="ml-2 text-red-500 font-medium">· {formatCurrency(cust.overdue_amount)} vencido</span>
                          )}
                        </p>
                      </div>

                      {/* Cifras (desktop) */}
                      <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                        <div>
                          <p className="text-xs text-gray-400 leading-none mb-0.5">Total</p>
                          <p className="text-sm font-semibold text-gray-700">{formatCurrency(cust.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 leading-none mb-0.5">Pagado</p>
                          <p className="text-sm font-semibold text-emerald-600">{formatCurrency(cust.paid_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 leading-none mb-0.5">Saldo</p>
                          <p className="text-sm font-bold text-red-600">{formatCurrency(cust.balance)}</p>
                        </div>
                      </div>

                      {/* Chevron */}
                      <div className="text-gray-400 flex-shrink-0">
                        {isOpen
                          ? <ChevronUpIcon className="h-5 w-5" />
                          : <ChevronDownIcon className="h-5 w-5" />
                        }
                      </div>
                    </button>

                    {/* ─ Detalle documentos del cliente ─ */}
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-slate-50 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-xs font-semibold text-gray-400 uppercase border-b border-gray-200">
                              <th className="pl-16 pr-4 py-2 text-left whitespace-nowrap">N° Documento</th>
                              <th className="px-4 py-2 text-left whitespace-nowrap">Tipo</th>
                              <th className="px-4 py-2 text-left whitespace-nowrap">Fecha</th>
                              <th className="px-4 py-2 text-right whitespace-nowrap">Total</th>
                              <th className="px-4 py-2 text-right whitespace-nowrap">Pagado</th>
                              <th className="px-4 py-2 text-right whitespace-nowrap">Saldo</th>
                              <th className="px-4 py-2 text-center whitespace-nowrap">Estado</th>
                              <th className="px-4 py-2 text-center whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                                Acción
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {cust.invoices.map((inv) => (
                              <tr key={inv.id} className="bg-white hover:bg-blue-50 transition-colors group">
                                <td className="pl-16 pr-4 py-2.5 whitespace-nowrap">
                                  <button
                                    onClick={() => navigate(`/sales/${inv.id}`)}
                                    className="font-mono font-semibold text-blue-700 hover:underline"
                                  >
                                    {inv.sale_number}
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${docColor(inv.document_type)}`}>
                                    {docLabel(inv.document_type)}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                                  {formatDate(inv.sale_date)}
                                  {inv.is_overdue && (
                                    <span className="ml-1 text-xs font-semibold text-red-500">({inv.days_overdue}d)</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap text-gray-700 font-medium">{formatCurrency(inv.total_amount)}</td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  {inv.paid_amount > 0
                                    ? <span className="text-emerald-600 font-semibold">{formatCurrency(inv.paid_amount)}</span>
                                    : <span className="text-gray-300">—</span>
                                  }
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-red-600">
                                  {formatCurrency(inv.balance)}
                                </td>
                                <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                  {inv.payment_status === 'partial'
                                    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Parcial</span>
                                    : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Crédito</span>
                                  }
                                </td>
                                <td className="px-4 py-2.5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                                  <button
                                    onClick={() => openPaymentModal(inv)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                                  >
                                    <BanknotesIcon className="h-3.5 w-3.5" />
                                    Abonar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            Modal de Pago
        ══════════════════════════════════════════════ */}
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              {/* Overlay */}
              <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" onClick={closePaymentModal} />

              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Registrar Pago</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedInvoice.sale_number} ·{' '}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${docColor(selectedInvoice.document_type)}`}>
                        {docLabel(selectedInvoice.document_type)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 font-medium mt-0.5">{selectedInvoice.customer_name}</p>
                  </div>
                  <button onClick={closePaymentModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                  {/* Resumen financiero */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-4 text-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Total</p>
                      <p className="font-bold text-gray-800 text-sm">{formatCurrency(selectedInvoice.total_amount)}</p>
                    </div>
                    <div className="border-x border-gray-200">
                      <p className="text-xs text-gray-400 mb-1">Pagado</p>
                      <p className="font-bold text-emerald-600 text-sm">{formatCurrency(selectedInvoice.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Saldo</p>
                      <p className="font-bold text-red-600 text-sm">{formatCurrency(selectedInvoice.balance)}</p>
                    </div>
                  </div>

                  {/* Monto */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Monto a pagar
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">$</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        step="any"
                        min="0"
                        className="w-full pl-8 pr-4 py-3.5 border-2 border-gray-300 rounded-xl text-xl font-bold text-gray-900 focus:ring-0 focus:border-blue-500 transition-colors"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                    {paymentAmount && parseFloat(paymentAmount) > 0 && parseFloat(paymentAmount) < parseFloat(selectedInvoice.balance) && (
                      <p className="mt-1.5 text-xs text-orange-600 font-medium">
                        ⚠ Quedará pendiente {formatCurrency(selectedInvoice.balance - parseFloat(paymentAmount))}
                      </p>
                    )}
                    {paymentAmount && parseFloat(paymentAmount) >= parseFloat(selectedInvoice.balance) && (
                      <p className="mt-1.5 text-xs text-emerald-600 font-medium">
                        ✓ Cancelará el saldo completo
                      </p>
                    )}
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Método de pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Nequi', 'Otro'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                            paymentMethod === m
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Notas <span className="font-normal text-gray-400">(opcional)</span>
                    </label>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Ej: pago en efectivo recibido en caja..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={closePaymentModal}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegisterPayment}
                    disabled={savingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {savingPayment
                      ? <><ArrowPathIcon className="h-4 w-4 animate-spin" />Guardando...</>
                      : <><BanknotesIcon className="h-4 w-4" />Registrar Pago</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default AccountsReceivablePage;