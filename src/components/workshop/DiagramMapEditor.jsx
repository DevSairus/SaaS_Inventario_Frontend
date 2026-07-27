// frontend/src/components/workshop/DiagramMapEditor.jsx
//
// "Mapa de intervención" — editor interno para que el técnico marque, sobre
// un diagrama base (SVG), los puntos dañados de una OT (fase 3 de la
// propuesta de diagramas interactivos). No es la vista pública del cliente
// (eso es fase 4) — este es el paso de diagnóstico interno del taller.
import { useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { diagramTemplatesApi, diagnosisMarksApi } from '../../api/workshop';
import useProductsStore from '../../store/productsStore';

const SYSTEM_LABELS = {
  suspension_delantera: 'Suspensión delantera',
  suspension_trasera: 'Suspensión trasera',
  frenos_delanteros: 'Frenos delanteros',
  frenos_traseros: 'Frenos traseros',
};

const SEVERITY_OPTIONS = [
  { value: 'revisar', label: 'Revisar', color: '#2563eb' },
  { value: 'cambiar_pronto', label: 'Cambiar pronto', color: '#d97706' },
  { value: 'urgente', label: 'Urgente', color: '#dc2626' },
];

const severityColor = (severity) => SEVERITY_OPTIONS.find(s => s.value === severity)?.color || '#2563eb';

// El fondo del diagrama es una imagen WEBP (public/assets/diagrams/...) — los
// puntos numerados se dibujan encima en un <svg> transparente con el mismo
// viewBox, así que sus coordenadas (x/y en unidades del viewBox) caen en el
// lugar correcto sin importar el tamaño real en pantalla.
function diagramImageUrl(imagePath) {
  return imagePath ? `/assets/diagrams/${imagePath}` : '';
}

// "0 0 600 400" -> { width: 600, height: 400 }, para mantener el aspect-ratio
// del contenedor igual al del viewBox y que el overlay de puntos calce con la imagen.
function parseViewBoxSize(viewBox) {
  const parts = (viewBox || '0 0 600 400').trim().split(/\s+/).map(Number);
  return { width: parts[2] || 600, height: parts[3] || 400 };
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';

export default function DiagramMapEditor({ workOrderId, vehicleType, disabled = false }) {
  const { searchProducts } = useProductsStore();

  const [systems, setSystems] = useState([]);       // catálogo crudo filtrado por vehicle_type
  const [system, setSystem] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [template, setTemplate] = useState(null);    // diagrama completo (svg + points)
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activePoint, setActivePoint] = useState(null); // punto clicado, pendiente de marcar
  const [form, setForm] = useState({ severity: 'revisar', side: '', observation: '', suggested_product_id: '', suggested_product_name: '' });
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 1. Cargar catálogo disponible para el tipo de vehículo de esta OT
  useEffect(() => {
    if (!vehicleType) return;
    diagramTemplatesApi.list({ vehicle_type: vehicleType })
      .then(res => setSystems(res.data.data || []))
      .catch(() => toast.error('No se pudo cargar el catálogo de diagramas'));
  }, [vehicleType]);

  // 2. Cargar las marcas ya guardadas de esta OT (sin importar el diagrama activo)
  useEffect(() => {
    if (!workOrderId) return;
    diagnosisMarksApi.list(workOrderId)
      .then(res => setMarks(res.data.data || []))
      .catch(() => toast.error('No se pudieron cargar las marcas del diagnóstico'));
  }, [workOrderId]);

  const availableSystems = useMemo(() => [...new Set(systems.map(s => s.system))], [systems]);
  const availableConfigs = useMemo(
    () => systems.filter(s => s.system === system),
    [systems, system]
  );

  const loadTemplate = async (templateId) => {
    setLoading(true);
    try {
      const res = await diagramTemplatesApi.getById(templateId);
      setTemplate(res.data.data);
    } catch {
      toast.error('No se pudo cargar el diagrama seleccionado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!configuration) { setTemplate(null); return; }
    const found = systems.find(s => s.system === system && s.configuration === configuration);
    if (found) loadTemplate(found.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration]);

  // Marcas del diagrama actualmente abierto
  const marksForTemplate = useMemo(
    () => marks.filter(m => m.diagram_template_id === template?.id),
    [marks, template]
  );

  const markForPoint = (pointNumber) => marksForTemplate.find(m => m.point_number === pointNumber);

  const openPointForm = (point) => {
    if (disabled) return;
    const existing = markForPoint(point.point_number);
    setActivePoint(point);
    if (existing) {
      setForm({
        severity: existing.severity,
        side: existing.side || '',
        observation: existing.observation || '',
        suggested_product_id: existing.suggested_product_id || '',
        suggested_product_name: existing.suggested_product?.name || '',
      });
    } else {
      setForm({ severity: 'revisar', side: '', observation: '', suggested_product_id: '', suggested_product_name: '' });
    }
    setProductQuery('');
    setProductResults([]);
  };

  // Búsqueda de producto sugerido (debounced simple)
  useEffect(() => {
    if (productQuery.trim().length < 2) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchProducts(productQuery.trim());
      setProductResults(Array.isArray(results) ? results.slice(0, 8) : []);
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery, searchProducts]);

  const saveMark = async () => {
    if (!activePoint || !template) return;
    setSaving(true);
    try {
      const existing = markForPoint(activePoint.point_number);
      const payload = {
        diagram_template_id: template.id,
        point_number: activePoint.point_number,
        severity: form.severity,
        side: form.side || null,
        observation: form.observation || null,
        suggested_product_id: form.suggested_product_id || null,
      };
      let res;
      if (existing) {
        res = await diagnosisMarksApi.update(workOrderId, existing.id, payload);
        setMarks(prev => prev.map(m => m.id === existing.id ? res.data.data : m));
        toast.success('Marca actualizada');
      } else {
        res = await diagnosisMarksApi.create(workOrderId, payload);
        setMarks(prev => [...prev, res.data.data]);
        toast.success('Punto marcado');
      }
      setActivePoint(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo guardar la marca');
    } finally {
      setSaving(false);
    }
  };

  const deleteMark = async (mark) => {
    if (mark.generated_item_id) {
      toast.error('Esta marca ya generó un ítem — elimina el ítem primero');
      return;
    }
    try {
      await diagnosisMarksApi.remove(workOrderId, mark.id);
      setMarks(prev => prev.filter(m => m.id !== mark.id));
      toast.success('Marca eliminada');
      if (activePoint?.point_number === mark.point_number) setActivePoint(null);
    } catch {
      toast.error('No se pudo eliminar la marca');
    }
  };

  const generateItems = async () => {
    const pending = marksForTemplate.filter(m => m.suggested_product_id && !m.generated_item_id);
    if (!pending.length) {
      toast.error('No hay marcas con producto sugerido pendientes de generar en este diagrama');
      return;
    }
    setGenerating(true);
    try {
      const res = await diagnosisMarksApi.generateItems(workOrderId, pending.map(m => m.id));
      toast.success(res.data.message || 'Ítems generados');
      const refreshed = await diagnosisMarksApi.list(workOrderId);
      setMarks(refreshed.data.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudieron generar los ítems');
    } finally {
      setGenerating(false);
    }
  };

  if (!vehicleType) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={15} className="text-blue-600" />
        <h2 className="font-semibold text-sm text-gray-800">Mapa de intervención</h2>
      </div>

      {/* Selección de sistema / configuración */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select
          value={system}
          onChange={e => { setSystem(e.target.value); setConfiguration(''); setTemplate(null); }}
          className={inputCls}
        >
          <option value="">Sistema...</option>
          {availableSystems.map(s => (
            <option key={s} value={s}>{SYSTEM_LABELS[s] || s}</option>
          ))}
        </select>
        <select
          value={configuration}
          onChange={e => setConfiguration(e.target.value)}
          disabled={!system}
          className={inputCls}
        >
          <option value="">Configuración...</option>
          {availableConfigs.map(c => (
            <option key={c.id} value={c.configuration}>{c.name}</option>
          ))}
        </select>
      </div>

      {!system && (
        <p className="text-xs text-gray-400">
          Elige un sistema para ver los diagramas disponibles para este vehículo.
        </p>
      )}

      {loading && <p className="text-xs text-gray-400">Cargando diagrama...</p>}

      {template && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{template.description}</p>

          <div
            className="relative border border-gray-100 rounded-lg bg-gray-50 p-2"
            style={{ aspectRatio: `${parseViewBoxSize(template.view_box).width} / ${parseViewBoxSize(template.view_box).height}` }}
          >
            <img
              src={diagramImageUrl(template.image_path)}
              alt={template.name}
              className="absolute inset-0 w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
            <svg viewBox={template.view_box} className="absolute inset-0 w-full h-full">
              {(template.points || []).map(p => {
                const mark = markForPoint(p.point_number);
                const isActive = activePoint?.point_number === p.point_number;
                const fill = mark ? severityColor(mark.severity) : '#ffffff';
                const stroke = mark ? severityColor(mark.severity) : '#2563eb';
                // Puntos con label_dx/label_dy (definidos en el catálogo para
                // separar números apretados o encima de la pieza) dibujan el
                // círculo desplazado + una línea guía hasta el punto real de
                // clic sobre la pieza. Sin offset: comportamiento igual que antes.
                const hasOffset = !!(p.label_dx || p.label_dy);
                const lx = p.x + (p.label_dx || 0);
                const ly = p.y + (p.label_dy || 0);
                return (
                  <g
                    key={p.point_number}
                    onClick={() => openPointForm(p)}
                    style={{ cursor: disabled ? 'default' : 'pointer' }}
                  >
                    {hasOffset && (
                      <>
                        <line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke={stroke} strokeWidth={1.25} opacity={0.85} />
                        <circle cx={p.x} cy={p.y} r={3} fill={stroke} stroke="#ffffff" strokeWidth={1} />
                      </>
                    )}
                    <circle
                      cx={lx} cy={ly} r={isActive ? 13 : 11}
                      fill={fill} stroke={stroke} strokeWidth={isActive ? 3 : 2}
                    />
                    <text x={lx} y={ly + 4} fontSize="11" textAnchor="middle"
                      fill={mark ? '#ffffff' : '#2563eb'} fontWeight="600">
                      {p.point_number}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Formulario del punto activo */}
          {activePoint && !disabled && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Punto {activePoint.point_number} — {activePoint.part_name}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className={inputCls}>
                  {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))} className={inputCls}>
                  <option value="">Lado (si aplica)</option>
                  <option value="izquierdo">Izquierdo</option>
                  <option value="derecho">Derecho</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>

              <textarea
                value={form.observation}
                onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
                placeholder="Observación del técnico (opcional)"
                rows={2}
                className={inputCls}
              />

              {/* Producto sugerido, opcional — permite autogenerar el ítem después */}
              <div>
                {form.suggested_product_id ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs">
                    <span>✓ <strong>{form.suggested_product_name}</strong></span>
                    <button
                      onClick={() => setForm(f => ({ ...f, suggested_product_id: '', suggested_product_name: '' }))}
                      className="text-green-500 hover:text-red-500 ml-2 font-bold">✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={productQuery}
                      onChange={e => setProductQuery(e.target.value)}
                      placeholder="Vincular producto/servicio sugerido (opcional)..."
                      className={inputCls}
                    />
                    {productResults.length > 0 && (
                      <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm divide-y divide-gray-50">
                        {productResults.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setForm(f => ({ ...f, suggested_product_id: p.id, suggested_product_name: p.name }));
                              setProductQuery(''); setProductResults([]);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50"
                          >
                            <span className="font-medium text-gray-800">{p.name}</span>
                            {p.sku && <span className="text-gray-400 ml-2">{p.sku}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setActivePoint(null)} className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={saveMark} disabled={saving} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
                  {saving ? 'Guardando...' : 'Guardar marca'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de marcas de este diagrama */}
          {marksForTemplate.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Puntos marcados</p>
              {marksForTemplate.map(m => {
                const pointDef = (template.points || []).find(p => p.point_number === m.point_number);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: severityColor(m.severity) }}>
                        {m.point_number}
                      </span>
                      <span className="truncate text-gray-700">
                        {pointDef?.part_name}
                        {m.side && <span className="text-gray-400"> · {m.side}</span>}
                        {m.generated_item_id && <span className="text-green-600 ml-1">· ítem generado</span>}
                      </span>
                    </div>
                    {!disabled && !m.generated_item_id && (
                      <button onClick={() => deleteMark(m)} className="text-gray-300 hover:text-red-500 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
              {!disabled && marksForTemplate.some(m => m.suggested_product_id && !m.generated_item_id) && (
                <button
                  onClick={generateItems}
                  disabled={generating}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium disabled:opacity-60"
                >
                  <Wand2 size={13} /> {generating ? 'Generando...' : 'Generar ítems desde el diagrama'}
                </button>
              )}
            </div>
          )}

          {!disabled && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Plus size={11} /> Haz clic sobre un punto numerado del diagrama para marcarlo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}