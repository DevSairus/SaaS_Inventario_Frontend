// frontend/src/components/settings/WorkshopBaysSettings.jsx
// Configuración → Taller: bahías de cada sede y enlace de la pantalla del TV.
// Guarda al instante (no depende del botón "Guardar" de la configuración).
// Va dentro del <form> de TenantSettingsPage: todos los botones son
// type="button" y Enter en los campos no envía el formulario.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../common/Card';
import useBranchStore from '../../store/branchStore';
import { workshopBoardApi, BAY_KINDS, bayKindLabel } from '../../api/workshopBoard';

const apiMsg = (e, fallback) => e?.response?.data?.message || fallback;
const noSubmit = (fn) => (e) => { if (e.key === 'Enter') { e.preventDefault(); fn?.(); } };

export default function WorkshopBaysSettings({ canEdit }) {
  const { branches, activeBranchId } = useBranchStore();
  const [branchId, setBranchId] = useState(activeBranchId);
  const [bays, setBays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [display, setDisplay] = useState(null);
  const [form, setForm] = useState({ name: '', kind: 'elevador' });
  const [editing, setEditing] = useState(null); // { id, name, kind }
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!branchId && activeBranchId) setBranchId(activeBranchId); }, [activeBranchId, branchId]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [b, d] = await Promise.all([
        workshopBoardApi.listBays(branchId),
        canEdit ? workshopBoardApi.getDisplay(branchId) : Promise.resolve(null),
      ]);
      setBays(b.data.data || []);
      setDisplay(d?.data?.data || null);
    } catch (e) {
      toast.error(apiMsg(e, 'No se pudieron cargar las bahías'));
    } finally {
      setLoading(false);
    }
  }, [branchId, canEdit]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(apiMsg(e, 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  };

  const addBay = () => {
    const name = form.name.trim();
    if (!name) return toast.error('Escribe el nombre de la bahía');
    run(async () => {
      await workshopBoardApi.createBay({ branch_id: branchId, name, kind: form.kind });
      setForm((f) => ({ ...f, name: '' }));
    }, 'Bahía creada');
  };

  const saveEdit = () => run(async () => {
    await workshopBoardApi.updateBay(editing.id, { name: editing.name, kind: editing.kind });
    setEditing(null);
  }, 'Bahía actualizada');

  const move = (index, dir) => {
    const other = bays[index + dir];
    const bay = bays[index];
    if (!other) return;
    run(async () => {
      // Reasignar órdenes consecutivas evita empates con sort_order repetidos.
      const reordered = [...bays];
      reordered[index] = other;
      reordered[index + dir] = bay;
      await Promise.all(reordered.map((b, i) => (b.sort_order !== i + 1 ? workshopBoardApi.updateBay(b.id, { sort_order: i + 1 }) : null)));
    });
  };

  const displayUrl = display?.path ? `${window.location.origin}${display.path}` : null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(displayUrl); toast.success('Enlace copiado'); } catch { toast.error('No se pudo copiar'); }
  };

  return (
    <Card>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold mb-1">Bahías y pantalla de taller</h2>
            <p className="text-sm text-gray-500 max-w-2xl">
              Las bahías (elevadores, puestos) de cada sede forman el mapa de ocupación de Taller → Tablero del taller
              y de la pantalla del TV. Cada bahía tiene como máximo una OT; se asigna desde la orden de trabajo y se
              libera sola al entregar o cancelar. Los cambios aquí se guardan al instante.
            </p>
          </div>
          {branches.length > 1 && (
            <select
              value={branchId || ''}
              onChange={(e) => { setBranchId(e.target.value); setEditing(null); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {/* Bahías */}
        <div>
          <h3 className="font-medium text-gray-900 text-sm mb-2">Bahías de la sede</h3>
          {loading && !bays.length ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : (
            <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {bays.length === 0 && <p className="p-4 text-sm text-gray-500">Esta sede aún no tiene bahías.</p>}
              {bays.map((b, i) => (
                <div key={b.id} className={`flex flex-wrap items-center gap-3 p-3 ${b.is_active ? '' : 'bg-gray-50 opacity-70'}`}>
                  {editing?.id === b.id ? (
                    <>
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        onKeyDown={noSubmit(saveEdit)}
                        maxLength={60}
                        className="flex-1 min-w-[10rem] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                        autoFocus
                      />
                      <select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        {BAY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                      <button type="button" disabled={busy} onClick={saveEdit} className="text-sm font-medium text-blue-600 hover:underline">Guardar</button>
                      <button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:underline">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-[10rem]">
                        <span className="font-medium text-gray-900 text-sm">{b.name}</span>
                        <span className="ml-2 text-xs text-gray-500">{bayKindLabel(b.kind)}</span>
                        {!b.is_active && <span className="ml-2 text-xs text-gray-500">(desactivada)</span>}
                      </div>
                      {b.occupied_by
                        ? <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">Ocupada · {b.occupied_by.order_number}</span>
                        : <span className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">Libre</span>}
                      {canEdit && (
                        <div className="flex items-center gap-3 text-sm">
                          <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className="text-gray-500 disabled:opacity-30" title="Subir">↑</button>
                          <button type="button" disabled={busy || i === bays.length - 1} onClick={() => move(i, 1)} className="text-gray-500 disabled:opacity-30" title="Bajar">↓</button>
                          <button type="button" onClick={() => setEditing({ id: b.id, name: b.name, kind: b.kind })} className="text-blue-600 hover:underline">Editar</button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => workshopBoardApi.updateBay(b.id, { is_active: !b.is_active }), b.is_active ? 'Bahía desactivada' : 'Bahía activada')}
                            className="text-gray-600 hover:underline"
                          >
                            {b.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => window.confirm(`¿Eliminar la bahía "${b.name}"?`) && run(() => workshopBoardApi.deleteBay(b.id), 'Bahía eliminada')}
                            className="text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={noSubmit(addBay)}
                placeholder="Nombre (ej. Elevador 1)"
                maxLength={60}
                className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {BAY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <button type="button" disabled={busy || !branchId} onClick={addBay} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Agregar bahía
              </button>
            </div>
          )}
        </div>

        {/* Enlace del TV */}
        {canEdit && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900 text-sm">Pantalla del TV de esta sede</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              Enlace sin inicio de sesión para abrir en el navegador del TV, un Chromecast o un mini-PC. Muestra placa,
              vehículo, técnico, estado y bahía; no muestra datos del cliente ni valores. Quien tenga el enlace puede
              verlo: si se filtra, regenéralo (el anterior deja de funcionar).
            </p>
            {displayUrl ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="flex-1 min-w-[16rem] break-all rounded bg-white px-3 py-2 text-xs ring-1 ring-gray-200">{displayUrl}</code>
                  <button type="button" onClick={copy} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">Copiar</button>
                  <a href={displayUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">Abrir</a>
                </div>
                <div className="flex gap-4 text-sm">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm('Se generará un enlace nuevo y el actual dejará de funcionar en los TV donde esté abierto. ¿Continuar?')
                      && run(() => workshopBoardApi.regenerateDisplay(branchId), 'Enlace regenerado')}
                    className="text-blue-600 hover:underline"
                  >
                    Regenerar enlace
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => window.confirm('El enlace dejará de funcionar en los TV donde esté abierto. ¿Desactivar la pantalla?')
                      && run(() => workshopBoardApi.revokeDisplay(branchId), 'Pantalla desactivada')}
                    className="text-red-600 hover:underline"
                  >
                    Desactivar pantalla
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || !branchId}
                onClick={() => run(() => workshopBoardApi.regenerateDisplay(branchId), 'Enlace de pantalla creado')}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                Generar enlace de pantalla
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
