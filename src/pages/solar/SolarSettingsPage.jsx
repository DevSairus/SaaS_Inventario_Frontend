import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import NumericInput from '../../components/inputs/NumericInput';
import ProductPicker from '../../components/solar/ProductPicker';
import { getSolarSettings, updateSolarSettings } from '../../api/solar';
import useTenantStore from '../../store/tenantStore';
import { formatCurrency } from '../../utils/formatters';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800';
const Label = ({ children, hint }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}{hint && <span className="block text-xs font-normal text-gray-500">{hint}</span>}
  </label>
);
const Card = ({ title, children }) => (
  <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    {children}
  </section>
);
const asProduct = (p) => (p ? { id: p.id, name: p.name, sku: p.sku, base_price: p.base_price } : null);

export default function SolarSettingsPage() {
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSolarSettings().then((r) => {
      const s = r.data;
      setForm({ ...s, panel: asProduct(s.panel_product), inverter: asProduct(s.inverter_product) });
    }).catch((e) => toast.error(e.response?.data?.message || 'No se pudieron cargar los parámetros'));
  }, []);

  if (!form) return <Layout><div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div></Layout>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const perKwp = (pct) => formatCurrency((Number(form.price_per_kwp) || 0) * (Number(pct) || 0) / 100);
  const aiuTotal = Number(form.aiu_admin_pct || 0) + Number(form.aiu_unforeseen_pct || 0) + Number(form.aiu_profit_pct || 0);
  const paySum = (form.payment_terms || []).reduce((s, p) => s + (Number(p.pct) || 0), 0);
  const publicUrl = tenantSlug ? `${window.location.origin}/simulador/${tenantSlug}` : null;
  const embedCode = publicUrl ? `<iframe id="pitbox-solar" src="${publicUrl}?embed=1" style="width:100%;border:0;min-height:900px" title="Simulador solar"></iframe>
<script>window.addEventListener('message',function(e){if(e.data&&e.data.type==='pitbox-solar-height'){document.getElementById('pitbox-solar').style.height=e.data.height+'px';}});</script>` : '';
  const copy = (text) => navigator.clipboard.writeText(text).then(() => toast.success('Copiado')).catch(() => toast.error('No se pudo copiar'));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        price_per_kwp: Number(form.price_per_kwp), labor_pct: Number(form.labor_pct), electrical_pct: Number(form.electrical_pct),
        consulting_pct: Number(form.consulting_pct), service_tax_pct: Number(form.service_tax_pct), performance_ratio: Number(form.performance_ratio),
        default_hsp: Number(form.default_hsp), dc_ac_ratio: Number(form.dc_ac_ratio), panel_watts: Number(form.panel_watts),
        panel_product_id: form.panel?.id || null, inverter_product_id: form.inverter?.id || null,
        use_aiu: Boolean(form.use_aiu), aiu_admin_pct: Number(form.aiu_admin_pct), aiu_unforeseen_pct: Number(form.aiu_unforeseen_pct), aiu_profit_pct: Number(form.aiu_profit_pct),
        validity_days: Number(form.validity_days), payment_terms: form.payment_terms, conditions: form.conditions,
        public_enabled: Boolean(form.public_enabled), public_title: form.public_title, public_intro: form.public_intro,
        public_price_range_pct: Number(form.public_price_range_pct), public_default_tariff: Number(form.public_default_tariff),
        public_privacy_url: form.public_privacy_url, public_notify_emails: form.public_notify_emails, public_whatsapp: form.public_whatsapp,
      };
      const r = await updateSolarSettings(payload);
      toast.success(r.message);
      setForm((f) => ({ ...f, public_notify_emails: r.data.public_notify_emails, public_privacy_url: r.data.public_privacy_url }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudieron guardar los parámetros');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <form onSubmit={save} className="space-y-5 max-w-4xl">
        <Link to="/solar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Cotizador solar</Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Parámetros del cotizador solar</h1>
          <p className="text-sm text-gray-500">Los equipos se cotizan con el precio del catálogo; la mano de obra, el material eléctrico y la consultoría, por kWp.</p>
        </div>

        <Card title="Equipos por defecto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><Label>Panel</Label><ProductPicker value={form.panel} onChange={set('panel')} placeholder="Buscar el panel en el catálogo..." /></div>
            <div><Label>Potencia del panel (W)</Label><input type="number" min="100" max="1000" value={form.panel_watts} onChange={set('panel_watts')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><Label>Inversor</Label><ProductPicker value={form.inverter} onChange={set('inverter')} placeholder="Buscar el inversor en el catálogo..." /></div>
            <div><Label hint="Para sugerir la potencia del inversor">Relación DC/AC</Label><input type="number" step="0.05" min="0.8" max="2" value={form.dc_ac_ratio} onChange={set('dc_ac_ratio')} className={inputCls} /></div>
          </div>
        </Card>

        <Card title="Servicios por kWp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label hint="Base para calcular los servicios">Precio base por kWp</Label><NumericInput value={form.price_per_kwp} onChange={set('price_per_kwp')} className={inputCls} /></div>
            <div><Label hint="Sin AIU; con AIU el IVA va sobre la utilidad">IVA de los servicios (%)</Label><input type="number" min="0" max="100" value={form.service_tax_pct} onChange={set('service_tax_pct')} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label hint={`${perKwp(form.labor_pct)} por kWp`}>Mano de obra (%)</Label><input type="number" min="0" max="100" step="0.5" value={form.labor_pct} onChange={set('labor_pct')} className={inputCls} /></div>
            <div><Label hint={`${perKwp(form.electrical_pct)} por kWp`}>Material eléctrico (%)</Label><input type="number" min="0" max="100" step="0.5" value={form.electrical_pct} onChange={set('electrical_pct')} className={inputCls} /></div>
            <div><Label hint={`${perKwp(form.consulting_pct)} por kWp`}>Consultoría RETIE / OR / UPME (%)</Label><input type="number" min="0" max="100" step="0.5" value={form.consulting_pct} onChange={set('consulting_pct')} className={inputCls} /></div>
          </div>
        </Card>

        <Card title="Dimensionamiento">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label hint="Pérdidas de inversor, cableado, temperatura y suciedad (antes de techo, orientación y sombra)">Eficiencia base del sistema</Label><input type="number" step="0.01" min="0.4" max="1" value={form.performance_ratio} onChange={set('performance_ratio')} className={inputCls} /></div>
            <div><Label hint="Si no se consulta la radiación de la ubicación">Horas sol pico por defecto</Label><input type="number" step="0.1" min="1" max="8" value={form.default_hsp} onChange={set('default_hsp')} className={inputCls} /></div>
          </div>
        </Card>

        <Card title="AIU">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={Boolean(form.use_aiu)} onChange={set('use_aiu')} disabled={!form.tenant_aiu_enabled && !form.use_aiu} />
            <span>
              Cotizar con AIU (administración, imprevistos y utilidad sobre el costo directo; el IVA va sobre la utilidad).
              {!form.tenant_aiu_enabled && <span className="block text-xs text-amber-700">La facturación AIU no está habilitada para la empresa (Ajustes → Impuestos).</span>}
            </span>
          </label>
          {form.use_aiu && (
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Administración (%)</Label><input type="number" min="0" max="100" step="0.5" value={form.aiu_admin_pct} onChange={set('aiu_admin_pct')} className={inputCls} /></div>
              <div><Label>Imprevistos (%)</Label><input type="number" min="0" max="100" step="0.5" value={form.aiu_unforeseen_pct} onChange={set('aiu_unforeseen_pct')} className={inputCls} /></div>
              <div><Label>Utilidad (%)</Label><input type="number" min="0" max="100" step="0.5" value={form.aiu_profit_pct} onChange={set('aiu_profit_pct')} className={inputCls} /></div>
              <p className="col-span-3 text-xs text-gray-500">AIU total: {aiuTotal} %</p>
            </div>
          )}
        </Card>

        <Card title="Propuesta">
          <div className="space-y-2">
            <Label hint={`Suma ${paySum} % (debe ser 100 %)`}>Forma de pago</Label>
            {(form.payment_terms || []).map((p, i) => (
              <div key={i} className="grid grid-cols-[6rem_minmax(0,1fr)_2rem] gap-2 items-center">
                <input type="number" min="1" max="100" value={p.pct} onChange={(e) => setForm((f) => ({ ...f, payment_terms: f.payment_terms.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)) }))} className={inputCls} />
                <input value={p.label} onChange={(e) => setForm((f) => ({ ...f, payment_terms: f.payment_terms.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} className={inputCls} />
                <button type="button" onClick={() => setForm((f) => ({ ...f, payment_terms: f.payment_terms.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setForm((f) => ({ ...f, payment_terms: [...(f.payment_terms || []), { pct: 0, label: '' }] }))} className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline"><Plus className="w-4 h-4" /> Agregar pago</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label>Validez (días)</Label><input type="number" min="1" max="365" value={form.validity_days} onChange={set('validity_days')} className={inputCls} /></div>
          </div>
          <div><Label hint="Una por línea; salen en la propuesta y en las notas de la cotización">Condiciones</Label><textarea rows={5} value={form.conditions || ''} onChange={set('conditions')} className={inputCls} /></div>
        </Card>

        <Card title="Lectura de facturas de energía">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {form.ocr_available
              ? 'Activa: el botón Leer factura usa el lector de facturas de Pitbox (incluye el historial de consumo cuando la factura lo trae).'
              : 'El lector de facturas no está configurado en este servidor: los datos de la factura se escriben a mano.'}
          </p>
        </Card>

        <Card title="Simulador público para tu sitio web">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={Boolean(form.public_enabled)} onChange={set('public_enabled')} />
            <span>
              Publicar el simulador: cualquier persona calcula su sistema solar y, para ver la inversión estimada, deja sus datos.
              <span className="block text-xs text-gray-500">Muestra siempre que los valores son estimados y no son una oferta ni un compromiso de precio o diseño.</span>
            </span>
          </label>
          {publicUrl && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-3 py-2 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-600">Enlace:</span>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="text-orange-700 hover:underline break-all">{publicUrl}</a>
                <button type="button" onClick={() => copy(publicUrl)} className="text-xs px-2 py-0.5 rounded border border-gray-300">Copiar</button>
              </div>
              <div>
                <span className="text-gray-600">Para incrustarlo en tu sitio web:</span>
                <textarea readOnly rows={4} value={embedCode} className="mt-1 w-full font-mono text-xs px-2 py-1.5 border border-gray-300 rounded bg-white dark:bg-gray-800" />
                <button type="button" onClick={() => copy(embedCode)} className="text-xs px-2 py-0.5 rounded border border-gray-300">Copiar código</button>
              </div>
              {!form.public_enabled && <p className="text-xs text-amber-700">El enlace no funciona hasta que actives el simulador y guardes.</p>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Título</Label><input value={form.public_title || ''} onChange={set('public_title')} className={inputCls} placeholder="Calcula tu sistema de energía solar" /></div>
            <div><Label hint="Obligatorio para publicar (Ley 1581)">Enlace a tu política de tratamiento de datos *</Label><input value={form.public_privacy_url || ''} onChange={set('public_privacy_url')} className={inputCls} placeholder="https://tusitio.com/politica-de-datos" /></div>
          </div>
          <div><Label>Texto de presentación</Label><textarea rows={2} value={form.public_intro || ''} onChange={set('public_intro')} className={inputCls} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label hint={'Se muestra "entre X y Y"'}>Rango del precio (± %)</Label><input type="number" min="0" max="50" value={form.public_price_range_pct ?? 10} onChange={set('public_price_range_pct')} className={inputCls} /></div>
            <div><Label hint="Si el visitante da el valor de su factura">Tarifa de referencia ($/kWh)</Label><NumericInput value={form.public_default_tariff} onChange={set('public_default_tariff')} className={inputCls} /></div>
            <div><Label hint="Botón de WhatsApp al final">WhatsApp de ventas</Label><input value={form.public_whatsapp || ''} onChange={set('public_whatsapp')} className={inputCls} placeholder="573001234567" /></div>
          </div>
          <div><Label hint="Separados por coma. Vacío: administradores y gerentes">Avisar de cada interesado a</Label><input value={form.public_notify_emails || ''} onChange={set('public_notify_emails')} className={inputCls} placeholder="ventas@tuempresa.com" /></div>
        </Card>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar parámetros'}</button>
        </div>
      </form>
    </Layout>
  );
}
