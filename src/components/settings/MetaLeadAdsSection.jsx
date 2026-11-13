// Formularios de anuncios de Meta (Lead Ads): los leads de Facebook/Instagram
// entran al pipeline como oportunidades. Vive en Configuración → Meta y
// WhatsApp para tener todo lo de Meta en un solo lugar.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Facebook, CheckCircle2, Building2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import crmApi from '../../api/crm';

const fmtDateTime = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// El backend arma el redirect URI del OAuth y la URL del webhook a partir de
// esta misma base -- el tenant tiene que pegar exactamente estas URLs en el
// dashboard de SU App de Meta (Facebook Login y Webhooks), ver
// metaIntegration.controller.js (CALLBACK_PATH).
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
const OAUTH_REDIRECT_URI = `${BACKEND_ORIGIN}/api/webhooks/meta/oauth-callback`;
const WEBHOOK_URL = `${BACKEND_ORIGIN}/api/webhooks/meta`;

const INPUT = 'w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30';

export default function MetaLeadAdsSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // 'own' | 'pitbox' | null
  const [ownForm, setOwnForm] = useState({ own_app_id: '', own_app_secret: '', own_webhook_verify_token: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getMetaIntegrationStatus();
      setStatus(res.data.data);
    } catch {
      toast.error('Error cargando el estado de los formularios de Meta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Resultado del callback OAuth: el backend redirige a /crm/settings/meta,
  // que reenvía los parámetros hasta aquí.
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected === null) return;
    if (connected === '1') toast.success('Cuenta de Meta conectada correctamente');
    else toast.error(searchParams.get('message') || 'No se pudo conectar con Meta');
    const rest = new URLSearchParams(searchParams);
    rest.delete('connected');
    rest.delete('message');
    setSearchParams(rest, { replace: true });
    load();
  }, [searchParams, setSearchParams, load]);

  const handleConnectOwn = async () => {
    if (!ownForm.own_app_id.trim() || !ownForm.own_app_secret.trim()) {
      toast.error('Completa el App ID y el App Secret de tu App de Meta');
      return;
    }
    setConnecting('own');
    try {
      const res = await crmApi.startMetaOwnConnection({
        own_app_id: ownForm.own_app_id.trim(),
        own_app_secret: ownForm.own_app_secret.trim(),
        own_webhook_verify_token: ownForm.own_webhook_verify_token.trim() || undefined,
      });
      window.location.href = res.data.data.oauth_url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar la conexión con Meta');
      setConnecting(null);
    }
  };

  const handleConnectPitbox = async () => {
    setConnecting('pitbox');
    try {
      const res = await crmApi.connectMetaPitboxMode();
      toast.success(res.data.message || 'Servicio de Meta de Pitbox activado');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al activar el servicio de Meta');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Desconectar los formularios de Meta? Los leads nuevos dejarán de crear oportunidades automáticamente.')) return;
    try {
      await crmApi.disconnectMetaIntegration();
      toast.success('Formularios desconectados');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desconectar');
    }
  };

  const isConnected = !!status?.provider_mode && status.is_active;

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-[#1877F2] rounded-lg">
          <Facebook className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Formularios de anuncios (Lead Ads)</h2>
          <p className="text-[11px] text-gray-500">Los leads de tus formularios de Facebook/Instagram entran al pipeline como oportunidades nuevas.</p>
        </div>
      </div>

      {loading || !status ? (
        <p className="text-xs text-gray-500">Cargando estado…</p>
      ) : isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-800">
                Conectado — {status.provider_mode === 'own' ? 'cuenta propia' : 'servicio Pitbox'}
              </span>
            </div>
            <button type="button" onClick={handleDisconnect} className="!p-0 text-xs font-medium text-red-600 hover:underline">
              Desconectar
            </button>
          </div>

          {status.provider_mode === 'own' && (
            <div className="text-xs text-gray-600 space-y-1">
              <p><span className="text-gray-400">Página:</span> {status.own_page_name || status.own_page_id || '—'}</p>
              <p><span className="text-gray-400">Conectado desde:</span> {fmtDateTime(status.connected_at)}</p>
            </div>
          )}
          {status.provider_mode === 'pitbox' && (
            <div className="text-xs text-gray-600 space-y-1">
              <p><span className="text-gray-400">Formularios vinculados:</span> {status.pitbox_lead_form_count}</p>
              {status.pitbox_lead_form_count === 0 && (
                <p className="text-amber-600">Un asesor de soporte todavía tiene que vincular tus formularios de anuncios para que empiecen a llegar los leads.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-gray-100">
            <div>
              <p className="text-gray-400">Último lead recibido</p>
              <p className="font-medium text-gray-700">{fmtDateTime(status.last_lead_at)}</p>
            </div>
            {status.last_error && (
              <div>
                <p className="text-gray-400">Último error</p>
                <p className="font-medium text-red-500">{status.last_error}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-gray-800">Mi propia cuenta de Meta</h3>
            </div>
            <p className="text-xs text-gray-500">
              Conecta tu App de Meta for Developers. Tus campañas siguen igual; Pitbox solo lee los leads nuevos con tus credenciales.
            </p>

            <details className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5 space-y-1.5">
              <summary className="cursor-pointer font-medium text-gray-600">¿Dónde consigo esto?</summary>
              <p>1. Crea una App en <span className="font-mono">developers.facebook.com/apps</span> (tipo "Empresa").</p>
              <p>2. En Facebook Login, agrega este Redirect URI:</p>
              <p className="font-mono bg-white border border-gray-200 rounded px-1.5 py-1 break-all select-all">{OAUTH_REDIRECT_URI}</p>
              <p>3. En Webhooks, suscribe el objeto Page al campo <span className="font-mono">leadgen</span> con esta URL:</p>
              <p className="font-mono bg-white border border-gray-200 rounded px-1.5 py-1 break-all select-all">{WEBHOOK_URL}</p>
              <p>4. Elige ahí un Verify Token (cualquier texto) y repítelo abajo.</p>
            </details>

            <div className="space-y-2">
              <input type="text" placeholder="App ID" className={INPUT}
                value={ownForm.own_app_id} onChange={e => setOwnForm(f => ({ ...f, own_app_id: e.target.value }))} />
              <input type="password" placeholder="App Secret" className={INPUT}
                value={ownForm.own_app_secret} onChange={e => setOwnForm(f => ({ ...f, own_app_secret: e.target.value }))} />
              <input type="text" placeholder="Webhook Verify Token (opcional)" className={INPUT}
                value={ownForm.own_webhook_verify_token} onChange={e => setOwnForm(f => ({ ...f, own_webhook_verify_token: e.target.value }))} />
            </div>

            <button type="button" onClick={handleConnectOwn} disabled={connecting === 'own'}
              className="!px-4 !py-2 bg-[#1877F2] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">
              {connecting === 'own' ? 'Redirigiendo…' : 'Conectar con Meta'}
            </button>
          </div>

          <div className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-800">Servicio de Pitbox</h3>
            </div>
            <p className="text-xs text-gray-500">
              ¿Aún no tienes cuenta de Meta Business? Usamos nuestra página compartida y un asesor de soporte te ayuda a vincular tus formularios.
            </p>
            <button type="button" onClick={handleConnectPitbox} disabled={connecting === 'pitbox'}
              className="!px-4 !py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">
              {connecting === 'pitbox' ? 'Activando…' : 'Activar servicio Pitbox'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
