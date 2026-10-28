// frontend/src/pages/legal/ConsentPublicPage.jsx
// Página pública /autorizacion/:token -- el cliente, sin autenticarse:
//   - habeas_data: lee la autorización de tratamiento de datos, elige si
//     acepta publicidad y confirma con un código (OTP) que le llega por
//     correo o WhatsApp.
//   - vehicle_intake: revisa el inventario de ingreso de su vehículo y las
//     condiciones del servicio, y las acepta con el mismo código. Si aún no
//     ha autorizado el tratamiento de datos, puede hacerlo aquí mismo.
// Backend: controllers/legal/consents.controller.js (getPublicConsent...).
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { renderLegalMarkdown } from '../../utils/legalMarkdown';

const HEX = /^#[0-9a-f]{6}$/i;
const accentOf = (tenant) => (HEX.test(tenant?.primary_color || '') ? tenant.primary_color : '#1e3a8a');

const fmtDateTime = (d) => (d
  ? new Date(d).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
  : '');

const CHANNEL_LABELS = { email: 'Correo', whatsapp: 'WhatsApp' };
const CHANNEL_NOUNS = { email: 'correo', whatsapp: 'WhatsApp' };

const ITEM_STYLES = {
  ok:    { label: 'OK',          cls: 'bg-emerald-50 text-emerald-700' },
  bad:   { label: 'Con novedad', cls: 'bg-red-50 text-red-700' },
  na:    { label: 'N/A',         cls: 'bg-stone-100 text-stone-500' },
};

const CLOSED_MESSAGES = {
  rejected:  'Registramos que no autorizaste esta solicitud.',
  cancelled: 'Esta solicitud fue anulada por el establecimiento.',
  expired:   'Esta solicitud venció. Pide al establecimiento un nuevo enlace.',
  revoked:   'Esta autorización fue revocada.',
};

function DocumentBox({ content, title, version }) {
  const [open, setOpen] = useState(false);
  const html = useMemo(() => renderLegalMarkdown(content), [content]);
  return (
    <div className="border border-stone-200 rounded-xl bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-medium text-stone-800 text-sm">
          {title}
          {version ? <span className="ml-2 text-xs font-normal text-stone-400">v{version}</span> : null}
        </span>
        <span className="text-xs font-medium text-stone-500 shrink-0">{open ? 'Ocultar' : 'Leer documento'}</span>
      </button>
      {open && (
        <div
          className="legal-doc px-4 pb-4 max-h-[60vh] overflow-y-auto text-sm text-stone-700 leading-relaxed border-t border-stone-100 pt-3
            [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1
            [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

function IntakeSummary({ snapshot }) {
  if (!snapshot) return null;
  const v = snapshot.vehicle || {};
  const items = (snapshot.items || []).filter((i) => i.value !== 'unset');
  return (
    <div className="border border-stone-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">Vehículo</p>
          <p className="font-semibold text-stone-900">
            {v.plate || '—'} <span className="font-normal text-stone-500">{[v.brand, v.model, v.year].filter(Boolean).join(' · ')}</span>
          </p>
        </div>
        <span className="text-xs font-mono bg-stone-100 text-stone-600 rounded px-2 py-1 shrink-0">{snapshot.order_number}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-stone-400">Kilometraje</p>
          <p className="text-stone-800">{snapshot.mileage_in != null ? `${Number(snapshot.mileage_in).toLocaleString('es-CO')} km` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Combustible</p>
          <p className="text-stone-800">{snapshot.fuel_label || '—'}</p>
        </div>
      </div>
      {items.length > 0 && (
        <div>
          <p className="text-xs text-stone-400 mb-1.5">Estado de elementos</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((i) => (
              <span key={i.key} className={`text-xs rounded-md px-2 py-1 ${ITEM_STYLES[i.value]?.cls || ''}`}>
                {i.label}: {ITEM_STYLES[i.value]?.label}
              </span>
            ))}
          </div>
        </div>
      )}
      {snapshot.observations && (
        <div>
          <p className="text-xs text-stone-400">Observaciones (golpes, rayones, faltantes)</p>
          <p className="text-sm text-stone-800 whitespace-pre-line">{snapshot.observations}</p>
        </div>
      )}
      {snapshot.belongings && (
        <div>
          <p className="text-xs text-stone-400">Objetos dejados en el vehículo</p>
          <p className="text-sm text-stone-800 whitespace-pre-line">{snapshot.belongings}</p>
        </div>
      )}
      {snapshot.problem_description && (
        <div>
          <p className="text-xs text-stone-400">Problema reportado</p>
          <p className="text-sm text-stone-800 whitespace-pre-line">{snapshot.problem_description}</p>
        </div>
      )}
      {snapshot.photos?.length > 0 && (
        <div>
          <p className="text-xs text-stone-400 mb-1.5">Fotos de ingreso</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {snapshot.photos.map((p, idx) => (
              <a key={idx} href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src={p.url} alt={p.caption || `Foto ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-stone-200" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarketingChoice({ value, onChange, accent }) {
  return (
    <fieldset className="border border-stone-200 rounded-xl bg-white p-4">
      <legend className="px-1 text-sm font-medium text-stone-800">Comunicaciones comerciales (opcional)</legend>
      <p className="text-xs text-stone-500 mb-3">
        ¿Quieres recibir promociones, descuentos y novedades? Tu respuesta no afecta el servicio.
      </p>
      <div className="space-y-2">
        {[
          { v: true, label: 'Sí autorizo recibir publicidad' },
          { v: false, label: 'No autorizo recibir publicidad' },
        ].map((opt) => (
          <label key={String(opt.v)} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
            <input
              type="radio"
              name="marketing"
              checked={value === opt.v}
              onChange={() => onChange(opt.v)}
              style={{ accentColor: accent }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ConsentPublicPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [accepted, setAccepted] = useState(false);
  const [acceptHabeas, setAcceptHabeas] = useState(false);
  const [marketing, setMarketing] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signerDocument, setSignerDocument] = useState('');

  const [otp, setOtp] = useState(null); // { channel, destination, expires_at }
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/consents/${token}`);
      setData(res.data.data);
      setOtp(res.data.data.otp || null);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'No pudimos cargar esta solicitud.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-sm">Cargando…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-6 text-center">
          <p className="text-stone-800 font-medium">Enlace no disponible</p>
          <p className="text-sm text-stone-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const accent = accentOf(data.tenant);
  const isIntake = data.kind === 'vehicle_intake';
  const isHabeas = data.kind === 'habeas_data';
  const title = isIntake ? 'Acta de ingreso de tu vehículo' : 'Autorización de tratamiento de datos personales';
  const needsMarketing = isHabeas || (isIntake && data.habeas && acceptHabeas);
  const canRequestCode = accepted && (!needsMarketing || marketing !== null);

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/public/consents/${token}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      setMessage('No pudimos generar la constancia. Intenta de nuevo.');
    }
  };

  const requestCode = async (channel) => {
    setSending(true);
    setMessage('');
    try {
      const res = await api.post(`/public/consents/${token}/otp`, { channel });
      setOtp(res.data.data);
      setCode('');
      setCooldown(60);
    } catch (e) {
      setMessage(e?.response?.data?.message || 'No pudimos enviar el código.');
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    setConfirming(true);
    setMessage('');
    try {
      const res = await api.post(`/public/consents/${token}/accept`, {
        code,
        marketing_opt_in: marketing === true,
        signer_name: signerName || undefined,
        signer_document: signerDocument || undefined,
        intake_hash: data.intake?.hash,
        accept_habeas: isIntake && !!data.habeas && acceptHabeas,
        habeas_token: data.habeas?.token,
      });
      setDone({ habeas_accepted: res.data.data.habeas_accepted });
    } catch (e) {
      const status = e?.response?.status;
      setMessage(e?.response?.data?.message || 'No pudimos confirmar el código.');
      if (status === 409) load();
    } finally {
      setConfirming(false);
    }
  };

  const reject = async () => {
    if (!window.confirm('¿Confirmas que NO autorizas el tratamiento de tus datos personales?')) return;
    try {
      await api.post(`/public/consents/${token}/reject`);
      await load();
    } catch (e) {
      setMessage(e?.response?.data?.message || 'No pudimos registrar tu respuesta.');
    }
  };

  const closed = data.status !== 'pending';

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200" style={{ borderTop: `4px solid ${accent}` }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {data.tenant.logo_url && (
            <img src={data.tenant.logo_url} alt="" className="h-10 w-auto max-w-[120px] object-contain" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 truncate">{data.tenant.name}</p>
            <p className="text-xs text-stone-500">{title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {done || data.status === 'accepted' ? (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-stone-900">¡Listo! Tu autorización quedó registrada.</p>
            {done?.habeas_accepted && (
              <p className="text-sm text-stone-600">También registramos tu autorización de tratamiento de datos personales.</p>
            )}
            {data.accepted_at && <p className="text-xs text-stone-500">{fmtDateTime(data.accepted_at)}</p>}
            <button
              type="button"
              onClick={downloadPdf}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: accent }}
            >
              Descargar constancia (PDF)
            </button>
            {message && <p className="text-sm text-red-600">{message}</p>}
          </div>
        ) : closed ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center">
            <p className="text-stone-800">{CLOSED_MESSAGES[data.status] || 'Esta solicitud ya no está disponible.'}</p>
            {data.tenant.phone && <p className="text-sm text-stone-500 mt-2">Contacto: {data.tenant.phone}</p>}
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              Hola{data.customer_name ? ` ${data.customer_name}` : ''}, {isIntake
                ? 'revisa el estado en que recibimos tu vehículo y las condiciones del servicio. Si todo está correcto, acéptalas con el código que te enviaremos.'
                : 'lee el documento y, si estás de acuerdo, confírmalo con el código que te enviaremos.'}
            </p>

            {isIntake && <IntakeSummary snapshot={data.intake?.snapshot} />}

            <DocumentBox
              content={data.document.content}
              version={data.document.version}
              title={isIntake ? 'Condiciones de ingreso del vehículo' : 'Autorización para el tratamiento de datos personales'}
            />

            <label className="flex items-start gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ accentColor: accent }}
              />
              <span>
                {isIntake
                  ? 'Confirmo que el inventario de ingreso es correcto y acepto las condiciones de ingreso del vehículo.'
                  : 'He leído el documento y autorizo de manera previa, expresa e informada el tratamiento de mis datos personales para las finalidades descritas.'}
              </span>
            </label>

            {isIntake && data.habeas && (
              <div className="space-y-3 pt-2">
                <DocumentBox content={data.habeas.content} version={data.habeas.version} title="Autorización para el tratamiento de datos personales" />
                <label className="flex items-start gap-2 text-sm text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={acceptHabeas}
                    onChange={(e) => setAcceptHabeas(e.target.checked)}
                    style={{ accentColor: accent }}
                  />
                  <span>También autorizo el tratamiento de mis datos personales (opcional para esta acta).</span>
                </label>
              </div>
            )}

            {needsMarketing && <MarketingChoice value={marketing} onChange={setMarketing} accent={accent} />}

            {isIntake && (
              <details className="text-sm">
                <summary className="cursor-pointer text-stone-500">¿Entrega el vehículo otra persona?</summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nombre de quien entrega"
                    className="border border-stone-300 rounded-lg px-3 py-2 text-sm" />
                  <input value={signerDocument} onChange={(e) => setSignerDocument(e.target.value)} placeholder="Documento"
                    className="border border-stone-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </details>
            )}

            <section className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium text-stone-800">Confirmación con código</p>
              {data.otp_channels.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No tenemos un correo o WhatsApp registrado para enviarte el código. Comunícate con {data.tenant.name}
                  {data.tenant.phone ? ` al ${data.tenant.phone}` : ''} para registrar tu autorización.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {data.otp_channels.map((c) => (
                      <button
                        key={c.channel}
                        type="button"
                        disabled={!canRequestCode || sending || cooldown > 0}
                        onClick={() => requestCode(c.channel)}
                        className="px-3 py-2 rounded-lg text-sm border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                      >
                        {otp ? 'Reenviar' : 'Enviar código'} por {CHANNEL_LABELS[c.channel]} <span className="text-stone-400">{c.destination}</span>
                      </button>
                    ))}
                  </div>
                  {!canRequestCode && (
                    <p className="text-xs text-stone-400">
                      {accepted ? 'Elige si autorizas recibir publicidad para continuar.' : 'Marca la casilla de aceptación para continuar.'}
                    </p>
                  )}
                  {cooldown > 0 && <p className="text-xs text-stone-400">Puedes pedir otro código en {cooldown} s.</p>}
                  {otp && (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-500">
                        Enviamos un código de 6 dígitos a tu {CHANNEL_NOUNS[otp.channel]} {otp.destination}. Vence en 10 minutos.
                      </p>
                      <div className="flex gap-2">
                        <input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-36 border border-stone-300 rounded-lg px-3 py-2 text-lg tracking-[0.3em] font-mono"
                        />
                        <button
                          type="button"
                          disabled={code.length !== 6 || confirming || !canRequestCode}
                          onClick={confirm}
                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                          style={{ background: accent }}
                        >
                          {confirming ? 'Confirmando…' : 'Confirmar autorización'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {message && <p className="text-sm text-red-600">{message}</p>}
            </section>

            {isHabeas && (
              <button type="button" onClick={reject} className="text-xs text-stone-500 underline">
                No autorizo el tratamiento de mis datos
              </button>
            )}
            {data.expires_at && <p className="text-xs text-stone-400">Este enlace vence el {fmtDateTime(data.expires_at)}.</p>}
          </>
        )}
      </main>
    </div>
  );
}
