import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Loader2, Plus, Trash2, Printer, CheckCircle2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraCotizacionesApi } from '../../api/ensambladora';
import TecnicoAutocomplete from '../../components/ensambladora/TecnicoAutocomplete';
import useUsuarioTecnico from '../../hooks/useUsuarioTecnico';
import NumericInput from '../../components/inputs/NumericInput';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';
const today = () => new Date().toISOString().slice(0, 10);

const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

let nextRubroKey = 0;
const nuevoRubro = (concepto = '', valor = '') => ({ key: nextRubroKey++, concepto, valor });

/**
 * Cotización de una moto todavía no vendida -- el asesor la genera para
 * entregarle al cliente un documento con la moto + gastos de matrícula +
 * otros rubros, sin que exista todavía una venta/VIN asignado. Queda
 * registrada en la Ensambladora vía el evento cotizacion.creada (ver
 * cotizaciones.controller.js).
 */
export default function CotizarPage() {
  const [marcas, setMarcas] = useState([]);
  const [marcaId, setMarcaId] = useState('');
  const [lineas, setLineas] = useState([]);
  const [lineaId, setLineaId] = useState('');
  const [cargandoLineas, setCargandoLineas] = useState(false);

  const [precioMoto, setPrecioMoto] = useState('');
  const [rubros, setRubros] = useState([]); // matrícula/otros -- la moto no vive acá, tiene su propio campo

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [tecnicoDocumento, setTecnicoDocumento] = useState('');
  const [fecha, setFecha] = useState(today());

  const [saving, setSaving] = useState(false);
  const [cotizacionCreada, setCotizacionCreada] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(false);

  // El asesor es, por defecto, quien inició sesión -- un admin puede elegir
  // a otra persona (autocomplete) porque suele cotizar en nombre del equipo.
  const { documentoPropio, esAdmin, loading: cargandoUsuario } = useUsuarioTecnico();
  useEffect(() => {
    if (documentoPropio) setTecnicoDocumento(documentoPropio);
  }, [documentoPropio]);

  useEffect(() => {
    ensambladoraCotizacionesApi
      .marcas()
      .then((res) => setMarcas(res.data?.data ?? []))
      .catch(() => toast.error('No se pudieron cargar las marcas'));
  }, []);

  useEffect(() => {
    setLineaId('');
    setPrecioMoto('');
    if (!marcaId) {
      setLineas([]);
      return;
    }
    setCargandoLineas(true);
    ensambladoraCotizacionesApi
      .lineas(marcaId)
      .then((res) => setLineas(res.data?.data ?? []))
      .catch(() => toast.error('No se pudieron cargar las líneas'))
      .finally(() => setCargandoLineas(false));
  }, [marcaId]);

  const lineaSeleccionada = lineas.find((l) => l.id === lineaId) || null;

  useEffect(() => {
    setPrecioMoto(lineaSeleccionada?.precio_lista || '');
  }, [lineaSeleccionada]);

  const total = useMemo(() => {
    const base = Number(precioMoto) || 0;
    const extra = rubros.reduce((suma, r) => suma + (Number(r.valor) || 0), 0);
    return base + extra;
  }, [precioMoto, rubros]);

  const agregarRubro = (concepto = '') => setRubros((prev) => [...prev, nuevoRubro(concepto)]);
  const actualizarRubro = (key, patch) => setRubros((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const quitarRubro = (key) => setRubros((prev) => prev.filter((r) => r.key !== key));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lineaId || !precioMoto) {
      toast.error('Elige una línea y el precio de la moto.');
      return;
    }
    setSaving(true);
    try {
      const items = [
        { concepto: `Moto ${lineaSeleccionada?.nombre || ''}`.trim(), valor: Number(precioMoto) },
        ...rubros.filter((r) => r.concepto.trim()).map((r) => ({ concepto: r.concepto.trim(), valor: Number(r.valor) || 0 })),
      ];
      const res = await ensambladoraCotizacionesApi.create({
        linea_id: lineaId,
        linea_nombre: lineaSeleccionada?.nombre || null,
        tecnico_documento: tecnicoDocumento || undefined,
        cliente_nombre: clienteNombre || undefined,
        cliente_documento: clienteDocumento || undefined,
        cliente_telefono: clienteTelefono || undefined,
        fecha,
        items,
      });
      toast.success('Cotización generada');
      setCotizacionCreada(res.data?.data ?? null);
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo generar la cotización';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleImprimir = async () => {
    if (!cotizacionCreada) return;
    setImprimiendo(true);
    try {
      const res = await ensambladoraCotizacionesApi.getPdf(cotizacionCreada.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('No se pudo generar el documento. Intenta de nuevo.');
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-6 px-4">
        <Link
          to="/ensambladora/buscar"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cotizar</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Para una moto todavía no vendida -- precio + matrícula y otros rubros, en un solo documento para el cliente.
        </p>

        {cotizacionCreada ? (
          <div className="space-y-4">
            <div className="text-center py-8 border border-dashed border-green-300 dark:border-green-900/40 rounded-xl bg-green-50 dark:bg-green-900/10">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Cotización generada</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{COP(cotizacionCreada.total)}</p>
            </div>
            <button
              type="button"
              onClick={handleImprimir}
              disabled={imprimiendo}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-40"
            >
              {imprimiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Imprimir cotización
            </button>
            <button
              type="button"
              onClick={() => {
                setCotizacionCreada(null);
                setRubros([]);
                setClienteNombre('');
                setClienteDocumento('');
                setClienteTelefono('');
              }}
              className="w-full text-center text-sm font-medium text-primary-600 py-2"
            >
              Cotizar otra
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Marca *</label>
                <select required value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className={inputCls}>
                  <option value="" disabled>Selecciona…</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Línea *</label>
                <select
                  required
                  disabled={!marcaId || cargandoLineas}
                  value={lineaId}
                  onChange={(e) => setLineaId(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>{cargandoLineas ? 'Cargando…' : 'Selecciona…'}</option>
                  {lineas.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Moto{lineaSeleccionada ? ` — ${lineaSeleccionada.nombre}` : ''}
                </p>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{COP(precioMoto)}</span>
              </div>
              <NumericInput
                required
                value={precioMoto}
                onChange={(e) => setPrecioMoto(e.target.value)}
                placeholder="Precio de la moto"
                className={inputCls}
              />
              {lineaSeleccionada && !lineaSeleccionada.precio_lista && (
                <p className="text-xs text-gray-400">Esta línea no tiene precio de lista configurado -- ingrésalo a mano.</p>
              )}
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Otros rubros</p>
                <button
                  type="button"
                  onClick={() => agregarRubro('Matrícula')}
                  className="text-xs font-medium text-primary-600"
                >
                  + Matrícula
                </button>
              </div>
              {rubros.map((r) => (
                <div key={r.key} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={r.concepto}
                    onChange={(e) => actualizarRubro(r.key, { concepto: e.target.value })}
                    placeholder="Concepto"
                    className={`${inputCls} flex-1`}
                  />
                  <NumericInput
                    value={r.valor}
                    onChange={(e) => actualizarRubro(r.key, { valor: e.target.value })}
                    placeholder="Valor"
                    className={`${inputCls} w-32`}
                  />
                  <button type="button" onClick={() => quitarRubro(r.key)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => agregarRubro()}
                className="flex items-center gap-1.5 text-sm text-primary-600 font-medium"
              >
                <Plus className="w-4 h-4" />
                Agregar rubro
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{COP(total)}</span>
            </div>

            <div className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2.5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cliente</p>
              <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Nombre" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={clienteDocumento} onChange={(e) => setClienteDocumento(e.target.value)} placeholder="Documento" className={inputCls} />
                <input type="text" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} placeholder="Teléfono" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Asesor</label>
                {esAdmin ? (
                  <TecnicoAutocomplete value={tecnicoDocumento} onChange={setTecnicoDocumento} placeholder="Cédula o nombre" />
                ) : (
                  <input
                    type="text"
                    value={cargandoUsuario ? 'Cargando…' : tecnicoDocumento}
                    disabled
                    className={`${inputCls} text-gray-400 dark:text-gray-500 cursor-not-allowed`}
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha *</label>
                <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Generar cotización
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
