// frontend/src/pages/purchases/PurchasesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import { useSuppliersStore } from '../../store/suppliersStore';
import Layout from '../../components/layout/Layout';
import InvoiceImportModal from '../../components/purchases/InvoiceImportModal';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtCOP  = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const normalizeQ = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const STATUS = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  received:  { label: 'Recibida',   cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-600' },
};

const Chip = ({ status }) => {
  const m = STATUS[status] || STATUS.draft;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}>{m.label}</span>;
};

/* ─── componente ──────────────────────────────────────────── */
const PurchasesPage = () => {
  const navigate = useNavigate();

  const { purchases, stats, isLoading, pagination, filters, fetchPurchases, fetchStats, setFilters, setPage, deletePurchase } = usePurchasesStore();
  const { fetchSuppliers, suppliers } = useSuppliersStore();

  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters]         = useState(false);
  const [search, setSearch]                   = useState('');
  const [serverFilters, setServerFilters]     = useState({ status: '', supplier_id: '' });

  useEffect(() => {
    fetchStats();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setFilters(serverFilters);
    fetchPurchases(serverFilters);
  }, [serverFilters, pagination.page]);

  /* filtrado local */
  const filtered = useMemo(() => {
    const q = normalizeQ(search);
    if (!q) return purchases;
    return purchases.filter((p) => {
      const hay = [p.purchase_number, p.invoice_number, p.supplier?.name].map(normalizeQ).join(' ');
      return hay.includes(q);
    });
  }, [purchases, search]);

  const activeCount = Object.values(serverFilters).filter(Boolean).length;

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta compra?')) return;
    const ok = await deletePurchase(id);
    if (ok) { fetchPurchases(serverFilters); fetchStats(); }
  };

  const clearAll = () => {
    setSearch('');
    setServerFilters({ status: '', supplier_id: '' });
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de órdenes de compra a proveedores</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Importar Factura</span>
            </button>
            <button
              onClick={() => navigate('/purchases/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Nueva Compra
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: ShoppingCartIcon,  color: 'text-blue-600 bg-blue-50',    label: 'Total Compras',  value: stats.total || 0 },
              { icon: ClockIcon,         color: 'text-gray-500 bg-gray-100',   label: 'Borradores',     value: stats.draft || 0 },
              { icon: CheckCircleIcon,   color: 'text-blue-600 bg-blue-50',    label: 'Confirmadas',    value: stats.confirmed || 0 },
              { icon: ArchiveBoxIcon,    color: 'text-emerald-600 bg-emerald-50', label: 'Recibidas',   value: stats.received || 0 },
              { icon: CurrencyDollarIcon,color: 'text-violet-600 bg-violet-50',label: 'Invertido (mes)',value: fmtCOP(stats.total_this_month), wide: true },
            ].map(({ icon: Icon, color, label, value, wide }) => (
              <div key={label} className={`bg-white shadow rounded-xl p-4 flex items-center gap-3 ${wide ? 'col-span-2 lg:col-span-1' : ''}`}>
                <div className={`rounded-lg p-2.5 flex-shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                  <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Búsqueda + filtros ── */}
        <div className="bg-white shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por N° compra, N° factura o proveedor..."
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                activeCount > 0 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <span className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeCount}</span>
              )}
            </button>

            <button
              onClick={() => fetchPurchases(serverFilters)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {(search || activeCount > 0) && (
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Proveedor</label>
                <select
                  value={serverFilters.supplier_id}
                  onChange={(e) => setServerFilters(f => ({ ...f, supplier_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todos los proveedores</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
                <select
                  value={serverFilters.status}
                  onChange={(e) => setServerFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todos</option>
                  <option value="draft">Borrador</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="received">Recibida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          {isLoading && !purchases.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando compras...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <ShoppingCartIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron compras</p>
              {(search || activeCount > 0) && (
                <button onClick={clearAll} className="mt-2 text-emerald-600 text-sm hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                    <th className="px-4 py-3 text-left whitespace-nowrap">N° Compra</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Proveedor</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">N° Factura</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/purchases/${p.id}`)}
                          className="font-mono font-semibold text-emerald-700 hover:underline"
                        >
                          {p.purchase_number}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 max-w-[180px] truncate">{p.supplier?.name || '—'}</p>
                        {p.supplier?.tax_id && <p className="text-xs text-gray-400">{p.supplier.tax_id}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{fmtDate(p.purchase_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">{p.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap"><Chip status={p.status} /></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-gray-800">{fmtCOP(p.total_amount)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => navigate(`/purchases/${p.id}`)} title="Ver detalle" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {p.status === 'draft' && (
                            <>
                              <button onClick={() => navigate(`/purchases/${p.id}/edit`)} title="Editar" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(p.id)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 text-sm font-bold">
                    <td colSpan={5} className="px-4 py-3 text-gray-500 font-normal">
                      {filtered.length} compra{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {fmtCOP(filtered.reduce((s, p) => s + parseFloat(p.total_amount || 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!isLoading && pagination.total > pagination.limit && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <InvoiceImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => { fetchPurchases(serverFilters); fetchStats(); }}
      />
    </Layout>
  );
};

export default PurchasesPage;