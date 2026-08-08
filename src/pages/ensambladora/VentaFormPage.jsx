import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ShoppingCart, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraVehiculosApi, ensambladoraVentasApi } from '../../api/ensambladora';
import TecnicoAutocomplete from '../../components/ensambladora/TecnicoAutocomplete';
import useUsuarioTecnico from '../../hooks/useUsuarioTecnico';
import NumericInput from '../../components/inputs/NumericInput';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';
const today = () => new Date().toISOString().slice(0, 10);

export default function VentaFormPage() {
  const { vin } = useParams();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [disponible, setDisponible] = useState(null);
  const [motivo, setMotivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fecha_venta: today(),
    cliente_documento: '',
    cliente_nombre: '',
    cliente_telefono: '',
    precio: '',
    vendedor_documento: '',
  });

  // El vendedor es, por defecto, quien inició sesión -- un admin puede
  // elegir a otra persona (autocomplete), mismo criterio que CotizarPage.
  const { documentoPropio, esAdmin, loading: cargandoUsuario } = useUsuarioTecnico();
  useEffect(() => {
    if (documentoPropio) setForm((p) => ({ ...p, vendedor_documento: documentoPropio }));
  }, [documentoPropio]);

  // Se valida disponibilidad en línea apenas se entra al formulario — el
  // mismo chequeo se repite en el servidor al confirmar (puede haber una
  // carrera con otro CSA), pero así se evita que alguien llene todo el
  // formulario para un vehículo que ya no está disponible.
  useEffect(() => {
    let active = true;
    setChecking(true);
    ensambladoraVehiculosApi.validarDisponibilidad(vin)
      .then((res) => {
        if (!active) return;
        setDisponible(!!res.data?.disponible);
        setMotivo(res.data?.motivo || null);
      })
      .catch(() => { if (active) { setDisponible(false); setMotivo('error_validando'); } })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [vin]);

  const setF = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!disponible) {
      toast.error('El vehículo no está disponible para venta.');
      return;
    }
    if (!form.fecha_venta) {
      toast.error('La fecha de venta es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      await ensambladoraVentasApi.create({
        vin,
        fecha_venta: form.fecha_venta,
        cliente_documento: form.cliente_documento || undefined,
        cliente_nombre: form.cliente_nombre || undefined,
        cliente_telefono: form.cliente_telefono || undefined,
        precio: form.precio ? Number(form.precio) : undefined,
        vendedor_documento: form.vendedor_documento || undefined,
      });
      toast.success('Venta registrada');
      navigate(`/ensambladora/vehiculos/${encodeURIComponent(vin)}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo registrar la venta';
      toast.error(msg);
      // Si el 409 fue por disponibilidad (carrera con otro CSA), refleja
      // el estado en la UI en vez de dejar el botón habilitado.
      if (err.response?.status === 409) setDisponible(false);
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
          <ShoppingCart className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registrar venta</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-mono">{vin}</p>

        {checking && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Validando disponibilidad en línea…
          </div>
        )}

        {!checking && disponible === false && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2.5 mb-5 text-sm text-red-700 dark:text-red-300">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Este vehículo no está disponible para venta{motivo ? ` (${motivo})` : ''}.
              <div>
                <Link to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}`} className="underline font-medium">
                  Ver ficha del vehículo
                </Link>
              </div>
            </div>
          </div>
        )}

        {!checking && disponible === true && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 rounded-lg px-3 py-2.5 mb-5 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Disponible para venta.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de venta *</label>
            <input type="date" required value={form.fecha_venta} onChange={(e) => setF('fecha_venta', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Documento del cliente</label>
            <input type="text" value={form.cliente_documento} onChange={(e) => setF('cliente_documento', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre del cliente</label>
            <input type="text" value={form.cliente_nombre} onChange={(e) => setF('cliente_nombre', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono del cliente</label>
            <input type="tel" value={form.cliente_telefono} onChange={(e) => setF('cliente_telefono', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Precio</label>
            <NumericInput value={form.precio} onChange={(e) => setF('precio', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vendedor</label>
            {esAdmin ? (
              <TecnicoAutocomplete value={form.vendedor_documento} onChange={(v) => setF('vendedor_documento', v)} placeholder="Cédula o nombre" />
            ) : (
              <input
                type="text"
                value={cargandoUsuario ? 'Cargando…' : form.vendedor_documento}
                disabled
                className={`${inputCls} text-gray-400 dark:text-gray-500 cursor-not-allowed`}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={saving || checking || !disponible}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar venta
          </button>
        </form>
      </div>
    </Layout>
  );
}
