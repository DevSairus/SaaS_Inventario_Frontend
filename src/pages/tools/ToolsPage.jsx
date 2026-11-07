import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Search, Wrench } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import ToolFormModal from '../../components/tools/ToolFormModal';
import { getTools } from '../../api/tools';
import { formatDate } from '../../utils/formatters';
import { TOOL_STATUS, COST_MODES, DUE_LABEL } from '../../components/tools/toolConstants';

const FILTERS = [
  ['', 'Todas'],
  ['available', 'Disponibles'],
  ['assigned', 'Asignadas'],
  ['maintenance', 'En mantenimiento'],
  ['due', 'Mantenimiento o calibración pendiente'],
  ['retired', 'Dadas de baja'],
];

export default function ToolsPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const canManage = can('tools.manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('f') || '';
  const [data, setData] = useState({ tools: [], categories: [], summary: {} });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search.trim() || undefined, category: category || undefined };
      if (['maintenance', 'retired'].includes(filter)) params.status = filter;
      else if (filter) params.state = filter;
      const res = await getTools(params);
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar las herramientas');
    } finally {
      setLoading(false);
    }
  }, [filter, search, category]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const rows = data.tools;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Herramientas</h1>
            <p className="text-sm text-gray-500 mt-0.5">Hoja de vida, quién tiene cada herramienta y en qué proyecto, mantenimientos y calibraciones.</p>
          </div>
          {canManage && (
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
              <Plus className="w-4 h-4" /> Nueva herramienta
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([key, label]) => (
            <button
              key={key || 'all'}
              onClick={() => setSearchParams(key ? { f: key } : {})}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filter === key ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-orange-400'
              }`}
            >
              {label}
              {key === 'due' && data.summary.due > 0 && filter !== 'due' && <span className="ml-1 px-1.5 rounded-full bg-amber-500 text-white text-xs">{data.summary.due}</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre, serial o marca..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white dark:bg-gray-800"
            />
          </div>
          {data.categories.length > 0 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800">
              <option value="">Todas las categorías</option>
              {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {loading && rows.length === 0 ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No hay herramientas {filter ? 'en este filtro' : 'registradas'}.</p>
            {canManage && !filter && <p className="text-sm mt-1">Registra la primera con "Nueva herramienta".</p>}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Herramienta</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Quién la tiene</th>
                    <th className="px-4 py-3 hidden md:table-cell">Costo</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Próximos vencimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((t) => {
                    const st = TOOL_STATUS[t.display_status];
                    return (
                      <tr key={t.id} onClick={() => navigate(`/tools/${t.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                          <p className="text-xs text-gray-500">
                            {t.code}{t.category ? ` · ${t.category}` : ''}{t.serial_number ? ` · S/N ${t.serial_number}` : ''}
                            {t.tracking === 'quantity' ? ` · ${t.available_quantity} de ${t.quantity_total} disponibles` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${st?.cls}`}>{st?.label}</span></td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {t.active_assignments.length === 0 ? <span className="text-gray-400">—</span> : t.active_assignments.slice(0, 3).map((a) => (
                            <p key={a.id} className="text-xs">
                              {a.quantity > 1 ? `${a.quantity} · ` : ''}{a.responsible_name}{a.project ? ` · ${a.project.code}` : ''}
                              {a.overdue && <span className="ml-1 text-red-600 font-medium">(devolución vencida)</span>}
                            </p>
                          ))}
                          {t.active_assignments.length > 3 && <p className="text-xs text-gray-500">y {t.active_assignments.length - 3} más</p>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{COST_MODES[t.cost_mode]?.label}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs">
                          {t.next_maintenance_date && (
                            <p className={t.due.maintenance === 'overdue' ? 'text-red-600' : t.due.maintenance === 'soon' ? 'text-amber-700' : 'text-gray-600'}>
                              {t.due.maintenance && <AlertTriangle className="inline w-3.5 h-3.5 mr-0.5" />}Mantenimiento {formatDate(t.next_maintenance_date)}{t.due.maintenance ? ` (${DUE_LABEL[t.due.maintenance]})` : ''}
                            </p>
                          )}
                          {t.requires_calibration && (
                            <p className={t.due.calibration === 'overdue' ? 'text-red-600' : t.due.calibration === 'soon' ? 'text-amber-700' : 'text-gray-600'}>
                              {t.due.calibration && <AlertTriangle className="inline w-3.5 h-3.5 mr-0.5" />}Calibración {t.next_calibration_date ? formatDate(t.next_calibration_date) : 'sin fecha'}{t.due.calibration ? ` (${DUE_LABEL[t.due.calibration]})` : ''}
                            </p>
                          )}
                          {!t.next_maintenance_date && !t.requires_calibration && <span className="text-gray-400">—</span>}
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

      <ToolFormModal isOpen={showNew} onClose={() => setShowNew(false)} categories={data.categories} onSaved={(t) => t?.id && navigate(`/tools/${t.id}`)} />
    </Layout>
  );
}
