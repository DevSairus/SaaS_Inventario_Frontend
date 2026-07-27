import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, Ticket, Clock, Star, ThumbsUp, ThumbsDown,
  Loader2, Calendar,
} from 'lucide-react';
import useSuperAdminSupportStore from '../../../store/superAdminSupportStore';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

const STATUS_LABELS = {
  open: 'Abierto',
  in_progress: 'En progreso',
  waiting_customer: 'Esperando cliente',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const PRIORITY_LABELS = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function SupportAnalytics() {
  const { stats, statsLoading, fetchStats } = useSuperAdminSupportStore();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const params = {};
    if (dateRange.start) params.start_date = dateRange.start;
    if (dateRange.end) params.end_date = dateRange.end;
    fetchStats(params);
  }, [fetchStats, dateRange.start, dateRange.end]);

  if (statsLoading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!stats) return null;

  const { summary, by_status, by_priority, by_category, by_tenant, monthly, faq } = stats;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estadísticas de Soporte</h1>
            <p className="text-sm text-gray-500">Métricas y rendimiento del módulo de soporte</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard icon={Ticket} label="Total tickets" value={summary.total} color="blue" />
        <KpiCard icon={Ticket} label="Abiertos" value={summary.open} color="yellow" />
        <KpiCard icon={Ticket} label="Cerrados" value={summary.closed} color="green" />
        <KpiCard
          icon={Clock}
          label="1ra respuesta"
          value={summary.avg_first_response_hours != null ? `${summary.avg_first_response_hours}h` : '—'}
          color="purple"
        />
        <KpiCard
          icon={Clock}
          label="Resolución"
          value={summary.avg_resolution_hours != null ? `${summary.avg_resolution_hours}h` : '—'}
          color="orange"
        />
        <KpiCard
          icon={Star}
          label="Satisfacción"
          value={summary.avg_rating != null ? `${summary.avg_rating}/5` : '—'}
          subtitle={summary.total_ratings > 0 ? `${summary.total_ratings} calificaciones` : ''}
          color="yellow"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly tickets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tickets por mes</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Tickets" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
          )}
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Por estado</h3>
          {by_status.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={by_status.map((s) => ({ ...s, name: STATUS_LABELS[s.status] || s.status }))}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                  dataKey="count" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* By Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Por categoría</h3>
          {by_category.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={by_category} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Tickets" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
          )}
        </div>

        {/* By Priority */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Por prioridad</h3>
          {by_priority.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={by_priority.map((p) => ({ ...p, name: PRIORITY_LABELS[p.priority] || p.priority }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                  {by_priority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
          )}
        </div>
      </div>

      {/* Top Tenants */}
      {by_tenant.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">Top tenants por volumen de tickets</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium text-right">Tickets</th>
                </tr>
              </thead>
              <tbody>
                {by_tenant.map((t, i) => (
                  <tr key={t.tenant_id} className="border-b last:border-b-0">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-medium text-gray-800">{t.tenant?.company_name || '—'}</td>
                    <td className="py-2 text-right">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {t.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ Effectiveness */}
      {faq.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Efectividad de FAQ</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Artículo</th>
                  <th className="pb-2 font-medium text-center">
                    <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Útil</span>
                  </th>
                  <th className="pb-2 font-medium text-center">
                    <span className="inline-flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> No útil</span>
                  </th>
                  <th className="pb-2 font-medium text-center">Efectividad</th>
                </tr>
              </thead>
              <tbody>
                {faq.map((a) => {
                  const total = (a.helpful_count || 0) + (a.not_helpful_count || 0);
                  const pct = total > 0 ? Math.round(((a.helpful_count || 0) / total) * 100) : null;
                  return (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="py-2 text-gray-800 max-w-xs truncate">{a.question}</td>
                      <td className="py-2 text-center text-green-600">{a.helpful_count || 0}</td>
                      <td className="py-2 text-center text-red-500">{a.not_helpful_count || 0}</td>
                      <td className="py-2 text-center">
                        {pct != null ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            pct >= 70 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin datos</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, color }) {
  const bgColors = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${bgColors[color] || bgColors.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
    </div>
  );
}
