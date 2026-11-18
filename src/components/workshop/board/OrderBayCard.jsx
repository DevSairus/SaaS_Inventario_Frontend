// frontend/src/components/workshop/board/OrderBayCard.jsx
// Tarjeta "Bahía" del detalle de la OT: asigna, cambia o libera la bahía
// (PATCH /work-orders/:id/bay). Se puede también con la OT en "Listo", para
// sacar el carro del elevador mientras espera la entrega. Solo se ofrecen las
// bahías activas y libres de la sede activa.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import useBranchStore from '../../../store/branchStore';
import { workshopBoardApi, bayKindLabel } from '../../../api/workshopBoard';

const ACTIVE = ['recibido', 'en_proceso', 'en_espera', 'listo'];

export default function OrderBayCard({ order, onChanged }) {
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const [editing, setEditing] = useState(false);
  const [bays, setBays] = useState([]);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const canChange = ACTIVE.includes(order.status);

  useEffect(() => {
    if (!editing) return;
    workshopBoardApi.listBays(activeBranchId)
      .then((r) => setBays((r.data.data || []).filter((b) => b.is_active)))
      .catch(() => setBays([]));
  }, [editing, activeBranchId]);

  const save = async (bayId) => {
    setSaving(true);
    try {
      const r = await workshopBoardApi.setOrderBay(order.id, bayId);
      toast.success(r.data.message || 'Bahía actualizada');
      setEditing(false);
      await onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo asignar la bahía');
    } finally {
      setSaving(false);
    }
  };

  const options = bays.filter((b) => !b.occupied_by || b.occupied_by.id === order.id);
  const busyCount = bays.length - options.length;

  return (
    <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-blue-600" />
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Bahía</h2>
        </div>
        {canChange && !editing && (
          <div className="flex gap-3">
            {order.bay && (
              <button type="button" disabled={saving} onClick={() => save(null)} className="text-xs text-gray-500 font-medium hover:underline">
                Liberar
              </button>
            )}
            <button
              type="button"
              onClick={() => { setSelected(order.bay?.id || ''); setEditing(true); }}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              {order.bay ? 'Cambiar' : 'Asignar'}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg dark:bg-graphite-2 dark:border-white/10"
          >
            <option value="">Sin bahía</option>
            {options.map((b) => <option key={b.id} value={b.id}>{b.name} · {bayKindLabel(b.kind)}</option>)}
          </select>
          {bays.length === 0 && (
            <p className="text-xs text-gray-500">La sede no tiene bahías. Créalas en Configuración → Taller.</p>
          )}
          {busyCount > 0 && <p className="text-xs text-gray-500">{busyCount} bahía(s) ocupada(s) por otras OT.</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => save(selected || null)}
              disabled={saving}
              className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            >
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : order.bay ? (
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {order.bay.name} <span className="text-xs font-normal text-gray-500">· {bayKindLabel(order.bay.kind)}</span>
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Sin bahía</p>
      )}
    </div>
  );
}
