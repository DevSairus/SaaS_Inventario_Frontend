import { useLiveQuery } from 'dexie-react-hooks';
import db from '../offlineQueue/db';

const ENTITY_LABEL = { work_order: 'Orden de trabajo', vehicle: 'Vehículo' };

function discard(id) {
  db.mutationQueue.delete(id);
}

// Reintenta forzando la escritura sin condición de versión (el usuario asume
// el riesgo de sobrescribir el cambio hecho por otro usuario en el servidor).
async function forceOverwrite(id) {
  await db.mutationQueue.update(id, { status: 'pending', baseVersion: null });
}

// Deliberadamente sin merge automático: los datos en conflicto son operativos
// /financieros (estado de OT, ítems facturables), así que se pausa para que
// el usuario decida en vez de aplicar last-write-wins silencioso.
function ConflictResolutionModal() {
  const conflicts = useLiveQuery(
    () => db.mutationQueue.where('status').equals('conflict').toArray(),
    [],
    []
  );

  if (!conflicts?.length) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Conflicto de sincronización</h2>
        <p className="text-sm text-gray-600 mb-4">
          Estos cambios se hicieron sin conexión, pero el registro cambió en el servidor mientras tanto.
        </p>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {conflicts.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">
                {ENTITY_LABEL[c.entity] || c.entity} — {c.operation}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => discard(c.id)}
                  className="flex-1 text-xs font-medium py-1.5 rounded bg-gray-100 text-gray-700"
                >
                  Descartar mi cambio
                </button>
                <button
                  onClick={() => forceOverwrite(c.id)}
                  className="flex-1 text-xs font-medium py-1.5 rounded bg-red-600 text-white"
                >
                  Sobrescribir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionModal;
