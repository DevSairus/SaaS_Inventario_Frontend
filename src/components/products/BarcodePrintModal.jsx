// frontend/src/components/products/BarcodePrintModal.jsx
// Imprimir etiquetas con código de barras de un producto usando el PERFIL de
// impresión del equipo (impresora + papel, Ajustes → Impresión de etiquetas;
// motor en utils/labelPrinting.js). Antes había 4 tamaños fijos y la página
// salía en tamaño "auto": en impresoras genéricas el navegador escalaba o
// corría las etiquetas.
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, Printer, Package, Wand2, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { productsAPI } from '../../api/products';
import { labelPrintingAPI } from '../../api/labelPrinting';
import useAuthStore from '../../store/authStore';
import LabelPreview from '../labels/LabelPreview';
import {
  DEFAULT_PROFILE, pickProfile, setDeviceProfileId, printProductLabels, labelsPerPage, normalizeProfile,
} from '../../utils/labelPrinting';

const MANAGE_ROLES = ['admin', 'manager'];

const generateEAN13 = () => {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return [...digits, check].join('');
};

export default function BarcodePrintModal({ isOpen, onClose, product, onBarcodeGenerated }) {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenant_id;
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [config, setConfig] = useState({ profiles: [], default_profile_id: null });
  const [profileId, setProfileId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [skip, setSkip] = useState(0);
  const [content, setContent] = useState({});
  const [printing, setPrinting] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState(null);
  const [generateMessage, setGenerateMessage] = useState('');
  // Barcode propio del modal: se inicializa con el del producto y se
  // actualiza localmente cuando se genera uno nuevo.
  const [currentBarcode, setCurrentBarcode] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    labelPrintingAPI.get()
      .then((res) => {
        const cfg = res.data || { profiles: [] };
        setConfig(cfg);
        setProfileId(pickProfile(cfg, tenantId).id);
      })
      .catch(() => setProfileId(DEFAULT_PROFILE.id));
  }, [isOpen, tenantId]);

  useEffect(() => {
    setCurrentBarcode(product?.barcode || null);
    setGenerateStatus(null);
    setGenerateMessage('');
  }, [product?.id]);

  const profile = useMemo(
    () => normalizeProfile(config.profiles.find((p) => p.id === profileId) || (config.profiles.length ? config.profiles[0] : DEFAULT_PROFILE)),
    [config, profileId]
  );

  // Contenido: arranca con lo del perfil y se puede ajustar para esta impresión.
  useEffect(() => {
    setContent({
      show_name: profile.show_name,
      show_sku: profile.show_sku,
      show_price: profile.show_price,
      show_barcode_text: profile.show_barcode_text,
    });
    setSkip(0);
  }, [profile]);

  const hasBarcode = Boolean(currentBarcode);
  const labelData = useMemo(() => ({
    name: product?.name,
    sku: product?.sku,
    barcode: currentBarcode,
    price: product?.sale_price ?? product?.price ?? null,
  }), [product, currentBarcode]);

  const handleGenerateAndSave = useCallback(async () => {
    if (!product) return;
    setGenerating(true);
    setGenerateStatus(null);
    setGenerateMessage('');
    try {
      const newBarcode = generateEAN13();
      const result = await productsAPI.update(product.id, { barcode: newBarcode });
      if (!result?.success) throw new Error(result?.message || 'Error al guardar');
      setCurrentBarcode(newBarcode);
      setGenerateStatus('success');
      setGenerateMessage(`Código ${newBarcode} guardado correctamente.`);
      if (onBarcodeGenerated) onBarcodeGenerated(product.id, newBarcode);
    } catch (err) {
      setGenerateStatus('error');
      setGenerateMessage(err?.response?.data?.message || err.message || 'No se pudo guardar el código.');
    } finally {
      setGenerating(false);
    }
  }, [product, onBarcodeGenerated]);

  const handleProfileChange = (id) => {
    setProfileId(id);
    // Lo que se elige aquí queda como perfil de este equipo.
    if (config.profiles.some((p) => p.id === id)) setDeviceProfileId(tenantId, id);
  };

  const handlePrint = useCallback(async () => {
    if (!product || !hasBarcode) return;
    setPrinting(true);
    try {
      const { overflow } = await printProductLabels(profile, labelData, { quantity, skip, overrides: content });
      if (overflow) toast('El código quedó más ancho que la etiqueta: revisa el perfil (margen interno o tamaño).', { icon: '⚠️' });
    } catch {
      toast.error('No se pudo preparar la impresión.');
    } finally {
      setPrinting(false);
    }
  }, [product, hasBarcode, profile, labelData, quantity, skip, content]);

  if (!isOpen || !product) return null;

  const perPage = labelsPerPage(profile);
  const rounded = profile.media !== 'sheet' && profile.fill_row && profile.columns > 1
    ? Math.ceil(quantity / profile.columns) * profile.columns : quantity;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-graphite rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Imprimir etiquetas</h2>
              <p className="text-xs text-gray-500 truncate max-w-[280px]">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Impresora / papel</label>
                {config.profiles.length > 0 ? (
                  <select value={profileId || ''} onChange={(e) => handleProfileChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100">
                    {config.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-graphite-2 rounded-lg p-2.5">
                    Sin perfiles configurados: se usa una etiqueta genérica de 50 × 30 mm.
                  </p>
                )}
                <Link to="/settings/label-printing" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1.5">
                  <Settings size={12} /> {canManage ? 'Configurar impresoras y papel' : 'Ver perfiles de impresión'}
                </Link>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Cantidad de etiquetas</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold text-lg">−</button>
                  <input type="number" min="1" max="500" value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)))}
                    className="w-20 text-center border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg py-2 text-sm font-medium" />
                  <button onClick={() => setQuantity((q) => Math.min(500, q + 1))}
                    className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold text-lg">+</button>
                </div>
                {rounded !== quantity && (
                  <p className="text-[11px] text-gray-500 mt-1">Se imprimirán {rounded} para completar filas de {profile.columns} columnas.</p>
                )}
              </div>

              {profile.media === 'sheet' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Etiquetas ya usadas en la hoja</label>
                  <input type="number" min="0" max={perPage - 1} value={skip}
                    onChange={(e) => setSkip(Math.max(0, Math.min(perPage - 1, parseInt(e.target.value, 10) || 0)))}
                    className="w-20 text-center border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg py-2 text-sm" />
                  <p className="text-[11px] text-gray-500 mt-1">Para aprovechar una hoja empezada: se salta esa cantidad de posiciones (de {perPage}).</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Contenido</label>
                <div className="space-y-2 bg-gray-50 dark:bg-graphite-2 rounded-xl p-3">
                  {[
                    ['show_name', 'Nombre del producto'],
                    ['show_barcode_text', 'Número debajo del código'],
                    ['show_sku', 'SKU / referencia'],
                    ['show_price', 'Precio de venta'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={!!content[key]} onChange={(e) => setContent((c) => ({ ...c, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-blue-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {!hasBarcode && (
                <div className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/30 p-3 space-y-2">
                  <div className="flex gap-2 items-start">
                    <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                      Este producto <strong>no tiene código de barras</strong>. Genera uno automáticamente (EAN-13) y se guardará en el producto.
                    </p>
                  </div>
                  <button onClick={handleGenerateAndSave} disabled={generating}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-xs font-semibold">
                    <Wand2 size={13} /> {generating ? 'Generando...' : 'Generar y guardar código de barras'}
                  </button>
                  {generateStatus === 'error' && (
                    <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} /> {generateMessage}</p>
                  )}
                </div>
              )}
              {generateStatus === 'success' && (
                <div className="flex gap-2 items-center bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/40 rounded-xl p-3">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">{generateMessage}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Vista previa</label>
              <div className="bg-gray-100 dark:bg-graphite-2 rounded-xl p-5 flex flex-col items-center justify-center min-h-[200px]">
                {hasBarcode ? (
                  <LabelPreview profile={profile} data={labelData} overrides={content} maxWidthPx={260} />
                ) : (
                  <p className="text-xs text-gray-500">Sin código de barras asignado</p>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                En el cuadro de impresión: Márgenes "Ninguno", Escala 100% y sin encabezados ni pies de página.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-graphite-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-graphite">
            Cancelar
          </button>
          <button onClick={handlePrint} disabled={!hasBarcode || printing}
            title={!hasBarcode ? 'Genera un código de barras primero' : ''}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <Printer size={16} /> {printing ? 'Preparando...' : `Imprimir ${rounded} etiqueta${rounded !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
