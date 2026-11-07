import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, Briefcase, FileText, Loader2, MapPin, Plus, Save, Sun, Trash2, Upload } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Layout from '../../components/layout/Layout';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';
import NumericInput from '../../components/inputs/NumericInput';
import ProductPicker from '../../components/solar/ProductPicker';
import { usePermissions } from '../../store/tenantPermissionsStore';
import salesApi from '../../api/sales';
import {
  calculateSolar, createProjectFromStudy, createSolarStudy, geocodeSolar, getIrradiance, getSolarQuotePayload,
  getSolarSettings, getSolarStudy, linkSolarQuote, ocrEnergyBill, openSolarProposal, updateSolarStudy,
} from '../../api/solar';
import { formatCurrency } from '../../utils/formatters';
import { googleMapsPointUrl, googleMapsSearchUrl, parseLatLon } from '../../utils/mapsLinks';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800';
const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;
const Card = ({ title, step, children, right }) => (
  <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">
        {step && <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-orange-100 text-orange-700 text-xs">{step}</span>}
        {title}
      </h2>
      {right}
    </div>
    {children}
  </section>
);
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ROOFS = { inclinado: 'Inclinado (teja, lámina)', plano: 'Plano (losa)', industrial: 'Industrial (cubierta metálica)', mixto: 'Mixto' };
const ORIENTATIONS = { norte: 'Norte (óptimo)', noreste: 'Noreste', noroeste: 'Noroeste', este: 'Este', oeste: 'Oeste', sur: 'Sur' };
const SYSTEMS = { ongrid: 'Conectado a la red (on-grid)', offgrid: 'Aislado (off-grid)', hybrid: 'Híbrido' };

const empty = {
  customer_id: null, title: '', system_type: 'ongrid', city: '', department: '', address: '', latitude: '', longitude: '',
  hsp: '', hsp_monthly: null, hsp_source: '', monthly_kwh: '', tariff_kwh: '', coverage_pct: 100,
  roof: 'inclinado', orientation: 'norte', tilt: 10, shading_pct: 5, panel: null, panel_watts: '', inverter: null,
  inverter_quantity: 1, extras: [], bill_data: null, notes: '',
};

// Producto de una línea del resultado guardado (para mostrar el elegido).
const productFromLine = (results, kind) => {
  const l = (results?.lines || []).find((x) => x.kind === kind);
  return l?.product_id ? { id: l.product_id, name: l.name, sku: l.sku, base_price: l.list_price } : null;
};

export default function SolarStudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const [form, setForm] = useState(empty);
  const [study, setStudy] = useState(null);
  const [settings, setSettings] = useState(null);
  const [calc, setCalc] = useState({ results: null, warnings: [], error: null, loading: false });
  const [geo, setGeo] = useState({ q: '', results: [], loading: false });
  const [busy, setBusy] = useState('');
  const fileRef = useRef(null);
  const locked = study?.status === 'project';

  // Carga: parámetros (panel/inversor por defecto) y el estudio si existe.
  useEffect(() => {
    (async () => {
      try {
        const s = (await getSolarSettings()).data;
        setSettings(s);
        if (!id) {
          setForm((f) => ({
            ...f,
            panel: s.panel_product ? { id: s.panel_product.id, name: s.panel_product.name, sku: s.panel_product.sku, base_price: s.panel_product.base_price } : null,
            inverter: s.inverter_product ? { id: s.inverter_product.id, name: s.inverter_product.name, sku: s.inverter_product.sku, base_price: s.inverter_product.base_price } : null,
            panel_watts: s.panel_watts,
          }));
          return;
        }
        const st = (await getSolarStudy(id)).data;
        setStudy(st);
        const inp = st.inputs || {};
        setForm({
          ...empty,
          ...Object.fromEntries(Object.keys(empty).filter((k) => st[k] !== undefined && st[k] !== null).map((k) => [k, st[k]])),
          coverage_pct: inp.coverage_pct ?? 100, roof: inp.roof || 'inclinado', orientation: inp.orientation || 'norte',
          tilt: inp.tilt ?? 10, shading_pct: inp.shading_pct ?? 5, panel_watts: inp.panel_watts || s.panel_watts,
          inverter_quantity: inp.inverter_quantity || 1,
          panel: productFromLine(st.results, 'panel'),
          inverter: inp.inverter_product_id === null ? null : productFromLine(st.results, 'inverter'),
          extras: (st.results?.lines || []).filter((l) => l.kind === 'extra').map((l) => ({ product: { id: l.product_id, name: l.name, sku: l.sku, base_price: l.list_price }, quantity: l.quantity })),
        });
      } catch (e) {
        toast.error(e.response?.data?.message || 'No se pudo cargar el cotizador');
      }
    })();
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const inputsPayload = useCallback((f) => ({
    monthly_kwh: Number(f.monthly_kwh) || 0,
    tariff_kwh: Number(f.tariff_kwh) || 0,
    coverage_pct: Number(f.coverage_pct) || 100,
    hsp: Number(f.hsp) || null,
    hsp_monthly: f.hsp_monthly,
    roof: f.roof, orientation: f.orientation, tilt: Number(f.tilt), shading_pct: Number(f.shading_pct),
    panel_product_id: f.panel?.id || null,
    panel_watts: Number(f.panel_watts) || null,
    inverter_product_id: f.inverter?.id || null,
    inverter_quantity: Number(f.inverter_quantity) || 1,
    extras: f.extras.filter((e) => e.product?.id && Number(e.quantity) > 0).map((e) => ({ product_id: e.product.id, quantity: Number(e.quantity) })),
  }), []);

  // Cálculo en vivo (con pausa para no consultar en cada tecla).
  const calcKey = JSON.stringify(inputsPayload(form));
  useEffect(() => {
    if (!(Number(form.monthly_kwh) > 0) || !settings) { setCalc((c) => ({ ...c, results: null, warnings: [] })); return undefined; }
    const t = setTimeout(async () => {
      setCalc((c) => ({ ...c, loading: true }));
      try {
        const r = (await calculateSolar(JSON.parse(calcKey))).data;
        setCalc({ results: r.results, warnings: r.warnings || [], error: null, loading: false });
      } catch (e) {
        setCalc({ results: null, warnings: [], error: e.response?.data?.message || 'No se pudo calcular', loading: false });
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcKey, settings]);

  const readBill = async (file) => {
    if (!file) return;
    setBusy('ocr');
    try {
      const { fields } = (await ocrEnergyBill(file)).data;
      setForm((f) => ({
        ...f,
        monthly_kwh: fields.monthly_kwh || f.monthly_kwh,
        tariff_kwh: fields.tariff_kwh || f.tariff_kwh,
        city: f.city || fields.city || '',
        bill_data: fields,
      }));
      const found = ['monthly_kwh', 'tariff_kwh', 'city'].filter((k) => fields[k]).length;
      if (fields.no_energy) toast.error('La factura no trae servicio de energía (ningún kWh): sube la de energía o ingresa el consumo a mano', { duration: 6000 });
      else toast.success(found ? `Factura leída: revisa los datos (${found} de 3 encontrados)` : 'No se encontraron datos claros: ingrésalos a mano');
      if (fields.city && !form.latitude) setGeo((g) => ({ ...g, q: `${fields.city}` }));
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo leer la factura');
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const loadIrradiance = async (lat, lon) => {
    setBusy('nasa');
    try {
      const r = (await getIrradiance(lat, lon)).data;
      setForm((f) => ({ ...f, hsp: r.hsp, hsp_monthly: r.hsp_monthly, hsp_source: 'nasa_power' }));
      toast.success(`Radiación NASA POWER: ${r.hsp} horas sol pico al día`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo consultar la radiación');
    } finally {
      setBusy('');
    }
  };

  const searchPlace = async () => {
    if (geo.q.trim().length < 3) return;
    setGeo((g) => ({ ...g, loading: true }));
    try {
      setGeo((g) => ({ ...g, results: [], loading: false }));
      const rows = (await geocodeSolar(geo.q)).data || [];
      setGeo((g) => ({ ...g, results: rows, loading: false }));
      if (!rows.length) toast('No se encontró el lugar: prueba con municipio y departamento');
    } catch (e) {
      setGeo((g) => ({ ...g, loading: false }));
      toast.error(e.response?.data?.message || 'No se pudo buscar');
    }
  };
  const pickPlace = (p) => {
    setForm((f) => ({ ...f, latitude: p.latitude, longitude: p.longitude, city: p.city || f.city, department: p.department || f.department }));
    setGeo((g) => ({ ...g, results: [] }));
    loadIrradiance(p.latitude, p.longitude);
  };
  // Pegar "4.43891, -75.23218" (clic derecho en Google Maps) llena latitud y longitud.
  const pasteCoords = (e) => {
    const c = parseLatLon(e.clipboardData?.getData('text'));
    if (!c) return;
    e.preventDefault();
    setForm((f) => ({ ...f, latitude: c.latitude, longitude: c.longitude }));
    loadIrradiance(c.latitude, c.longitude);
  };

  const save = async () => {
    if (!(Number(form.monthly_kwh) > 0)) { toast('Indica el consumo mensual'); return null; }
    setBusy('save');
    try {
      const payload = {
        ...inputsPayload(form),
        customer_id: form.customer_id || null, title: form.title, system_type: form.system_type,
        city: form.city, department: form.department, address: form.address,
        latitude: form.latitude === '' ? null : Number(form.latitude), longitude: form.longitude === '' ? null : Number(form.longitude),
        hsp_source: form.hsp_source || (form.hsp ? 'manual' : null), bill_data: form.bill_data, notes: form.notes,
      };
      const res = id ? await updateSolarStudy(id, payload) : await createSolarStudy(payload);
      toast.success(res.message);
      if (!id) navigate(`/solar/${res.data.id}`, { replace: true });
      else setStudy((s) => ({ ...s, ...res.data }));
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
      return null;
    } finally {
      setBusy('');
    }
  };

  const makeQuote = async () => {
    if (!form.customer_id) { toast('Elige el cliente antes de cotizar'); return; }
    const saved = await save();
    if (!saved) return;
    setBusy('quote');
    try {
      const payload = (await getSolarQuotePayload(saved.id)).data;
      const sale = (await salesApi.create(payload)).data;
      const linked = (await linkSolarQuote(saved.id, sale.data.id)).data;
      setStudy((s) => ({ ...s, ...linked }));
      toast.success(`Cotización ${sale.data.sale_number} creada`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear la cotización');
    } finally {
      setBusy('');
    }
  };

  const makeProject = async () => {
    setBusy('project');
    try {
      const r = await createProjectFromStudy(id);
      toast.success(r.message, { duration: 6000 });
      navigate(`/projects/${r.data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear el proyecto');
    } finally {
      setBusy('');
    }
  };

  const r = calc.results;
  const quote = study?.quote;
  const chartData = r ? r.production_monthly.map((v, i) => ({ month: MONTHS[i], kwh: Math.round(v) })) : [];
  const target = r ? Math.round(r.target_kwh) : 0;

  return (
    <Layout>
      <div className="space-y-5">
        <Link to="/solar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Cotizador solar</Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sun className="w-6 h-6 text-orange-500" /> {study ? `${study.number}${form.title ? ` · ${form.title}` : ''}` : 'Nuevo estudio solar'}
            </h1>
            <p className="text-sm text-gray-500">Consumo, ubicación y sistema → cotización → proyecto con materiales y presupuesto.</p>
          </div>
          {!locked && (
            <button onClick={save} disabled={Boolean(busy)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar estudio
            </button>
          )}
        </div>

        {locked && (
          <div className="text-sm rounded-lg px-4 py-3 border bg-gray-50 border-gray-200 text-gray-700">
            Este estudio ya tiene proyecto: es de solo lectura. Para cotizar de nuevo crea un estudio nuevo.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <fieldset disabled={locked} className="xl:col-span-3 space-y-5 min-w-0">
            <Card step="1" title="Cliente">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <CustomerSearchInput
                    customers={study?.customer ? [{ ...study.customer, full_name: study.customer.business_name || [study.customer.first_name, study.customer.last_name].filter(Boolean).join(' ') }] : []}
                    value={form.customer_id}
                    onChange={(cid) => setForm((f) => ({ ...f, customer_id: cid || null }))}
                    placeholder="Buscar cliente por nombre o NIT..."
                  />
                </div>
                <div>
                  <Label>Tipo de sistema</Label>
                  <select value={form.system_type} onChange={set('system_type')} className={inputCls}>
                    {Object.entries(SYSTEMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Nombre del proyecto</Label><input value={form.title || ''} onChange={set('title')} className={inputCls} placeholder="Ej. Sistema solar residencial - Finca El Roble" /></div>
            </Card>

            <Card
              step="2"
              title="Consumo de energía"
              right={(
                <>
                  <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => readBill(e.target.files?.[0])} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'ocr'} title={settings && !settings.has_ocr_key ? 'Configura la llave de OCR.space en los parámetros' : ''} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    {busy === 'ocr' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Leer factura
                  </button>
                </>
              )}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Consumo mensual (kWh) *</Label><NumericInput value={form.monthly_kwh} onChange={set('monthly_kwh')} className={inputCls} placeholder="Ej. 450" /></div>
                <div><Label>Tarifa ($/kWh)</Label><NumericInput value={form.tariff_kwh} onChange={set('tariff_kwh')} className={inputCls} decimals={2} placeholder="Ej. 900" /></div>
                <div>
                  <Label>Cobertura del consumo: {form.coverage_pct} %</Label>
                  <input type="range" min="30" max="120" step="5" value={form.coverage_pct} onChange={set('coverage_pct')} className="w-full accent-orange-600 mt-2" />
                </div>
              </div>
              {form.bill_data && Object.keys(form.bill_data).length > 0 && (
                <p className="text-xs text-gray-500">
                  Leído de la factura: {[form.bill_data.holder, form.bill_data.operator, form.bill_data.period, form.bill_data.stratum && `estrato ${form.bill_data.stratum}`, form.bill_data.bill_total && `total ${formatCurrency(form.bill_data.bill_total)}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </Card>

            <Card step="3" title="Ubicación y radiación">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={geo.q} onChange={(e) => setGeo((g) => ({ ...g, q: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(); } }} className={`${inputCls} pl-9`} placeholder="Municipio, barrio o dirección (Colombia)" />
                </div>
                <button type="button" onClick={searchPlace} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50">{geo.loading ? 'Buscando…' : 'Buscar'}</button>
              </div>
              {geo.results.length > 0 && (
                <ul className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {geo.results.map((p) => (
                    <li key={`${p.latitude},${p.longitude}`}>
                      <button type="button" onClick={() => pickPlace(p)} className="w-full text-left px-3 py-2 hover:bg-orange-50 dark:hover:bg-gray-700">{p.label}</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><Label>Ciudad</Label><input value={form.city || ''} onChange={set('city')} className={inputCls} /></div>
                <div><Label>Departamento</Label><input value={form.department || ''} onChange={set('department')} className={inputCls} /></div>
                <div><Label>Latitud</Label><input type="number" step="any" value={form.latitude ?? ''} onChange={set('latitude')} onPaste={pasteCoords} className={inputCls} placeholder="Pega aquí: 4.4389, -75.2322" /></div>
                <div><Label>Longitud</Label><input type="number" step="any" value={form.longitude ?? ''} onChange={set('longitude')} onPaste={pasteCoords} className={inputCls} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label>Dirección de la instalación</Label>
                  {form.address?.trim() && (
                    <a href={googleMapsSearchUrl(form.address, form.city, form.department)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline mb-1">
                      <MapPin className="w-3.5 h-3.5" /> Buscar en Google Maps
                    </a>
                  )}
                </div>
                <input value={form.address || ''} onChange={set('address')} className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">Para la ubicación exacta del techo: búscala en Google Maps, haz clic derecho sobre el techo, copia las coordenadas y pégalas en Latitud.</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Label>Horas sol pico (HSP)</Label>
                  <input type="number" step="0.01" min="1" max="8" value={form.hsp ?? ''} onChange={(e) => setForm((f) => ({ ...f, hsp: e.target.value, hsp_monthly: null, hsp_source: 'manual' }))} className={inputCls} placeholder={settings ? String(settings.default_hsp) : ''} />
                </div>
                <button type="button" disabled={!form.latitude || !form.longitude || busy === 'nasa'} onClick={() => loadIrradiance(form.latitude, form.longitude)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {busy === 'nasa' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4" />} Consultar NASA POWER
                </button>
                {form.latitude && form.longitude && (
                  <a href={googleMapsPointUrl(form.latitude, form.longitude)} target="_blank" rel="noreferrer" className="text-sm text-orange-700 hover:underline pb-2">Ver el punto (satélite)</a>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {form.hsp_source === 'nasa_power' ? 'Radiación promedio histórica mes a mes de NASA POWER.'
                  : form.hsp ? 'Horas sol pico ingresadas a mano.'
                    : `Sin radiación: se usan ${settings?.default_hsp ?? 4.5} horas sol pico por defecto. Busca la ubicación para usar la radiación real.`}
              </p>
            </Card>

            <Card step="4" title="Sistema">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><Label>Techo</Label><select value={form.roof} onChange={set('roof')} className={inputCls}>{Object.entries(ROOFS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label>Orientación</Label><select value={form.orientation} onChange={set('orientation')} className={inputCls}>{Object.entries(ORIENTATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label>Inclinación (°)</Label><input type="number" min="0" max="60" value={form.tilt} onChange={set('tilt')} className={inputCls} /></div>
                <div><Label>Sombra (%)</Label><input type="number" min="0" max="60" value={form.shading_pct} onChange={set('shading_pct')} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><Label>Panel</Label><ProductPicker value={form.panel} onChange={(p) => setForm((f) => ({ ...f, panel: p }))} placeholder="Buscar el panel en el catálogo..." /></div>
                <div><Label>Potencia del panel (W)</Label><input type="number" min="100" max="1000" value={form.panel_watts ?? ''} onChange={set('panel_watts')} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Inversor {r ? <span className="font-normal text-gray-500">(sugerido: unos {r.suggested_inverter_kw} kW)</span> : null}</Label>
                  <ProductPicker value={form.inverter} onChange={(p) => setForm((f) => ({ ...f, inverter: p }))} placeholder="Buscar el inversor en el catálogo..." />
                </div>
                <div><Label>Cantidad de inversores</Label><input type="number" min="1" value={form.inverter_quantity} onChange={set('inverter_quantity')} className={inputCls} /></div>
              </div>
              <div className="space-y-2">
                <Label>Otros equipos del catálogo (estructura, baterías, medidor…)</Label>
                {form.extras.map((e, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_6rem_2rem] gap-2 items-center">
                    <ProductPicker value={e.product} onChange={(p) => setForm((f) => ({ ...f, extras: f.extras.map((x, j) => (j === i ? { ...x, product: p } : x)) }))} placeholder="Buscar producto..." />
                    <input type="number" min="1" value={e.quantity} onChange={(ev) => setForm((f) => ({ ...f, extras: f.extras.map((x, j) => (j === i ? { ...x, quantity: ev.target.value } : x)) }))} className={inputCls} />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, extras: f.extras.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-600" title="Quitar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setForm((f) => ({ ...f, extras: [...f.extras, { product: null, quantity: r?.panels || 1 }] }))} className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline"><Plus className="w-4 h-4" /> Agregar equipo</button>
              </div>
              <div><Label>Notas</Label><textarea rows={2} value={form.notes || ''} onChange={set('notes')} className={inputCls} /></div>
            </Card>
          </fieldset>

          <div className="xl:col-span-2 space-y-5">
            <div className="xl:sticky xl:top-4 space-y-5">
              <Card title="Resultado" right={calc.loading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : null}>
                {!r ? (
                  <p className="text-sm text-gray-500">{calc.error || 'Ingresa el consumo mensual para dimensionar el sistema.'}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Potencia', `${Number(r.kwp).toLocaleString('es-CO')} kWp`, `${r.panels} paneles de ${r.panel_watts} W`],
                        ['Producción', `${Math.round(r.production_month).toLocaleString('es-CO')} kWh/mes`, `eficiencia ${Math.round(r.pr * 100)} % · ${r.hsp} HSP`],
                        ['Ahorro', `${formatCurrency(r.savings_month)}/mes`, `${formatCurrency(r.savings_year)} al año`],
                        ['Retorno', r.payback_months ? `${Number(r.payback_months).toLocaleString('es-CO')} meses` : '—', r.payback_months ? `${(r.payback_months / 12).toLocaleString('es-CO', { maximumFractionDigits: 1 })} años` : 'sin tarifa'],
                      ].map(([label, value, sub]) => (
                        <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
                          <p className="text-xs text-gray-500">{sub}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Producción estimada por mes (kWh)</p>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 14, right: 8, left: -12, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={44} />
                            <Tooltip cursor={{ fill: 'rgba(234,88,12,0.08)' }} formatter={(v) => [`${Number(v).toLocaleString('es-CO')} kWh`, 'Producción']} />
                            <ReferenceLine y={target} stroke="#6b7280" strokeDasharray="4 3" ifOverflow="extendDomain" />
                            <Bar dataKey="kwh" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Línea punteada: consumo a cubrir ({target.toLocaleString('es-CO')} kWh/mes).</p>
                    </div>

                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {r.lines.map((l, i) => (
                          <tr key={i}>
                            <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300">{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.name}</td>
                            <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{formatCurrency(l.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-gray-200 dark:border-gray-600">
                        {r.aiu && (
                          <>
                            <tr><td className="pt-2 text-gray-600">Costo directo</td><td className="pt-2 text-right tabular-nums">{formatCurrency(r.direct)}</td></tr>
                            <tr><td className="text-gray-600">AIU ({r.aiu.admin_pct} + {r.aiu.unforeseen_pct} + {r.aiu.profit_pct} %)</td><td className="text-right tabular-nums">{formatCurrency(r.aiu.total)}</td></tr>
                          </>
                        )}
                        <tr><td className="pt-1 text-gray-600">Subtotal</td><td className="pt-1 text-right tabular-nums">{formatCurrency(r.subtotal)}</td></tr>
                        <tr><td className="text-gray-600">Impuestos (estimado)</td><td className="text-right tabular-nums">{formatCurrency(r.taxes)}</td></tr>
                        <tr className="font-semibold text-gray-900 dark:text-gray-100"><td className="pt-1">Total inversión</td><td className="pt-1 text-right tabular-nums">{formatCurrency(r.total)}</td></tr>
                      </tfoot>
                    </table>
                    <p className="text-xs text-gray-500">Deducción en renta de hasta {formatCurrency(r.tax_deduction_50)} (Ley 1715, sujeta a certificación UPME).</p>
                  </>
                )}
                {calc.warnings.length > 0 && (
                  <div className="text-xs rounded-lg px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 space-y-0.5">
                    {calc.warnings.map((w) => <p key={w} className="flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</p>)}
                  </div>
                )}
              </Card>

              {id && (
                <Card title="Cotización y proyecto">
                  <div className="space-y-2 text-sm">
                    <button type="button" onClick={() => openSolarProposal(id).catch(() => toast.error('No se pudo generar la propuesta'))} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50">
                      <FileText className="w-4 h-4" /> Propuesta en PDF
                    </button>
                    {quote ? (
                      <p className="rounded-lg bg-green-50 text-green-800 px-3 py-2">
                        Cotización <Link to={`/quotes/${quote.id}`} className="font-semibold underline">{quote.quote_number || quote.sale_number}</Link>
                        {quote.quote_status ? ` · ${quote.quote_status}` : ''}. Los cambios al estudio no la modifican.
                      </p>
                    ) : (
                      <button type="button" onClick={makeQuote} disabled={Boolean(busy) || !r} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">
                        {busy === 'quote' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Crear cotización
                      </button>
                    )}
                    {study?.project ? (
                      <p className="rounded-lg bg-blue-50 text-blue-800 px-3 py-2">
                        Proyecto <Link to={`/projects/${study.project.id}`} className="font-semibold underline">{study.project.code} {study.project.name}</Link>
                      </p>
                    ) : quote && can('projects.manage') && (
                      <button type="button" onClick={makeProject} disabled={Boolean(busy)} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 disabled:opacity-50">
                        {busy === 'project' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />} Crear proyecto con materiales y presupuesto
                      </button>
                    )}
                    {!quote && <p className="text-xs text-gray-500">La cotización usa los precios del catálogo y los parámetros del cotizador; el proyecto toma de ella el contrato, la lista de materiales y el presupuesto.</p>}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
