import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import useBranchStore from '../../store/branchStore';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import Layout from '../../components/layout/Layout';
import DianStatusBadge from '../../components/dian/DianStatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import salesApi from '../../api/sales';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  pending:   { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Entregada',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const PAYMENT_LABELS = {
  pending: { label: 'Sin pagar',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  partial: { label: 'Pago parcial', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  paid:    { label: 'Pagado',       cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const DOC_LABELS = {
  remision:     'Remisión',
  factura:      'Factura',
  cotizacion:   'Cotización',
  nota_credito: 'Nota Crédito',
  nota_debito:  'Nota Débito',
};

// Remisión que se puede facturar desde el listado (el backend revalida todo:
// devoluciones, datos DIAN del cliente, resolución activa...). Solo las del
// mes en curso -- ver services/sales/remisionInvoicing.service.js.
const isInvoiceableRemision = (sale) => {
  if (sale.document_type !== 'remision' || !['pending', 'completed'].includes(sale.status) || sale.invoiced_in_sale_id) return false;
  const d = new Date(sale.sale_date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

// Marca de facturación de remisiones junto al tipo de documento.
function InvoicingTag({ sale }) {
  const cls = 'ml-1.5 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (sale.invoiced_in_sale_id) return <span className={cls} title="Incluida en una factura electrónica">Facturada</span>;
  if (sale.is_consolidated_invoice) return <span className={cls} title="Factura que agrupa varias remisiones">Agrupada</span>;
  if (sale.document_type === 'factura' && sale.remision_number) {
    return <span className={cls} title="Factura emitida desde una remisión">{sale.remision_number}</span>;
  }
  return null;
}

export default function SalesPage() {
  // Remisiones ocultas (Ajustes > Visibilidad de remisiones): el backend ya
  // no las devuelve a nadie salvo al superadmin impersonando; acá solo se
  // quita la opción del filtro.
  const tenantFeatures = useTenantStore(s => s.features);
  const isImpersonating = useAuthStore(s => s.isImpersonating);
  const hideRemisiones = tenantFeatures?.hide_remisiones_for_non_admin === true && !isImpersonating();
  const navigate = useNavigate();
  const { sales, loading, fetchSales, setFilters, filters, stats, fetchStats } = useSalesStore();
  const { branches, fetchBranches } = useBranchStore();

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Facturar remisiones (una, o varias del mismo cliente agrupadas)
  const canInvoiceRemisiones = tenantFeatures?.allow_remision_to_invoice === true && !hideRemisiones;
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmInvoicing, setConfirmInvoicing] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const selectedSales = sales.filter(s => selectedIds.includes(s.id));
  const selectedCustomerId = selectedSales[0]?.customer_id;
  const selectedTotal = selectedSales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
  const isSelectable = (sale) => isInvoiceableRemision(sale)
    && (!selectedCustomerId || (sale.customer_id === selectedCustomerId && sale.branch_id === selectedSales[0]?.branch_id));
  const toggleSelected = (saleId) => setSelectedIds(ids => (ids.includes(saleId) ? ids.filter(i => i !== saleId) : [...ids, saleId]));

  const handleInvoiceSelected = async () => {
    setConfirmInvoicing(false);
    setInvoicing(true);
    try {
      const res = selectedIds.length === 1
        ? await salesApi.convertToInvoice(selectedIds[0])
        : await salesApi.consolidateInvoice(selectedIds);
      toast.success(res.data?.message || 'Factura creada', { duration: 6000 });
      const invoiceId = res.data?.data?.sale_id || res.data?.data?.id;
      setSelectedIds([]);
      if (invoiceId) navigate(`/sales/${invoiceId}`);
      else fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error facturando las remisiones', { duration: 8000 });
    } finally {
      setInvoicing(false);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchStats();
    fetchBranches();
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
    const clean = { status: '', customer_name: '', from_date: '', to_date: '', document_type: '', vehicle_plate: '', branch_id: '' };
    setFilters(clean);
    fetchSales(clean);
  };

  const hasActiveFilters = filters.status || filters.from_date || filters.to_date || filters.document_type || filters.vehicle_plate || filters.branch_id;

  return (
    <Layout>
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ventas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
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
              <div key={s.label} className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-500">{s.label}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                  {s.isCurrency ? formatCurrency(s.value) : s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div id="tour-sales-search" className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-3">
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
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Confirmada</option>
                <option value="completed">Entregada</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <select
                value={filters.document_type}
                onChange={e => handleFilterChange('document_type', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los documentos</option>
                {!hideRemisiones && <option value="remision">Remisión</option>}
                <option value="factura">Factura</option>
                <option value="cotizacion">Cotización</option>
                <option value="nota_credito">Nota Crédito</option>
                <option value="nota_debito">Nota Débito</option>
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

        {canInvoiceRemisiones && selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-lg px-4 py-3">
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              {selectedIds.length} remisi{selectedIds.length === 1 ? 'ón' : 'ones'} de {selectedSales[0]?.customer_name} · {formatCurrency(selectedTotal)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-white dark:hover:bg-white/5"
              >
                Quitar selección
              </button>
              <button
                onClick={() => setConfirmInvoicing(true)}
                disabled={invoicing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {invoicing ? 'Facturando...' : selectedIds.length === 1 ? 'Facturar electrónicamente' : 'Agrupar en una factura'}
              </button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmInvoicing}
          onCancel={() => setConfirmInvoicing(false)}
          onConfirm={handleInvoiceSelected}
          title={selectedIds.length === 1 ? 'Facturar electrónicamente' : 'Agrupar en una factura'}
          message={selectedIds.length === 1
            ? `La remisión ${selectedSales[0]?.sale_number} se convertirá en factura electrónica y se enviará a la DIAN.`
            : `Se emitirá una factura electrónica por ${formatCurrency(selectedTotal)} con las remisiones ${selectedSales.map(s => s.sale_number).join(', ')}. Pagos, cartera e inventario siguen en cada remisión.`}
          confirmText="Facturar"
        />

        <div id="tour-sales-table" className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-500 text-sm">No hay ventas que mostrar</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {hasActiveFilters || searchInput ? 'Intenta con otros filtros' : 'Crea tu primera venta con el botón de arriba'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden lg:table min-w-full divide-y divide-gray-100 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-graphite-2">
                  <tr>
                    {canInvoiceRemisiones && <th className="w-8 px-3 py-3" />}
                    {(branches.length > 1 ? ['#', 'Cliente', 'Documento', 'Sede', 'Fecha', 'Total', 'Pago', 'Estado', 'DIAN'] : ['#', 'Cliente', 'Documento', 'Fecha', 'Total', 'Pago', 'Estado', 'DIAN']).map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {sales.map(sale => {
                    const st = STATUS_LABELS[sale.status]          || STATUS_LABELS.draft;
                    const pt = PAYMENT_LABELS[sale.payment_status] || PAYMENT_LABELS.pending;
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => navigate(`/sales/${sale.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        {canInvoiceRemisiones && (
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            {isInvoiceableRemision(sale) && (
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(sale.id)}
                                disabled={!selectedIds.includes(sale.id) && !isSelectable(sale)}
                                onChange={() => toggleSelected(sale.id)}
                                title={isSelectable(sale) || selectedIds.includes(sale.id) ? 'Seleccionar para facturar' : 'Solo se agrupan remisiones del mismo cliente y sede'}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                              />
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">{sale.sale_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sale.customer_name}</p>
                          {sale.vehicle_plate && <p className="text-xs text-gray-500 dark:text-gray-500">{sale.vehicle_plate}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {DOC_LABELS[sale.document_type] || '—'}
                          <InvoicingTag sale={sale} />
                          {sale.converted_to_work_order_id && (
                            <span
                              className="ml-1.5 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                              title="Esta cotización ya fue convertida en una Orden de Trabajo"
                            >
                              → OT
                            </span>
                          )}
                        </td>
                        {branches.length > 1 && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{sale.branch?.name || '—'}</td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(sale.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${pt.cls}`}>{pt.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {['factura', 'nota_credito', 'nota_debito'].includes(sale.document_type) ? (
                            <DianStatusBadge sale={sale} />
                          ) : (
                            <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                          )}
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
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pt.cls}`}>{pt.label}</span>
                        {sale.document_type === 'factura' && <DianStatusBadge sale={sale} />}
                        {sale.converted_to_work_order_id && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">→ OT</span>
                        )}
                        {branches.length > 1 && sale.branch?.name && (
                          <span className="text-xs text-gray-500">{sale.branch.name}</span>
                        )}
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