import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { getProductPriceHistory, COST_SOURCE_LABELS } from '../../api/priceAdjustments';

// Pestaña "Precios" de la ficha del producto: ajustes de precio de venta (AJP-)
// que lo incluyeron, con motivo, usuario y costo de referencia.

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const userName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || '—';
const money = (v) => (v === null || v === undefined ? '—' : formatCurrency(Number(v), { decimals: 2 }));
const marginTxt = (v) => (v === null || v === undefined ? 'sin margen' : `${Number(v).toLocaleString('es-CO')} %`);

export default function PriceHistorySection({ productId, refreshKey = 0 }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    getProductPriceHistory(productId)
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]));
  }, [productId, refreshKey]);

  if (rows === null) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Ajustes de precio</h3>
        <p className="text-xs text-gray-500">
          Cambios del precio de venta (y del margen) hechos con <strong>Ajustar precio</strong>. Los cambios por compras o por márgenes se ven en la compra o en Márgenes de ganancia.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">Este producto no tiene ajustes de precio.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Ajuste</th>
                <th className="px-4 py-2 text-right">Precio anterior</th>
                <th className="px-4 py-2 text-right">Precio nuevo</th>
                <th className="px-4 py-2 text-right">Costo de referencia</th>
                <th className="px-4 py-2 text-right">Margen</th>
                <th className="px-4 py-2">Motivo</th>
                <th className="px-4 py-2">Hecho por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">{fmtDateTime(r.created_at)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Link to={`/price-adjustments?id=${r.adjustment?.id}`} className="text-blue-600 hover:underline">{r.adjustment?.adjustment_number}</Link>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">{money(r.previous_price)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap font-semibold">{money(r.new_price)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {money(r.reference_cost)}
                    {r.cost_source && <div className="text-xs text-gray-500">{COST_SOURCE_LABELS[r.cost_source]}</div>}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {r.margin_changed
                      ? <span className="font-semibold text-amber-700">{marginTxt(r.previous_margin_pct)} → {marginTxt(r.margin_pct)}</span>
                      : (r.margin_pct !== null ? marginTxt(r.margin_pct) : '—')}
                  </td>
                  <td className="px-4 py-2">{r.adjustment?.reason}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">{userName(r.adjustment?.creator)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
