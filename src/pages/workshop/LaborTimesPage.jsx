// frontend/src/pages/workshop/LaborTimesPage.jsx
//
// Tempario: horas estándar y tarifa de cada servicio de mano de obra.
// Modo "Por hora" = precio = horas × valor hora de la empresa (se recalcula
// solo); modo "Fijo" = precio propio del servicio. Carga masiva por Excel.
// Backend: services/workshop/laborTimes.service.js.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, Download, Upload, Loader2, Save, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import NumericInput from '../../components/inputs/NumericInput';
import { laborTimesAPI, WEEKDAYS } from '../../api/laborTimes';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';

const MODE_LABEL = { hourly: 'Por hora', fixed: 'Fijo' };
const fmtHours = (h) => (h == null || h === '' ? '' : Number(h).toLocaleString('es-CO', { maximumFractionDigits: 2 }));

function SettingsCard({ settings, onSaved, canEdit }) {
  const [rate, setRate] = useState(settings.labor_hour_rate || '');
  const [mode, setMode] = useState(settings.default_pricing_mode);
  const [schedule, setSchedule] = useState(settings.default_schedule);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await laborTimesAPI.saveSettings({ labor_hour_rate: rate === '' ? null : Number(rate), default_pricing_mode: mode, default_schedule: schedule });
      const updated = res.data.data.prices_updated;
      toast.success(updated ? `Guardado. ${updated} servicio(s) por hora con precio actualizado` : 'Configuración guardada');
      onSaved(res.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Valor hora de mano de obra</label>
          <NumericInput value={rate} onChange={(e) => setRate(e.target.value)} disabled={!canEdit}
            className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2" placeholder="Ej. 60.000" />
          <p className="text-xs text-gray-500 mt-1">Precio de los servicios "Por hora" = horas × este valor (con o sin IVA según el servicio). Al cambiarlo se recalculan.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Modo de precio por defecto (importación)</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={!canEdit}
            className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2">
            <option value="hourly">Por hora (horas × valor hora)</option>
            <option value="fixed">Fijo (precio propio del servicio)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Se usa cuando la fila del Excel no trae modo.</p>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Jornada por defecto de los técnicos (horas por día)</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(([d, label]) => (
            <div key={d} className="w-16">
              <span className="block text-[11px] text-gray-500 text-center">{label}</span>
              <input type="number" min="0" max="24" step="0.5" value={schedule[d] ?? 0} disabled={!canEdit}
                onChange={(e) => setSchedule({ ...schedule, [d]: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-center dark:bg-graphite-2" />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">Para la productividad. Cada técnico puede tener su propia jornada en Productividad → Jornadas.</p>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar configuración
          </button>
        </div>
      )}
    </div>
  );
}

function ImportModal({ isOpen, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [validation, setValidation] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');

  const close = () => { setFile(null); setValidation(null); setResult(null); onClose(); };
  const run = async (dryRun) => {
    setBusy(dryRun ? 'validate' : 'import');
    try {
      const res = await laborTimesAPI.importServices(file, { dryRun, updateExisting });
      if (dryRun) setValidation(res.data.data);
      else { setResult(res.data.data); onImported(); }
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo procesar el archivo');
    } finally {
      setBusy('');
    }
  };
  const v = result || validation;
  const willChange = validation ? validation.to_create + validation.to_update : 0;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Importar tempario desde Excel" size="lg">
      <div className="space-y-4 text-sm">
        {!result && (
          <>
            <ol className="list-decimal ml-5 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Descarga la plantilla (o exporta el tempario actual para editarlo) y llena una operación por fila.</li>
              <li>Obligatorios: código, nombre y horas. Los servicios se crean como mano de obra.</li>
              <li>Valida el archivo: verás qué se crea, qué se actualiza y qué filas tienen errores antes de guardar.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => laborTimesAPI.downloadTemplate().catch(() => toast.error('No se pudo descargar'))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20">
                <Download size={15} /> Descargar plantilla
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg p-4">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] || null); setValidation(null); }} className="block w-full text-sm" />
              <label className="flex items-start gap-2 mt-3 text-gray-700 dark:text-gray-300">
                <input type="checkbox" className="mt-0.5" checked={updateExisting} onChange={(e) => { setUpdateExisting(e.target.checked); setValidation(null); }} />
                <span>Actualizar los servicios que ya existen (mismo código): nombre, categoría, horas, modo, precio, IVA y estado.
                  <span className="block text-xs text-gray-500">Si no se marca, los que ya existen se omiten.</span></span>
              </label>
            </div>
          </>
        )}

        {v && (
          <div className="space-y-3">
            {result
              ? <p className="flex items-center gap-2 text-green-700 font-medium"><CheckCircle2 size={20} /> Importación terminada</p>
              : <p className="font-medium text-gray-900 dark:text-gray-100">Resultado de la validación (todavía no se ha guardado nada)</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['Filas leídas', v.total_rows],
                [result ? 'Creados' : 'Se crearán', result ? v.created : v.to_create],
                [updateExisting ? (result ? 'Actualizados' : 'Se actualizarán') : 'Ya existen (se omiten)', updateExisting ? (result ? v.updated : v.to_update) : v.skipped_existing],
                ['Con errores', v.error_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg p-3 bg-gray-50 dark:bg-graphite-2">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
              ))}
            </div>
            {v.new_categories?.length > 0 && <p className="text-xs text-gray-600">Categorías nuevas: {v.new_categories.join(', ')}</p>}
            {v.ignored_columns?.length > 0 && <p className="text-xs text-amber-700">Columnas no reconocidas (no se cargan): {v.ignored_columns.join(', ')}</p>}
            {!(v.labor_hour_rate > 0) && <p className="text-xs text-amber-700">No hay valor hora configurado: los servicios "Por hora" se rechazan hasta configurarlo.</p>}
            {v.errors?.length > 0 && (
              <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-graphite-2 sticky top-0">
                    <tr><th className="px-2 py-1 text-left">Fila</th><th className="px-2 py-1 text-left">Código</th><th className="px-2 py-1 text-left">Problema</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                    {v.errors.map((e) => (
                      <tr key={e.row}><td className="px-2 py-1 align-top">{e.row}</td><td className="px-2 py-1 align-top">{e.sku || '—'}</td><td className="px-2 py-1 text-red-700">{e.errors.join('. ')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
          <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10">{result ? 'Cerrar' : 'Cancelar'}</button>
          {!result && (validation && willChange > 0 ? (
            <button type="button" onClick={() => run(false)} disabled={Boolean(busy)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
              <Upload size={15} /> {busy === 'import' ? 'Importando…' : `Importar ${willChange} servicio(s)`}
            </button>
          ) : (
            <button type="button" onClick={() => run(true)} disabled={!file || Boolean(busy)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {busy === 'validate' ? 'Validando…' : validation ? 'Validar de nuevo' : 'Validar archivo'}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ServiceRow({ item, rate, canEdit, onSaved }) {
  const [hours, setHours] = useState(item.standard_hours ?? '');
  const [mode, setMode] = useState(item.labor_pricing_mode || 'fixed');
  const [price, setPrice] = useState(item.base_price ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = String(hours ?? '') !== String(item.standard_hours ?? '')
    || mode !== (item.labor_pricing_mode || 'fixed')
    || (mode === 'fixed' && Number(price) !== Number(item.base_price));
  const shownPrice = mode === 'hourly' ? (Number(hours) > 0 && rate > 0 ? Math.round(Number(hours) * rate) : null) : price;

  const save = async () => {
    setSaving(true);
    try {
      const res = await laborTimesAPI.updateService(item.id, {
        standard_hours: hours === '' ? null : Number(hours),
        labor_pricing_mode: mode,
        ...(mode === 'fixed' && { base_price: Number(price) || 0 }),
      });
      onSaved(res.data.data);
      toast.success('Servicio actualizado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const input = 'border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm dark:bg-graphite-2';
  return (
    <tr className={!item.is_active ? 'opacity-60' : ''}>
      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{item.sku}</td>
      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.name}{!item.is_active && <span className="ml-2 text-xs text-gray-400">(inactivo)</span>}</td>
      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{item.category?.name || '—'}</td>
      <td className="px-3 py-2">
        <input type="number" min="0" step="0.05" value={hours} disabled={!canEdit} onChange={(e) => setHours(e.target.value)}
          className={`${input} w-20 text-right ${!(Number(hours) > 0) ? 'border-amber-300' : ''}`} placeholder="—" />
      </td>
      <td className="px-3 py-2">
        <select value={mode} disabled={!canEdit} onChange={(e) => setMode(e.target.value)} className={`${input} w-28`}>
          <option value="hourly">Por hora</option>
          <option value="fixed">Fijo</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {mode === 'fixed' && canEdit
          ? <NumericInput value={price} onChange={(e) => setPrice(e.target.value)} className={`${input} w-28 text-right`} />
          : <span className="text-gray-900 dark:text-gray-100">{shownPrice != null ? formatCurrency(shownPrice) : <span className="text-amber-600 text-xs">Falta valor hora u horas</span>}</span>}
      </td>
      <td className="px-3 py-2 text-gray-500 text-right whitespace-nowrap">{Number(item.tax_percentage) ? `${Number(item.tax_percentage)} %` : 'Sin IVA'}</td>
      <td className="px-3 py-2 text-right">
        {canEdit && dirty && (
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:opacity-60">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
          </button>
        )}
      </td>
    </tr>
  );
}

export default function LaborTimesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = ['admin', 'manager', 'super_admin'].includes(role);
  const [settings, setSettings] = useState(null);
  const [data, setData] = useState({ items: [], stats: null, pagination: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [missing, setMissing] = useState(false);
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await laborTimesAPI.listServices({ search: search || undefined, missing_hours: missing ? 'true' : undefined, status: 'all', page, limit: 50 });
      setData(res.data.data);
    } catch {
      toast.error('No se pudo cargar el tempario');
    } finally {
      setLoading(false);
    }
  }, [search, missing, page]);

  useEffect(() => { laborTimesAPI.getSettings().then((r) => setSettings(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const stats = data.stats;
  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock size={20} className="text-emerald-600" /> Tempario
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Tiempo estándar y tarifa de cada servicio de mano de obra. Las horas pasan a cada línea de la orden de trabajo y alimentan la productividad de los técnicos.
              Los servicios nuevos se crean en Productos (tipo Mano de obra) o con el Excel.
            </p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => laborTimesAPI.exportServices().catch(() => toast.error('No se pudo exportar'))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                <Download size={15} /> Exportar
              </button>
              <button onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                <Upload size={15} /> Importar Excel
              </button>
            </div>
          )}
        </div>

        {settings && <SettingsCard key={JSON.stringify(settings)} settings={settings} canEdit={canEdit} onSaved={(s) => { setSettings(s); load(); }} />}

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Servicios activos', stats.total],
              ['Con tiempo', `${stats.with_hours} de ${stats.total}`],
              ['Precio por hora', stats.hourly],
            ].map(([label, value]) => (
              <div key={label} className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-100 dark:border-white/10">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por código o nombre"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={missing} onChange={(e) => { setMissing(e.target.checked); setPage(1); }} />
              <AlertTriangle size={14} className="text-amber-500" /> Solo sin tiempo
            </label>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : data.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No hay servicios de mano de obra{search || missing ? ' con ese filtro' : ''}. Créalos en Productos (tipo Mano de obra) o impórtalos desde Excel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-graphite-2">
                  <tr>
                    {['Código', 'Servicio', 'Categoría', 'Horas', 'Modo', 'Precio', 'IVA', ''].map((h, i) => (
                      <th key={i} className={`px-3 py-2 text-xs font-medium text-gray-500 uppercase ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {data.items.map((item) => (
                    <ServiceRow key={`${item.id}-${item.updated_at || ''}-${item.base_price}-${item.standard_hours}-${item.labor_pricing_mode}`} item={item} rate={settings?.labor_hour_rate || 0} canEdit={canEdit}
                      onSaved={(updated) => setData((d) => ({ ...d, items: d.items.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)) }))} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.pagination?.pages > 1 && (
            <div className="p-3 border-t border-gray-100 dark:border-white/10">
              <Pagination currentPage={page} totalPages={data.pagination.pages} onPageChange={setPage} />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">Modo: {MODE_LABEL.hourly} = horas × valor hora; {MODE_LABEL.fixed} = precio propio. Cambiar el tempario no modifica las órdenes de trabajo ya creadas.</p>
      </div>

      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImported={load} />
    </Layout>
  );
}
