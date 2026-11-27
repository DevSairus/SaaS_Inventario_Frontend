// frontend/src/pages/workshop/InspectionTemplatesPage.jsx
// Plantillas de peritaje de la empresa. Las de Pitbox no se editan: se
// copian y la copia se ajusta. Editar una plantilla no cambia los peritajes
// ya creados (cada peritaje congela su plantilla al crearse).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Plus, Trash2, ArrowUp, ArrowDown, Save, Loader2, Eye } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { inspectionsApi } from '../../api/workshop';
import { VEHICLE_TYPE_OPTIONS, VEHICLE_TYPE_LABELS } from '../../constants/vehicleTypes';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const labelCls = 'block text-xs text-gray-500 mb-1';
const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

export default function InspectionTemplatesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ own: [], builtin: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id?, name, vehicle_types, sections, is_active, readOnly? }
  const [saving, setSaving] = useState(false);

  const load = () => inspectionsApi.listTemplates(true)
    .then((r) => setData(r.data.data))
    .catch(() => toast.error('Error cargando plantillas'))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const copyBuiltin = async (t) => {
    try {
      const r = await inspectionsApi.createTemplate({ name: `${t.name} (taller)`, base_key: t.base_key });
      toast.success('Plantilla copiada; ajústala a tu taller');
      await load();
      setEditing(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo copiar');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { name: editing.name, vehicle_types: editing.vehicle_types, sections: editing.sections, is_active: editing.is_active };
      const r = editing.id ? await inspectionsApi.updateTemplate(editing.id, payload) : await inspectionsApi.createTemplate(payload);
      toast.success('Plantilla guardada');
      setEditing(r.data.data);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = (editing?.sections || []).reduce((s, x) => s + (Number(x.weight) || 0), 0);
  const setSec = (i, patch) => setEditing((e) => ({ ...e, sections: e.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setItem = (si, ii, patch) => setSec(si, { items: editing.sections[si].items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) });

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => (editing ? setEditing(null) : navigate('/workshop/inspections'))} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Volver"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{editing ? (editing.readOnly ? editing.name : editing.id ? 'Editar plantilla' : 'Nueva plantilla') : 'Plantillas de peritaje'}</h1>
            <p className="text-sm text-gray-500">Cambiar una plantilla no modifica los peritajes ya hechos.</p>
          </div>
        </div>

        {loading ? <Loader2 className="animate-spin text-blue-600 mx-auto" /> : !editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">De tu taller</h2>
                <button onClick={() => setEditing({ name: '', vehicle_types: [], sections: [{ label: 'Sección 1', weight: 100, items: [{ label: '', kind: 'rating' }] }], is_active: true })}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Plus size={13} /> En blanco</button>
              </div>
              {data.own.length === 0 && <p className="text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl p-4">Aún no tienes plantillas propias. Mientras tanto se usan las de Pitbox según el tipo de vehículo.</p>}
              {data.own.map((t) => (
                <TemplateCard key={t.id} t={t} onClick={() => setEditing(t)} />
              ))}
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">De Pitbox</h2>
              {data.builtin.map((t) => (
                <TemplateCard key={t.id} t={t}
                  actions={(
                    <div className="flex gap-2">
                      <button onClick={() => setEditing({ ...t, readOnly: true })} className="flex items-center gap-1 text-xs text-gray-600 hover:underline"><Eye size={13} /> Ver</button>
                      <button onClick={() => copyBuiltin(t)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Copy size={13} /> Copiar y ajustar</button>
                    </div>
                  )} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className={labelCls}>Nombre</label>
                <input value={editing.name} disabled={editing.readOnly} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} className={inputCls} />
                {!editing.readOnly && editing.id && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 mt-3">
                    <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing((x) => ({ ...x, is_active: e.target.checked }))} /> Activa
                  </label>
                )}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Se usa automáticamente para</label>
                <div className="flex flex-wrap gap-2">
                  {VEHICLE_TYPE_OPTIONS.map((o) => {
                    const on = (editing.vehicle_types || []).includes(o.value);
                    return (
                      <button key={o.value} type="button" disabled={editing.readOnly}
                        onClick={() => setEditing((x) => ({ ...x, vehicle_types: on ? x.vehicle_types.filter((v) => v !== o.value) : [...(x.vehicle_types || []), o.value] }))}
                        className={`px-2.5 py-1 text-xs rounded-full border ${on ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{o.label}</button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Al crear un peritaje se puede elegir cualquier plantilla; esto solo define la que se propone.</p>
              </div>
            </div>

            <p className={`text-xs ${totalWeight === 100 ? 'text-gray-500' : 'text-amber-700'}`}>
              Suma de pesos: {totalWeight}. El puntaje total es el promedio ponderado de las secciones; no necesita sumar 100, pero es más fácil de leer.
            </p>

            {editing.sections.map((sec, si) => (
              <div key={si} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[200px]"><label className={labelCls}>Sección</label>
                    <input value={sec.label} disabled={editing.readOnly} onChange={(e) => setSec(si, { label: e.target.value })} className={inputCls} /></div>
                  <div className="w-24"><label className={labelCls}>Peso</label>
                    <input type="number" min="0" max="100" value={sec.weight} disabled={editing.readOnly} onChange={(e) => setSec(si, { weight: e.target.value })} className={inputCls} /></div>
                  {!editing.readOnly && (
                    <div className="flex gap-1 pb-1">
                      <IconBtn onClick={() => setEditing((x) => ({ ...x, sections: move(x.sections, si, -1) }))} label="Subir"><ArrowUp size={14} /></IconBtn>
                      <IconBtn onClick={() => setEditing((x) => ({ ...x, sections: move(x.sections, si, 1) }))} label="Bajar"><ArrowDown size={14} /></IconBtn>
                      <IconBtn onClick={() => setEditing((x) => ({ ...x, sections: x.sections.filter((_, j) => j !== si) }))} label="Quitar sección" danger><Trash2 size={14} /></IconBtn>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {sec.items.map((it, ii) => (
                    <div key={ii} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                      <input value={it.label} disabled={editing.readOnly} onChange={(e) => setItem(si, ii, { label: e.target.value })} placeholder="Punto a revisar"
                        className="flex-1 min-w-[180px] border border-gray-200 rounded px-2 py-1 text-sm bg-white disabled:bg-transparent disabled:border-transparent" />
                      <select value={it.kind} disabled={editing.readOnly} onChange={(e) => setItem(si, ii, { kind: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
                        <option value="rating">Calificación</option>
                        <option value="measure">Calificación + medida</option>
                      </select>
                      {it.kind === 'measure' && (
                        <input value={it.unit || ''} disabled={editing.readOnly} onChange={(e) => setItem(si, ii, { unit: e.target.value })} placeholder="unidad" className="w-16 border border-gray-200 rounded px-2 py-1 text-xs bg-white" />
                      )}
                      <label className="flex items-center gap-1 text-xs text-gray-600" title="Si se califica como malo, el concepto es No recomendado">
                        <input type="checkbox" disabled={editing.readOnly} checked={!!it.critical} onChange={(e) => setItem(si, ii, { critical: e.target.checked })} /> Crítico
                      </label>
                      {!editing.readOnly && (
                        <div className="flex gap-0.5">
                          <IconBtn onClick={() => setSec(si, { items: move(sec.items, ii, -1) })} label="Subir"><ArrowUp size={13} /></IconBtn>
                          <IconBtn onClick={() => setSec(si, { items: move(sec.items, ii, 1) })} label="Bajar"><ArrowDown size={13} /></IconBtn>
                          <IconBtn onClick={() => setSec(si, { items: sec.items.filter((_, j) => j !== ii) })} label="Quitar punto" danger><Trash2 size={13} /></IconBtn>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!editing.readOnly && (
                  <button onClick={() => setSec(si, { items: [...sec.items, { label: '', kind: 'rating' }] })} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={13} /> Agregar punto</button>
                )}
              </div>
            ))}

            {!editing.readOnly ? (
              <div className="flex flex-wrap justify-between gap-2">
                <button onClick={() => setEditing((x) => ({ ...x, sections: [...x.sections, { label: `Sección ${x.sections.length + 1}`, weight: 10, items: [{ label: '', kind: 'rating' }] }] }))}
                  className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Plus size={15} /> Agregar sección</button>
                <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  <Save size={15} /> {saving ? 'Guardando…' : 'Guardar plantilla'}
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button onClick={() => copyBuiltin(editing)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Copy size={15} /> Copiar y ajustar</button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TemplateCard({ t, onClick, actions }) {
  const points = (t.sections || []).reduce((s, x) => s + (x.items?.length || 0), 0);
  return (
    <div onClick={onClick} className={`bg-white border border-gray-100 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-blue-200' : ''} ${t.is_active === false ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">{t.name}{t.is_active === false && <span className="ml-2 text-xs font-normal text-gray-500">(inactiva)</span>}</p>
          <p className="text-xs text-gray-500 mt-0.5">{(t.sections || []).length} secciones · {points} puntos</p>
          <p className="text-[11px] text-gray-400 mt-1">{(t.vehicle_types || []).map((v) => VEHICLE_TYPE_LABELS[v] || v).join(', ') || 'Sin tipo asignado'}</p>
        </div>
        {actions}
      </div>
    </div>
  );
}

function IconBtn({ onClick, label, danger, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`p-1.5 rounded hover:bg-white ${danger ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-700'}`}>{children}</button>
  );
}
