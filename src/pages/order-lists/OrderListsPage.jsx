import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, Search, AlertTriangle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import Combobox, { HighlightMatch } from '../../components/common/Combobox';
import OrderLineForm from '../../components/order-lists/OrderLineForm';
import { suppliersAPI } from '../../api/suppliers';
import { getOrderLists } from '../../api/orderLists';

const STATUS = {
  open: { label: 'Abierto', cls: 'bg-orange-100 text-orange-800' },
  ordered: { label: 'Pedido', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Descartado', cls: 'bg-gray-100 text-gray-700' },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const supplierName = (s) => s?.business_name || s?.name || '—';
const userName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || '';

export default function OrderListsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'open';

  const [lists, setLists] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [suppliers, setSuppliers] = useState(null);
  const [newSupplier, setNewSupplier] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrderLists({ status: tab, page, limit: 50, search: search.trim() || undefined });
      setLists(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => { setPage(1); }, [tab, search]);

  const openNew = () => {
    setShowNew(true);
    setNewSupplier(null);
    if (!suppliers) {
      suppliersAPI.getAll({ is_active: true, limit: 10000, sort_by: 'name', sort_order: 'ASC' })
        .then((res) => setSuppliers(res.data || []))
        .catch(() => toast.error('Error al cargar proveedores'));
    }
  };

  const supplierLabel = (s) => (s ? `${s.business_name || s.name}${s.tax_id ? ` - ${s.tax_id}` : ''}` : '');

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pedidos a proveedores</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Lo que hay que pedirle a cada proveedor, sin precios. Una lista abierta por proveedor; al marcarla como pedida pasa al historial.
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" /> Anotar en pedido
          </button>
        </div>

        <div className="border-b border-gray-200 flex gap-1">
          {[['open', 'Abiertos'], ['history', 'Historial']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setSearchParams(id === 'history' ? { tab: 'history' } : {})}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proveedor o número de pedido..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
          </div>
        ) : lists.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
            {tab === 'open' ? (
              <>
                <p>No hay pedidos abiertos.</p>
                <p className="text-sm mt-1">
                  Anota productos desde <Link to="/stock-alerts" className="text-orange-600 hover:underline">Alertas de Stock</Link>, la ficha del producto o con el botón "Anotar en pedido".
                </p>
              </>
            ) : <p>Todavía no hay pedidos cerrados.</p>}
          </div>
        ) : tab === 'open' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => navigate(`/order-lists/${l.id}`)}
                className="text-left bg-white rounded-xl shadow-md p-5 border border-transparent hover:border-orange-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 truncate" title={supplierName(l.supplier)}>{supplierName(l.supplier)}</p>
                  <span className="text-xs text-gray-500 flex-shrink-0">{l.list_number}</span>
                </div>
                <p className="text-3xl font-bold text-orange-600 mt-3">{Number(l.items_count) || 0}</p>
                <p className="text-xs text-gray-500">ítem(s) anotado(s)</p>
                {Number(l.free_items_count) > 0 && (
                  <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {l.free_items_count} línea(s) libre(s)
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">Última anotación: {fmtDate(l.last_item_at || l.updated_at)}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Pedido</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Ítems</th>
                    <th className="px-4 py-3 hidden md:table-cell">Fecha</th>
                    <th className="px-4 py-3 hidden md:table-cell">Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lists.map((l) => (
                    <tr key={l.id} onClick={() => navigate(`/order-lists/${l.id}`)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-gray-900">{l.list_number}</td>
                      <td className="px-4 py-3">{supplierName(l.supplier)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[l.status]?.cls}`}>{STATUS[l.status]?.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{Number(l.items_count) || 0}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {fmtDate(l.ordered_at || l.cancelled_at)}
                        {l.orderer && <span className="block text-xs">{userName(l.orderer)}</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {l.purchase ? (
                          <Link to={`/purchases/${l.purchase.id}`} onClick={(e) => e.stopPropagation()} className="text-orange-600 hover:underline">
                            {l.purchase.purchase_number}
                          </Link>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-600">Página {pagination.page} de {pagination.pages} · {pagination.total} pedidos</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50">Anterior</button>
                  <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Anotar en pedido" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor</label>
            <Combobox
              placeholder="Buscar proveedor por nombre o NIT..."
              items={suppliers || []}
              value={newSupplier?.id || null}
              displayValue={supplierLabel(newSupplier)}
              onSelect={setNewSupplier}
              onClear={() => setNewSupplier(null)}
              getSearchText={(s) => [s.name, s.business_name, s.tax_id].filter(Boolean).join(' ')}
              renderItem={(s, q) => (
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100"><HighlightMatch text={s.business_name || s.name} query={q} /></p>
                  {s.tax_id && <p className="text-xs text-gray-500">NIT <HighlightMatch text={s.tax_id} query={q} /></p>}
                </div>
              )}
            />
            <p className="text-xs text-gray-500 mt-1">Si el proveedor ya tiene un pedido abierto, la línea se agrega a ese pedido.</p>
          </div>
          {newSupplier && (
            <OrderLineForm
              supplierId={newSupplier.id}
              onAdded={(r) => { setShowNew(false); navigate(`/order-lists/${r.list_id}`); }}
            />
          )}
        </div>
      </Modal>
    </Layout>
  );
}
