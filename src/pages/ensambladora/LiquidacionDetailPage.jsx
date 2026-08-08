import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Receipt, Loader2, ShieldAlert, Wrench, CalendarRange } from 'lucide-react';
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

const ESTADO_CONFIG = {
  borrador: { label: 'Borrador', cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  aprobada: { label: 'Aprobada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pagada:   { label: 'Pagada',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

// tipo_origen del item, ver models/LiquidacionCsaItem.js del Core
const ORIGEN_CONFIG = {
  orden_revision: { label: 'Revisión', icon: Wrench },
  orden_garantia: { label: 'Garantía', icon: ShieldAlert },
};

// Fase 5 — detalle de una liquidación puntual: periodo, estado, total y el
// desglose de items (revisiones + garantías cerradas que la componen). El
// backend Pitbox no guarda copia local, así que `id` acá es siempre el id
// del Core (ver GET /ensambladora/liquidaciones/:id, pass-through puro).
export default function LiquidacionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [liquidacion, setLiquidacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await ensambladoraLiquidacionesApi.getById(id);
      setLiquidacion(res.data?.data ?? null);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Error consultando la liquidación');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const cfg = liquidacion ? ESTADO_CONFIG[liquidacion.estado] : null;
  const items = liquidacion?.LiquidacionCsaItems || liquidacion?.liquidacion_csa_items || liquidacion?.items || [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <button
          onClick={() => navigate('/ensambladora/liquidaciones')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a liquidaciones
        </button>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && notFound && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No se encontró esa liquidación
            </p>
            <Link
              to="/ensambladora/liquidaciones"
              className="inline-block mt-3 text-sm text-primary-600 font-medium"
            >
              Ver todas las liquidaciones
            </Link>
          </div>
        )}

        {!loading && liquidacion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-600" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Liquidación</h1>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.cls || 'bg-gray-100 text-gray-600'}`}>
                {cfg?.label || liquidacion.estado}
              </span>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CalendarRange className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Periodo</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {fmtDate(liquidacion.periodo_inicio)} — {fmtDate(liquidacion.periodo_fin)}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-white/10 pt-3 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total liquidado</span>
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(liquidacion.total)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Detalle ({items.length})
              </p>
              {items.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Sin items en esta liquidación</p>
              )}
              {items.length > 0 && (
                <ul className="divide-y divide-gray-100 dark:divide-white/10">
                  {items.map((it) => {
                    const origen = ORIGEN_CONFIG[it.tipo_origen];
                    const Icon = origen?.icon || Receipt;
                    return (
                      <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{origen?.label || it.tipo_origen}</p>
                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                              {it.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 shrink-0">
                          {formatCurrency(it.valor)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
