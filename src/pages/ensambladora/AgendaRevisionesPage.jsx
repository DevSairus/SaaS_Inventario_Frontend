import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarClock, Loader2, RefreshCw, Wrench, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraVehiculosApi } from '../../api/ensambladora';

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

// Fase 3 — el CSA ve acá qué vehículos entregados por él tienen revisión
// vencida. Se arma del lado Pitbox (ver ensambladoraVehiculosApi.agendaRevisiones
// / agendaRevisiones en vehiculos.controller.js) porque el Core no expone
// un listado por CSA, solo por VIN individual.
export default function AgendaRevisionesPage() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent = false, forzarOnline = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await ensambladoraVehiculosApi.agendaRevisiones({ forzarOnline });
      setVehiculos(res.data?.data ?? []);
    } catch (err) {
      toast.error('No se pudo cargar la agenda de revisiones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revisiones pendientes</h1>
          </div>
          <button
            onClick={() => load({ silent: true, forzarOnline: true })}
            disabled={refreshing}
            title="Actualizar (consulta en línea contra la Ensambladora)"
            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-primary-600 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Vehículos entregados por este centro con revisión vencida, según la Ensambladora.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && vehiculos.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <Wrench className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No hay revisiones vencidas por ahora
            </p>
          </div>
        )}

        {!loading && vehiculos.length > 0 && (
          <ul className="space-y-2">
            {vehiculos.map((v) => (
              <li key={v.vin}>
                <Link
                  to={`/ensambladora/vehiculos/${encodeURIComponent(v.vin)}/revision`}
                  className="flex items-center justify-between gap-3 bg-white dark:bg-graphite-2 border border-orange-200 dark:border-orange-900/40 rounded-xl px-4 py-3 hover:border-orange-400"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono truncate">{v.vin}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {[v.marca?.nombre, v.linea?.nombre].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                      Revisión #{v.proxima_revision?.numero_revision}
                      {v.proxima_revision?.fecha_programada ? ` — venció ${fmtDate(v.proxima_revision.fecha_programada)}` : ''}
                      {v.proxima_revision?.motivo_vencida === 'kilometraje' ? ' (por kilometraje)' : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
