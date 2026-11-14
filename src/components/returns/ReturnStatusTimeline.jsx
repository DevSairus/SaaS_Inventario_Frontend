import React from 'react';
import { formatDateTime } from '../../utils/formatters';

// Historial de estados de una devolución (venta o compra), req. 3.5 / 4.2.
// `history` es data.history del detalle (backend: services/returns/returnHistory.js):
//   { current_status, current_label, next_statuses, events: [...], milestones: [...] }
const DOT = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  reversed: 'bg-gray-500',
};

const ReturnStatusTimeline = ({ history }) => {
  if (!history || !history.events?.length) return null;
  const { events, milestones = [], next_statuses: next = [] } = history;

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-graphite">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Historial de estados</h2>
      <ol className="relative border-l border-gray-200 dark:border-white/10 ml-2 space-y-5">
        {events.map((e, i) => (
          <li key={`${e.status}-${i}`} className="ml-5">
            <span className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full ${DOT[e.status] || 'bg-gray-400'}`} />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {e.label}
              {e.from_status == null && <span className="ml-2 text-xs font-normal text-gray-500">(creación)</span>}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {e.user_name ? `Por ${e.user_name} · ` : ''}{formatDateTime(e.at)}
            </p>
            {e.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{e.note}</p>}
          </li>
        ))}
        {milestones.map((m) => (
          <li key={m.key} className="ml-5">
            <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-blue-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.label}</p>
          </li>
        ))}
      </ol>
      {next.length > 0 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Siguiente paso posible: {next.map((n) => n.label).join(' o ')}
        </p>
      )}
    </div>
  );
};

export default ReturnStatusTimeline;
