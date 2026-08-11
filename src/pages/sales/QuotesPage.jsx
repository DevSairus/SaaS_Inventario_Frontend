import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import salesApi from '../../api/sales';
import { workOrdersApi } from '../../api/workshop';
import useBranchStore from '../../store/branchStore';
import useTenantStore from '../../store/tenantStore';
import Layout from '../../components/layout/Layout';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

// Estado propio de las cotizaciones -- independiente del status genérico de
// venta (draft/pending/completed/cancelled). Se actualiza a 'enviada' al
// compartir por WhatsApp, y a 'aprobada'/'rechazada' cuando el cliente
// responde desde el link público (/public/quote/:token). 'parcial' aplica
// tanto a cotizaciones de Taller como de Venta: el cliente aprobó algunos
// ítems y rechazó otros dentro de la misma cotización.
const QUOTE_STATUS_LABELS = {
  borrador: { label: 'Borrador', cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  enviada:  { label: 'Enviada',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  aprobada: { label: 'Aprobada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  parcial:  { label: 'Parcial',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  rechazada:{ label: 'Rechazada', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  vencida:  { label: 'Vencida',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

const ORIGIN_LABELS = {
  sale:     { label: 'Venta',  cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-gray-300' },
  workshop: { label: 'Taller', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const EMPTY_FILTERS = { quote_status: '', from_date: '', to_date: '', branch_id: '', vehicle_plate: '' };

// Normaliza una Sale (document_type='cotizacion') al shape unificado de la tabla.
function fromSale(sale) {
  return {
    id: sale.id,
    source: 'sale',
    number: sale.sale_number,
    customer_name: sale.customer_name,
    vehicle_plate: sale.vehicle_plate,
    branch_name: sale.branch?.name,
    date: sale.sale_date,
    total_amount: sale.total_amount,
    quote_status: sale.quote_status,
  };
}

// Normaliza una ronda de WorkOrderQuoteRequest (cotización hecha dentro de
// una Orden de Trabajo) al mismo shape.
function fromWorkshopQuote(q) {
  return {
    id: q.id,
    source: 'workshop',
    work_order_id: q.work_order_id,
    number: q.order_number,
    customer_name: q.customer_name,
    vehicle_plate: q.vehicle_plate,
    branch_name: null,
    date: q.sent_at,
    total_amount: q.total_amount,
    quote_status: q.quote_status,
  };
}

// Página independiente de Ventas (SalesPage.jsx). Usa estado local en vez del
// store compartido useSalesStore para no arrastrar filtros de un lado al
// otro al navegar entre /sales y /quotes (ambos apuntan al mismo modelo Sale).
// Combina, además, las cotizaciones hechas dentro de Órdenes de Trabajo
// (Taller) cuando el tenant tiene ese módulo habilitado.
export default function QuotesPage() {
  const navigate = useNavigate();
  const { branches, fetchBranches } = useBranchStore();
  const { enabledModules, fetchFeatures } = useTenantStore();
  const hasWorkshop = enabledModules?.includes('workshop');

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchQuotes = async (customFilters = filters) => {
    setLoading(true);
    try {
      const commonFilters = { ...customFilters, customer_name: searchInput };

      const requests = [
        salesApi.getAll({ ...commonFilters, quote_view: true }).then(res => res.data.data.map(fromSale)),
      ];
      if (hasWorkshop) {
        requests.push(
          workOrdersApi.getWorkshopQuotes(commonFilters).then(res => res.data.data.map(fromWorkshopQuote))
        );
      }

      const results = await Promise.all(requests);
      const merged = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
      setQuotes(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchQuotes(EMPTY_FILTERS);
  }, [hasWorkshop]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchQuotes(filters);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    fetchQuotes(updated);
  };

  const handleReset = () => {
    setSearchInput('');
    setFilters(EMPTY_FILTERS);
    fetchQuotes(EMPTY_FILTERS);
  };

  const goToQuote = (quote) => {
    if (quote.source === 'workshop') navigate(`/workshop/work-orders/${quote.work_order_id}`);
    else navigate(`/sales/${quote.id}`);
  };

  const hasActiveFilters = filters.quote_status || filters.from_date || filters.to_date || filters.branch_id || filters.vehicle_plate;

  return (
    <Layout>
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Cotizaciones</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${quotes.length} resultado${quotes.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => navigate('/crm/quotes/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Nueva cotización
          </button>
        </div>

        <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por cliente o placa..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800/40 dark:text-blue-300' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <select
                value={filters.quote_status}
                onChange={e => handleFilterChange('quote_status', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="borrador">Borrador</option>
                <option value="enviada">Enviada</option>
                <option value="aprobada">Aprobada</option>
                <option value="parcial">Parcial</option>
                <option value="rechazada">Rechazada</option>
                <option value="vencida">Vencida</option>
              </select>
              <input
                type="date"
                value={filters.from_date}
                onChange={e => handleFilterChange('from_date', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 dark:text-gray-400"
              />
              <input
                type="date"
                value={filters.to_date}
                onChange={e => handleFilterChange('to_date', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 dark:text-gray-400"
              />
              {branches.length > 1 && (
                <select
                  value={filters.branch_id}
                  onChange={e => handleFilterChange('branch_id', e.target.value)}
                  className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las sedes</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-500 text-sm">No hay cotizaciones que mostrar</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {hasActiveFilters || searchInput ? 'Intenta con otros filtros' : 'Crea tu primera cotización con el botón de arriba'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden lg:table min-w-full divide-y divide-gray-100 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-graphite-2">
                  <tr>
                    {(hasWorkshop
                      ? (branches.length > 1 ? ['#', 'Cliente', 'Origen', 'Sede', 'Fecha', 'Total', 'Estado'] : ['#', 'Cliente', 'Origen', 'Fecha', 'Total', 'Estado'])
                      : (branches.length > 1 ? ['#', 'Cliente', 'Sede', 'Fecha', 'Total', 'Estado'] : ['#', 'Cliente', 'Fecha', 'Total', 'Estado'])
                    ).map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {quotes.map(quote => {
                    const qs = QUOTE_STATUS_LABELS[quote.quote_status] || QUOTE_STATUS_LABELS.borrador;
                    const origin = ORIGIN_LABELS[quote.source];
                    return (
                      <tr
                        key={`${quote.source}-${quote.id}`}
                        onClick={() => goToQuote(quote)}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">{quote.number}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{quote.customer_name || '—'}</p>
                          {quote.vehicle_plate && <p className="text-xs text-gray-500 dark:text-gray-500">{quote.vehicle_plate}</p>}
                        </td>
                        {hasWorkshop && (
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${origin.cls}`}>{origin.label}</span>
                          </td>
                        )}
                        {branches.length > 1 && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{quote.branch_name || '—'}</td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(quote.date)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(quote.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${qs.cls}`}>{qs.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-gray-100">
                {quotes.map(quote => {
                  const qs = QUOTE_STATUS_LABELS[quote.quote_status] || QUOTE_STATUS_LABELS.borrador;
                  const origin = ORIGIN_LABELS[quote.source];
                  return (
                    <div
                      key={`${quote.source}-${quote.id}`}
                      onClick={() => goToQuote(quote)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{quote.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{quote.number}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(quote.total_amount)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${qs.cls}`}>{qs.label}</span>
                        {hasWorkshop && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${origin.cls}`}>{origin.label}</span>
                        )}
                        {branches.length > 1 && quote.branch_name && (
                          <span className="text-xs text-gray-500">{quote.branch_name}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(quote.date)}</span>
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
