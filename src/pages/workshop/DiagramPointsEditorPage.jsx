// frontend/src/pages/workshop/DiagramPointsEditorPage.jsx
//
// Herramienta interna (admin) para recalibrar las coordenadas x/y de los
// puntos numerados de un diagrama, contra la imagen WEBP real (reemplazo del
// SVG dibujado a mano). Arrastra los puntos sobre la imagen; "Guardar" manda
// el array completo de puntos al backend (PATCH /diagram-templates/:id/points).
import { useEffect, useRef, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { diagramTemplatesApi } from '../../api/workshop';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = [
  { value: 'automovil', label: 'Automóvil' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'camion', label: 'Camión' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'otro', label: 'Otro' },
];

function diagramImageUrl(imagePath) {
  return imagePath ? `/assets/diagrams/${imagePath}` : '';
}

function parseViewBoxSize(viewBox) {
  const parts = (viewBox || '0 0 600 400').trim().split(/\s+/).map(Number);
  return { width: parts[2] || 600, height: parts[3] || 400 };
}

// Convierte un evento de mouse/pointer a coordenadas en unidades del viewBox,
// sin importar el tamaño real en pantalla del <svg> (usa su propia matriz).
function clientToSvgPoint(svgEl, clientX, clientY) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const local = pt.matrixTransform(ctm.inverse());
  return { x: Math.round(local.x), y: Math.round(local.y) };
}

export default function DiagramPointsEditorPage() {
  const [vehicleType, setVehicleType] = useState('automovil');
  const [systems, setSystems] = useState([]);
  const [system, setSystem] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [template, setTemplate] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    setSystem(''); setConfiguration(''); setTemplate(null); setPoints([]);
    diagramTemplatesApi.list({ vehicle_type: vehicleType })
      .then(res => setSystems(res.data.data || []))
      .catch(() => toast.error('No se pudo cargar el catálogo'));
  }, [vehicleType]);

  const availableSystems = [...new Set(systems.map(s => s.system))];
  const availableConfigs = systems.filter(s => s.system === system);

  useEffect(() => {
    if (!configuration) { setTemplate(null); setPoints([]); return; }
    const found = systems.find(s => s.system === system && s.configuration === configuration);
    if (!found) return;
    setLoading(true);
    diagramTemplatesApi.getById(found.id)
      .then(res => {
        setTemplate(res.data.data);
        setPoints(res.data.data.points || []);
      })
      .catch(() => toast.error('No se pudo cargar el diagrama'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration]);

  const startDrag = (index) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragIndex(index);
  };

  const handlePointerMove = (e) => {
    if (dragIndex === null || !svgRef.current) return;
    const { x, y } = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
    setPoints(prev => prev.map((p, i) => (i === dragIndex ? { ...p, x, y } : p)));
  };

  const handlePointerUp = () => setDragIndex(null);

  const handleSvgClick = (e) => {
    if (!addMode || !svgRef.current) return;
    const { x, y } = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
    const nextNumber = (points.reduce((max, p) => Math.max(max, p.point_number), 0) || 0) + 1;
    setPoints(prev => [...prev, { point_number: nextNumber, x, y, part_name: `Punto ${nextNumber}` }]);
    setAddMode(false);
  };

  const updatePartName = (index, name) => {
    setPoints(prev => prev.map((p, i) => (i === index ? { ...p, part_name: name } : p)));
  };

  const removePoint = (index) => {
    setPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      await diagramTemplatesApi.updatePoints(template.id, points);
      toast.success('Puntos guardados');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const size = template ? parseViewBoxSize(template.view_box) : { width: 600, height: 400 };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calibrar puntos de diagrama</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Arrastra cada punto numerado hasta la parte real en la imagen. Clic en "Agregar punto" y luego en la imagen para crear uno nuevo.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          <select value={system} onChange={e => { setSystem(e.target.value); setConfiguration(''); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">Sistema...</option>
            {availableSystems.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={configuration} onChange={e => setConfiguration(e.target.value)} disabled={!system}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100">
            <option value="">Configuración...</option>
            {availableConfigs.map(c => <option key={c.id} value={c.configuration}>{c.name}</option>)}
          </select>
        </div>

        {loading && <p className="text-sm text-gray-400">Cargando...</p>}

        {template && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-white rounded-xl shadow-sm p-3">
              <div
                className="relative bg-gray-50 border border-gray-100 rounded-lg mx-auto"
                style={{ aspectRatio: `${size.width} / ${size.height}`, maxWidth: '100%' }}
              >
                <img
                  src={diagramImageUrl(template.image_path)}
                  alt={template.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                <svg
                  ref={svgRef}
                  viewBox={template.view_box}
                  className="absolute inset-0 w-full h-full"
                  style={{ cursor: addMode ? 'crosshair' : 'default' }}
                  onClick={handleSvgClick}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  {points.map((p, i) => (
                    <g key={p.point_number} onPointerDown={startDrag(i)} style={{ cursor: 'grab' }}>
                      <circle cx={p.x} cy={p.y} r={dragIndex === i ? 14 : 11}
                        fill="#2563eb" stroke="#ffffff" strokeWidth={2} />
                      <text x={p.x} y={p.y + 4} fontSize="11" textAnchor="middle" fill="#ffffff" fontWeight="600">
                        {p.point_number}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setAddMode(a => !a)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium ${addMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {addMode ? 'Clic en la imagen para agregar...' : '+ Agregar punto'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3 space-y-1.5 max-h-[600px] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 mb-1">Puntos ({points.length})</p>
              {points.map((p, i) => (
                <div key={p.point_number} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {p.point_number}
                  </span>
                  <input
                    type="text"
                    value={p.part_name}
                    onChange={e => updatePartName(i, e.target.value)}
                    className="flex-1 min-w-0 text-xs px-1.5 py-1 border border-gray-200 rounded"
                  />
                  <span className="text-[10px] text-gray-400 shrink-0">{p.x},{p.y}</span>
                  <button onClick={() => removePoint(i)} className="text-gray-300 hover:text-red-500 shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
