import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { warehousesService } from '../../api/warehouses';
import { getProjectSiteStock, returnProjectSurplus } from '../../api/projects';
import { formatCurrency } from '../../utils/formatters';
import { qty } from './projectConstants';

/**
 * Reintegro del sobrante: lo que está en la bodega de la obra vuelve a otra
 * bodega en un traslado, sin volver a buscar los productos.
 */
export default function ReturnSurplusModal({ isOpen, onClose, project, onDone }) {
  const [stock, setStock] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [to, setTo] = useState('');
  const [quantities, setQuantities] = useState({});
  const [receiveNow, setReceiveNow] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStock(null);
    getProjectSiteStock(project.id)
      .then((r) => {
        setStock(r.data || []);
        setQuantities(Object.fromEntries((r.data || []).map((s) => [s.product_id, String(s.quantity)])));
      })
      .catch((e) => { toast.error(e.response?.data?.message || 'No se pudo leer la bodega de la obra'); setStock([]); });
    warehousesService.getAll().then((r) => {
      const list = (r.data || []).filter((w) => w.id !== project.warehouse_id && !w.project_id);
      setWarehouses(list);
      setTo((prev) => prev || list.find((w) => w.is_main)?.id || list[0]?.id || '');
    }).catch(() => setWarehouses([]));
  }, [isOpen, project.id, project.warehouse_id]);

  const items = (stock || [])
    .map((s) => ({ product_id: s.product_id, quantity: Number(quantities[s.product_id]) || 0, max: s.quantity }))
    .filter((i) => i.quantity > 0);
  const tooMuch = items.find((i) => i.quantity > i.max + 0.00005);
  const showValue = (stock || []).some((s) => s.value !== null && s.value !== undefined);

  const submit = async () => {
    if (!to) { toast('Elige la bodega de destino'); return; }
    if (!items.length) { toast('Indica al menos una cantidad'); return; }
    if (tooMuch) { toast('Hay cantidades mayores a lo que está en la obra'); return; }
    setBusy(true);
    try {
      const res = await returnProjectSurplus(project.id, {
        to_warehouse_id: to,
        receive_now: receiveNow,
        items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
      });
      toast.success(res.message);
      onDone?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo reintegrar el sobrante');
    } finally {
      setBusy(false);
    }
  };

  const setAll = (full) => setQuantities(Object.fromEntries((stock || []).map((s) => [s.product_id, full ? String(s.quantity) : ''])));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reintegrar sobrante · ${project.code}`} size="lg">
      {stock === null ? (
        <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
      ) : stock.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">La bodega de la obra está vacía: no hay nada para reintegrar.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Esto es lo que hay hoy en la bodega del proyecto. Deja la cantidad que vuelve; lo que se quedó instalado en la obra regístralo como{' '}
            <Link to="/inventory/internal-consumptions" className="text-orange-600 hover:underline">consumo interno</Link> desde esa bodega.
            El reintegro descuenta el costo de materiales del proyecto.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[240px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vuelve a la bodega</label>
              <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800">
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}{w.branch?.name ? ` · ${w.branch.name}` : ''}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2">
              <input type="checkbox" checked={receiveNow} onChange={(e) => setReceiveNow(e.target.checked)} />
              El material ya llegó (recibir de una vez)
            </label>
          </div>
          <div className="flex gap-3 text-xs">
            <button onClick={() => setAll(true)} className="text-orange-600 hover:underline">Todo</button>
            <button onClick={() => setAll(false)} className="text-gray-500 hover:underline">Nada</button>
          </div>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[45vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">En la obra</th>
                  {showValue && <th className="px-3 py-2 text-right">Valor</th>}
                  <th className="px-3 py-2 text-right">Reintegrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {stock.map((s) => {
                  const over = (Number(quantities[s.product_id]) || 0) > s.quantity + 0.00005;
                  return (
                    <tr key={s.product_id}>
                      <td className="px-3 py-2">{s.name} <span className="text-xs text-gray-500">{s.sku}</span></td>
                      <td className="px-3 py-2 text-right">{qty(s.quantity)}</td>
                      {showValue && <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(s.value)}</td>}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number" min="0" step="any" max={s.quantity}
                          value={quantities[s.product_id] ?? ''}
                          onChange={(e) => setQuantities((q) => ({ ...q, [s.product_id]: e.target.value }))}
                          className={`w-24 px-2 py-1 border rounded text-right bg-white dark:bg-gray-800 ${over ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button onClick={submit} disabled={busy || !items.length || Boolean(tooMuch)} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
              {busy ? 'Reintegrando...' : `Reintegrar ${items.length} producto(s)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
