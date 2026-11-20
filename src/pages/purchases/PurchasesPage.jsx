// frontend/src/pages/purchases/PurchasesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import { suppliersAPI } from '../../api/suppliers';
import mergeById from '../../utils/mergeById';
import useBranchStore from '../../store/branchStore';
import Layout from '../../components/layout/Layout';
import InvoiceImportModal from '../../components/purchases/InvoiceImportModal';
import Combobox, { HighlightMatch } from '../../components/common/Combobox';
import { formatDate } from '../../utils/formatters';
import { purchasesAPI } from '../../api/purchases';
import toast from 'react-hot-toast';
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
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import Pagination from '../../components/common/Pagination';
import useUrlPageSync from '../../hooks/useUrlPageSync';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtCOP  = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
// purchase_date es un campo "solo fecha" (medianoche UTC) -- se usa el
// formatDate ya corregido de utils/formatters.js (ver comentario ahí),
// no new Date(...).toLocaleDateString() que en UTC-5 muestra un día menos.
const fmtDate = (d) => d ? formatDate(d) : '—';
const normalizeQ = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const STATUS = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmada', cls: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Recibida parcial', cls: 'bg-amber-100 text-amber-700' },
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

  const { purchases, stats, isLoading, pagination, filters, fetchPurchases, fetchStats, setFilters, setPage, setLimit, deletePurchase } = usePurchasesStore();
  // Lista completa (el store de proveedores está paginado a 10 para su listado)
  const [suppliers, setSuppliers] = useState([]);
  const { branches, fetchBranches } = useBranchStore();

  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters]         = useState(false);
  const [search, setSearch]                   = useState('');
  const [serverFilters, setServerFilters]     = useState({ status: '', supplier_id: '', branch_id: '' });
  // Pestañas: todas / órdenes de compra (sin factura) / facturas de proveedor.
  const [kind, setKind] = useState('');
  // Convertir orden en factura: { purchase, invoice_number, invoice_date, due_date }
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [savingInvoice, setSavingInvoice] = useState(false);

  const saveInvoice = async () => {
    if (!invoiceModal.invoice_number.trim()) { toast.error('Indica el número de factura del proveedor'); return; }
    try {
      setSavingInvoice(true);
      const res = await purchasesAPI.registerInvoice(invoiceModal.purchase.id, {
        invoice_number: invoiceModal.invoice_number.trim(),
        invoice_date: invoiceModal.invoice_date || undefined,
        due_date: invoiceModal.due_date || undefined,
      });
      toast.success(res?.message || 'Factura registrada');
      setInvoiceModal(null);
      fetchPurchases(); fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la factura');
    } finally {
      setSavingInvoice(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Solo para hojear; el resto lo encuentra el remoteSearch del Combobox.
    suppliersAPI.getAll({ limit: 100, sort_by: 'name', sort_order: 'ASC' })
      .then(res => setSuppliers(prev => mergeById(res.data || [], prev)))
      .catch(() => {});
    fetchBranches();
  }, []);

  // Antes de los efectos de carga: la primera consulta ya usa la página de la URL
  useUrlPageSync(pagination.page, setPage);
  useEffect(() => {
    setFilters({ ...serverFilters, kind });
    fetchPurchases();
  }, [serverFilters, kind, pagination.page, pagination.limit]);

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
    setServerFilters({ status: '', supplier_id: '', branch_id: '' });
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
              onClick={() => navigate('/purchases/dian-documents')}
              title="Subir el Excel de documentos recibidos del portal DIAN"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <TableCellsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Documentos DIAN</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Importar Factura</span>
            </button>
            <button
              onClick={() => navigate('/purchases/new?kind=order')}
              title="Mercancía que llega sin factura: entra al inventario y se convierte en factura después"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 rounded-lg text-sm font-semibold shadow-sm"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Orden de compra</span>
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

        {/* ── Pestañas: órdenes / facturas ── */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            ['', 'Todas'],
            ['order', `Órdenes de compra${stats?.open_orders ? ` (${stats.open_orders})` : ''}`],
            ['invoice', 'Facturas'],
          ].map(([k, label]) => (
            <button key={k || 'all'} type="button" onClick={() => { setKind(k); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${kind === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: ShoppingCartIcon,  color: 'text-blue-600 bg-blue-50',    label: 'Total Compras',  value: stats.total || 0 },
              { icon: ClockIcon,         color: 'text-gray-500 bg-gray-100',   label: 'Borradores',     value: stats.draft || 0 },
              { icon: CheckCircleIcon,   color: 'text-blue-600 bg-blue-50',    label: 'Confirmadas',    value: (stats.confirmed || 0) + (stats.partially_received || 0) },
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
                <Combobox
                  placeholder="Todos los proveedores"
                  items={suppliers}
                  value={serverFilters.supplier_id || null}
                  displayValue={suppliers.find(s => String(s.id) === String(serverFilters.supplier_id))?.name || ''}
                  onSelect={(s) => { setSuppliers(prev => mergeById(prev, [s])); setServerFilters(f => ({ ...f, supplier_id: s.id })); }}
                  remoteSearch={(q) => suppliersAPI.search(q)}
                  onClear={() => setServerFilters(f => ({ ...f, supplier_id: '' }))}
                  getSearchText={(s) => [s.name, s.business_name, s.tax_id].filter(Boolean).join(' ')}
                  renderItem={(s, q) => (
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100"><HighlightMatch text={s.name} query={q} /></p>
                      {s.tax_id && <p className="text-xs text-gray-500">NIT <HighlightMatch text={s.tax_id} query={q} /></p>}
                    </div>
                  )}
                />
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
                  <option value="partially_received">Recibida parcial</option>
                  <option value="received">Recibida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              {branches.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sede</label>
                  <select
                    value={serverFilters.branch_id}
                    onChange={(e) => setServerFilters(f => ({ ...f, branch_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Todas las sedes</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">
                        {p.invoice_number || (p.purchase_kind === 'order'
                          ? <span className="font-sans text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Orden sin factura</span>
                          : '—')}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap"><Chip status={p.status} /></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-gray-800">{fmtCOP(p.total_amount)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => navigate(`/purchases/${p.id}`)} title="Ver detalle" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {p.purchase_kind === 'order' && !['draft', 'cancelled'].includes(p.status) && (
                            <button
                              onClick={() => setInvoiceModal({ purchase: p, invoice_number: '', invoice_date: new Date().toISOString().slice(0, 10), due_date: '' })}
                              title="Registrar la factura del proveedor y convertir la orden en factura"
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100"
                            >
                              Convertir en factura
                            </button>
                          )}
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
          {!isLoading && (
            <Pagination
              className="px-4 py-3 border-t border-gray-100"
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setPage}
              onPageSizeChange={setLimit}
              pageSizeOptions={[10, 25, 50, 100, 200]}
            />
          )}
        </div>
      </div>

      {invoiceModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-900">Convertir {invoiceModal.purchase.purchase_number} en factura</h3>
            <p className="text-sm text-gray-500">{invoiceModal.purchase.supplier?.name} · {fmtCOP(invoiceModal.purchase.total_amount)}</p>
            <label className="block text-sm font-medium text-gray-700">Número de factura del proveedor *
              <input autoFocus value={invoiceModal.invoice_number}
                onChange={(e) => setInvoiceModal((m) => ({ ...m, invoice_number: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ej: FE-1234" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700">Fecha factura
                <input type="date" value={invoiceModal.invoice_date}
                  onChange={(e) => setInvoiceModal((m) => ({ ...m, invoice_date: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-700">Vence
                <input type="date" value={invoiceModal.due_date}
                  onChange={(e) => setInvoiceModal((m) => ({ ...m, due_date: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </label>
            </div>
            <p className="text-xs text-gray-500">Lo ya recibido pasa de “mercancía recibida por facturar” a cuentas por pagar al proveedor, con su IVA y retenciones.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setInvoiceModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
              <button onClick={saveInvoice} disabled={savingInvoice}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {savingInvoice ? 'Guardando...' : 'Convertir en factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoiceImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => { fetchPurchases(serverFilters); fetchStats(); }}
      />
    </Layout>
  );
};

export default PurchasesPage;