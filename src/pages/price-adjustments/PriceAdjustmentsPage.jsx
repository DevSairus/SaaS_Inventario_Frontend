import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Tags } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import PriceAdjustmentModal from '../../components/price-adjustments/PriceAdjustmentModal';
import useAuthStore from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';
import { MARGIN_METHOD_LABELS } from '../../utils/salePricing';
import {
  getPriceAdjustments, getPriceAdjustment, PRICE_ADJUSTMENT_WRITE_ROLES, COST_SOURCE_LABELS,
} from '../../api/priceAdjustments';
import Pagination from '../../components/common/Pagination';
import useUrlPageSync from '../../hooks/useUrlPageSync';

// Ajustes de precio de venta (AJP-): historial de todos los cambios de precio
// hechos con ajuste, y botón para crear uno nuevo con varios productos.

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const userName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || '—';
const money = (v) => (v === null || v === undefined ? '—' : formatCurrency(Number(v), { decimals: 2 }));
const marginTxt = (v) => (v === null || v === undefined ? 'sin margen' : `${Number(v).toLocaleString('es-CO')} %`);

export function PriceAdjustmentDetailModal({ adjustmentId, onClose }) {
  const [adj, setAdj] = useState(null);

  useEffect(() => {
    if (!adjustmentId) return;
    setAdj(null);
    getPriceAdjustment(adjustmentId)
      .then((res) => setAdj(res.data))
      .catch((err) => { toast.error(err.response?.data?.message || 'Error al cargar el ajuste'); onClose(); });
  }, [adjustmentId, onClose]);

  return (
    <Modal isOpen={!!adjustmentId} onClose={onClose} title={adj ? `Ajuste de precio ${adj.adjustment_number}` : 'Ajuste de precio'} size="xl">
      {!adj ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div><span className="text-gray-500">Fecha:</span> {fmtDateTime(adj.created_at)}</div>
            <div><span className="text-gray-500">Hecho por:</span> {userName(adj.creator)}</div>
            <div><span className="text-gray-500">Productos:</span> {adj.items_count}</div>
            <div className="sm:col-span-3"><span className="text-gray-500">Motivo:</span> {adj.reason}</div>
            {adj.notes && <div className="sm:col-span-3"><span className="text-gray-500">Observaciones:</span> {adj.notes}</div>}
          </div>
          <div className="overflow-x-auto rounded-lg border dark:border-white/10">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Precio anterior</th>
                  <th className="px-3 py-2 text-right">Precio nuevo</th>
                  <th className="px-3 py-2 text-right">Costo de referencia</th>
                  <th className="px-3 py-2 text-right">Margen</th>
                  <th className="px-3 py-2 text-right">Sugerido</th>
                  <th className="px-3 py-2 text-right">Costos registrados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {adj.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">
                      {it.product_id ? <Link to={`/products/${it.product_id}`} className="font-medium text-blue-600 hover:underline">{it.product_name}</Link> : <span className="font-medium">{it.product_name}</span>}
                      <div className="text-xs text-gray-500 font-mono">{it.sku}{it.price_includes_tax ? ' · precio con IVA' : ''}</div>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{money(it.previous_price)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{money(it.new_price)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {money(it.reference_cost)}
                      {it.cost_source && <div className="text-xs text-gray-500">{COST_SOURCE_LABELS[it.cost_source]}</div>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {it.margin_changed
                        ? <span className="font-semibold text-amber-700">{marginTxt(it.previous_margin_pct)} → {marginTxt(it.margin_pct)}</span>
                        : (it.margin_pct !== null ? marginTxt(it.margin_pct) : '—')}
                      {it.margin_method && <div className="text-xs text-gray-500">{MARGIN_METHOD_LABELS[it.margin_method]}</div>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{money(it.suggested_price)}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500 whitespace-nowrap">
                      <div>Último: {money(it.last_purchase_cost)}</div>
                      <div>Promedio: {money(it.average_cost)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function PriceAdjustmentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = PRICE_ADJUSTMENT_WRITE_ROLES.includes(role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const detailId = searchParams.get('id');
  // ?id abre el detalle; se conserva ?page al abrir/cerrar
  const openDetail = (id) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('id', id); return next; });
  const closeDetail = useCallback(() => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('id'); return next; }), [setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPriceAdjustments({ page, limit: 50, search: search.trim() || undefined });
      setRows(res.data.adjustments || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar los ajustes de precio');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => { setPage(1); }, [search]);
  useUrlPageSync(page, setPage);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ajustes de precio</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cambios del precio de venta con motivo y costo de referencia. No mueven stock, costos ni contabilidad.
            </p>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" /> Nuevo ajuste
            </button>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, motivo o producto..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500">
            <Tags className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{search ? 'No hay ajustes que coincidan.' : 'Todavía no hay ajustes de precio.'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Ajuste</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3 text-right">Productos</th>
                    <th className="px-4 py-3 hidden md:table-cell">Hecho por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.id} onClick={() => openDetail(r.id)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.adjustment_number}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-3">{r.reason}</td>
                      <td className="px-4 py-3 text-right">{r.items_count}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{userName(r.creator)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              className="bg-gray-50 px-4 py-3 border-t border-gray-200"
              currentPage={page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              pageSize={50}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <PriceAdjustmentModal isOpen={showNew} onClose={() => setShowNew(false)} onSaved={() => { setPage(1); load(); }} />
      <PriceAdjustmentDetailModal adjustmentId={detailId} onClose={closeDetail} />
    </Layout>
  );
}
