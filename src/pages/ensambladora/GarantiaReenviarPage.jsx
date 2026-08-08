import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ShieldAlert, Loader2, Plus, Trash2, Undo2, Camera, X, Search, AlertTriangle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ensambladoraGarantiasApi, ensambladoraVehiculosApi, ensambladoraMantenimientoApi } from '../../api/ensambladora';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100';

let nextItemKey = 0;
const emptyItem = () => ({ key: nextItemKey++, id: null, pieza_codigo: '', codigo_falla: '', cantidad: 1, file: null, previewUrl: null, eliminado: false });
const itemFromCore = (item) => ({
  key: nextItemKey++,
  id: item.id,
  pieza_codigo: item.CatalogoPieza?.codigo || '',
  codigo_falla: item.codigo_falla || '',
  cantidad: item.cantidad || 1,
  file: null,
  previewUrl: null,
  eliminado: false,
});

// Retomar una garantía "devuelta": la Ensambladora pidió correcciones o
// datos adicionales (ver `observaciones`) sin obligar a radicar una
// garantía nueva desde cero. Corrige/elimina renglones existentes y/o
// agrega nuevos, y la reenvía -- ver garantia.reenviada en
// eventoSyncHandlers.js del Core, que vuelve a poner la orden en "enviada".
export default function GarantiaReenviarPage() {
  const { localId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [catalogoPiezas, setCatalogoPiezas] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await ensambladoraGarantiasApi.getDetalle(localId);
        const data = res.data?.data;
        setDetalle(data);
        setItems((data?.OrdenGarantiaItems || []).map(itemFromCore));

        const vin = data?.Vehiculo?.vin;
        if (vin) {
          try {
            const vehiculoRes = await ensambladoraVehiculosApi.getByVin(vin);
            const vehiculo = vehiculoRes.data?.data ?? vehiculoRes.data ?? null;
            const marcaId = vehiculo?.marca?.id;
            const lineaId = vehiculo?.linea?.id;
            if (marcaId) {
              const piezasRes = await ensambladoraMantenimientoApi.catalogoPiezas(marcaId, lineaId);
              setCatalogoPiezas(piezasRes.data?.data ?? []);
            }
          } catch {
            // silencioso -- el formulario sigue usable como texto libre
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'No se pudo cargar la garantía');
      } finally {
        setLoading(false);
      }
    })();
  }, [localId]);

  const sugerenciasPara = (query) => {
    const q = query.trim().toLowerCase();
    if (!q || catalogoPiezas.length === 0) return [];
    return catalogoPiezas
      .filter((p) => p.codigo.toLowerCase() !== q && (p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)))
      .slice(0, 8);
  };

  const updateItem = (key, patch) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (key) => setItems((prev) => {
    const it = prev.find((i) => i.key === key);
    if (it?.id) return prev.map((i) => (i.key === key ? { ...i, eliminado: true } : i));
    return prev.filter((i) => i.key !== key);
  });
  const deshacerEliminar = (key) => updateItem(key, { eliminado: false });

  const handleFile = (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateItem(key, { file, previewUrl: URL.createObjectURL(file) });
  };

  const clearFile = (key) => updateItem(key, { file: null, previewUrl: null });

  const vin = detalle?.Vehiculo?.vin;
  const volverPath = vin ? `/ensambladora/vehiculos/${encodeURIComponent(vin)}` : '/ensambladora/buscar';

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activos = items.filter((it) => !it.eliminado);
    const activosValidos = activos.filter((it) => it.pieza_codigo.trim());
    if (activosValidos.length === 0) {
      toast.error('La garantía debe quedar con al menos un item con código de pieza.');
      return;
    }

    setSaving(true);
    try {
      const itemFiles = {};
      const payloadItems = activosValidos.map((it, idx) => {
        if (it.file) itemFiles[idx] = it.file;
        const base = {
          pieza_codigo: it.pieza_codigo.trim().toUpperCase(),
          codigo_falla: it.codigo_falla || undefined,
          cantidad: Number(it.cantidad) || 1,
        };
        return it.id ? { id: it.id, ...base } : base;
      });
      const itemsEliminar = items.filter((it) => it.eliminado && it.id).map((it) => it.id);

      await ensambladoraGarantiasApi.reenviar(localId, { items: payloadItems, items_eliminar: itemsEliminar }, itemFiles);
      toast.success('Garantía reenviada');
      navigate(volverPath);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'No se pudo reenviar la garantía';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!detalle) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto py-6 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No se pudo cargar esta garantía.
        </div>
      </Layout>
    );
  }

  if (detalle.estado !== 'devuelta') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto py-6 px-4">
          <div className="text-center py-10 border border-dashed border-gray-300 dark:border-white/10 rounded-xl">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Esta garantía ya no está en estado "Devuelta" -- no se puede reenviar.
            </p>
            <Link to={volverPath} className="inline-block mt-4 text-sm font-medium text-primary-600">
              Volver al vehículo
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-6 px-4">
        <Link
          to={volverPath}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al vehículo
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Corregir y reenviar garantía</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">{vin}</p>

        {detalle.observaciones && (
          <div className="mb-5 border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-900/10 rounded-xl px-3 py-2.5">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-0.5">Motivo de la devolución</p>
            <p className="text-sm text-orange-800 dark:text-orange-200">{detalle.observaciones}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={it.key}
                className={`bg-white dark:bg-graphite-2 border rounded-xl p-3 space-y-2.5 ${
                  it.eliminado ? 'border-red-200 dark:border-red-900/40 opacity-50' : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Item {idx + 1} {it.id ? '(ya radicado)' : '(nuevo)'} {it.eliminado ? '· marcado para eliminar' : ''}
                  </p>
                  {it.eliminado ? (
                    <button type="button" onClick={() => deshacerEliminar(it.key)} className="text-gray-400 hover:text-primary-600" title="Deshacer">
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => removeItem(it.key)} className="text-gray-400 hover:text-red-500" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!it.eliminado && (
                  <>
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
                  </>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-primary-600 font-medium">
            <Plus className="w-4 h-4" />
            Agregar item
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Reenviar garantía
          </button>
        </form>
      </div>
    </Layout>
  );
}
