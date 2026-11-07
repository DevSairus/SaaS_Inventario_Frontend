import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Briefcase, Plus, Search } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import ProjectFormModal from '../../components/projects/ProjectFormModal';
import { getProjects } from '../../api/projects';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PROJECT_STATUS, PROJECT_TYPES, customerName, userName } from '../../components/projects/projectConstants';

// Filtros por estado: "activos" = todo lo que no está cerrado ni cancelado.
const FILTERS = [
  ['active', 'Activos'],
  ['prospect,quoted', 'Comercial'],
  ['approved,in_progress,on_hold', 'En ejecución'],
  ['completed', 'Terminados'],
  ['closed,cancelled', 'Cerrados'],
  ['all', 'Todos'],
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const canManage = can('projects.manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('f') || 'active';

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50, search: search.trim() || undefined };
      if (filter === 'active') params.active = 'true';
      else if (filter !== 'all') params.status = filter;
      const res = await getProjects(params);
      setRows(res.data || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      setCounts(res.meta?.status_counts || {});
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar los proyectos');
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const countFor = (key) => {
    if (key === 'all') return Object.values(counts).reduce((s, n) => s + n, 0);
    if (key === 'active') return Object.entries(counts).filter(([k]) => !['closed', 'cancelled'].includes(k)).reduce((s, [, n]) => s + n, 0);
    return key.split(',').reduce((s, k) => s + (counts[k] || 0), 0);
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Proyectos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cada obra con su bodega, lista de materiales, presupuesto y estado de resultados.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" /> Nuevo proyecto
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSearchParams(key === 'active' ? {} : { f: key })}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filter === key ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-orange-400'
              }`}
            >
              {label} <span className="opacity-75">({countFor(key)})</span>
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre, cliente o ciudad..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-800"
          />
        </div>

        {loading && rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No hay proyectos {filter === 'all' ? '' : 'en este filtro'}.</p>
            {canManage && <p className="text-sm mt-1">Crea el primero con "Nuevo proyecto".</p>}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 hidden md:table-cell">Tipo</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Responsable</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Entrega</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Contrato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {p.name}
                          {p.budget_alert && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[11px] font-semibold ${p.budget_alert === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                              {p.budget_alert === 'critical' ? 'Sobrecosto' : 'Cerca del límite'}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{p.code}{p.city ? ` · ${p.city}` : ''}{p.capacity_kwp ? ` · ${Number(p.capacity_kwp)} kWp` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{customerName(p.customer) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${PROJECT_STATUS[p.status]?.cls}`}>{PROJECT_STATUS[p.status]?.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{PROJECT_TYPES[p.type] || p.type}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-400">{p.manager ? userName(p.manager) : '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-400">{p.end_date_planned ? formatDate(p.end_date_planned) : '—'}</td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell text-gray-900 dark:text-gray-100">{p.contract_amount ? formatCurrency(p.contract_amount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-900/40 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                <span className="text-gray-600">Página {pagination.page} de {pagination.pages} · {pagination.total} proyectos</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50">Anterior</button>
                  <button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50">Siguiente</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ProjectFormModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSaved={(p) => p?.id && navigate(`/projects/${p.id}`)}
      />
    </Layout>
  );
}
