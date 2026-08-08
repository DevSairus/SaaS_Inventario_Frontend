import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Wrench, Loader2, AlertTriangle, Search, X, CheckCircle2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import {
  ensambladoraVehiculosApi,
  ensambladoraRevisionesApi,
  ensambladoraMantenimientoApi,
} from '../../api/ensambladora';
import ComprobanteAcciones from '../../components/ensambladora/ComprobanteAcciones';
import NumericInput from '../../components/inputs/NumericInput';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';
const today = () => new Date().toISOString().slice(0, 10);

// Puntos típicos sugeridos por el contrato (ver
// requerimientos-pitbox-formulario-mantenimiento.md, sección 2) -- el Core
// acepta el checklist tal cual venga, no valida contra una lista cerrada,
// así que esto es solo una sugerencia razonable de UX.
const CHECKLIST_ITEMS = [
  { key: 'frenos',             label: 'Frenos' },
  { key: 'luces',               label: 'Luces' },
  { key: 'nivel_aceite',        label: 'Nivel de aceite' },
  { key: 'nivel_refrigerante',  label: 'Nivel de refrigerante' },
  { key: 'nivel_frenos',        label: 'Nivel de líquido de frenos' },
  { key: 'llantas',             label: 'Llantas' },
  { key: 'bateria',             label: 'Batería' },
  { key: 'correas',             label: 'Correas' },
];

// `politica_id` nunca lo arma el CSA a mano -- sale de
// vehiculo.proxima_revision.politica_id (GET /vehiculos/:vin) como default,
// o de una de las políticas de la línea si el taller registra una revisión
// fuera de secuencia (ver 1.1bis del contrato). Esta pantalla primero trae
// el vehículo antes de mostrar el formulario.
export default function RevisionFormPage() {
  const { vin } = useParams();

  const [loading, setLoading] = useState(true);
  const [revisionCreada, setRevisionCreada] = useState(null);
  const [vehiculo, setVehiculo] = useState(null);
  const [proximaRevision, setProximaRevision] = useState(null);

  const [politicas, setPoliticas] = useState([]);
  const [politicaId, setPoliticaId] = useState('');
  const [valorManoObra, setValorManoObra] = useState('');

  const [catalogoPiezas, setCatalogoPiezas] = useState([]);
  const [piezaBusqueda, setPiezaBusqueda] = useState('');
  const [piezasSeleccionadas, setPiezasSeleccionadas] = useState([]); // [{pieza_codigo, nombre, cantidad}]

  const [fechaRealizada, setFechaRealizada] = useState(today());
  const [kilometraje, setKilometraje] = useState('');
  const [checklist, setChecklist] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Siempre forzando online: el kilometraje/política tienen que estar
        // al día para no cerrar una revisión con datos viejos del cache.
        const res = await ensambladoraVehiculosApi.getByVin(vin, { forzarOnline: true });
        const data = res.data?.data ?? res.data ?? null;
        setVehiculo(data);
        setProximaRevision(data?.proxima_revision || null);

        if (data?.proxima_revision) {
          const lineaId = data?.linea?.id;
          const marcaId = data?.marca?.id;
          setPoliticaId(data.proxima_revision.politica_id);

          const [politicasRes, piezasRes] = await Promise.all([
            lineaId ? ensambladoraMantenimientoApi.politicasPorLinea(lineaId).catch(() => null) : null,
            marcaId ? ensambladoraMantenimientoApi.catalogoPiezas(marcaId, lineaId).catch(() => null) : null,
          ]);

          if (politicasRes) {
            const lista = politicasRes.data?.data ?? [];
            setPoliticas([...lista].sort((a, b) => (a.numero_revision || 0) - (b.numero_revision || 0)));
          }
          if (piezasRes) {
            setCatalogoPiezas(piezasRes.data?.data ?? []);
          }
        }
      } catch (err) {
        toast.error('No se pudo consultar el vehículo en la Ensambladora');
      } finally {
        setLoading(false);
      }
    })();
  }, [vin]);

  const setCL = (key, val) => setChecklist((p) => ({ ...p, [key]: val }));

  // La tarifa ya no la elige el CSA -- la asigna la Ensambladora por
  // política (ver PoliticasPage.jsx del Core), acá solo se muestra y se
  // usa para prellenar "valor cobrado" cuando cambia la política elegida.
  const tarifaAsignada = politicas.find((p) => p.id === politicaId)?.TarifarioServicio || null;

  useEffect(() => {
    setValorManoObra(tarifaAsignada ? tarifaAsignada.valor_mano_obra : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [politicaId]);

  const piezasFiltradas = useMemo(() => {
    const q = piezaBusqueda.trim().toLowerCase();
    if (!q) return [];
    return catalogoPiezas
      .filter((p) => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .filter((p) => !piezasSeleccionadas.some((s) => s.pieza_codigo === p.codigo))
      .slice(0, 8);
  }, [piezaBusqueda, catalogoPiezas, piezasSeleccionadas]);

  const agregarPieza = (pieza) => {
    setPiezasSeleccionadas((prev) => [...prev, { pieza_codigo: pieza.codigo, nombre: pieza.nombre, cantidad: 1 }]);
    setPiezaBusqueda('');
  };

  const actualizarCantidad = (codigo, cantidad) =>
    setPiezasSeleccionadas((prev) => prev.map((p) => (p.pieza_codigo === codigo ? { ...p, cantidad } : p)));

  const quitarPieza = (codigo) => setPiezasSeleccionadas((prev) => prev.filter((p) => p.pieza_codigo !== codigo));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fechaRealizada || !politicaId) return;
    setSaving(true);
    try {
      const res = await ensambladoraRevisionesApi.create({
        vin,
        politica_id: politicaId,
        fecha_realizada: fechaRealizada,
        kilometraje_registrado: kilometraje ? Number(kilometraje) : undefined,
        checklist,
        observaciones: observaciones || undefined,
        valor_mano_obra: valorManoObra !== '' ? Number(valorManoObra) : undefined,
        piezas: piezasSeleccionadas.map((p) => ({ pieza_codigo: p.pieza_codigo, cantidad: Number(p.cantidad) || 1 })),
      });
      toast.success('Revisión registrada — la Ensambladora recalcula la siguiente');
      // No navega de una -- primero se ofrece el comprobante/link para el
      // cliente (ver ComprobanteAcciones), igual criterio que "dejó la moto".
      setRevisionCreada(res.data?.data ?? null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo registrar la revisión';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-6 px-4">
        <Link
          to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al vehículo
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registrar revisión</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-mono">{vin}</p>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {!loading && revisionCreada && (
          <div className="space-y-4">
            <div className="text-center py-8 border border-dashed border-green-300 dark:border-green-900/40 rounded-xl bg-green-50 dark:bg-green-900/10">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Revisión registrada</p>
            </div>
            <ComprobanteAcciones tipo="revision" id={revisionCreada.id} />
            <Link
              to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}`}
              className="block text-center text-sm font-medium text-primary-600 py-2"
            >
              Volver al vehículo
            </Link>
          </div>
        )}

        {!loading && !revisionCreada && !proximaRevision && (
          <div className="text-center py-14 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <AlertTriangle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Este vehículo no tiene una revisión pendiente
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Puede que no haya política configurada para la próxima, o que aún no esté en garantía.
            </p>
          </div>
        )}

        {!loading && !revisionCreada && proximaRevision && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Política / revisión *</label>
              <select value={politicaId} onChange={(e) => setPoliticaId(e.target.value)} className={inputCls} required>
                {politicas.length === 0 && proximaRevision && (
                  <option value={proximaRevision.politica_id}>
                    Revisión #{proximaRevision.numero_revision}
                    {proximaRevision.descripcion ? ` — ${proximaRevision.descripcion}` : ''}
                  </option>
                )}
                {politicas.map((p) => (
                  <option key={p.id} value={p.id}>
                    Revisión #{p.numero_revision}
                    {p.descripcion ? ` — ${p.descripcion}` : ''}
                    {p.id === proximaRevision.politica_id ? ' (sugerida)' : ''}
                  </option>
                ))}
              </select>
              {proximaRevision.vencida && politicaId === proximaRevision.politica_id && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Esta revisión está vencida.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha realizada *</label>
                <input type="date" required value={fechaRealizada} onChange={(e) => setFechaRealizada(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kilometraje actual</label>
                <NumericInput
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                  className={inputCls}
                  placeholder="Ej: 15000"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Checklist</p>
              <div className="space-y-1.5">
                {CHECKLIST_ITEMS.map(({ key, label }) => {
                  const v = checklist[key]; // true | false | undefined
                  return (
                    <div key={key} className={`flex items-center justify-between rounded-lg px-3 py-2 ${v === true ? 'bg-green-50 dark:bg-green-900/20' : v === false ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-white/5'}`}>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCL(key, true)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${v === true ? 'bg-green-500 text-white border-green-500' : 'bg-white dark:bg-transparent text-gray-400 border-gray-300 dark:border-white/15 hover:border-green-400 hover:text-green-600'}`}
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setCL(key, false)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${v === false ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-transparent text-gray-400 border-gray-300 dark:border-white/15 hover:border-red-400 hover:text-red-600'}`}
                        >
                          Falla
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2.5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Mano de obra</p>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tarifa (asignada por la Ensambladora)</label>
                <p className="text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                  {tarifaAsignada
                    ? `${tarifaAsignada.descripcion || 'Mano de obra — revisión'} — $${Number(tarifaAsignada.valor_mano_obra).toLocaleString('es-CO')}`
                    : 'Sin tarifa asignada a esta revisión'}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Valor cobrado</label>
                <NumericInput
                  value={valorManoObra}
                  onChange={(e) => setValorManoObra(e.target.value)}
                  className={inputCls}
                  placeholder="Ej: 40000"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2.5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Piezas usadas</p>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={piezaBusqueda}
                  onChange={(e) => setPiezaBusqueda(e.target.value)}
                  className={`${inputCls} pl-8`}
                  placeholder="Buscar por código o nombre..."
                />
                {piezasFiltradas.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
                    {piezasFiltradas.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => agregarPieza(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-700 dark:text-gray-200">{p.nombre}</span>
                        <span className="text-xs text-gray-400 font-mono shrink-0">{p.codigo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {piezasSeleccionadas.length > 0 && (
                <div className="space-y-1.5">
                  {piezasSeleccionadas.map((p) => (
                    <div key={p.pieza_codigo} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.pieza_codigo}</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={p.cantidad}
                        onChange={(e) => actualizarCantidad(p.pieza_codigo, e.target.value)}
                        className="w-16 border border-gray-200 dark:border-white/10 rounded-md px-2 py-1 text-sm text-center bg-white dark:bg-graphite-2 dark:text-gray-100"
                      />
                      <button type="button" onClick={() => quitarPieza(p.pieza_codigo)} className="text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {piezasSeleccionadas.length === 0 && (
                <p className="text-xs text-gray-400">Ninguna pieza agregada — está bien si la revisión no requirió cambios.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Observaciones</label>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className={inputCls}
                placeholder="Ej: Cliente reporta ruido leve en suspensión delantera"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar revisión
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
