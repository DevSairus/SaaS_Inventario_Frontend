import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Car, RefreshCw, ShieldAlert, Calendar,
  Gauge, Palette, Hash, Tag, CheckCircle2, XCircle,
  Loader2, Wrench, Factory, ShoppingCart, ClipboardCheck, PackageCheck, Megaphone,
  CreditCard, Pencil,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import {
  ensambladoraVehiculosApi,
  ensambladoraGarantiasApi,
  ensambladoraAlistamientosApi,
  ensambladoraEntregasApi,
} from '../../api/ensambladora';
import { GARANTIA_ESTADO_CONFIG } from '../../utils/garantiaEstados';

const today = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
};

// Estados reales del modelo Vehiculo del Core (ver src/models/Vehiculo.js):
// ensamblado | en_stock | vendido | en_garantia | dado_de_baja
const ESTADO_CONFIG = {
  ensamblado:    { label: 'Ensamblado',    cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  en_stock:      { label: 'En stock',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  vendido:       { label: 'Vendido',       cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  en_garantia:   { label: 'En garantía',   cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  dado_de_baja:  { label: 'Dado de baja',  cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

function Field({ icon: Icon, label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function VehiculoDetailPage() {
  const { vin } = useParams();
  const navigate = useNavigate();

  const [vehiculo, setVehiculo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [validating, setValidating] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [garantiasLocales, setGarantiasLocales] = useState([]);
  const [alistamientoLocal, setAlistamientoLocal] = useState(null);
  const [entregaLocal, setEntregaLocal] = useState(null);
  // Mientras esto es true, los botones "Alistamiento"/"Entrega" no se
  // muestran como link activo -- antes de esto, alistamientoLocal/
  // entregaLocal arrancaban en null (== "no existe todavía") y el botón se
  // veía habilitado un instante, dejando entrar al formulario aunque el
  // registro real ya existiera (recién se corregía al volver a esta
  // pantalla, cuando el fetch ya había terminado).
  const [cargandoHistorialLocal, setCargandoHistorialLocal] = useState(true);
  const [cerrandoId, setCerrandoId] = useState(null);
  const [atendiendoRecallId, setAtendiendoRecallId] = useState(null);
  const [matriculando, setMatriculando] = useState(false);
  const [placaNueva, setPlacaNueva] = useState('');
  const [guardandoPlaca, setGuardandoPlaca] = useState(false);

  const loadGarantiasLocales = useCallback(async () => {
    try {
      const res = await ensambladoraGarantiasApi.listByVin(vin);
      setGarantiasLocales(res.data?.data ?? []);
    } catch {
      // No crítico -- si falla, simplemente no se ofrece el botón "cerrar"
      // (la vista de solo lectura de garantías sigue funcionando igual).
    }
  }, [vin]);

  // Si ya existe un registro local confirmado, los botones "Alistamiento"/
  // "Entrega" se deshabilitan en vez de dejar reintentar -- el backend ya
  // rechaza el duplicado (409), pero sin esto el usuario solo se entera
  // después de llenar el formulario entero.
  const loadAlistamientoLocal = useCallback(async () => {
    try {
      const res = await ensambladoraAlistamientosApi.listByVin(vin);
      setAlistamientoLocal(res.data?.data?.[0] ?? null);
    } catch {
      // No crítico -- si falla, el botón se muestra activo (el backend
      // igual bloquea el duplicado al enviar el formulario).
    }
  }, [vin]);

  const loadEntregaLocal = useCallback(async () => {
    try {
      const res = await ensambladoraEntregasApi.listByVin(vin);
      setEntregaLocal(res.data?.data?.[0] ?? null);
    } catch {
      // No crítico, mismo criterio que loadAlistamientoLocal.
    }
  }, [vin]);

  const load = useCallback(async ({ forzarOnline = false } = {}) => {
    forzarOnline ? setRefreshing(true) : setLoading(true);
    setNotFound(false);
    try {
      const res = await ensambladoraVehiculosApi.getByVin(vin, { forzarOnline });
      setVehiculo(res.data?.data ?? res.data ?? null);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Error consultando el vehículo en la Ensambladora');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vin]);

  useEffect(() => {
    load();
    loadGarantiasLocales();
    setCargandoHistorialLocal(true);
    Promise.all([loadAlistamientoLocal(), loadEntregaLocal()]).finally(() => setCargandoHistorialLocal(false));
  }, [load, loadGarantiasLocales, loadAlistamientoLocal, loadEntregaLocal]);

  const handleCerrarGarantia = async (localId) => {
    setCerrandoId(localId);
    try {
      await ensambladoraGarantiasApi.cerrar(localId, { fecha_cierre: today() });
      toast.success('Garantía cerrada');
      await Promise.all([load({ forzarOnline: true }), loadGarantiasLocales()]);
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo cerrar la garantía';
      toast.error(msg);
    } finally {
      setCerrandoId(null);
    }
  };

  const handleAtenderRecall = async (campanaRecallVehiculoId, campanaId) => {
    setAtendiendoRecallId(campanaRecallVehiculoId);
    try {
      await ensambladoraVehiculosApi.atenderRecall(vin, campanaId);
      toast.success('Recall marcado como atendido');
      await load({ forzarOnline: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo confirmar el recall como atendido';
      toast.error(msg);
    } finally {
      setAtendiendoRecallId(null);
    }
  };

  const handleValidarDisponibilidad = async () => {
    setValidating(true);
    setDisponibilidad(null);
    try {
      // El Core responde { disponible, motivo } (sin envolver en `data`,
      // a diferencia de GET /vehiculos/:vin) — ver validarDisponibilidad
      // en vehiculos.controller.js.
      const res = await ensambladoraVehiculosApi.validarDisponibilidad(vin);
      setDisponibilidad(res.data ?? { disponible: false, motivo: null });
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo validar la disponibilidad';
      setDisponibilidad({ disponible: false, motivo: msg });
    } finally {
      setValidating(false);
    }
  };

  // Informa al Core la placa del vehículo (evento vehiculo.matriculado, ver
  // requerimientos-pitbox-busqueda-por-placa.md, sección 3) -- solo aplica
  // cuando el vehículo todavía no tiene placa cargada; una vez matriculado,
  // ese dato lo sigue gestionando el Core.
  const handleGuardarPlaca = async (e) => {
    e.preventDefault();
    const clean = placaNueva.trim();
    if (!clean) return;
    setGuardandoPlaca(true);
    try {
      await ensambladoraVehiculosApi.matricular(vin, clean);
      toast.success('Placa registrada');
      setMatriculando(false);
      setPlacaNueva('');
      await load({ forzarOnline: true });
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Esa placa ya está asignada a otro vehículo en la Ensambladora');
      } else {
        const msg = err.response?.data?.message || 'No se pudo registrar la placa';
        toast.error(msg);
      }
    } finally {
      setGuardandoPlaca(false);
    }
  };

  const estado = vehiculo?.estado;
  const estadoCfg = ESTADO_CONFIG[estado];
  const marcaNombre = vehiculo?.marca?.nombre;
  const lineaNombre = vehiculo?.linea?.nombre;
  const anioModelo = vehiculo?.linea?.anio_modelo;
  const ensambladoraNombre = vehiculo?.ensambladora?.nombre;
  const proximaRevision = vehiculo?.proxima_revision;
  const garantias = vehiculo?.garantias || [];
  const recalls = vehiculo?.recalls_pendientes || [];
  const revisiones = vehiculo?.revisiones || [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <button
          onClick={() => navigate('/ensambladora/buscar')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Buscar otro VIN
        </button>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && notFound && (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <Car className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No se encontró un vehículo con VIN <span className="font-mono">{vin}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Verifica que el VIN esté cargado en el catálogo de la Ensambladora.
            </p>
            <Link
              to="/ensambladora/buscar"
              className="inline-block mt-4 text-sm text-primary-600 font-medium"
            >
              Volver a buscar
            </Link>
          </div>
        )}

        {!loading && !notFound && vehiculo && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Car className="w-5 h-5 text-primary-600" />
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
                    {vehiculo.vin || vin}
                  </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {[marcaNombre, lineaNombre, anioModelo].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {estadoCfg && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoCfg.cls}`}>
                    {estadoCfg.label}
                  </span>
                )}
                <button
                  onClick={() => load({ forzarOnline: true })}
                  disabled={refreshing}
                  title="Forzar consulta en línea al Core"
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-primary-600 disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {recalls.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  <Megaphone className="w-4 h-4 shrink-0" />
                  {recalls.length} recall{recalls.length > 1 ? 's' : ''} pendiente{recalls.length > 1 ? 's' : ''}
                </div>
                <ul className="space-y-2">
                  {recalls.map((r) => (
                    <li key={r.campana_recall_vehiculo_id} className="flex items-start justify-between gap-2">
                      <div className="text-sm text-red-700 dark:text-red-300 min-w-0">
                        <span className="font-medium">{r.titulo}</span>
                        {r.descripcion ? <span className="text-red-500 dark:text-red-400"> — {r.descripcion}</span> : null}
                      </div>
                      <button
                        onClick={() => handleAtenderRecall(r.campana_recall_vehiculo_id, r.campana_id)}
                        disabled={atendiendoRecallId === r.campana_recall_vehiculo_id}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-40 shrink-0"
                      >
                        {atendiendoRecallId === r.campana_recall_vehiculo_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Atender
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proximaRevision?.vencida && (
              <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/40 rounded-lg px-3 py-2.5">
                <Wrench className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  Revisión #{proximaRevision.numero_revision} vencida
                  {proximaRevision.motivo_vencida ? ` (por ${proximaRevision.motivo_vencida === 'kilometraje' ? 'kilometraje' : 'fecha'})` : ''}
                  {proximaRevision.descripcion ? ` — ${proximaRevision.descripcion}` : ''}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4 grid grid-cols-2 gap-4">
              <Field icon={CreditCard} label="Placa" value={vehiculo.placa} />
              <Field icon={Palette} label="Color" value={vehiculo.color} />
              <Field icon={Gauge} label="Kilometraje" value={vehiculo.kilometraje_actual != null ? `${Number(vehiculo.kilometraje_actual).toLocaleString('es-CO')} km` : null} />
              <Field icon={Tag} label="Motor" value={vehiculo.motor} />
              <Field icon={Hash} label="Lote de producción" value={vehiculo.lote_produccion} />
              <Field icon={Factory} label="Planta" value={vehiculo.planta} />
              <Field icon={Calendar} label="Fecha de ensamble" value={fmtDate(vehiculo.fecha_ensamble)} />
              <Field
                icon={Calendar}
                label="Próxima revisión"
                value={
                  proximaRevision
                    ? `#${proximaRevision.numero_revision}${proximaRevision.fecha_programada ? ` — ${fmtDate(proximaRevision.fecha_programada)}` : ''}${proximaRevision.vencida ? ' (vencida)' : ''}`
                    : (estado === 'en_garantia' || estado === 'vendido' ? 'Sin política configurada' : null)
                }
              />
              <Field icon={Factory} label="Ensambladora" value={ensambladoraNombre} />
            </div>

            {!vehiculo.placa && (
              <div className="bg-white dark:bg-graphite-2 border border-dashed border-gray-300 dark:border-white/15 rounded-xl p-3">
                {!matriculando ? (
                  <button
                    onClick={() => setMatriculando(true)}
                    className="flex items-center gap-1.5 text-sm text-primary-600 font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Registrar placa
                  </button>
                ) : (
                  <form onSubmit={handleGuardarPlaca} className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={placaNueva}
                      onChange={(e) => setPlacaNueva(e.target.value)}
                      placeholder="Placa"
                      autoCapitalize="characters"
                      className="flex-1 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100"
                    />
                    <button
                      type="submit"
                      disabled={!placaNueva.trim() || guardandoPlaca}
                      className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {guardandoPlaca && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMatriculando(false); setPlacaNueva(''); }}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-500"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            )}

            {garantias.length > 0 && (
              <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Garantías radicadas ({garantias.length})
                </p>
                <ul className="space-y-2">
                  {garantias.map((g) => {
                    const cfg = GARANTIA_ESTADO_CONFIG[g.estado];
                    // g.id es el id del CORE -- cruza con core_orden_garantia_id
                    // del registro local para saber qué id local mandarle a
                    // /garantias/:id/cerrar (ver listarPorVin, garantias.controller.js).
                    const local = garantiasLocales.find((l) => l.core_orden_garantia_id === g.id);
                    const puedeCerrar = g.estado === 'aprobada' && local && !local.cerrada;
                    const puedeReenviar = g.estado === 'devuelta' && local;
                    return (
                      <li key={g.id} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-700 dark:text-gray-200 min-w-0 truncate">
                            {fmtDate(g.fecha_reporte)}
                            {g.observaciones ? ` — ${g.observaciones}` : ''}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-medium ${cfg?.textCls || 'text-gray-500'}`}>
                              {cfg?.label || g.estado}
                            </span>
                            {puedeCerrar && (
                              <button
                                onClick={() => handleCerrarGarantia(local.id)}
                                disabled={cerrandoId === local.id}
                                className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 disabled:opacity-40"
                              >
                                {cerrandoId === local.id ? 'Cerrando…' : 'Cerrar'}
                              </button>
                            )}
                            {puedeReenviar && (
                              <Link
                                to={`/ensambladora/garantias/${local.id}/reenviar`}
                                className="text-xs font-medium px-2 py-1 rounded-md border border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-300 hover:border-orange-400"
                              >
                                Corregir y reenviar
                              </Link>
                            )}
                          </span>
                        </div>
                        {g.items?.length > 0 && (
                          <ul className="mt-1 pl-3 border-l border-gray-200 dark:border-white/10 space-y-0.5">
                            {g.items.map((item) => (
                              <li key={item.id} className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {item.pieza ? `${item.pieza.codigo} — ${item.pieza.nombre}` : 'Pieza no identificada'}
                                  {item.codigo_falla ? ` (${item.codigo_falla})` : ''}
                                  {item.cantidad > 1 ? ` × ${item.cantidad}` : ''}
                                </span>
                                {item.costo_reconocido != null && (
                                  <span className="shrink-0 font-medium">
                                    ${Number(item.costo_reconocido).toLocaleString('es-CO')}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {revisiones.length > 0 && (
              <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Revisiones realizadas ({revisiones.length})
                </p>
                <ul className="space-y-2">
                  {revisiones.map((r) => (
                    <li key={r.id} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-700 dark:text-gray-200 min-w-0 truncate">
                          {fmtDate(r.fecha_realizada)}
                          {r.politica ? ` — Revisión #${r.politica.numero_revision}` : ''}
                        </span>
                        <span className="flex items-center gap-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {r.kilometraje_registrado != null && `${Number(r.kilometraje_registrado).toLocaleString('es-CO')} km`}
                          {r.valor_mano_obra != null && ` · $${Number(r.valor_mano_obra).toLocaleString('es-CO')}`}
                        </span>
                      </div>
                      {r.observaciones && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.observaciones}</p>
                      )}
                      {r.piezas?.length > 0 && (
                        <ul className="mt-1 pl-3 border-l border-gray-200 dark:border-white/10 space-y-0.5">
                          {r.piezas.map((p, i) => (
                            <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                              {p.pieza ? `${p.pieza.codigo} — ${p.pieza.nombre}` : 'Pieza no identificada'}
                              {p.cantidad > 1 ? ` × ${p.cantidad}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(estado === 'ensamblado' || estado === 'en_stock') && (
                <Link
                  to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}/venta`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Vender
                </Link>
              )}
              {cargandoHistorialLocal ? (
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-400 dark:text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Alistamiento
                </span>
              ) : alistamientoLocal ? (
                <span
                  title={`Ya registrado el ${fmtDate(alistamientoLocal.fecha)}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Alistamiento — {fmtDate(alistamientoLocal.fecha)}
                </span>
              ) : (
                <Link
                  to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}/alistamiento`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Alistamiento
                </Link>
              )}
              {cargandoHistorialLocal ? (
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-400 dark:text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrega
                </span>
              ) : entregaLocal ? (
                <span
                  title={`Ya registrada el ${fmtDate(entregaLocal.fecha_entrega)}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed"
                >
                  <PackageCheck className="w-4 h-4" />
                  Entrega — {fmtDate(entregaLocal.fecha_entrega)}
                </span>
              ) : (
                <Link
                  to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}/entrega`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  <PackageCheck className="w-4 h-4" />
                  Entrega
                </Link>
              )}
              <Link
                to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}/garantia`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                <ShieldAlert className="w-4 h-4" />
                Radicar garantía
              </Link>
              {proximaRevision && (
                <Link
                  to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}/revision`}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${proximaRevision.vencida ? 'border-orange-300 dark:border-orange-900/40 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200'}`}
                >
                  <Wrench className="w-4 h-4" />
                  Revisión
                </Link>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-white/10 pt-4">
              <button
                onClick={handleValidarDisponibilidad}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white/10 text-white text-sm font-medium disabled:opacity-50"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                Validar disponibilidad en línea
              </button>
              {disponibilidad && (
                <div className={`mt-3 flex items-center gap-2 text-sm ${disponibilidad.disponible ? 'text-green-600' : 'text-red-600'}`}>
                  {disponibilidad.disponible ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {disponibilidad.disponible
                    ? 'Vehículo disponible para venta.'
                    : `No disponible${disponibilidad.motivo ? ` (${disponibilidad.motivo})` : ''}.`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
