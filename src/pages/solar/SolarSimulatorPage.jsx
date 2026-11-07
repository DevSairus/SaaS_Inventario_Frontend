// Simulador solar público (/simulador/:slug). Sin sesión; se puede incrustar
// en el sitio web de la empresa con ?embed=1 (sin márgenes, avisa su alto al
// sitio que lo contiene para que el iframe crezca). Todo es estimado: el
// aviso viene del backend (services/solar/solarPublic.service.js).
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Info, Loader2, MapPin, Sun, Upload } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { solarPublicApi } from '../../api/solar';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const cop = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const millions = (n) => `$ ${(Number(n) / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} millones`;
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white';
const msg = (e, fallback) => e?.response?.data?.message || fallback;

// Cloudflare Turnstile (solo si el backend tiene la llave configurada).
function Turnstile({ siteKey, onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!siteKey) return undefined;
    let widgetId = null;
    const render = () => {
      if (!ref.current || !window.turnstile) return;
      widgetId = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(null), language: 'es' });
    };
    if (window.turnstile) render();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
    return () => { if (widgetId && window.turnstile) window.turnstile.remove(widgetId); };
  }, [siteKey, onToken]);
  return siteKey ? <div ref={ref} className="my-2" /> : null;
}

export default function SolarSimulatorPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const rootRef = useRef(null);

  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('kwh'); // kwh | bill
  const [form, setForm] = useState({ monthly_kwh: '', bill_amount: '', segment: 'residencial' });
  const [billInfo, setBillInfo] = useState(null);
  const [place, setPlace] = useState({ q: '', results: [], chosen: null, hsp: null, hsp_monthly: null });
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [lead, setLead] = useState({ name: '', phone: '', email: '', city: '', address: '', consent: false, website: '' });
  const [token, setToken] = useState(null);
  const [final, setFinal] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    solarPublicApi.config(slug).then((r) => setConfig(r.data)).catch((e) => setError(msg(e, 'Simulador no disponible')));
  }, [slug]);

  // En un iframe, avisar el alto al sitio que lo contiene.
  useEffect(() => {
    if (!embed || !rootRef.current || window.parent === window) return undefined;
    const send = () => window.parent.postMessage({ type: 'pitbox-solar-height', height: rootRef.current.scrollHeight + 24 }, '*');
    const ro = new ResizeObserver(send);
    ro.observe(rootRef.current);
    send();
    return () => ro.disconnect();
  }, [embed, config]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputs = () => ({
    segment: form.segment,
    ...(mode === 'kwh' ? { monthly_kwh: Number(form.monthly_kwh) } : { bill_amount: Number(String(form.bill_amount).replace(/\D/g, '')) }),
    ...(billInfo?.tariff_kwh ? { tariff_kwh: billInfo.tariff_kwh } : {}),
    hsp: place.hsp, hsp_monthly: place.hsp_monthly,
    latitude: place.chosen?.latitude, longitude: place.chosen?.longitude,
    place_city: place.chosen?.city, place_department: place.chosen?.department,
  });

  const readBill = async (file) => {
    if (!file) return;
    setBusy('bill'); setNotice(null);
    try {
      const r = (await solarPublicApi.readBill(slug, file, token)).data;
      setBillInfo(r);
      if (r.monthly_kwh) { setMode('kwh'); setForm((f) => ({ ...f, monthly_kwh: String(r.monthly_kwh), segment: r.segment === 'comercial' ? 'comercial' : f.segment })); }
      if (r.city && !place.q) setPlace((p) => ({ ...p, q: r.city }));
      if (r.address) setLead((l) => ({ ...l, address: l.address || r.address, city: l.city || r.city || '' }));
      setNotice(r.monthly_kwh
        ? `Leímos tu factura: ${r.history_kwh ? `promedio de ${r.history_kwh.length} meses, ` : ''}${r.monthly_kwh} kWh/mes${r.tariff_kwh ? ` a ${cop(r.tariff_kwh)}/kWh` : ''}. Revisa que esté bien.`
        : r.no_energy
          ? 'Esta factura no trae servicio de energía (no aparece ningún kWh; parece de agua, gas o aseo). Sube la factura de energía o escribe tu consumo a mano.'
          : 'No logramos leer el consumo de tu factura: escríbelo a mano.');
    } catch (e) {
      setNotice(msg(e, 'No pudimos leer la factura: escribe tu consumo a mano.'));
    } finally { setBusy(''); }
  };

  const searchPlace = async () => {
    if (place.q.trim().length < 3) return;
    setBusy('geo');
    try {
      const rows = (await solarPublicApi.geocode(slug, place.q)).data || [];
      setPlace((p) => ({ ...p, results: rows }));
      if (!rows.length) setNotice('No encontramos el lugar: prueba con el municipio y el departamento.');
    } catch (e) { setNotice(msg(e, 'No pudimos buscar el lugar.')); } finally { setBusy(''); }
  };
  const pickPlace = async (p) => {
    setPlace((s) => ({ ...s, chosen: p, results: [], q: p.label.split(',').slice(0, 2).join(',') }));
    setLead((l) => ({ ...l, city: l.city || p.city || '' }));
    setBusy('nasa');
    try {
      const r = (await solarPublicApi.irradiance(slug, p.latitude, p.longitude)).data;
      setPlace((s) => ({ ...s, hsp: r.hsp, hsp_monthly: r.hsp_monthly }));
    } catch { /* se usa la radiación por defecto */ } finally { setBusy(''); }
  };

  const calculate = async (e) => {
    e.preventDefault();
    setBusy('calc'); setNotice(null); setFinal(null);
    try {
      setResult((await solarPublicApi.estimate(slug, inputs())).data);
    } catch (err) { setNotice(msg(err, 'No pudimos calcular. Revisa tu consumo.')); } finally { setBusy(''); }
  };

  const sendLead = async (e) => {
    e.preventDefault();
    if (!lead.consent) { setNotice('Para ver la inversión estimada debes autorizar el tratamiento de tus datos.'); return; }
    setBusy('lead'); setNotice(null);
    try {
      const r = (await solarPublicApi.lead(slug, { ...inputs(), ...lead, turnstile_token: token, referrer: document.referrer || window.location.href, bill_data: billInfo })).data;
      setFinal(r);
    } catch (err) { setNotice(msg(err, 'No pudimos enviar tus datos. Intenta de nuevo.')); } finally { setBusy(''); }
  };

  if (error) return <div className="min-h-screen flex items-center justify-center p-6 text-gray-600">{error}</div>;
  if (!config) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  const accent = /^#?[0-9a-f]{6}$/i.test(config.primary_color || '') ? `#${config.primary_color.replace('#', '')}` : '#ea580c';
  const chart = result ? result.production_monthly.map((v, i) => ({ month: MONTHS[i], kwh: Math.round(v) })) : [];
  const whatsapp = final?.whatsapp ? `https://wa.me/${final.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, hice la simulación solar en su sitio web (${result?.kwp} kWp). Quisiera la propuesta formal.`)}` : null;

  return (
    <div ref={rootRef} style={{ '--accent': accent }} className={`${embed ? '' : 'min-h-screen bg-gray-50 py-8'} text-gray-900`}>
      <div className={`max-w-3xl mx-auto ${embed ? 'px-3 py-3' : 'px-4'} space-y-5`}>
        {!embed && (
          <header className="flex items-center gap-3">
            {config.logo_url && <img src={config.logo_url} alt={config.company} className="h-10 w-auto object-contain" />}
            <span className="font-semibold text-gray-700">{config.company}</span>
          </header>
        )}

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Sun className="w-7 h-7" style={{ color: accent }} /> {config.title}</h1>
          <p className="text-gray-600 mt-1">{config.intro}</p>
        </div>

        <form onSubmit={calculate} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
          <section className="space-y-3">
            <h2 className="font-semibold">1. Tu consumo de energía</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {[['kwh', 'Sé mis kWh al mes'], ['bill', 'Sé el valor de mi factura']].map(([k, label]) => (
                <button type="button" key={k} onClick={() => setMode(k)} className="px-3 py-1.5 rounded-full border" style={mode === k ? { background: accent, borderColor: accent, color: '#fff' } : {}}>{label}</button>
              ))}
            </div>
            {mode === 'kwh' ? (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Consumo mensual (kWh)</label>
                <input type="number" min="30" inputMode="numeric" value={form.monthly_kwh} onChange={set('monthly_kwh')} className={inputCls} placeholder="Ej. 350 (está en tu factura)" required />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor de tu factura de energía ($ al mes)</label>
                <input inputMode="numeric" value={form.bill_amount} onChange={set('bill_amount')} className={inputCls} placeholder="Ej. 320.000" required />
                <p className="text-xs text-gray-500 mt-1">Lo convertimos a kWh con una tarifa de referencia de {cop(config.default_tariff)}/kWh.</p>
              </div>
            )}
            {config.ocr_available && (
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: accent }}>
                {busy === 'bill' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {busy === 'bill' ? 'Leyendo tu factura…' : 'O sube una foto o PDF de tu factura'}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => readBill(e.target.files?.[0])} disabled={busy === 'bill'} />
              </label>
            )}
            <div className="flex gap-4 text-sm">
              {[['residencial', 'Hogar'], ['comercial', 'Negocio o industria']].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2"><input type="radio" checked={form.segment === k} onChange={() => setForm((f) => ({ ...f, segment: k }))} /> {label}</label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">2. ¿Dónde se instalaría?</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={place.q} onChange={(e) => setPlace((p) => ({ ...p, q: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(); } }} className={`${inputCls} pl-9`} placeholder="Municipio (ej. Ibagué, Tolima)" />
              </div>
              <button type="button" onClick={searchPlace} className="px-4 rounded-lg border border-gray-300 text-sm">{busy === 'geo' ? '…' : 'Buscar'}</button>
            </div>
            {place.results.length > 0 && (
              <ul className="border border-gray-200 rounded-lg divide-y text-sm">
                {place.results.map((p) => <li key={`${p.latitude},${p.longitude}`}><button type="button" onClick={() => pickPlace(p)} className="w-full text-left px-3 py-2 hover:bg-gray-50">{p.label}</button></li>)}
              </ul>
            )}
            {place.chosen && (
              <p className="text-sm text-gray-600">
                {busy === 'nasa' ? 'Consultando la radiación solar…' : place.hsp ? `Radiación de tu zona: ${place.hsp} horas de sol pico al día (promedio histórico).` : 'Usaremos una radiación promedio.'}
              </p>
            )}
            {!place.chosen && <p className="text-xs text-gray-500">Opcional, pero el cálculo es más preciso con tu ubicación.</p>}
          </section>

          <button type="submit" disabled={Boolean(busy)} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60" style={{ background: accent }}>
            {busy === 'calc' ? 'Calculando…' : 'Calcular mi sistema'}
          </button>
        </form>

        {notice && <p className="text-sm rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-900">{notice}</p>}

        {result && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-lg">Tu sistema estimado</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Potencia', `${Number(result.kwp).toLocaleString('es-CO')} kWp`, `${result.panels} paneles de ${result.panel_watts} W`],
                ['Energía producida', `${Math.round(result.production_month).toLocaleString('es-CO')} kWh/mes`, `para tu consumo de ${Math.round(result.monthly_kwh).toLocaleString('es-CO')} kWh`],
                ['Ahorro mensual', cop(result.savings_month), `con tarifa de ${cop(result.tariff_kwh)}/kWh`],
                ['Ahorro anual', cop(result.savings_year), 'aproximado'],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold tabular-nums">{value}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Producción estimada por mes (kWh)</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 10, right: 6, left: -14, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={44} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [`${Number(v).toLocaleString('es-CO')} kWh`, 'Producción']} />
                    <ReferenceLine y={Math.round(result.target_kwh)} stroke="#6b7280" strokeDasharray="4 3" />
                    <Bar dataKey="kwh" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-1">Línea punteada: tu consumo ({Math.round(result.target_kwh).toLocaleString('es-CO')} kWh/mes).</p>
            </div>

            {!final ? (
              <form onSubmit={sendLead} className="border-t border-gray-100 pt-4 space-y-3">
                <h3 className="font-semibold">¿Cuánto costaría? Déjanos tus datos y te mostramos la inversión estimada y el retorno</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={lead.name} onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))} className={inputCls} placeholder="Nombre *" required autoComplete="name" />
                  <input value={lead.phone} onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))} className={inputCls} placeholder="Celular *" required inputMode="tel" autoComplete="tel" />
                  <input type="email" value={lead.email} onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))} className={inputCls} placeholder="Correo" autoComplete="email" />
                  <input value={lead.city} onChange={(e) => setLead((l) => ({ ...l, city: e.target.value }))} className={inputCls} placeholder="Ciudad" />
                  <input value={lead.address} onChange={(e) => setLead((l) => ({ ...l, address: e.target.value }))} className={`${inputCls} sm:col-span-2`} placeholder="Dirección del inmueble" title="Para agendar la visita técnica" autoComplete="street-address" maxLength={255} />
                </div>
                {/* Campo trampa: los bots lo llenan, las personas no lo ven */}
                <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={lead.website} onChange={(e) => setLead((l) => ({ ...l, website: e.target.value }))} name="website" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input type="checkbox" className="mt-0.5" checked={lead.consent} onChange={(e) => setLead((l) => ({ ...l, consent: e.target.checked }))} />
                  <span>{config.consent_text} <a href={config.privacy_url} target="_blank" rel="noreferrer" className="underline">Ver la política de datos</a>.</span>
                </label>
                <Turnstile siteKey={config.turnstile_site_key} onToken={setToken} />
                <button type="submit" disabled={busy === 'lead'} className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60" style={{ background: accent }}>
                  {busy === 'lead' ? 'Enviando…' : 'Ver la inversión estimada'}
                </button>
              </form>
            ) : (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                {final.price_min ? (
                  <div className="rounded-xl px-4 py-4 text-white" style={{ background: accent }}>
                    <p className="text-sm opacity-90">Inversión estimada</p>
                    <p className="text-2xl font-bold">entre {millions(final.price_min)} y {millions(final.price_max)}</p>
                    {final.payback_years_min && <p className="text-sm opacity-90">Recuperarías la inversión en unos {Number(final.payback_years_min).toLocaleString('es-CO')} a {Number(final.payback_years_max).toLocaleString('es-CO')} años con el ahorro estimado.</p>}
                  </div>
                ) : (
                  <p className="text-sm">Un asesor te enviará la inversión estimada para tu caso.</p>
                )}
                {final.tax_deduction_note && <p className="text-xs text-gray-600">{final.tax_deduction_note}</p>}
                <p className="flex items-start gap-2 text-sm text-green-800"><CheckCircle2 className="w-5 h-5 shrink-0" /> {final.message}</p>
                {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Escribir por WhatsApp</a>}
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-gray-500 flex items-start gap-2 bg-white rounded-xl border border-gray-200 px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" /> {config.disclaimer}
        </p>
        <p className="text-[11px] text-gray-400 text-center">Radiación solar: NASA POWER. Simulador de {config.company}.</p>
      </div>
    </div>
  );
}
