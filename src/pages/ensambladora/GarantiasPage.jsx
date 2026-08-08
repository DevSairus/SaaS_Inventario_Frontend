import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldAlert, Loader2, RefreshCw, ChevronRight, Filter } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraGarantiasApi } from '../../api/ensambladora';
import { GARANTIA_ESTADO_CONFIG } from '../../utils/garantiaEstados';

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  ...Object.entries(GARANTIA_ESTADO_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
];

// Listado global de garantías radicadas por este CSA, con el estado real
// que asigna la Ensambladora (aprobada/rechazada/devuelta/etc.) -- consulta
// en vivo al Core, sin tabla local propia (ver ensambladoraGarantiasApi.listAll /
// GET /ensambladora/garantias/todas, pass-through puro, mismo criterio que
// LiquidacionesPage.jsx).
export default function GarantiasPage() {
  const [garantias, setGarantias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todas');

  const load = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await ensambladoraGarantiasApi.listAll();
      setGarantias(res.data?.data ?? []);
    } catch (err) {
      toast.error('No se pudieron cargar las garantías');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibles = filtro === 'todas' ? garantias : garantias.filter((g) => g.estado === filtro);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Garantías</h1>
          </div>
          <button
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            title="Actualizar"
            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-primary-600 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Garantías radicadas por este centro y su estado ante la Ensambladora.
        </p>

        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                filtro === f.value
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && visibles.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <ShieldAlert className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {garantias.length === 0 ? 'Todavía no hay garantías radicadas' : 'No hay garantías con ese estado'}
            </p>
          </div>
        )}

        {!loading && visibles.length > 0 && (
          <ul className="space-y-2">
            {visibles.map((g) => {
              const cfg = GARANTIA_ESTADO_CONFIG[g.estado];
              const vin = g.Vehiculo?.vin;
              return (
                <li key={g.id}>
                  <Link
                    to={vin ? `/ensambladora/vehiculos/${encodeURIComponent(vin)}` : '#'}
                    className="flex items-center justify-between gap-3 bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 hover:border-primary-400"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {g.Vehiculo?.placa || vin || 'Vehículo sin identificar'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {fmtDate(g.fecha_reporte)}
                        {g.OrdenGarantiaItems?.length ? ` · ${g.OrdenGarantiaItems.length} pieza(s)` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.badgeCls || 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label || g.estado}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
