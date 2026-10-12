// frontend/src/pages/settings/LabelPrintingSettingsPage.jsx
// Ajustes → Impresión de etiquetas. Perfiles impresora + papel del tenant
// (backend: labelPrinting.controller.js). Cada equipo elige cuál usa
// (utils/labelPrinting.js#setDeviceProfileId). Solo Administrador y Gerente
// crean o modifican perfiles; los demás pueden elegir el de su equipo.
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, Plus, Copy, Trash2, Star, Monitor, Ruler, Save } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import LabelPreview from '../../components/labels/LabelPreview';
import VehicleLabelPreview from '../../components/labels/VehicleLabelPreview';
import { labelPrintingAPI } from '../../api/labelPrinting';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';
import {
  BARCODE_FORMATS, DPI_OPTIONS, PRESETS, SAMPLE_LABEL_DATA, LABEL_KINDS,
  newProfileFromPreset, pageSize, labelsPerPage, normalizeProfile,
  getDeviceProfileId, setDeviceProfileId, printAlignmentTest, printProductLabels, printHtmlLabels,
} from '../../utils/labelPrinting';
import {
  vehicleLabelCss, vehicleLabelHtml, vehicleMetricsForProfile, sampleVehicleLabelData, DEFAULT_VEHICLE_OPTIONS,
} from '../../components/workshop/vehicleLabel';

const EDIT_ROLES = ['admin', 'manager'];

function NumberField({ label, value, onChange, min, max, step = 0.5, disabled, help }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</span>
      <input
        type="number" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100 disabled:opacity-60"
      />
      {help && <span className="block text-[11px] text-gray-400 mt-0.5">{help}</span>}
    </label>
  );
}

function Check({ label, checked, onChange, disabled, help }) {
  return (
    <label className={`flex items-start gap-2 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" className="mt-0.5 accent-blue-600" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {label}
        {help && <span className="block text-[11px] text-gray-400">{help}</span>}
      </span>
    </label>
  );
}

export default function LabelPrintingSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenant_id;
  const canEdit = EDIT_ROLES.includes(user?.role);

  // Stickers de vehículo solo si el tenant tiene Taller.
  const enabledModules = useTenantStore((st) => st.enabledModules);
  const hasWorkshop = !!enabledModules?.includes('workshop');
  const [kind, setKind] = useState('product');
  const defaultKey = LABEL_KINDS[kind].defaultKey;

  const [profiles, setProfiles] = useState([]);
  // { default_profile_id, default_vehicle_profile_id }
  const [defaults, setDefaults] = useState({});
  const defaultId = defaults[defaultKey] || null;
  const setDefaultId = (id) => setDefaults((d) => ({ ...d, [defaultKey]: id }));
  const [selectedId, setSelectedId] = useState(null);
  const [deviceIds, setDeviceIds] = useState(() => ({
    product: getDeviceProfileId(tenantId, 'product'),
    vehicle: getDeviceProfileId(tenantId, 'vehicle'),
  }));
  const deviceId = deviceIds[kind];
  const vehicleSample = useMemo(() => sampleVehicleLabelData(), []);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [presetKey, setPresetKey] = useState(PRESETS[0].key);

  useEffect(() => {
    labelPrintingAPI.get()
      .then((res) => {
        const list = res.data?.profiles || [];
        setProfiles(list);
        setDefaults({
          default_profile_id: res.data?.default_profile_id || null,
          default_vehicle_profile_id: res.data?.default_vehicle_profile_id || null,
        });
        setSelectedId(getDeviceProfileId(tenantId) && list.some((p) => p.id === getDeviceProfileId(tenantId))
          ? getDeviceProfileId(tenantId) : (res.data?.default_profile_id || list[0]?.id || null));
      })
      .catch((e) => toast.error(e.response?.data?.message || 'No se pudieron cargar los perfiles'))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const profile = useMemo(() => profiles.find((p) => p.id === selectedId) || null, [profiles, selectedId]);

  const update = (field, value) => {
    setProfiles((list) => list.map((p) => (p.id === selectedId ? { ...p, [field]: value } : p)));
    setDirty(true);
  };

  const addProfile = () => {
    const p = newProfileFromPreset(presetKey);
    setProfiles((list) => [...list, p]);
    setSelectedId(p.id);
    setDefaults((d) => ({
      default_profile_id: d.default_profile_id || p.id,
      default_vehicle_profile_id: d.default_vehicle_profile_id || p.id,
    }));
    setDirty(true);
  };

  const duplicate = () => {
    if (!profile) return;
    const p = { ...profile, id: `perfil-${Date.now().toString(36)}`, name: `${profile.name} (copia)` };
    setProfiles((list) => [...list, p]);
    setSelectedId(p.id);
    setDirty(true);
  };

  const remove = () => {
    if (!profile || !window.confirm(`¿Eliminar el perfil "${profile.name}"?`)) return;
    const rest = profiles.filter((p) => p.id !== profile.id);
    setProfiles(rest);
    setDefaults((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === profile.id ? (rest[0]?.id || null) : v])));
    setSelectedId(rest[0]?.id || null);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await labelPrintingAPI.save({ profiles, ...defaults });
      setProfiles(res.data.profiles);
      setDefaults({
        default_profile_id: res.data.default_profile_id,
        default_vehicle_profile_id: res.data.default_vehicle_profile_id,
      });
      setDirty(false);
      toast.success('Perfiles guardados');
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron guardar los perfiles');
    } finally {
      setSaving(false);
    }
  };

  const useOnThisDevice = () => {
    setDeviceProfileId(tenantId, profile.id, kind);
    setDeviceIds((d) => ({ ...d, [kind]: profile.id }));
    toast.success(`Este equipo imprimirá ${kind === 'vehicle' ? 'los stickers' : 'las etiquetas'} con "${profile.name}"`);
  };

  const printSample = () => {
    if (kind === 'vehicle') {
      const p = normalizeProfile(profile);
      const metrics = vehicleMetricsForProfile(p);
      printHtmlLabels(p, vehicleLabelHtml(vehicleSample, metrics, DEFAULT_VEHICLE_OPTIONS),
        vehicleLabelCss(metrics, !p.color, vehicleSample.workshop.primary_color), { quantity: p.columns });
    } else {
      printProductLabels(profile, SAMPLE_LABEL_DATA, { quantity: profile.columns });
    }
  };

  const page = profile ? pageSize(profile) : null;
  const disabled = !canEdit;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Impresión de etiquetas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              Crea un perfil por cada combinación de impresora y papel (rollo térmico u hoja adhesiva). Cada equipo elige el perfil de
              la impresora que tiene conectada.
            </p>
          </div>
          {canEdit && (
            <button onClick={save} disabled={!dirty || saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Guardando...' : dirty ? 'Guardar cambios' : 'Guardado'}
            </button>
          )}
        </div>

        {hasWorkshop && (
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 p-1 bg-white dark:bg-graphite">
            {Object.entries(LABEL_KINDS).map(([k, def]) => (
              <button key={k} onClick={() => setKind(k)}
                className={`px-3 py-1.5 text-sm rounded-md ${kind === k ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                {def.label}
              </button>
            ))}
          </div>
        )}

        {!canEdit && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300 text-sm rounded-lg px-4 py-3">
            Puedes elegir el perfil de este equipo. Crear o modificar perfiles lo hace un administrador o gerente.
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
            {/* Lista de perfiles */}
            <div className="space-y-3">
              <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/10">
                {profiles.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">Aún no hay perfiles. Se usa una etiqueta genérica de 50 × 30 mm.</p>
                )}
                {profiles.map((p) => (
                  <button key={p.id} onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-3 py-2.5 ${p.id === selectedId ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-gray-500">{p.media === 'sheet' ? 'Hoja' : 'Rollo'} · {p.label_w_mm}×{p.label_h_mm} · {p.columns} col.</span>
                      {p.id === defaultId && <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-700"><Star size={10} /> Predeterminado</span>}
                      {p.id === deviceId && <span className="inline-flex items-center gap-0.5 text-[11px] text-green-700"><Monitor size={10} /> Este equipo</span>}
                    </div>
                  </button>
                ))}
              </div>
              {canEdit && (
                <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Nuevo perfil desde plantilla</label>
                  <select value={presetKey} onChange={(e) => setPresetKey(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100">
                    {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </select>
                  <button onClick={addProfile} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/20">
                    <Plus size={14} /> Crear perfil
                  </button>
                </div>
              )}
            </div>

            {/* Editor */}
            {profile && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
                <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-5">
                  <div className="flex items-end gap-3 flex-wrap">
                    <label className="flex-1 min-w-[200px]">
                      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre del perfil</span>
                      <input value={profile.name} disabled={disabled} onChange={(e) => update('name', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100 disabled:opacity-60" />
                    </label>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={duplicate} title="Duplicar" className="p-2 rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"><Copy size={15} /></button>
                        <button onClick={remove} title="Eliminar" className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Papel</h3>
                    <div className="flex gap-2">
                      {[['roll', 'Rollo (térmica)'], ['sheet', 'Hoja adhesiva (láser/tinta)']].map(([v, l]) => (
                        <button key={v} disabled={disabled} onClick={() => update('media', v)}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${profile.media === v ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'} disabled:opacity-60`}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <NumberField label="Ancho de etiqueta (mm)" value={profile.label_w_mm} min={10} max={300} disabled={disabled} onChange={(v) => update('label_w_mm', v)} />
                      <NumberField label="Alto de etiqueta (mm)" value={profile.label_h_mm} min={10} max={300} disabled={disabled} onChange={(v) => update('label_h_mm', v)} />
                      <NumberField label="Columnas" value={profile.columns} min={1} max={6} step={1} disabled={disabled} onChange={(v) => update('columns', v)} />
                      <NumberField label="Separación entre columnas (mm)" value={profile.col_gap_mm} min={0} max={30} disabled={disabled} onChange={(v) => update('col_gap_mm', v)} />
                      <NumberField label={profile.media === 'sheet' ? 'Separación entre filas (mm)' : 'Separación entre etiquetas del rollo (mm)'} value={profile.row_gap_mm} min={0} max={30} disabled={disabled} onChange={(v) => update('row_gap_mm', v)} />
                      {profile.media === 'sheet' && (
                        <>
                          <NumberField label="Ancho de la hoja (mm)" value={profile.page_w_mm} min={50} max={500} disabled={disabled} onChange={(v) => update('page_w_mm', v)} help="Carta 215,9 · A4 210" />
                          <NumberField label="Alto de la hoja (mm)" value={profile.page_h_mm} min={50} max={500} disabled={disabled} onChange={(v) => update('page_h_mm', v)} help="Carta 279,4 · A4 297" />
                          <NumberField label="Margen superior (mm)" value={profile.margin_top_mm} min={0} max={60} disabled={disabled} onChange={(v) => update('margin_top_mm', v)} />
                          <NumberField label="Margen izquierdo (mm)" value={profile.margin_left_mm} min={0} max={60} disabled={disabled} onChange={(v) => update('margin_left_mm', v)} />
                        </>
                      )}
                    </div>
                    {page && (
                      <p className="text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                        Página que se envía a la impresora: {page.w} × {page.h} mm, {labelsPerPage(profile)} etiqueta(s) por página.
                        En el cuadro de impresión deja Márgenes en "Ninguno", Escala 100% y sin encabezados ni pies de página.
                      </p>
                    )}
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Ruler size={14} /> Impresora y calibración</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <label className="block col-span-2 md:col-span-1">
                        <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Resolución</span>
                        <select value={profile.dpi} disabled={disabled} onChange={(e) => update('dpi', Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100 disabled:opacity-60">
                          {DPI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </label>
                      <NumberField label="Desplazar horizontal (mm)" value={profile.offset_x_mm} min={-50} max={50} disabled={disabled} onChange={(v) => update('offset_x_mm', v)} help="Negativo = hacia la izquierda" />
                      <NumberField label="Desplazar vertical (mm)" value={profile.offset_y_mm} min={-50} max={50} disabled={disabled} onChange={(v) => update('offset_y_mm', v)} help="Negativo = hacia arriba" />
                      <NumberField label="Margen interno (mm)" value={profile.padding_mm} min={0} max={15} disabled={disabled} onChange={(v) => update('padding_mm', v)} />
                    </div>
                    <div className="space-y-2">
                      <Check label="Rotar el contenido 90°" help="Si la impresora alimenta la etiqueta de lado y el código sale girado." checked={profile.rotate} disabled={disabled} onChange={(v) => update('rotate', v)} />
                      <Check label="Impresora a color" help="Stickers de vehículo con el color del taller y placa amarilla. Desactivado = térmica, solo negro." checked={profile.color} disabled={disabled} onChange={(v) => update('color', v)} />
                      {profile.media === 'roll' && profile.columns > 1 && (
                        <Check label="Completar la última fila" help="Redondea la cantidad a filas completas para no dejar etiquetas en blanco en el rollo." checked={profile.fill_row} disabled={disabled} onChange={(v) => update('fill_row', v)} />
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Contenido</h3>
                    <label className="block max-w-sm">
                      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Formato del código</span>
                      <select value={profile.barcode_format} disabled={disabled} onChange={(e) => update('barcode_format', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2 dark:text-gray-100 disabled:opacity-60">
                        {BARCODE_FORMATS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <span className="block text-[11px] text-gray-400 mt-0.5">Si un código no es válido para el formato elegido, se imprime en Code 128.</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Check label="Nombre del producto" checked={profile.show_name} disabled={disabled} onChange={(v) => update('show_name', v)} />
                      <Check label="Número debajo del código" checked={profile.show_barcode_text} disabled={disabled} onChange={(v) => update('show_barcode_text', v)} />
                      <Check label="SKU / referencia" checked={profile.show_sku} disabled={disabled} onChange={(v) => update('show_sku', v)} />
                      <Check label="Precio de venta" checked={profile.show_price} disabled={disabled} onChange={(v) => update('show_price', v)} />
                      <Check label="Zona de silencio a los lados" help="Espacio en blanco que algunos lectores necesitan." checked={profile.quiet_zone} disabled={disabled} onChange={(v) => update('quiet_zone', v)} />
                    </div>
                    <label className="block max-w-sm">
                      <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tamaño de letra: {Math.round(profile.font_scale * 100)}%</span>
                      <input type="range" min={0.6} max={2} step={0.05} value={profile.font_scale} disabled={disabled}
                        onChange={(e) => update('font_scale', Number(e.target.value))} className="w-full accent-blue-600" />
                    </label>
                  </section>
                </div>

                {/* Vista previa y acciones */}
                <div className="space-y-3">
                  <div className="bg-gray-100 dark:bg-graphite-2 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Vista previa</p>
                    {kind === 'vehicle'
                      ? <VehicleLabelPreview profile={profile} data={vehicleSample} opts={DEFAULT_VEHICLE_OPTIONS} />
                      : <LabelPreview profile={profile} data={SAMPLE_LABEL_DATA} />}
                  </div>
                  <button onClick={() => printAlignmentTest(profile)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600">
                    <Ruler size={15} /> Imprimir prueba de alineación
                  </button>
                  <button onClick={printSample}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                    <Printer size={15} /> {kind === 'vehicle' ? 'Imprimir sticker de muestra' : 'Imprimir etiqueta de muestra'}
                  </button>
                  <button onClick={useOnThisDevice} disabled={deviceId === profile.id}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 dark:text-green-400">
                    <Monitor size={15} /> {deviceId === profile.id
                      ? `Es el de este equipo (${kind === 'vehicle' ? 'stickers' : 'productos'})`
                      : `Usar en este equipo para ${kind === 'vehicle' ? 'stickers' : 'productos'}`}
                  </button>
                  {canEdit && (
                    <button onClick={() => { setDefaultId(profile.id); setDirty(true); }} disabled={defaultId === profile.id}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-amber-500 text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                      <Star size={15} /> {defaultId === profile.id
                        ? `Es el predeterminado para ${kind === 'vehicle' ? 'stickers' : 'productos'}`
                        : `Marcar predeterminado para ${kind === 'vehicle' ? 'stickers' : 'productos'}`}
                    </button>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-3">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Cómo calibrar</p>
                    <p>1. Imprime la prueba de alineación: cada etiqueta sale con su borde punteado.</p>
                    <p>2. Si el borde no coincide con la etiqueta física, ajusta el desplazamiento horizontal/vertical (en mm) y repite.</p>
                    <p>3. Si las etiquetas se van corriendo una a una, ajusta la separación entre etiquetas o el alto.</p>
                    <p>4. Si el código sale de lado, activa "Rotar el contenido 90°".</p>
                    {dirty && <p className="text-amber-700">Las pruebas usan los valores en pantalla; guarda para que los use todo el equipo.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
