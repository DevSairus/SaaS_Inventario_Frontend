// frontend/src/pages/sales/SalesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import {
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Layout from '../../components/layout/Layout';
import salesApi from '../../api/sales';
import ConfirmSaleWithPaymentModal from '../../components/sales/ConfirmSaleWithPaymentModal';

/* ─── helpers visuales ────────────────────────────────────── */
const STATUS_META = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600' },
  pending:   { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Entregada',  cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-600' },
};

const PAYMENT_META = {
  pending: { label: 'Pendiente',    cls: 'bg-orange-100 text-orange-700' },
  partial: { label: 'Pago Parcial', cls: 'bg-yellow-100 text-yellow-700' },
  paid:    { label: 'Pagado',       cls: 'bg-emerald-100 text-emerald-700' },
};

const DOC_META = {
  remision:  { label: 'Remisión',   cls: 'bg-blue-100 text-blue-800' },
  factura:   { label: 'Factura',    cls: 'bg-purple-100 text-purple-800' },
  cotizacion:{ label: 'Cotización', cls: 'bg-gray-100 text-gray-700' },
};

const Chip = ({ meta }) => meta
  ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
  : null;

const normalizeQ = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ─── componente ──────────────────────────────────────────── */
export default function SalesPage() {
  const navigate = useNavigate();

  const {
    sales, loading, error,
    fetchSales, confirmSale, cancelSale, deleteSale,
    setFilters, filters,
    stats, fetchStats,
  } = useSalesStore();

  /* filtros que van al servidor */
  const [serverFilters, setServerFilters] = useState({
    status: '', document_type: '', from_date: '', to_date: '',
  });

  /* búsqueda local (sin petición) */
  const [search, setSearch] = useState('');

  /* ui */
  const [showFilters, setShowFilters]               = useState(false);
  const [confirmDialog, setConfirmDialog]           = useState({ show: false, sale: null, action: null });
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [saleToConfirm, setSaleToConfirm]           = useState(null);
  const [confirmingId, setConfirmingId]             = useState(null);

  /* carga inicial y cuando cambian filtros servidor */
  useEffect(() => {
    setFilters(serverFilters);
    fetchSales(serverFilters);
    fetchStats(serverFilters);
  }, [serverFilters]);

  /* filtrado local */
  const filtered = useMemo(() => {
    const q = normalizeQ(search);
    if (!q) return sales;
    return sales.filter((s) => {
      const haystack = [
        s.sale_number, s.customer_name,
        s.customer_tax_id, s.vehicle_plate,
      ].map(normalizeQ).join(' ');
      return haystack.includes(q);
    });
  }, [sales, search]);

  const activeFiltersCount = Object.values(serverFilters).filter(Boolean).length;

  /* acciones */
  const handleConfirmWithPayment = async (paymentData) => {
    try {
      setConfirmingId(saleToConfirm.id);
      await confirmSale(saleToConfirm.id, paymentData);
      setShowConfirmPayment(false);
      setSaleToConfirm(null);
      fetchSales(serverFilters);
      fetchStats(serverFilters);
    } catch (err) {
      alert('Error confirmando venta: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirmingId(null);
    }
  };

  const executeAction = async () => {
    const { sale, action } = confirmDialog;
    try {
      if (action === 'cancel') await cancelSale(sale.id);
      if (action === 'delete') await deleteSale(sale.id);
      setConfirmDialog({ show: false, sale: null, action: null });
      fetchSales(serverFilters);
      fetchStats(serverFilters);
    } catch (err) {
      alert(err.message || 'Error ejecutando acción');
    }
  };

  const handleDownloadPDF = async (saleId) => {
    try {
      const response = await salesApi.generatePDF(saleId);
      window.open(URL.createObjectURL(response.data), '_blank');
    } catch {
      alert('Error al generar el PDF');
    }
  };

  const clearAll = () => {
    setSearch('');
    setServerFilters({ status: '', document_type: '', from_date: '', to_date: '' });
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ventas y Remisiones</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de facturas, remisiones y cotizaciones</p>
          </div>
          <button
            onClick={() => navigate('/sales/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva Venta
          </button>
        </div>

        {/* ── Estadísticas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Documentos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_sales || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas Totales</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats?.total_amount || 0)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Por Cobrar</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{formatCurrency(stats?.pending_amount || 0)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cobrado</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency((stats?.total_amount || 0) - (stats?.pending_amount || 0))}
            </p>
          </div>
        </div>

        {/* ── Barra búsqueda + filtros ── */}
        <div className="bg-white shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Búsqueda local */}
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

            {/* Filtros avanzados */}
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

            {/* Recargar */}
            <button
              onClick={() => { fetchSales(serverFilters); fetchStats(serverFilters); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Limpiar */}
            {(search || activeFiltersCount > 0) && (
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 transition-colors flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          {/* Panel filtros */}
          {showFilters && (
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
                <select
                  value={serverFilters.status}
                  onChange={(e) => setServerFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="draft">Borrador</option>
                  <option value="pending">Confirmada</option>
                  <option value="completed">Entregada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de documento</label>
                <select
                  value={serverFilters.document_type}
                  onChange={(e) => setServerFilters(f => ({ ...f, document_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="remision">Remisión</option>
                  <option value="factura">Factura</option>
                  <option value="cotizacion">Cotización</option>
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
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ── Tabla ── */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          {loading && !sales.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando ventas...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron registros</p>
              {(search || activeFiltersCount > 0) && (
                <button onClick={clearAll} className="mt-2 text-blue-600 text-sm hover:underline">
                  Limpiar filtros
                </button>
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
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pago</th>
                    {/* sticky */}
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">

                      {/* N° */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          className="font-mono font-semibold text-blue-700 hover:underline text-sm"
                        >
                          {sale.sale_number}
                        </button>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Chip meta={DOC_META[sale.document_type]} />
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 max-w-[200px] truncate leading-tight">
                          {sale.customer_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sale.customer_tax_id && (
                            <span className="text-xs text-gray-400">{sale.customer_tax_id}</span>
                          )}
                          {sale.vehicle_plate && (
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {sale.vehicle_plate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(sale.sale_date)}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-gray-800">
                        {formatCurrency(sale.total_amount)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Chip meta={STATUS_META[sale.status]} />
                      </td>

                      {/* Pago */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Chip meta={PAYMENT_META[sale.payment_status]} />
                      </td>

                      {/* Acciones — sticky */}
                      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">

                          {/* Ver detalle */}
                          <button
                            onClick={() => navigate(`/sales/${sale.id}`)}
                            title="Ver detalle"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>

                          {/* Confirmar (solo borrador) */}
                          {sale.status === 'draft' && (
                            <button
                              onClick={() => { setSaleToConfirm(sale); setShowConfirmPayment(true); }}
                              disabled={confirmingId === sale.id}
                              title="Confirmar venta"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}

                          {/* Cancelar (solo borrador) */}
                          {sale.status === 'draft' && (
                            <button
                              onClick={() => setConfirmDialog({ show: true, sale, action: 'cancel' })}
                              title="Cancelar venta"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}

                          {/* PDF */}
                          <button
                            onClick={() => handleDownloadPDF(sale.id)}
                            title="Descargar PDF"
                            className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                          </button>

                          {/* Eliminar (solo borrador) */}
                          {sale.status === 'draft' && (
                            <button
                              onClick={() => setConfirmDialog({ show: true, sale, action: 'delete' })}
                              title="Eliminar borrador"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totales */}
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 text-sm font-bold">
                    <td colSpan={4} className="px-4 py-3 text-gray-500 font-normal">
                      {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {formatCurrency(filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Modales ── */}
        <ConfirmSaleWithPaymentModal
          isOpen={showConfirmPayment}
          onClose={() => { setShowConfirmPayment(false); setSaleToConfirm(null); }}
          onConfirm={handleConfirmWithPayment}
          saleTotal={saleToConfirm?.total_amount || 0}
          loading={!!confirmingId}
        />

        <ConfirmDialog
          isOpen={confirmDialog.show}
          onClose={() => setConfirmDialog({ show: false, sale: null, action: null })}
          onConfirm={executeAction}
          title={confirmDialog.action === 'delete' ? 'Eliminar borrador' : 'Cancelar venta'}
          message={
            confirmDialog.action === 'delete'
              ? '¿Eliminar este borrador? Esta acción no se puede deshacer.'
              : '¿Cancelar esta venta? Si ya fue confirmada, se revertirá el inventario.'
          }
          confirmText={confirmDialog.action === 'delete' ? 'Eliminar' : 'Cancelar venta'}
          confirmVariant="danger"
        />
      </div>
    </Layout>
  );
}