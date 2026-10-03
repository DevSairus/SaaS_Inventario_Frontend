// frontend/src/components/products/SuppliersSection.jsx
//
// Pestaña "Proveedores" de la ficha del producto: comparativo de quién lo
// vende y a qué precio, armado desde el historial real de compras
// (GET /products/:id/suppliers?detail=1). Mismo propósito que el modal de
// proveedores de la alerta de stock — decidir a quién comprar — con más
// contexto: tendencia, mínimo, promedio e historial por proveedor.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ShoppingCart, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI } from '../../api/products';

const COP = (n) =>
  n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
};

const daysAgo = (value) => {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

export default function SuppliersSection({ product }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productsAPI.getSuppliersDetail(product.id)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) { toast.error('No se pudieron cargar los proveedores'); setData({ suppliers: [], summary: {} }); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [product.id]);

  const createPurchaseOrder = (s) => {
    navigate('/purchases/new', {
      state: {
        prefilledData: {
          supplier_id: s.id,
          supplier_name: s.business_name || s.name,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            current_stock: product.current_stock,
            min_stock: product.min_stock,
            last_price: s.last_unit_cost || s.last_price || 0,
          },
          suggested_quantity: Math.max((Number(product.min_stock) || 0) - (Number(product.current_stock) || 0), 1),
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const suppliers = data?.suppliers || [];
  const summary = data?.summary || {};

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center py-8">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin proveedores registrados</p>
          <p className="text-sm text-gray-400 mt-1">
            Aparecerán aquí cuando registres una compra de este producto (o lo importes desde una factura).
          </p>
        </div>
      </div>
    );
  }

  const best = suppliers.find((s) => s.is_best_price);
  const lastSupplier = suppliers.find((s) => s.id === summary.last_purchase?.supplier_id);

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase">Proveedores</p>
          <p className="text-lg font-bold text-gray-900">{summary.suppliers_count ?? suppliers.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Mejor precio</p>
          <p className="text-lg font-bold text-green-700">{COP(summary.best_price)}</p>
          {best && <p className="text-xs text-gray-500 truncate">{best.business_name || best.name}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Última compra</p>
          <p className="text-lg font-bold text-gray-900">{COP(summary.last_purchase?.price)}</p>
          {lastSupplier && (
            <p className="text-xs text-gray-500 truncate">
              {lastSupplier.business_name || lastSupplier.name} · {fmtDate(summary.last_purchase?.date)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Costo promedio actual</p>
          <p className="text-lg font-bold text-gray-900">{COP(summary.current_cost)}</p>
          {summary.current_cost && summary.best_price && summary.best_price < summary.current_cost && (
            <p className="text-xs text-green-700">
              Mejor precio {Math.round(((summary.current_cost - summary.best_price) / summary.current_cost) * 100)}% bajo el costo
            </p>
          )}
        </div>
      </div>

      {/* Comparativo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-right">Último precio</th>
                <th className="px-4 py-3 text-right">Tendencia</th>
                <th className="px-4 py-3 text-left">Última compra</th>
                <th className="px-4 py-3 text-right">Mín. / Prom.</th>
                <th className="px-4 py-3 text-center">Compras</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map((s) => {
                const ago = daysAgo(s.last_purchase_date);
                const isOpen = expanded === s.id;
                return [
                  <tr key={s.id} className={s.is_best_price ? 'bg-green-50/60' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${s.is_active === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {s.business_name || s.name}
                        </span>
                        {s.is_best_price && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">
                            <Award className="w-3 h-3" /> Mejor precio
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {[s.supplier_code && `Cód. proveedor: ${s.supplier_code}`, s.phone, s.contact_name].filter(Boolean).join(' · ') || ' '}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{COP(s.last_price)}</div>
                      {s.last_discount_percentage > 0 && (
                        <div className="text-[11px] text-gray-400">{COP(s.last_unit_cost)} − {s.last_discount_percentage}%</div>
                      )}
                      {s.diff_vs_best_pct > 0 && <div className="text-[11px] text-orange-600">+{s.diff_vs_best_pct}% vs mejor</div>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {s.price_change_pct === null || s.price_change_pct === undefined ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : s.price_change_pct === 0 ? (
                        <span className="text-xs text-gray-500">Sin cambio</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.price_change_pct > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {s.price_change_pct > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {s.price_change_pct > 0 ? '+' : ''}{s.price_change_pct}%
                        </span>
                      )}
                      {s.previous_price ? <div className="text-[11px] text-gray-400">antes {COP(s.previous_price)}</div> : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{fmtDate(s.last_purchase_date)}</div>
                      <div className="text-[11px] text-gray-400">
                        {ago !== null && (ago === 0 ? 'hoy' : `hace ${ago} día(s)`)}
                        {s.last_purchase_number && (
                          <button onClick={() => navigate(`/purchases/${s.last_purchase_id}`)} className="ml-1 text-blue-600 hover:underline">
                            {s.last_purchase_number}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-xs text-gray-600">
                      <div>{COP(s.min_price)}</div>
                      <div className="text-gray-400">{COP(s.avg_price)}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {s.purchases_count || 0}
                      {s.total_quantity > 0 && <div className="text-[11px] text-gray-400">{s.total_quantity} und.</div>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {s.is_active !== false && (
                          <button
                            onClick={() => createPurchaseOrder(s)}
                            title="Crear orden de compra a este proveedor"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        )}
                        {s.history?.length > 0 && (
                          <button onClick={() => setExpanded(isOpen ? null : s.id)} title="Historial de compras" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>,
                  isOpen && (
                    <tr key={`${s.id}-history`} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Últimas compras a este proveedor</div>
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 pr-3">Fecha</th>
                              <th className="text-left py-1 pr-3">Compra</th>
                              <th className="text-left py-1 pr-3">Factura</th>
                              <th className="text-right py-1 pr-3">Cant.</th>
                              <th className="text-right py-1 pr-3">Costo unit.</th>
                              <th className="text-right py-1 pr-3">Desc.</th>
                              <th className="text-right py-1">Neto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.history.map((h) => (
                              <tr key={h.purchase_id + h.unit_cost} className="border-t border-gray-200">
                                <td className="py-1 pr-3">{fmtDate(h.purchase_date)}</td>
                                <td className="py-1 pr-3">
                                  <button onClick={() => navigate(`/purchases/${h.purchase_id}`)} className="text-blue-600 hover:underline">{h.purchase_number}</button>
                                  {h.status === 'confirmed' && <span className="ml-1 text-gray-400">(sin recibir)</span>}
                                </td>
                                <td className="py-1 pr-3 text-gray-500">{h.invoice_number || '—'}</td>
                                <td className="py-1 pr-3 text-right">{h.quantity}</td>
                                <td className="py-1 pr-3 text-right">{COP(h.unit_cost)}</td>
                                <td className="py-1 pr-3 text-right">{h.discount_percentage ? `${h.discount_percentage}%` : '—'}</td>
                                <td className="py-1 text-right font-medium">{COP(h.net_cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100">
          Precios sin IVA, con el descuento de línea aplicado. Se toman de compras confirmadas o recibidas.
        </p>
      </div>
    </div>
  );
}
