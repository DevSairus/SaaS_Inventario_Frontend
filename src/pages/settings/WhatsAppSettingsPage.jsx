// frontend/src/pages/settings/WhatsAppSettingsPage.jsx
import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import api from '../../api/axios';
import crmApi from '../../api/crm';
import toast from 'react-hot-toast';

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function loadFacebookSdk(appId) {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v21.0',
      });
      resolve(window.FB);
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/es_LA/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de Facebook'));
    document.body.appendChild(script);
  });
}

export default function WhatsAppSettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [waStatus, setWaStatus] = useState(null);
  const [loadingWa, setLoadingWa] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [manual, setManual] = useState({
    code: '',
    waba_id: '',
    phone_number_id: '',
    display_phone: '',
  });
  const [tokenForm, setTokenForm] = useState({
    access_token: '',
    waba_id: '',
    phone_number_id: '',
    display_phone: '',
    token_source: 'system_user',
  });
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [savingWebhookToken, setSavingWebhookToken] = useState(false);

  const handleSaveWebhookVerifyToken = async (e) => {
    e.preventDefault();
    if (!webhookVerifyToken.trim()) return;
    setSavingWebhookToken(true);
    try {
      await crmApi.setWhatsAppWebhookVerifyToken(webhookVerifyToken.trim());
      toast.success('Verify token guardado. Ya puedes pegarlo en Meta (mismo texto).');
      setWebhookVerifyToken('');
      loadWa();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar el verify token');
    } finally {
      setSavingWebhookToken(false);
    }
  };

  const loadWa = useCallback(async () => {
    setLoadingWa(true);
    try {
      const res = await crmApi.getWhatsAppCloudStatus();
      setWaStatus(res.data.data);
    } catch {
      setWaStatus(null);
    } finally {
      setLoadingWa(false);
    }
  }, []);

  useEffect(() => { loadWa(); }, [loadWa]);

  const handleTestCloudinary = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.get('/whatsapp/test-cloudinary');
      setTestResult(data);
      if (data.success) toast.success('Cloudinary OK');
      else toast.error('Error con Cloudinary');
    } catch (e) {
      const data = e.response?.data || { success: false, message: e.message, diagnosis: null };
      setTestResult(data);
      toast.error('Error conectando con Cloudinary');
    } finally {
      setTesting(false);
    }
  };

  const submitEmbeddedComplete = async (payload) => {
    setConnecting(true);
    try {
      await crmApi.completeWhatsAppEmbeddedSignup({
        ...payload,
        coexistence: true,
      });
      toast.success('WhatsApp Cloud API conectado');
      loadWa();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo completar la conexión');
    } finally {
      setConnecting(false);
    }
  };

  const handleEmbeddedSignup = async () => {
    if (!waStatus?.app_id) {
      toast.error('Falta App ID de Meta en configuración de Pitbox (superadmin)');
      return;
    }
    if (!waStatus?.embedded_signup_config_id) {
      toast.error('Falta embedded_signup_config_id en Meta Config. Mientras tanto usa el formulario manual abajo.');
      return;
    }
    try {
      setConnecting(true);
      const FB = await loadFacebookSdk(waStatus.app_id);
      FB.login(
        (response) => {
          const code = response?.authResponse?.code;
          if (!code) {
            toast.error('No se recibió code de Meta');
            setConnecting(false);
            return;
          }
          // Tras Embedded Signup, Meta también entrega waba_id / phone_number_id
          // vía sessionInfoListener. Si no llega, el admin completa el form manual.
          const wabaId = window.__pitboxWaSession?.waba_id;
          const phoneId = window.__pitboxWaSession?.phone_number_id;
          if (!wabaId || !phoneId) {
            toast(
              'Autorización OK. Completa WABA ID y Phone Number ID en el formulario (sesión Embedded Signup).',
              { duration: 6000 }
            );
            setManual((m) => ({ ...m, code }));
            setConnecting(false);
            return;
          }
          submitEmbeddedComplete({
            code,
            waba_id: wabaId,
            phone_number_id: phoneId,
            display_phone: window.__pitboxWaSession?.display_phone,
          });
        },
        {
          config_id: waStatus.embedded_signup_config_id,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
          },
        }
      );
    } catch (err) {
      toast.error(err.message || 'Error al abrir Embedded Signup');
      setConnecting(false);
    }
  };

  useEffect(() => {
    const handler = (event) => {
      if (!event.origin.includes('facebook.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          window.__pitboxWaSession = {
            waba_id: data.data?.waba_id,
            phone_number_id: data.data?.phone_number_id,
            display_phone: data.data?.display_phone_number,
          };
        }
      } catch (_) { /* ignore */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manual.code || !manual.waba_id || !manual.phone_number_id) {
      toast.error('code, waba_id y phone_number_id son obligatorios');
      return;
    }
    await submitEmbeddedComplete(manual);
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!tokenForm.access_token || !tokenForm.waba_id || !tokenForm.phone_number_id) {
      toast.error('Token, WABA ID y Phone Number ID son obligatorios');
      return;
    }
    setConnecting(true);
    try {
      const res = await crmApi.connectWhatsAppWithToken({ ...tokenForm, coexistence: true });
      toast.success(res.data.message || 'WhatsApp conectado');
      setTokenForm((f) => ({ ...f, access_token: '' }));
      loadWa();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo conectar');
    } finally {
      setConnecting(false);
    }
  };

  const cloudConnected = !!waStatus?.connected;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">WhatsApp</h1>
          <p className="text-sm text-gray-500">
            Cloud API con coexistencia (mismo número en la app del celular y en Pitbox) + fallback wa.me.
          </p>
        </div>

        {/* Cloud API status */}
        <div className={`flex items-start gap-4 p-5 border rounded-xl ${
          cloudConnected ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-3 h-3 mt-1.5 rounded-full shrink-0 ${cloudConnected ? 'bg-green-500' : 'bg-amber-500'}`} />
          <div className="flex-1 space-y-1">
            {loadingWa ? (
              <p className="text-sm text-gray-600">Cargando estado Cloud API…</p>
            ) : cloudConnected ? (
              <>
                <p className="font-semibold text-green-800 text-sm">Cloud API conectada</p>
                <p className="text-xs text-green-700">
                  {waStatus.own_display_phone || waStatus.own_phone_number_id}
                  {waStatus.wa_coexistence ? ' · Coexistencia activa' : ''}
                </p>
                {waStatus.token_is_permanent ? (
                  <p className="text-xs text-green-700">Token permanente · no requiere reconexión</p>
                ) : waStatus.token_expires_at && (
                  <p className={`text-xs ${waStatus.token_expired ? 'text-red-600 font-medium' : 'text-amber-700'}`}>
                    {waStatus.token_expired ? 'Token expirado — reconecta' : `Token vence: ${new Date(waStatus.token_expires_at).toLocaleString()}`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-800 text-sm">Cloud API no conectada</p>
                <p className="text-xs text-amber-700">
                  Escanea el QR en WhatsApp Business App vía Embedded Signup, o completa el formulario cuando Meta entregue los IDs.
                </p>
              </>
            )}
            {waStatus?.last_error && (
              <p className="text-xs text-red-600 mt-1">{waStatus.last_error}</p>
            )}
            {cloudConnected && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('¿Desconectar WhatsApp Cloud API de este tenant?')) return;
                  try {
                    await crmApi.disconnectWhatsAppCloud();
                    toast.success('WhatsApp desconectado');
                    loadWa();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'No se pudo desconectar');
                  }
                }}
                className="mt-2 text-xs font-medium text-red-600 hover:underline"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* Verify token del webhook -- propio de este tenant, NO se toca en Superadmin */}
        <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-3">
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">Webhook de mensajes entrantes</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Este es el verify token que pegas en Meta (Paso 2 → Configurar webhooks) junto con la URL
              <code className="mx-1 px-1 bg-gray-100 rounded">{waStatus?.webhook_callback_path || '/api/webhooks/meta'}</code>
              de tu backend público. Debe ser idéntico en los dos lados.
            </p>
          </div>
          <p className="text-xs">
            Estado:{' '}
            {waStatus?.has_webhook_verify_token ? (
              <span className="text-green-700 font-medium">configurado</span>
            ) : (
              <span className="text-amber-700 font-medium">sin configurar</span>
            )}
          </p>
          <form onSubmit={handleSaveWebhookVerifyToken} className="flex gap-2">
            <input
              type="text"
              placeholder="Verify token (cualquier texto, ej. un hex al azar)"
              value={webhookVerifyToken}
              onChange={(e) => setWebhookVerifyToken(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              disabled={savingWebhookToken || !webhookVerifyToken.trim()}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
            >
              {savingWebhookToken ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        </div>

        {!cloudConnected && (
          <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Conectar WhatsApp (coexistencia)</h2>
            </div>
            <p className="text-xs text-gray-500">
              El número sigue usable en WhatsApp Business App. Pitbox envía plantillas y recibe mensajes por Cloud API.
            </p>
            <button
              type="button"
              onClick={handleEmbeddedSignup}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
            >
              {connecting ? 'Conectando…' : 'Abrir Embedded Signup (QR)'}
            </button>

            <form onSubmit={handleTokenSubmit} className="pt-3 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-700">Conectar con token propio</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Usa un <strong>System User</strong> de Meta Business para un token permanente (no expira),
                  o el token del número de prueba para validar el flujo (dura 24h).
                </p>
              </div>

              <select
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white"
                value={tokenForm.token_source}
                onChange={(e) => setTokenForm((f) => ({ ...f, token_source: e.target.value }))}
              >
                <option value="system_user">System User — token permanente (producción)</option>
                <option value="test_number">Número de prueba — token temporal (24h)</option>
              </select>

              <textarea
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono"
                rows={3}
                placeholder="Access token (EAAG...)"
                value={tokenForm.access_token}
                onChange={(e) => setTokenForm((f) => ({ ...f, access_token: e.target.value }))}
              />
              {['waba_id', 'phone_number_id', 'display_phone'].map((field) => (
                <input
                  key={field}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                  placeholder={field === 'display_phone' ? 'display_phone (opcional)' : field}
                  value={tokenForm[field]}
                  onChange={(e) => setTokenForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              ))}
              <button
                type="submit"
                disabled={connecting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                {connecting ? 'Verificando con Meta…' : 'Conectar con token'}
              </button>
            </form>

            <form onSubmit={handleManualSubmit} className="pt-3 border-t border-gray-100 space-y-3">
              <p className="text-xs font-medium text-gray-700">Completar a mano (code + IDs de Meta)</p>
              {['code', 'waba_id', 'phone_number_id', 'display_phone'].map((field) => (
                <input
                  key={field}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                  placeholder={field}
                  value={manual[field]}
                  onChange={(e) => setManual((m) => ({ ...m, [field]: e.target.value }))}
                />
              ))}
              <button
                type="submit"
                disabled={connecting}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Guardar conexión
              </button>
            </form>
          </div>
        )}

        {cloudConnected && (
          <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Plantillas Meta</h2>
            <p className="text-xs text-gray-500">
              Sincroniza las plantillas APPROVED del WABA para recordatorios y campañas.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await crmApi.syncWaTemplates();
                  toast.success(`Sincronizadas: ${res.data.data?.synced ?? 0}`);
                } catch (err) {
                  toast.error(err.response?.data?.message || 'No se pudo sincronizar');
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
            >
              Sincronizar plantillas
            </button>
            <a href="/crm/whatsapp" className="block text-xs text-emerald-700 hover:underline">
              Ir al inbox WhatsApp →
            </a>
          </div>
        )}

        {!cloudConnected && (
          <div className="p-5 bg-white border border-amber-200 rounded-xl space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Modo demo (sin Meta)</h2>
            <p className="text-xs text-gray-500">
              Activa un inbox realista en Empresa de Pruebas para demos a clientes. Los mensajes no salen a WhatsApp.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await crmApi.setWhatsAppDemoMode(true);
                  toast.success('Modo demo activado');
                  loadWa();
                } catch (err) {
                  toast.error(err.response?.data?.message || 'No se pudo activar');
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg"
            >
              Activar modo demo
            </button>
          </div>
        )}

        {/* wa.me fallback */}
        <div className="flex items-start gap-4 p-5 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">Fallback — Modo wa.me</p>
            <p className="text-xs text-green-700 mt-0.5">
              Si Cloud API no está conectada, ventas y OT siguen abriendo WhatsApp con el mensaje prellenado.
            </p>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <WhatsAppIcon className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-800 text-sm">Facturas y Órdenes de Trabajo</h2>
          </div>
          <ol className="text-sm text-gray-600 space-y-3 list-decimal list-inside">
            <li>Abre una venta o una orden de trabajo y haz clic en <strong>Enviar por WhatsApp</strong>.</li>
            <li>Con Cloud API: se envía plantilla/API. Sin Cloud API: se abre wa.me.</li>
          </ol>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">PDF adjunto — Cloudinary</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Sube el PDF a la nube y envía el enlace de descarga por WhatsApp.
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">Opcional</span>
          </div>

          <button
            onClick={handleTestCloudinary}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {testing ? 'Probando…' : 'Probar conexión con Cloudinary'}
          </button>

          {testResult && (
            <div className={`rounded-lg border p-4 space-y-3 text-xs ${
              testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success
                  ? <CheckIcon className="w-4 h-4 text-green-600" />
                  : <XIcon className="w-4 h-4 text-red-600" />}
                <span className={`font-semibold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
