import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import api from '../../api/axios';
import { categoriesAPI } from '../../api/categories';
import { physicalCountsAPI, triggerBlobDownload } from '../../api/physicalCounts';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';

// Flujo de 3 pasos para el conteo físico de inventario por Excel.
// Ver: 00 - Documentación/Pitbox-Tecnicos-InventarioFisico-EnTramite-Analisis-y-Plan.md, sección 2.3.
const STEPS = [
  { id: 1, label: 'Generar' },
  { id: 2, label: 'Subir' },
  { id: 3, label: 'Confirmar' }
];

const StepIndicator = ({ current }) => (
  <div className="flex items-center gap-3 mb-6">
    {STEPS.map((s, i) => (
      <div key={s.id} className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            current === s.id
              ? 'bg-indigo-600 text-white'
              : current > s.id
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-500 dark:bg-graphite-2 dark:text-gray-500'
          }`}
        >
          {current > s.id ? <CheckCircle className="w-4 h-4" /> : <span>{s.id}</span>}
          {s.label}
        </div>
        {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 dark:bg-white/10" />}
      </div>
    ))}
  </div>
);

const SummaryCard = ({ label, value, subvalue, tone = 'gray' }) => {
  const tones = {
    gray: 'bg-gray-50 dark:bg-graphite-2',
    green: 'bg-green-50 dark:bg-green-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20'
  };
  const textTones = {
    gray: 'text-gray-900 dark:text-gray-100',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-700 dark:text-red-300',
    yellow: 'text-yellow-700 dark:text-yellow-300',
    orange: 'text-orange-700 dark:text-orange-300'
  };
  return (
    <div className={`rounded-lg p-4 text-center ${tones[tone]}`}>
      <p className={`text-2xl font-bold ${textTones[tone]}`}>{value}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      {subvalue != null && <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{subvalue}</p>}
    </div>
  );
};

const PhysicalCountPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Paso 1: formulario
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Sesión creada
  const [count, setCount] = useState(null); // { id, count_number }

  // Paso 2: subida y preview
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [treatEmptyAsZero, setTreatEmptyAsZero] = useState(false);
  const [applyConflicts, setApplyConflicts] = useState(false);

  // Paso 3: resultado
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [whRes, catRes] = await Promise.all([
          api.get('/inventory/warehouses'),
          categoriesAPI.getAll(false)
        ]);
        setWarehouses(whRes.data?.data || whRes.data || []);
        setCategories(catRes.data || []);
      } catch {
        // Los selects quedan vacíos; el usuario aún puede generar sin filtros.
      }
    };
    loadOptions();
  }, []);

  // ── Paso 1: generar sesión + plantilla ──────────────────────────
  const handleGenerate = async () => {
    setIsProcessing(true);
    try {
      const payload = {};
      if (warehouseId) payload.warehouse_id = warehouseId;
      if (categoryId) payload.category_id = categoryId;
      if (includeInactive) payload.include_inactive = true;

      const createRes = await physicalCountsAPI.create(payload);
      const created = createRes.data;
      setCount(created);

      const blob = await physicalCountsAPI.downloadTemplate(created.id);
      triggerBlobDownload(blob, `${created.count_number || 'conteo-fisico'}.xlsx`);

      toast.success(`Sesión ${created.count_number} creada. Plantilla descargada.`);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al generar el conteo físico');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Paso 2: subir (dry run) ──────────────────────────────────────
  // Las opciones se reciben explícitas (no se leen del state) porque los
  // handlers de las casillas llaman a runPreview en el mismo tick en que
  // cambian el state -- leerlas del closure daría el valor previo al toggle
  // (bug de closure obsoleto), mostrando un preview desalineado con la
  // casilla que el usuario acaba de marcar.
  const runPreview = async (selectedFile, { treatEmptyAsZero: teaz, applyConflicts: ac } = {}) => {
    if (!selectedFile || !count) return;
    setIsProcessing(true);
    try {
      const response = await physicalCountsAPI.upload(count.id, selectedFile, true, {
        treat_empty_as_zero: teaz ?? treatEmptyAsZero,
        apply_despite_conflict: ac ?? applyConflicts
      });
      setPreview(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el archivo');
      setPreview(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      runPreview(selected);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      runPreview(dropped);
    }
  };

  // Re-ejecuta el preview cuando cambian las casillas (empty-as-zero / conflictos)
  const handleTreatEmptyAsZeroChange = (checked) => {
    setTreatEmptyAsZero(checked);
    if (file) runPreview(file, { treatEmptyAsZero: checked });
  };
  const handleApplyConflictsChange = (checked) => {
    setApplyConflicts(checked);
    if (file) runPreview(file, { applyConflicts: checked });
  };

  // ── Paso 3: aplicar ──────────────────────────────────────────────
  const handleApply = async () => {
    if (!file || !count) return;
    setIsProcessing(true);
    try {
      const response = await physicalCountsAPI.upload(count.id, file, false, {
        treat_empty_as_zero: treatEmptyAsZero,
        apply_despite_conflict: applyConflicts
      });
      setResult(response.data);
      setStep(3);
      toast.success('Conteo físico aplicado correctamente');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al aplicar el conteo físico');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setCount(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setTreatEmptyAsZero(false);
    setApplyConflicts(false);
  };

  const summary = preview?.summary || {};

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario físico</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
              Genera una plantilla, cuenta físicamente y sube el Excel para ajustar el stock automáticamente
            </p>
          </div>
          <button
            onClick={() => navigate('/inventory/physical-counts')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Ver historial
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 dark:bg-graphite">
          <StepIndicator current={step} />

          {/* Paso 1: Generar */}
          {step === 1 && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bodega</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                >
                  <option value="">Todas las bodegas</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                />
                Incluir productos inactivos
              </label>

              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 transition-all disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {isProcessing ? 'Generando...' : 'Generar plantilla'}
              </button>
            </div>
          )}

          {/* Paso 2: Subir + preview */}
          {step === 2 && (
            <div className="space-y-5">
              {count && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800/40 dark:text-indigo-300">
                  Sesión <strong>{count.count_number}</strong>. Diligencia la columna "Conteo físico" en el Excel descargado y súbelo aquí.
                </div>
              )}

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-white/10 hover:border-indigo-400'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="physical-count-upload"
                />
                <label htmlFor="physical-count-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {file ? file.name : 'Arrastra el Excel diligenciado o haz clic para seleccionarlo'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 dark:text-gray-500">XLSX o XLS</p>
                </label>
              </div>

              {isProcessing && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-500">Procesando archivo...</div>
              )}

              {preview && !isProcessing && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <SummaryCard
                      tone="green"
                      label="Sobrantes"
                      value={formatNumber(summary.sobrantes?.unidades || 0)}
                      subvalue={formatCurrency(summary.sobrantes?.valor || 0)}
                    />
                    <SummaryCard
                      tone="red"
                      label="Faltantes"
                      value={formatNumber(summary.faltantes?.unidades || 0)}
                      subvalue={formatCurrency(summary.faltantes?.valor || 0)}
                    />
                    <SummaryCard
                      tone="gray"
                      label="No contados"
                      value={summary.no_contados ?? 0}
                    />
                    <SummaryCard
                      tone="yellow"
                      label="Errores"
                      value={preview.errores?.length || 0}
                    />
                    <SummaryCard
                      tone="orange"
                      label="Conflictos"
                      value={preview.conflictos?.length || 0}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={treatEmptyAsZero}
                      onChange={(e) => handleTreatEmptyAsZeroChange(e.target.checked)}
                    />
                    Tratar celdas vacías como cero (por defecto se ignoran como "no contado")
                  </label>

                  {/* Filas con diferencia */}
                  {preview.filas?.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden dark:border-white/10">
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                          <thead className="bg-gray-50 dark:bg-graphite-2 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Código</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Nombre</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Sistema</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Contado</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Diferencia</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200 dark:bg-graphite dark:divide-white/10">
                            {preview.filas.map((row, i) => (
                              <tr key={row.product_id || i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.sku}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.name}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-500">{formatNumber(row.system_qty)}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-500">{formatNumber(row.counted_qty)}</td>
                                <td className={`px-4 py-2 text-sm text-right font-medium ${row.diff_qty > 0 ? 'text-green-600' : row.diff_qty < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                  {row.diff_qty > 0 ? '+' : ''}{formatNumber(row.diff_qty)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Errores */}
                  {preview.errores?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-56 overflow-y-auto dark:bg-red-900/10 dark:border-red-800/40">
                      <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Errores encontrados
                      </h4>
                      <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                        {preview.errores.map((err, i) => (
                          <li key={i}>Fila {err.row} - {err.sku}: {(err.errors || []).join('; ')}</li>
                        ))}
                      </ul>
                      {preview.errores_truncados && (
                        <p className="text-xs text-red-700 dark:text-red-400 mt-2">Se muestran solo los primeros errores; hay más sin listar.</p>
                      )}
                    </div>
                  )}

                  {/* Conflictos */}
                  {preview.conflictos?.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-900/10 dark:border-orange-800/40">
                      <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Conflictos (hubo movimientos desde la descarga)
                      </h4>
                      <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1 mb-3">
                        {preview.conflictos.map((c, i) => (
                          <li key={i}>
                            {c.sku} - {c.name}: sistema al descargar {formatNumber(c.system_qty)}, actual {formatNumber(c.current_stock)}, contado {formatNumber(c.counted_qty)} (diferencia sería {c.would_be_diff > 0 ? '+' : ''}{formatNumber(c.would_be_diff)})
                          </li>
                        ))}
                      </ul>
                      <label className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-300">
                        <input
                          type="checkbox"
                          checked={applyConflicts}
                          onChange={(e) => handleApplyConflictsChange(e.target.checked)}
                        />
                        Ajustar igualmente a lo contado
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!preview || isProcessing}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Confirmar */}
          {step === 3 && (
            <div className="space-y-5">
              {!result && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Se aplicará el conteo: se creará un ajuste de entrada para los sobrantes y uno de salida para los faltantes.
                    Esta acción no se puede deshacer y el archivo no podrá volver a aplicarse.
                  </p>
                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? 'Aplicando...' : 'Aplicar conteo'}
                    </button>
                  </div>
                </>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800/40">
                    <p className="text-green-900 dark:text-green-300 font-medium flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Conteo {result.count_number} aplicado exitosamente
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.entry_adjustment_id && (
                      <button
                        onClick={() => navigate(`/adjustments/${result.entry_adjustment_id}`)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">Ver ajuste de entrada (sobrantes)</span>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    {result.exit_adjustment_id && (
                      <button
                        onClick={() => navigate(`/adjustments/${result.exit_adjustment_id}`)}
                        className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">Ver ajuste de salida (faltantes)</span>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={resetFlow}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      Nuevo conteo
                    </button>
                    <button
                      onClick={() => navigate('/inventory/physical-counts')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Ver historial
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PhysicalCountPage;
