import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraAlistamientosApi, ensambladoraVehiculosApi, ensambladoraLiquidacionesApi } from '../../api/ensambladora';
import TecnicoAutocomplete from '../../components/ensambladora/TecnicoAutocomplete';
import useUsuarioTecnico from '../../hooks/useUsuarioTecnico';
import NumericInput from '../../components/inputs/NumericInput';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';
const today = () => new Date().toISOString().slice(0, 10);

// Checklist de alistamiento (PDI) previo a la entrega. No hay un catálogo
// fijo de items en el Core (`checklist` es JSONB libre — ver
// OrdenAlistamiento.js), así que se usa un set genérico razonable; se
// puede ajustar según lo que realmente pida cada ensambladora/marca.
const CHECKLIST_ITEMS = [
  { key: 'niveles_fluidos', label: 'Niveles de fluidos' },
  { key: 'presion_llantas', label: 'Presión de llantas' },
  { key: 'bateria',         label: 'Batería' },
  { key: 'luces',           label: 'Luces' },
  { key: 'limpieza',        label: 'Limpieza general' },
  { key: 'documentos',      label: 'Documentos del vehículo' },
  { key: 'accesorios',      label: 'Accesorios de fábrica completos' },
  { key: 'prueba_manejo',   label: 'Prueba de manejo' },
];

export default function AlistamientoFormPage() {
  const { vin } = useParams();
  const navigate = useNavigate();

  const [fecha, setFecha] = useState(today());
  const [responsable, setResponsable] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [checklist, setChecklist] = useState({});
  const [saving, setSaving] = useState(false);

  // Responsable es, por defecto, quien inició sesión -- un admin puede
  // elegir a otra persona (autocomplete), mismo criterio que VentaFormPage.
  const { documentoPropio, esAdmin, loading: cargandoUsuario } = useUsuarioTecnico();
  useEffect(() => {
    if (documentoPropio) setResponsable(documentoPropio);
  }, [documentoPropio]);

  // Sin esto, el alistamiento nunca llevaba ningún valor de mano de obra al
  // Core -- se busca la tarifa de tipo 'alistamiento' vigente para la marca
  // del vehículo (mismo mecanismo que RevisionFormPage.jsx con la tarifa de
  // su política), y queda editable por si el taller cobra un valor distinto.
  const [tarifarioServicioId, setTarifarioServicioId] = useState(null);
  const [tarifaAsignada, setTarifaAsignada] = useState(null);
  const [valorManoObra, setValorManoObra] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await ensambladoraVehiculosApi.getByVin(vin);
        const vehiculo = res.data?.data ?? res.data ?? null;
        const marcaId = vehiculo?.marca?.id;
        if (!marcaId) return;
        const tarifasRes = await ensambladoraLiquidacionesApi.tarifarioVigente(marcaId);
        const tarifas = tarifasRes.data?.data ?? [];
        const tarifa = tarifas.find((t) => t.tipo_servicio === 'alistamiento') || null;
        if (tarifa) {
          setTarifarioServicioId(tarifa.id);
          setTarifaAsignada(tarifa);
          setValorManoObra(tarifa.valor_mano_obra);
        }
      } catch {
        // silencioso -- el formulario sigue usable sin tarifa (valor manual)
      }
    })();
  }, [vin]);

  const setCL = (key, val) => setChecklist((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha) {
      toast.error('La fecha es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      await ensambladoraAlistamientosApi.create({
        vin,
        fecha,
        responsable: responsable || undefined,
        checklist,
        observaciones: observaciones || undefined,
        tarifario_servicio_id: tarifarioServicioId || undefined,
        valor_mano_obra: valorManoObra !== '' ? Number(valorManoObra) : undefined,
      });
      toast.success('Alistamiento registrado');
      navigate(`/ensambladora/vehiculos/${encodeURIComponent(vin)}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo registrar el alistamiento';
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
          <ClipboardCheck className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registrar alistamiento</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-mono">{vin}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha *</label>
              <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responsable</label>
              {esAdmin ? (
                <TecnicoAutocomplete value={responsable} onChange={setResponsable} placeholder="Cédula o nombre" />
              ) : (
                <input
                  type="text"
                  value={cargandoUsuario ? 'Cargando…' : responsable}
                  disabled
                  className={`${inputCls} text-gray-400 dark:text-gray-500 cursor-not-allowed`}
                />
              )}
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
                  ? `${tarifaAsignada.descripcion || 'Mano de obra — alistamiento'} — $${Number(tarifaAsignada.valor_mano_obra).toLocaleString('es-CO')}`
                  : 'Sin tarifa asignada para alistamiento'}
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

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Observaciones</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={inputCls}
              placeholder="Ej: Rayón leve en guardabarro derecho"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar alistamiento
          </button>
        </form>
      </div>
    </Layout>
  );
}
