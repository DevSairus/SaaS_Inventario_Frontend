import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ClipboardList, Download, PackageCheck, ShoppingCart, Trash2, Truck, Unlock, Upload } from 'lucide-react';
import Modal from '../common/Modal';
import ProductSearchInput from '../common/ProductSearchInput';
import BomImportModal from './BomImportModal';
import { warehousesService } from '../../api/warehouses';
import { downloadProjectBomTemplate } from '../../utils/excelExport';
import {
  getProjectBom, reserveProjectBom, releaseProjectBom, orderProjectShortages, dispatchProjectBom,
  updateBomItem, deleteBomItem,
} from '../../api/projects';
import { qty } from './projectConstants';

const btn = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50';

function Stat({ label, value, tone = 'text-gray-900 dark:text-gray-100' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function DispatchModal({ isOpen, onClose, project, lines, onDone }) {
  const [warehouses, setWarehouses] = useState([]);
  const [from, setFrom] = useState('');
  const [quantities, setQuantities] = useState({});
  const [busy, setBusy] = useState(false);

  const candidates = lines.filter((l) => l.product_id && l.product?.track_inventory !== false && l.qty_required - l.qty_delivered > 0);

  useEffect(() => {
    if (!isOpen) return;
    setQuantities(Object.fromEntries(candidates.map((l) => [l.id, l.qty_reserved > 0 ? String(Math.min(l.qty_reserved, l.qty_required - l.qty_delivered)) : ''])));
    warehousesService.getAll().then((r) => {
      const list = (r.data || []).filter((w) => w.id !== project.warehouse_id && !w.project_id);
      setWarehouses(list);
      setFrom((prev) => prev || list.find((w) => w.is_main)?.id || list[0]?.id || '');
    }).catch(() => setWarehouses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const items = candidates
    .map((l) => ({ item_id: l.id, quantity: Number(quantities[l.id]) || 0 }))
    .filter((i) => i.quantity > 0);

  const submit = async () => {
    if (!from) { toast('Elige la bodega de origen'); return; }
    if (!items.length) { toast('Indica al menos una cantidad'); return; }
    setBusy(true);
    try {
      const res = await dispatchProjectBom(project.id, { from_warehouse_id: from, items });
      toast.success(res.message);
      onDone?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo despachar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Despachar materiales a la obra" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Se crea un traslado <strong>en tránsito</strong> hacia la bodega del proyecto. Cuando el material llegue, recíbelo desde Traslados:
          a partir de ahí cuenta como costo de materiales de la obra.
        </p>
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bodega de origen</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800">
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}{w.branch?.name ? ` · ${w.branch.name}` : ''}</option>)}
          </select>
        </div>
        {candidates.length === 0 ? (
          <p className="text-sm text-gray-500">No hay líneas pendientes de despacho.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[45vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Pendiente</th>
                  <th className="px-3 py-2 text-right">Reservado</th>
                  <th className="px-3 py-2 text-right">A despachar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {candidates.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.product?.name} <span className="text-xs text-gray-500">{l.product?.sku}</span></td>
                    <td className="px-3 py-2 text-right">{qty(l.qty_required - l.qty_delivered)}</td>
                    <td className="px-3 py-2 text-right">{qty(l.qty_reserved)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number" min="0" step="any" max={l.qty_required - l.qty_delivered}
                        value={quantities[l.id] ?? ''}
                        onChange={(e) => setQuantities((q) => ({ ...q, [l.id]: e.target.value }))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-right bg-white dark:bg-gray-800"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button onClick={submit} disabled={busy || !items.length} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Despachando...' : `Despachar ${items.length} línea(s)`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LineRow({ line, project, canManage, onChanged }) {
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState(String(line.qty_required));
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const p = line.product;
  const locked = line.qty_dispatched > 0 || line.qty_ordered > 0;

  const save = async (data) => {
    try {
      await updateBomItem(project.id, line.id, data);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar la línea');
    }
  };
  const remove = async () => {
    if (!window.confirm(`¿Eliminar la línea ${line.line_no}?`)) return;
    try {
      await deleteBomItem(project.id, line.id);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar la línea');
    }
  };

  const short = line.qty_shortage > 0;
  return (
    <tr className="align-top">
      <td className="px-3 py-2 text-gray-400">{line.line_no}</td>
      <td className="px-3 py-2 min-w-[220px]">
        {p ? (
          <>
            <p className="text-gray-900 dark:text-gray-100">{p.name}</p>
            <p className="text-xs text-gray-500">{p.sku}{line.input_code && line.input_code !== p.sku ? ` · Excel: ${line.input_code}` : ''}</p>
          </>
        ) : (
          <>
            <p className="text-gray-800 dark:text-gray-200">{line.input_description || line.input_code}</p>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[11px] rounded bg-red-100 text-red-700">Sin producto del catálogo</span>
          </>
        )}
        {canManage && !locked && line.qty_reserved === 0 && (
          picking ? (
            <div className="mt-1 max-w-xs">
              <ProductSearchInput value={search} onChange={setSearch} onSelect={(prod) => { setPicking(false); save({ product_id: prod.id }); }} onClear={() => { setSearch(''); setPicking(false); }} autoFocus />
            </div>
          ) : (
            <button onClick={() => setPicking(true)} className="block mt-0.5 text-xs text-orange-600 hover:underline">{p ? 'Cambiar producto' : 'Enlazar a producto'}</button>
          )
        )}
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {editingQty ? (
          <span className="inline-flex gap-1">
            <input type="number" min="0" step="any" value={qtyValue} onChange={(e) => setQtyValue(e.target.value)} className="w-20 px-1 py-0.5 border border-gray-300 rounded text-right bg-white dark:bg-gray-800" autoFocus />
            <button onClick={() => { setEditingQty(false); save({ qty_required: Number(qtyValue) }); }} className="text-xs text-orange-600">OK</button>
          </span>
        ) : (
          <button disabled={!canManage} onClick={() => setEditingQty(true)} className={canManage ? 'hover:underline' : ''}>
            {qty(line.qty_required)} {line.unit && <span className="text-xs text-gray-500">{line.unit}</span>}
          </button>
        )}
      </td>
      <td className={`px-3 py-2 text-right ${p && p.available < line.qty_required - line.qty_delivered - line.qty_reserved ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>{p ? qty(p.available) : '—'}</td>
      <td className="px-3 py-2 text-right text-indigo-700 dark:text-indigo-300">{line.qty_reserved ? qty(line.qty_reserved) : '—'}</td>
      <td className="px-3 py-2 text-right">{line.qty_dispatched ? qty(line.qty_dispatched) : '—'}</td>
      <td className="px-3 py-2 text-right hidden lg:table-cell">{line.qty_on_site ? qty(line.qty_on_site) : '—'}</td>
      <td className="px-3 py-2 text-right">{line.qty_ordered ? qty(line.qty_ordered) : '—'}</td>
      <td className={`px-3 py-2 text-right font-medium ${short ? 'text-red-600' : 'text-green-700'}`}>{short ? qty(line.qty_shortage) : '✓'}</td>
      <td className="px-3 py-2 hidden xl:table-cell text-xs text-gray-600">{line.supplier?.name || '—'}</td>
      <td className="px-3 py-2 text-right">
        {canManage && !locked && (
          <button onClick={remove} title="Eliminar línea" className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
        )}
      </td>
    </tr>
  );
}

/**
 * Lista de materiales del proyecto: cargar desde Excel, reservar lo
 * disponible, pedir faltantes y despachar a la bodega de la obra.
 */
export default function BomTab({ project, canManage, canStock, onChanged }) {
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProjectBom(project.id);
      setBom(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar la lista de materiales');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); onChanged?.(); };
  const finished = ['completed', 'closed', 'cancelled'].includes(project.status);
  const closed = ['closed', 'cancelled'].includes(project.status);

  const run = async (fn, after) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res.message);
      after?.(res.data);
      refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !bom) {
    return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  }

  const lines = bom?.lines || [];
  const s = bom?.summary || {};
  const locked = lines.some((l) => l.qty_dispatched > 0 || l.qty_ordered > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canManage && !closed && (
          <button onClick={() => setShowImport(true)} className={`${btn} bg-orange-600 text-white hover:bg-orange-700`}>
            <Upload className="w-4 h-4" /> {lines.length ? 'Cargar más desde Excel' : 'Cargar desde Excel'}
          </button>
        )}
        {canManage && !closed && (
          <button onClick={() => downloadProjectBomTemplate(project.code)} className={`${btn} text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20`}>
            <Download className="w-4 h-4" /> Plantilla Excel
          </button>
        )}
        {canStock && !finished && lines.length > 0 && (
          <>
            <button disabled={busy} onClick={() => run(() => reserveProjectBom(project.id))} className={`${btn} border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>
              <PackageCheck className="w-4 h-4" /> Reservar disponible
            </button>
            <button disabled={busy || !s.qty_shortage} onClick={() => run(() => orderProjectShortages(project.id), setOrderResult)} className={`${btn} border border-gray-300 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50`}>
              <ShoppingCart className="w-4 h-4" /> Pedir faltantes
            </button>
            <button
              disabled={busy || !project.warehouse_id}
              title={project.warehouse_id ? '' : 'Crea primero la bodega del proyecto (pestaña Resumen)'}
              onClick={() => setShowDispatch(true)}
              className={`${btn} border border-gray-300 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50`}
            >
              <Truck className="w-4 h-4" /> Despachar a la obra
            </button>
            {s.qty_reserved > 0 && (
              <button disabled={busy} onClick={() => window.confirm('¿Liberar todas las reservas de este proyecto?') && run(() => releaseProjectBom(project.id))} className={`${btn} text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                <Unlock className="w-4 h-4" /> Liberar reservas
              </button>
            )}
          </>
        )}
      </div>

      {orderResult && (
        <div className="text-sm bg-green-50 border border-green-200 text-green-900 rounded-lg px-4 py-3">
          {orderResult.lists.length > 0 && (
            <p>
              Pedidos a proveedor:{' '}
              {orderResult.lists.map((l, i) => (
                <span key={l.id}>{i > 0 && ', '}<Link to={`/order-lists/${l.id}`} className="font-medium text-orange-700 hover:underline">{l.list_number}</Link> ({l.lines} línea(s))</span>
              ))}
              . Desde cada pedido puedes enviarlo al proveedor y crear la compra (queda del proyecto y se recibe en su bodega).
            </p>
          )}
          {orderResult.without_supplier.length > 0 && (
            <p className="text-amber-800 mt-1">
              Sin proveedor conocido (líneas {orderResult.without_supplier.map((l) => l.line_no).join(', ')}): anótalas desde la ficha del producto o en Pedidos a proveedores.
            </p>
          )}
          <button onClick={() => setOrderResult(null)} className="text-xs text-gray-500 hover:underline mt-1">Cerrar</button>
        </div>
      )}

      {lines.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Este proyecto aún no tiene lista de materiales.</p>
          {canManage && <p className="text-sm mt-1">Copia las filas desde Excel y pégalas con "Cargar desde Excel".</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Líneas" value={`${s.lines_complete}/${s.lines}`} />
            <Stat label="Reservado" value={qty(s.qty_reserved)} tone="text-indigo-700 dark:text-indigo-300" />
            <Stat label="Entregado a la obra" value={qty(s.qty_delivered)} />
            <Stat label="En pedidos" value={qty(s.qty_ordered)} />
            <Stat label="Faltante" value={qty(s.qty_shortage)} tone={s.qty_shortage > 0 ? 'text-red-600' : 'text-green-700'} />
          </div>
          {s.unmatched > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {s.unmatched} línea(s) sin producto del catálogo: enlázalas para poder reservarlas, pedirlas o despacharlas.
            </p>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Requerido</th>
                  <th className="px-3 py-2 text-right" title="Stock menos lo comprometido por otros documentos y proyectos">Disponible</th>
                  <th className="px-3 py-2 text-right">Reservado</th>
                  <th className="px-3 py-2 text-right">Despachado</th>
                  <th className="px-3 py-2 text-right hidden lg:table-cell">En obra</th>
                  <th className="px-3 py-2 text-right">Pedido</th>
                  <th className="px-3 py-2 text-right">Faltante</th>
                  <th className="px-3 py-2 hidden xl:table-cell">Proveedor</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lines.map((l) => <LineRow key={l.id} line={l} project={project} canManage={canManage && !closed} onChanged={refresh} />)}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Reservado: apartado del stock para esta obra (las ventas y OT lo ven como comprometido). Entregado = lo despachado desde aquí o lo que ya está en la bodega de la obra (también si llegó por un traslado o una compra), lo que sea mayor. Faltante = requerido − entregado − reservado − pedido.
          </p>
        </>
      )}

      <BomImportModal isOpen={showImport} onClose={() => setShowImport(false)} project={project} hasLines={lines.length > 0} locked={locked} onSaved={refresh} />
      <DispatchModal isOpen={showDispatch} onClose={() => setShowDispatch(false)} project={project} lines={lines} onDone={refresh} />
    </div>
  );
}
