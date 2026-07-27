import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSuperAdminSupportStore from '../../../store/superAdminSupportStore';

const STATUS_LABELS = {
  open: { text: 'Abierto', color: 'bg-blue-100 text-blue-800' },
  in_progress: { text: 'En progreso', color: 'bg-yellow-100 text-yellow-800' },
  waiting_customer: { text: 'Esperando cliente', color: 'bg-orange-100 text-orange-800' },
  resolved: { text: 'Resuelto', color: 'bg-green-100 text-green-800' },
  closed: { text: 'Cerrado', color: 'bg-gray-100 text-gray-600' },
};

const PRIORITY_LABELS = {
  low: { text: 'Baja', color: 'bg-gray-100 text-gray-600' },
  medium: { text: 'Media', color: 'bg-blue-100 text-blue-700' },
  high: { text: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { text: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const SupportInbox = () => {
  const navigate = useNavigate();
  const { tickets, ticketsPagination, ticketsLoading, fetchTickets } = useSuperAdminSupportStore();
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const params = { page: 1, limit: 20 };
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    fetchTickets(params);
  }, [filters.status, filters.priority, filters.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bandeja de Soporte</h1>
        <p className="mt-1 text-sm text-gray-500">Gestiona los tickets de soporte de todos los tenants</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar por asunto o tenant..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-60"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              Buscar
            </button>
          </form>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En progreso</option>
            <option value="waiting_customer">Esperando cliente</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todas las prioridades</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>

          {(filters.status || filters.priority || filters.search) && (
            <button
              onClick={() => { setFilters({ status: '', priority: '', search: '' }); setSearchInput(''); }}
              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {ticketsLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">No hay tickets{filters.status || filters.priority || filters.search ? ' con estos filtros' : ''}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado por</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => {
                  const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.open;
                  const priority = PRIORITY_LABELS[ticket.priority] || PRIORITY_LABELS.medium;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => navigate(`/superadmin/support/tickets/${ticket.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900 truncate block max-w-[250px]">{ticket.subject}</span>
                        {ticket.category && <span className="text-xs text-gray-400">{ticket.category}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ticket.tenant?.company_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ticket.creator?.first_name} {ticket.creator?.last_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${priority.color}`}>
                          {priority.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ticket.assigned_agent
                          ? `${ticket.assigned_agent.first_name} ${ticket.assigned_agent.last_name}`
                          : <span className="text-gray-400 italic">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(ticket.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                if (filters.status) params.status = filters.status;
                if (filters.priority) params.priority = filters.priority;
                if (filters.search) params.search = filters.search;
                fetchTickets(params);
              }}
              className={`px-3 py-1 text-sm rounded ${
                ticketsPagination.page === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportInbox;
