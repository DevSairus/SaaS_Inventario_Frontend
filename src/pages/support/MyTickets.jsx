import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSupportStore from '../../store/supportStore';
import Layout from '../../components/layout/Layout';

const STATUS_LABELS = {
  open: { text: 'Abierto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  in_progress: { text: 'En progreso', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  waiting_customer: { text: 'Esperando cliente', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  resolved: { text: 'Resuelto', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  closed: { text: 'Cerrado', color: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400' },
};

const PRIORITY_LABELS = {
  low: { text: 'Baja', color: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400' },
  medium: { text: 'Media', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  high: { text: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  urgent: { text: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const MyTickets = () => {
  const navigate = useNavigate();
  const { tickets, ticketsPagination, ticketsLoading, fetchTickets } = useSupportStore();
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = { page: 1, limit: 20 };
    if (statusFilter) params.status = statusFilter;
    fetchTickets(params);
  }, [statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Layout>
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis Tickets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">Historial de tus solicitudes de soporte</p>
        </div>
        <button
          onClick={() => navigate('/support')}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          &larr; Volver a FAQ
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            {s === '' ? 'Todos' : STATUS_LABELS[s]?.text}
          </button>
        ))}
      </div>

      {/* List */}
      {ticketsLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 dark:bg-graphite dark:border-white/10">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">No tienes tickets{statusFilter ? ' con este estado' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.open;
            const priority = PRIORITY_LABELS[ticket.priority] || PRIORITY_LABELS.medium;

            return (
              <button
                key={ticket.id}
                onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all dark:bg-graphite dark:border-white/10 dark:hover:border-indigo-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ticket.subject}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatDate(ticket.created_at)}
                      {ticket.assigned_agent && (
                        <span className="ml-2">· Asignado a: {ticket.assigned_agent.first_name} {ticket.assigned_agent.last_name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${priority.color}`}>
                      {priority.text}
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {ticketsPagination.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: ticketsPagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => {
                const params = { page: p, limit: 20 };
                if (statusFilter) params.status = statusFilter;
                fetchTickets(params);
              }}
              className={`px-3 py-1 text-sm rounded ${
                ticketsPagination.page === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
    </Layout>
  );
};

export default MyTickets;
