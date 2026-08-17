import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ShieldAlert, Loader2, Plus, Trash2, Camera, X, Search, CheckCircle2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraGarantiasApi, ensambladoraVehiculosApi, ensambladoraMantenimientoApi } from '../../api/ensambladora';
import ComprobanteAcciones from '../../components/ensambladora/ComprobanteAcciones';
import TecnicoAutocomplete from '../../components/ensambladora/TecnicoAutocomplete';
import useUsuarioTecnico from '../../hooks/useUsuarioTecnico';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';

let nextItemKey = 0;
const emptyItem = () => ({ key: nextItemKey++, pieza_codigo: '', codigo_falla: '', cantidad: 1, file: null, previewUrl: null });

export default function GarantiaFormPage() {
  const { vin } = useParams();

  const [tecnicoDocumento, setTecnicoDocumento] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [catalogoPiezas, setCatalogoPiezas] = useState([]);
  const [garantiaCreada, setGarantiaCreada] = useState(null);

  // Quién atiende es, por defecto, quien inició sesión -- un admin puede
  // elegir a otra persona (autocomplete), mismo criterio que VentaFormPage.
  const { documentoPropio, esAdmin, loading: cargandoUsuario } = useUsuarioTecnico();
  useEffect(() => {
    if (documentoPropio) setTecnicoDocumento(documentoPropio);
  }, [documentoPropio]);

  // Trae el catálogo de piezas de la marca/línea del vehículo para
  // sugerir códigos válidos -- mismo patrón que RevisionFormPage.jsx. Si
  // falla (o el catálogo queda vacío) el input sigue funcionando como
  // texto libre, solo sin sugerencias.
  useEffect(() => {
    (async () => {
      try {
        const res = await ensambladoraVehiculosApi.getByVin(vin);
        const vehiculo = res.data?.data ?? res.data ?? null;
        const marcaId = vehiculo?.marca?.id;
        const lineaId = vehiculo?.linea?.id;
        if (!marcaId) return;
        const piezasRes = await ensambladoraMantenimientoApi.catalogoPiezas(marcaId, lineaId);
        setCatalogoPiezas(piezasRes.data?.data ?? []);
      } catch {
        // silencioso -- el formulario sigue usable como texto libre
      }
    })();
  }, [vin]);

  const sugerenciasPara = (query) => {
    const q = query.trim().toLowerCase();
    if (!q || catalogoPiezas.length === 0) return [];
    return catalogoPiezas
      .filter((p) => p.codigo.toLowerCase() !== q && (p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)))
      .slice(0, 8);
  };

  const updateItem = (key, patch) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (key) => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));

  const handleFile = (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateItem(key, { file, previewUrl: URL.createObjectURL(file) });
  };

  const clearFile = (key) => updateItem(key, { file: null, previewUrl: null });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const itemsValidos = items.filter((it) => it.pieza_codigo.trim());
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos un item con código de pieza.');
      return;
    }

    setSaving(true);
    try {
      const itemFiles = {};
      const payloadItems = itemsValidos.map((it, idx) => {
        if (it.file) itemFiles[idx] = it.file;
        return {
          pieza_codigo: it.pieza_codigo.trim().toUpperCase(),
          codigo_falla: it.codigo_falla || undefined,
          cantidad: Number(it.cantidad) || 1,
        };
      });

      const res = await ensambladoraGarantiasApi.create(
        { vin, tecnico_documento: tecnicoDocumento || undefined, items: payloadItems },
        itemFiles
      );
      toast.success('Garantía radicada');
      // No navega de una -- primero se ofrece el comprobante/link para el
      // cliente (ver ComprobanteAcciones), igual criterio que "dejó la moto".
      setGarantiaCreada(res.data?.data ?? null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo radicar la garantía';
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
          <ShieldAlert className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Radicar garantía</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-mono">{vin}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          El código de pieza debe existir en el catálogo de la marca del vehículo -- si no existe, la Ensambladora rechaza el item.
        </p>

        {garantiaCreada && (
          <div className="space-y-4">
            <div className="text-center py-8 border border-dashed border-green-300 dark:border-green-900/40 rounded-xl bg-green-50 dark:bg-green-900/10">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Garantía radicada</p>
            </div>
            <ComprobanteAcciones tipo="garantia" id={garantiaCreada.id} />
            <Link
              to={`/ensambladora/vehiculos/${encodeURIComponent(vin)}`}
              className="block text-center text-sm font-medium text-primary-600 py-2"
            >
              Volver al vehículo
            </Link>
          </div>
        )}

        {!garantiaCreada && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Técnico</label>
            {esAdmin ? (
              <TecnicoAutocomplete value={tecnicoDocumento} onChange={setTecnicoDocumento} placeholder="Cédula o nombre de quien atiende" />
            ) : (
              <input
                type="text"
                value={cargandoUsuario ? 'Cargando…' : tecnicoDocumento}
                disabled
                className={`${inputCls} text-gray-400 dark:text-gray-500 cursor-not-allowed`}
              />
            )}
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={it.key} className="bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Item {idx + 1}</p>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(it.key)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Código de pieza *</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={it.pieza_codigo}
                        onChange={(e) => updateItem(it.key, { pieza_codigo: e.target.value })}
                        className={`${inputCls} uppercase pl-7`}
                        placeholder="Ej: MOT-001 o buscar por nombre"
                      />
                    </div>
                    {sugerenciasPara(it.pieza_codigo).length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
                        {sugerenciasPara(it.pieza_codigo).map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => updateItem(it.key, { pieza_codigo: p.codigo })}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between gap-2"
                          >
                            <span className="text-gray-700 dark:text-gray-200 truncate">{p.nombre}</span>
                            <span className="text-xs text-gray-400 font-mono shrink-0">{p.codigo}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={it.cantidad}
                      onChange={(e) => updateItem(it.key, { cantidad: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Falla reportada</label>
                  <input
                    type="text"
                    value={it.codigo_falla}
                    onChange={(e) => updateItem(it.key, { codigo_falla: e.target.value })}
                    className={inputCls}
                    placeholder="Descripción breve de la falla"
                  />
                </div>

                <div>
                  {!it.previewUrl ? (
                    <label className="flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-white/15 rounded-lg px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary-400 hover:text-primary-600">
                      <Camera className="w-3.5 h-3.5" />
                      Adjuntar foto de evidencia
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(it.key, e)} className="hidden" />
                    </label>
                  ) : (
                    <div className="relative inline-block">
                      <img src={it.previewUrl} alt="Evidencia" className="max-h-32 rounded-lg border border-gray-200 dark:border-white/10" />
                      <button type="button" onClick={() => clearFile(it.key)} className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-sm text-primary-600 font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar item
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Radicar garantía
          </button>
        </form>
        )}
      </div>
    </Layout>
  );
}
