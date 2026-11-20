// components/inventory/KardexView.jsx
//
// Kardex valorizado de un producto: saldo inicial, entradas/salidas con su
// costo, saldo en cantidad y en valor después de cada movimiento, y un
// resumen para decidir (costo promedio, último costo, última compra y venta,
// precio, utilidad configurada / actual / realizada en el periodo).
// Lo usan la página Inventario → Kardex y la ficha del producto.
import { useCallback, useEffect, useState } from 'react';
import { Activity, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { movementsAPI } from '../../api/movements';
import { warehousesService } from '../../api/warehouses';
import { getMovementReasonLabel } from '../../constants/movementReasons';
import { formatCurrency } from '../../utils/formatters';
import { exportKardexToExcel } from '../../utils/excelExport';
import Pagination from '../common/Pagination';

const PAGE_SIZE = 25;

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
};
const fmtQty = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 }));
const fmtPct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`);
const ago = (days) => (days === null || days === undefined ? '' : days === 0 ? 'hoy' : `hace ${days} día${days === 1 ? '' : 's'}`);

function Stat({ label, value, sub, tone = 'text-gray-900' }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-base font-semibold truncate ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
    </div>
  );
}

export default function KardexView({ productId, compact = false }) {
  const [filters, setFilters] = useState({ start_date: '', end_date: '', warehouse_id: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    warehousesService.getAll()
      .then((r) => setWarehouses(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])))
      .catch(() => setWarehouses([]));
  }, []);

  const params = useCallback((extra = {}) => {
    const p = { ...extra };
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filters]);

  useEffect(() => {
    if (!productId) return;
    let stale = false;
    setLoading(true);
    movementsAPI.getKardex(productId, params({ page, limit: PAGE_SIZE }))
      .then((r) => { if (!stale) setData(r.data); })
      .catch((e) => { if (!stale) toast.error(e.response?.data?.message || 'No se pudo cargar el kardex'); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [productId, page, params]);

  const setFilter = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await movementsAPI.getKardex(productId, params({ page: 1, limit: 1000 }));
      await exportKardexToExcel(r.data, { ...filters, warehouse_name: warehouses.find((w) => w.id === filters.warehouse_id)?.name });
    } catch {
      toast.error('No se pudo exportar el kardex');
    } finally {
      setExporting(false);
    }
  };

  if (!productId) return null;
  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const product = data?.product || {};
  const sales = data?.sales || {};
  const summary = data?.summary || {};
  const movements = data?.movements || [];
  const inputCls = 'border border-gray-300 rounded-md px-2 py-1.5 text-sm';
  const lowMargin = product.current_margin_pct !== null && product.configured_margin_pct !== null
    && product.current_margin_pct < product.configured_margin_pct - 0.5;

  return (
    <div className="space-y-4">
      {/* Datos del producto para decidir */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Stock actual" value={fmtQty(product.current_stock)} sub={`Valor ${formatCurrency(product.inventory_value || 0)}`} tone="text-blue-700" />
        <Stat label="Costo promedio" value={formatCurrency(product.average_cost || 0)} />
        <Stat label="Último costo" value={formatCurrency(product.last_purchase_cost || 0)}
          sub={product.last_purchase_date ? `Compra ${fmtDate(product.last_purchase_date)} · ${ago(product.days_since_last_purchase)}` : 'Sin compras registradas'} />
        <Stat label="Precio de venta" value={formatCurrency(product.sale_price || 0)} sub={product.price_includes_tax ? 'IVA incluido' : 'Antes de IVA'} />
        <Stat label="Utilidad actual"
          value={fmtPct(product.current_margin_pct)}
          tone={lowMargin ? 'text-red-600' : 'text-gray-900'}
          sub={`Configurada ${fmtPct(product.configured_margin_pct)} · ${product.margin_method === 'markup' ? 'sobre costo' : 'sobre venta'}`} />
        <Stat label="Última venta"
          value={sales.last_sale ? fmtDate(sales.last_sale.sale_date) : 'Nunca'}
          tone={sales.last_sale?.days_ago > 90 ? 'text-amber-600' : 'text-gray-900'}
          sub={sales.last_sale ? `${sales.last_sale.sale_number} · ${ago(sales.last_sale.days_ago)}` : ''} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-600">Desde
          <input type="date" className={`${inputCls} block mt-0.5`} value={filters.start_date} onChange={(e) => setFilter('start_date', e.target.value)} />
        </label>
        <label className="text-xs text-gray-600">Hasta
          <input type="date" className={`${inputCls} block mt-0.5`} value={filters.end_date} onChange={(e) => setFilter('end_date', e.target.value)} />
        </label>
        {warehouses.length > 1 && (
          <label className="text-xs text-gray-600">Bodega
            <select className={`${inputCls} block mt-0.5`} value={filters.warehouse_id} onChange={(e) => setFilter('warehouse_id', e.target.value)}>
              <option value="">Todas</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
        )}
        <button type="button" onClick={handleExport} disabled={exporting || !movements.length}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Excel
        </button>
      </div>

      {/* Resumen del periodo */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <Stat label="Saldo inicial" value={fmtQty(summary.opening_qty)} sub={formatCurrency(summary.opening_value || 0)} />
        <Stat label="Entradas" value={fmtQty(summary.total_entradas)} sub={formatCurrency(summary.valor_entradas || 0)} tone="text-green-700" />
        <Stat label="Salidas" value={fmtQty(summary.total_salidas)} sub={formatCurrency(summary.valor_salidas || 0)} tone="text-red-600" />
        <Stat label="Saldo final" value={fmtQty(summary.closing_qty)} sub={formatCurrency(summary.closing_value || 0)} tone="text-blue-700" />
        <Stat label="Unidades vendidas" value={fmtQty(sales.qty_sold)} sub={`${sales.sales_count || 0} venta(s)`} />
        <Stat label="Ventas (sin IVA)" value={formatCurrency(sales.revenue || 0)} sub={`Costo ${formatCurrency(sales.cost || 0)}`} />
        <Stat label="Utilidad realizada" value={formatCurrency(sales.profit || 0)} sub={fmtPct(sales.realized_margin_pct)}
          tone={(sales.profit || 0) < 0 ? 'text-red-600' : 'text-green-700'} />
      </div>

      {/* Movimientos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {movements.length === 0 ? (
          <div className="text-center py-10">
            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">Sin movimientos en este rango</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Movimiento</th>
                  {!compact && <th className="px-3 py-2 text-left">Bodega</th>}
                  <th className="px-3 py-2 text-right">Entrada</th>
                  <th className="px-3 py-2 text-right">Salida</th>
                  <th className="px-3 py-2 text-right">Costo unit.</th>
                  <th className="px-3 py-2 text-right">Valor mov.</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-right">Saldo valor</th>
                  {!compact && <th className="px-3 py-2 text-right">Costo prom.</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtDate(m.movement_date)}</td>
                    <td className="px-3 py-2">
                      <div className="text-gray-800">{getMovementReasonLabel(m.movement_reason)}</div>
                      <div className="text-xs text-gray-400">{m.movement_number}</div>
                    </td>
                    {!compact && <td className="px-3 py-2 text-gray-600">{m.warehouse?.name || '—'}</td>}
                    <td className="px-3 py-2 text-right text-green-700">{m.direction === 'in' ? fmtQty(m.quantity) : ''}</td>
                    <td className="px-3 py-2 text-right text-red-600">{m.direction === 'out' ? fmtQty(m.quantity) : ''}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(Number(m.unit_cost) || 0)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(Number(m.total_cost) || 0)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmtQty(m.balance_qty)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(m.balance_value || 0)}</td>
                    {!compact && <td className="px-3 py-2 text-right text-gray-600">{m.balance_avg_cost !== null ? formatCurrency(m.balance_avg_cost) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.pagination?.pages > 1 && (
          <Pagination
            className="px-4 py-3 border-t border-gray-100"
            currentPage={page}
            totalPages={data.pagination.pages}
            totalItems={data.pagination.total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
