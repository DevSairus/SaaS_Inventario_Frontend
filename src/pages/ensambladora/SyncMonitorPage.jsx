import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Activity, Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft,
  RotateCw, CheckCircle2, Filter,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraSyncApi } from '../../api/ensambladora';
import useAuthStore from '../../store/authStore';

const fmtDateTime = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
};

// Estados reales de EnsambladoraEventoSync (ver models/ensambladora/EnsambladoraEventoSync.js)
const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  enviado:    { label: 'Enviado',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  confirmado: { label: 'Confirmado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  error:      { label: 'Error',      cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

const ESTADO_FILTROS = ['todos', 'pendiente', 'enviado', 'confirmado', 'error'];
const DIRECCION_FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'saliente', label: 'Salientes' },
  { value: 'entrante', label: 'Entrantes' },
];

// Fase 8 — vista de solo esta punta (Pitbox) del outbox/inbox de sync con
// la Ensambladora. El panel gemelo del lado Core (Front Ensambladora) queda
// fuera del alcance de esta entrega. "Reintentar" solo aparece habilitado
// para eventos salientes en error (mismo criterio que el backend, ver
// reintentarEvento en sync.controller.js) -- no tiene efecto real si el
// evento sí llegó al Core y falló allá; en ese caso hay que reintentarlo
// desde el panel del Core.
export default function SyncMonitorPage() {
  const { user } = useAuthStore();
  const revisadoPor = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email || 'desconocido';

  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estado, setEstado] = useState('todos');
  const [direccion, setDireccion] = useState('todas');
  const [soloNoRevisados, setSoloNoRevisados] = useState(false);
  const [reintentandoId, setReintentandoId] = useState(null);
  const [marcandoId, setMarcandoId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const filtros = {};
      if (estado !== 'todos') filtros.estado = estado;
      if (direccion !== 'todas') filtros.direccion = direccion;
      if (soloNoRevisados) filtros.revisado = false;
      const res = await ensambladoraSyncApi.listEvents(filtros);
      setEventos(res.data?.data ?? []);
    } catch (err) {
      toast.error('No se pudieron cargar los eventos de sincronización');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [estado, direccion, soloNoRevisados]);

  useEffect(() => { load(); }, [load]);

  const handleReintentar = async (eventId) => {
    setReintentandoId(eventId);
    try {
      await ensambladoraSyncApi.reintentar(eventId);
      toast.success('Evento reenviado y confirmado');
      await load({ silent: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo confirmar el reintento con la Ensambladora';
      toast.error(msg);
    } finally {
      setReintentandoId(null);
    }
  };

  const handleMarcarRevisado = async (eventId) => {
    setMarcandoId(eventId);
    try {
      await ensambladoraSyncApi.marcarRevisado(eventId, revisadoPor);
      await load({ silent: true });
    } catch (err) {
      toast.error('No se pudo marcar como revisado');
    } finally {
      setMarcandoId(null);
    }
  };

  const pendientesOError = eventos.filter((e) => e.estado === 'pendiente' || e.estado === 'error').length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sincronización con la Ensambladora</h1>
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
          {loading ? 'Cargando…' : `${eventos.length} evento${eventos.length === 1 ? '' : 's'}${pendientesOError > 0 ? ` — ${pendientesOError} pendiente(s)/error` : ''}`}
        </p>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {ESTADO_FILTROS.map((v) => (
              <button
                key={v}
                onClick={() => setEstado(v)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 capitalize ${
                  estado === v
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                }`}
              >
                {v === 'todos' ? 'Todos' : ESTADO_CONFIG[v]?.label || v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {DIRECCION_FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDireccion(f.value)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                  direccion === f.value
                    ? 'bg-gray-900 dark:bg-white/20 border-gray-900 dark:border-white/20 text-white'
                    : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                }`}
              >
                {f.label}
              </button>
            ))}
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 ml-1">
              <input type="checkbox" checked={soloNoRevisados} onChange={(e) => setSoloNoRevisados(e.target.checked)} />
              Solo no revisados
            </label>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && eventos.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <Activity className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No hay eventos con esos filtros
            </p>
          </div>
        )}

        {!loading && eventos.length > 0 && (
          <ul className="space-y-2">
            {eventos.map((ev) => {
              const cfg = ESTADO_CONFIG[ev.estado];
              const puedeReintentar = ev.direccion === 'saliente' && ev.estado === 'error';
              return (
                <li
                  key={ev.id}
                  className={`bg-white dark:bg-graphite-2 border rounded-xl px-4 py-3 ${
                    ev.revisado ? 'border-gray-100 dark:border-white/5 opacity-70' : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {ev.direccion === 'saliente' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ev.tipo_evento}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {fmtDateTime(ev.created_at)}
                        {ev.entidad_tipo ? ` · ${ev.entidad_tipo}` : ''}
                        {ev.intentos > 0 ? ` · ${ev.intentos} intento${ev.intentos > 1 ? 's' : ''}` : ''}
                      </p>
                      {ev.ultimo_error && (
                        <p className="text-xs text-red-500 mt-1 break-words">{ev.ultimo_error}</p>
                      )}
                      {ev.revisado && (
                        <p className="text-xs text-gray-400 mt-1">
                          Revisado por {ev.revisado_por} — {fmtDateTime(ev.revisado_en)}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {cfg?.label || ev.estado}
                    </span>
                  </div>

                  {(puedeReintentar || !ev.revisado) && (
                    <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/10">
                      {puedeReintentar && (
                        <button
                          onClick={() => handleReintentar(ev.id)}
                          disabled={reintentandoId === ev.id}
                          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 disabled:opacity-40"
                        >
                          {reintentandoId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                          Reintentar
                        </button>
                      )}
                      {!ev.revisado && (
                        <button
                          onClick={() => handleMarcarRevisado(ev.id)}
                          disabled={marcandoId === ev.id}
                          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 disabled:opacity-40"
                        >
                          {marcandoId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Marcar revisado
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
