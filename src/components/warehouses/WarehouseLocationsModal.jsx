import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { warehouseLocationsService } from '../../api/warehouseLocations';
import { usePermissions } from '../../store/tenantPermissionsStore';

// Ubicaciones físicas de una bodega (pasillo / estante / nivel), req. 2.2.
// El stock sigue siendo uno solo por producto: la ubicación dice dónde se guarda.
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent';
const errMsg = (e) => e.response?.data?.message || e.message;

const WarehouseLocationsModal = ({ warehouse, onClose }) => {
  const can = usePermissions();
  const canCreate = can('inventory.locations.create');
  const canEdit = can('inventory.locations.edit');
  const canDelete = can('inventory.locations.delete');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [single, setSingle] = useState({ aisle: '', shelf: '', level: '', description: '' });
  const [bulk, setBulk] = useState({ aisles: '', shelves: '', levels: '' });
  const [editing, setEditing] = useState(null); // { id, code, description, is_active }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseLocationsService.getAll({ warehouse_id: warehouse.id, search: search || undefined, limit: 500 });
      setRows(res.data || []);
    } catch (e) {
      toast.error('Error: ' + errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [warehouse.id, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res?.message || okMsg);
      await load();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createSingle = async () => {
    const ok = await run(() => warehouseLocationsService.create({ warehouse_id: warehouse.id, ...single }), 'Ubicación creada');
    if (ok) setSingle({ aisle: '', shelf: '', level: '', description: '' });
  };

  const createBulk = async () => {
    const aisles = bulk.aisles.split(',').map((s) => s.trim()).filter(Boolean);
    const ok = await run(() => warehouseLocationsService.bulkCreate({
      warehouse_id: warehouse.id,
      aisles,
      shelves: bulk.shelves ? parseInt(bulk.shelves, 10) : 0,
      levels: bulk.levels ? parseInt(bulk.levels, 10) : 0,
    }), 'Ubicaciones creadas');
    if (ok) setBulk({ aisles: '', shelves: '', levels: '' });
  };

  const saveEdit = async () => {
    const ok = await run(() => warehouseLocationsService.update(editing.id, {
      code: editing.code, description: editing.description, is_active: editing.is_active,
    }), 'Ubicación actualizada');
    if (ok) setEditing(null);
  };

  const remove = async (loc) => {
    const msg = loc.product_count
      ? `${loc.code} tiene ${loc.product_count} producto(s): quedarán sin ubicación. ¿Eliminarla?`
      : `¿Eliminar la ubicación ${loc.code}?`;
    if (!window.confirm(msg)) return;
    await run(() => warehouseLocationsService.remove(loc.id), 'Ubicación eliminada');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ubicaciones — {warehouse.name}</h2>
            <p className="text-xs text-gray-500">Pasillo / estante / nivel donde se guarda cada producto. No reparte el stock: es un solo total por producto.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Cerrar">×</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-5">
          {canCreate && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-700">Nueva ubicación</p>
                <div className="grid grid-cols-3 gap-2">
                  <input className={inputCls} placeholder="Pasillo" value={single.aisle} onChange={(e) => setSingle({ ...single, aisle: e.target.value })} />
                  <input className={inputCls} placeholder="Estante" value={single.shelf} onChange={(e) => setSingle({ ...single, shelf: e.target.value })} />
                  <input className={inputCls} placeholder="Nivel" value={single.level} onChange={(e) => setSingle({ ...single, level: e.target.value })} />
                </div>
                <input className={inputCls} placeholder="Descripción (opcional)" value={single.description} onChange={(e) => setSingle({ ...single, description: e.target.value })} />
                <button disabled={busy} onClick={createSingle} className="px-3 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Crear</button>
              </div>
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-gray-700">Crear varias a la vez</p>
                <input className={inputCls} placeholder="Pasillos separados por coma: A, B, C" value={bulk.aisles} onChange={(e) => setBulk({ ...bulk, aisles: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} type="number" min="0" placeholder="Estantes por pasillo" value={bulk.shelves} onChange={(e) => setBulk({ ...bulk, shelves: e.target.value })} />
                  <input className={inputCls} type="number" min="0" placeholder="Niveles por estante" value={bulk.levels} onChange={(e) => setBulk({ ...bulk, levels: e.target.value })} />
                </div>
                <p className="text-xs text-gray-500">Ej.: A, B con 3 estantes y 2 niveles crea A-01-1 … B-03-2 (máx. 500; las que ya existen se omiten).</p>
                <button disabled={busy || !bulk.aisles.trim()} onClick={createBulk} className="px-3 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Generar</button>
              </div>
            </div>
          )}

          <div>
            <input className={inputCls} placeholder="Buscar ubicación…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">Esta bodega aún no tiene ubicaciones.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2">Código</th><th>Descripción</th><th className="text-right">Productos</th><th>Estado</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    {editing?.id === l.id ? (
                      <>
                        <td className="py-2 pr-2"><input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></td>
                        <td className="pr-2"><input className={inputCls} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></td>
                        <td className="text-right">{l.product_count}</td>
                        <td><label className="text-xs"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Activa</label></td>
                        <td className="text-right whitespace-nowrap">
                          <button disabled={busy} onClick={saveEdit} className="text-pink-600 text-xs font-semibold mr-2">Guardar</button>
                          <button onClick={() => setEditing(null)} className="text-gray-500 text-xs">Cancelar</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 font-mono font-semibold">{l.code}</td>
                        <td className="text-gray-600">{l.description || '—'}</td>
                        <td className="text-right">{l.product_count}</td>
                        <td>{l.is_active ? <span className="text-green-700 text-xs">Activa</span> : <span className="text-gray-400 text-xs">Inactiva</span>}</td>
                        <td className="text-right whitespace-nowrap">
                          {canEdit && <button onClick={() => setEditing({ id: l.id, code: l.code, description: l.description, is_active: l.is_active })} className="text-gray-500 hover:text-pink-600 text-xs mr-3">Editar</button>}
                          {canDelete && <button onClick={() => remove(l)} className="text-gray-500 hover:text-red-600 text-xs">Eliminar</button>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehouseLocationsModal;
