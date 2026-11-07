import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Search, Settings, Sun } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { getSolarStudies } from '../../api/solar';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS = {
  draft: { label: 'Estudio', cls: 'bg-gray-100 text-gray-700' },
  quoted: { label: 'Cotizado', cls: 'bg-blue-100 text-blue-800' },
  project: { label: 'Con proyecto', cls: 'bg-green-100 text-green-800' },
};
const customerName = (c) => (c ? c.business_name || [c.first_name, c.last_name].filter(Boolean).join(' ') : '—');

export default function SolarStudiesPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setRows((await getSolarStudies({ search: search.trim() || undefined })).data || []);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Error al cargar los estudios');
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Cotizador solar</h1>
            <p className="text-sm text-gray-500 mt-0.5">Dimensiona el sistema con el consumo y la radiación real, cotiza con el catálogo y crea el proyecto.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/solar/leads" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50">Interesados</Link>
            {can('solar.configure') && (
              <Link to="/solar/settings" className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50">
                <Settings className="w-4 h-4" /> Parámetros
              </Link>
            )}
            <button onClick={() => navigate('/solar/new')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
              <Plus className="w-4 h-4" /> Nuevo estudio
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número, nombre o ciudad..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800" />
        </div>

        {loading && rows.length === 0 ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center text-gray-500">
            <Sun className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Todavía no hay estudios solares.</p>
            <p className="text-sm mt-1">Crea el primero con "Nuevo estudio".</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Estudio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Sistema</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Total</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Cotización / proyecto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/solar/${s.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{s.title || s.number}</p>
                      <p className="text-xs text-gray-500">{s.number}{s.city ? ` · ${s.city}` : ''} · {formatDate(s.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{customerName(s.customer)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[s.status]?.cls}`}>{STATUS[s.status]?.label}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.kwp ? `${Number(s.kwp).toLocaleString('es-CO')} kWp` : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{s.total_amount ? formatCurrency(s.total_amount) : '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">
                      {[s.quote && (s.quote.quote_number || s.quote.sale_number), s.project && s.project.code].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
