import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Loader2, RefreshCw, Filter, User, Bot } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraAuditoriaApi } from '../../api/ensambladora';

const fmtDateTime = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
};

const ACCION_LABELS = {
  radicada: 'Radicada',
  cerrada: 'Cerrada',
  reenviada_tras_devolucion: 'Reenviada (tras devolución)',
  creado: 'Creado',
};

const accionLabel = (accion) => {
  if (ACCION_LABELS[accion]) return ACCION_LABELS[accion];
  if (accion?.startsWith('evento_core_')) return `Evento Core: ${accion.replace('evento_core_', '')}`;
  return accion;
};

const ENTIDAD_FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'garantia', label: 'Garantías' },
  { value: 'alistamiento', label: 'Alistamientos' },
];

// Registro de auditoría de acciones sobre garantía/alistamiento/etc -- ver
// registrarAuditoria en el backend. Cubre en particular "garantías
// devueltas": reenviar una garantía solo tiene efecto si el Core la
// devolvió, así que esa acción es la señal confiable de una devolución
// corregida por este centro; los eventos entrantes del Core relacionados
// con garantía (accion "evento_core_...") quedan también acá si el Core
// llega a empujarlos.
export default function AuditoriaPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entidadTipo, setEntidadTipo] = useState('todas');

  const load = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const filtros = {};
      if (entidadTipo !== 'todas') filtros.entidad_tipo = entidadTipo;
      const res = await ensambladoraAuditoriaApi.list(filtros);
      setRegistros(res.data?.data ?? []);
    } catch (err) {
      toast.error('No se pudo cargar el log de auditoría');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entidadTipo]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Auditoría</h1>
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
          Quién hizo qué y cuándo — radicar/cerrar/reenviar garantías, alistamientos, y eventos recibidos de la Ensambladora.
        </p>

        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {ENTIDAD_FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEntidadTipo(f.value)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                entidadTipo === f.value
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

        {!loading && registros.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <ShieldCheck className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No hay registros de auditoría todavía</p>
          </div>
        )}

        {!loading && registros.length > 0 && (
          <ul className="space-y-2">
            {registros.map((r) => (
              <li key={r.id} className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium uppercase text-gray-400">{r.entidad_tipo}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{accionLabel(r.accion)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {fmtDateTime(r.created_at)}
                      {r.vin ? ` · ${r.vin}` : ''}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    {r.usuario_id ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    {r.usuario_nombre || 'Desconocido'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
