import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Filter, X } from 'lucide-react';
import { getRemoteSessions } from '../../../api/superadminSupport';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'active', label: 'Activa' },
  { value: 'ended', label: 'Finalizada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'expired', label: 'Expirada' },
];

const STATUS_LABELS = {
  pending: { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  active: { text: 'Activa', color: 'bg-green-100 text-green-800', icon: Monitor },
  ended: { text: 'Finalizada', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  rejected: { text: 'Rechazada', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { text: 'Expirada', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
};

export default function RemoteSessionsHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    agent_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (filters.status) params.status = filters.status;
        if (filters.agent_id) params.agent_id = filters.agent_id;
        if (filters.tenant_id) params.tenant_id = filters.tenant_id;
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;

        const data = await getRemoteSessions(params);
        if (data.success) {
          setSessions(data.data);
          setTotalPages(data.pages);
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: '', agent_id: '', tenant_id: '', start_date: '', end_date: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const getDuration = (start, end) => {
    if (!start || !end) return '—';
    const ms = new Date(end) - new Date(start);
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}min`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Monitor className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Sesiones Remotas</h1>
            <p className="text-sm text-gray-500">Registro de accesos remotos realizados</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {hasActiveFilters ? 'No hay sesiones con esos filtros' : 'No hay sesiones remotas registradas'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 border-b">
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Agente</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Modo</th>
                  <th className="px-4 py-3 font-medium">Inicio</th>
                  <th className="px-4 py-3 font-medium">Duración</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const st = STATUS_LABELS[s.status] || STATUS_LABELS.ended;
                  const Icon = st.icon;
                  return (
                    <tr key={s.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/superadmin/support/tickets/${s.ticket?.id}`)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-[180px] block"
                        >
                          {s.ticket?.subject || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.agent?.first_name} {s.agent?.last_name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {s.user?.first_name} {s.user?.last_name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.tenant?.company_name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          <Icon className="w-3 h-3" />
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {s.mode === 'view_only' ? 'Solo ver' : 'Control remoto'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(s.started_at || s.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {getDuration(s.started_at, s.ended_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
