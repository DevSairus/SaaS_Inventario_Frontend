import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Receipt, Loader2, RefreshCw, ChevronRight, Filter } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraLiquidacionesApi } from '../../api/ensambladora';
import { formatCurrency } from '../../utils/formatters';

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

// Estados reales del modelo LiquidacionCsa del Core (ver models/LiquidacionCsa.js):
// borrador | aprobada | pagada
const ESTADO_CONFIG = {
  borrador: { label: 'Borrador', cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  aprobada: { label: 'Aprobada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pagada:   { label: 'Pagada',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'pagada', label: 'Pagada' },
];

// Fase 5 — histórico de liquidaciones que la Ensambladora generó para este
// CSA (mano de obra + repuestos reconocidos de garantías cerradas y
// revisiones del periodo). Sin tabla local del lado Pitbox: cada carga es
// una consulta en vivo al Core (ver ensambladoraLiquidacionesApi.list /
// GET /ensambladora/liquidaciones, pass-through puro).
export default function LiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todas');

  const load = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await ensambladoraLiquidacionesApi.list();
      setLiquidaciones(res.data?.data ?? []);
    } catch (err) {
      toast.error('No se pudieron cargar las liquidaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibles = filtro === 'todas' ? liquidaciones : liquidaciones.filter((l) => l.estado === filtro);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Liquidaciones</h1>
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
          Liquidaciones que la Ensambladora ha generado para este centro por periodo.
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
            <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {liquidaciones.length === 0 ? 'Todavía no hay liquidaciones' : 'No hay liquidaciones con ese estado'}
            </p>
          </div>
        )}

        {!loading && visibles.length > 0 && (
          <ul className="space-y-2">
            {visibles.map((l) => {
              const cfg = ESTADO_CONFIG[l.estado];
              return (
                <li key={l.id}>
                  <Link
                    to={`/ensambladora/liquidaciones/${encodeURIComponent(l.id)}`}
                    className="flex items-center justify-between gap-3 bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 hover:border-primary-400"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {fmtDate(l.periodo_inicio)} — {fmtDate(l.periodo_fin)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatCurrency(l.total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.cls || 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label || l.estado}
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
