import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import Layout from '../../components/layout/Layout';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-700' },
  pending:   { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Entregada',  cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-700' },
};

const PAYMENT_LABELS = {
  pending: { label: 'Sin pagar',    cls: 'bg-orange-100 text-orange-700' },
  partial: { label: 'Pago parcial', cls: 'bg-yellow-100 text-yellow-700' },
  paid:    { label: 'Pagado',       cls: 'bg-green-100 text-green-700' },
};

const DOC_LABELS = {
  remision:   'Remisión',
  factura:    'Factura',
  cotizacion: 'Cotización',
};

export default function SalesPage() {
  const navigate = useNavigate();
  const { sales, loading, fetchSales, setFilters, filters, stats, fetchStats } = useSalesStore();

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchStats();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.customer_name) {
        const updated = { customer_name: searchInput };
        setFilters(updated);
        fetchSales({ ...filters, ...updated });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleFilterChange = (key, value) => {
    const updated = { [key]: value };
    setFilters(updated);
    fetchSales({ ...filters, ...updated });
  };

  const handleReset = () => {
    setSearchInput('');
    const clean = { status: '', customer_name: '', from_date: '', to_date: '', document_type: '', vehicle_plate: '' };
    setFilters(clean);
    fetchSales(clean);
  };

  const hasActiveFilters = filters.status || filters.from_date || filters.to_date || filters.document_type || filters.vehicle_plate;

  return (
    <Layout>
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Ventas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${sales.length} resultado${sales.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            id="tour-sales-new"
            onClick={() => navigate('/sales/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Nueva venta
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Total ventas',  value: stats.sales_count ?? 0,     isCurrency: false },
              { label: 'Monto total',   value: stats.total_amount ?? 0,    isCurrency: true  },
              { label: 'Por cobrar',    value: stats.pending_amount ?? 0,  isCurrency: true  },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {s.isCurrency ? formatCurrency(s.value) : s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div id="tour-sales-search" className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o placa..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
              <select
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="pending">Confirmada</option>
                <option value="completed">Entregada</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <select
                value={filters.document_type}
                onChange={e => handleFilterChange('document_type', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los documentos</option>
                <option value="remision">Remisión</option>
                <option value="factura">Factura</option>
                <option value="cotizacion">Cotización</option>
              </select>
              <input
                type="date"
                value={filters.from_date}
                onChange={e => handleFilterChange('from_date', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
              <input
                type="date"
                value={filters.to_date}
                onChange={e => handleFilterChange('to_date', e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              />
            </div>
          )}
        </div>

        <div id="tour-sales-table" className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No hay ventas que mostrar</p>
              <p className="text-gray-400 text-xs mt-1">
                {hasActiveFilters || searchInput ? 'Intenta con otros filtros' : 'Crea tu primera venta con el botón de arriba'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden lg:table min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'Cliente', 'Documento', 'Fecha', 'Total', 'Pago', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(sale => {
                    const st = STATUS_LABELS[sale.status]          || STATUS_LABELS.draft;
                    const pt = PAYMENT_LABELS[sale.payment_status] || PAYMENT_LABELS.pending;
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => navigate(`/sales/${sale.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{sale.sale_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{sale.customer_name}</p>
                          {sale.vehicle_plate && <p className="text-xs text-gray-500">{sale.vehicle_plate}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{DOC_LABELS[sale.document_type] || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(sale.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${pt.cls}`}>{pt.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-gray-100">
                {sales.map(sale => {
                  const st = STATUS_LABELS[sale.status]          || STATUS_LABELS.draft;
                  const pt = PAYMENT_LABELS[sale.payment_status] || PAYMENT_LABELS.pending;
                  return (
                    <div
                      key={sale.id}
                      onClick={() => navigate(`/sales/${sale.id}`)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{sale.customer_name}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{sale.sale_number}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(sale.total_amount)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pt.cls}`}>{pt.label}</span>
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(sale.sale_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}