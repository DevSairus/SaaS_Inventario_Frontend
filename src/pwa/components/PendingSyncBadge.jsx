import { useLiveQuery } from 'dexie-react-hooks';
import db from '../offlineQueue/db';

// Contador reactivo de mutaciones pendientes de sincronizar (cola offline).
function PendingSyncBadge() {
  const pendingCount = useLiveQuery(
    () => db.mutationQueue.where('status').equals('pending').count(),
    [],
    0
  );

  if (!pendingCount) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium whitespace-nowrap">
      {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
    </span>
  );
}

export default PendingSyncBadge;
