// frontend/src/components/common/DraftRecoveryBanner.jsx
//
// Aviso "Tienes un borrador sin guardar" de useFormDraft. `summary` describe
// el contenido (p.ej. "5 ítems · Juan Pérez"); `warning` es un aviso extra
// (p.ej. la venta se modificó después del borrador). `conflict` cambia el
// texto al caso "otro equipo guardó una versión más reciente mientras se
// trabajaba acá" (ver useFormDraft.resolveConflict).
import { History, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';

const formatSavedAt = (ts) => new Date(ts).toLocaleString('es-CO', {
  day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit',
});

export default function DraftRecoveryBanner({ pending, summary, warning, onRestore, onDiscard, conflict = false }) {
  if (!pending) return null;
  const when = formatSavedAt(pending.savedAt);
  const title = conflict
    ? `Desde otro equipo se guardó una versión más reciente de este borrador (${when})`
    : pending.otherDevice
      ? `Tienes un borrador sin guardar desde otro equipo, del ${when}`
      : `Tienes un borrador sin guardar del ${when}`;
  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/30 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <History className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-200">
            {title}
          </p>
          {summary && <p className="text-blue-800/80 dark:text-blue-300/80 truncate">{summary}</p>}
          {warning && (
            <p className="mt-1 flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {warning}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <RotateCcw className="w-4 h-4" /> {conflict ? 'Usar esa versión' : 'Recuperar'}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-800 dark:text-blue-200 text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20"
          >
            <Trash2 className="w-4 h-4" /> {conflict ? 'Mantener la mía' : 'Descartar'}
          </button>
        </div>
      </div>
    </div>
  );
}
