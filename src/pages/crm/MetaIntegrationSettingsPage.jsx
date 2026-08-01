import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import crmApi from '../../api/crm';
import { Facebook, CheckCircle2, Building2, Users } from 'lucide-react';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const fmtDateTime = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function MetaIntegrationSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // 'own' | 'pitbox' | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getMetaIntegrationStatus();
      setStatus(res.data.data);
    } catch {
      toast.error('Error cargando el estado de la integración con Meta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Resultado del callback OAuth (ver metaIntegration.controller.js -> redirige acá)
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected === null) return;
    if (connected === '1') toast.success('Cuenta de Meta conectada correctamente');
    else toast.error(searchParams.get('message') || 'No se pudo conectar con Meta');
    setSearchParams({}, { replace: true });
    load();
  }, [searchParams, setSearchParams, load]);

  const handleConnectOwn = async () => {
    setConnecting('own');
    try {
      const res = await crmApi.startMetaOwnConnection();
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
    if (!window.confirm('¿Desconectar la integración con Meta? Los leads nuevos dejarán de crear oportunidades automáticamente.')) return;
    try {
      await crmApi.disconnectMetaIntegration();
      toast.success('Integración desconectada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desconectar');
    }
  };

  if (loading || !status) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
        </div>
      </Layout>
    );
  }

  const isConnected = !!status.provider_mode && status.is_active;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1877F2] rounded-xl">
            <Facebook className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Integración con Meta</h1>
            <p className="text-sm text-gray-500">Los leads de tus formularios de Facebook/Instagram entran directo al pipeline como oportunidades nuevas</p>
          </div>
        </div>

        {isConnected ? (
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-gray-800">
                  Conectado — {status.provider_mode === 'own' ? 'cuenta propia' : 'servicio Pitbox'}
                </span>
              </div>
              <button onClick={handleDisconnect} className="text-xs font-medium text-red-500 hover:underline">
                Desconectar
              </button>
            </div>

            {status.provider_mode === 'own' && (
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="text-gray-400">Página:</span> {status.own_page_name || status.own_page_id || '—'}</p>
                <p><span className="text-gray-400">Conectado desde:</span> {fmtDateTime(status.connected_at)}</p>
              </div>
            )}
            {status.provider_mode === 'pitbox' && (
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="text-gray-400">Formularios vinculados:</span> {status.pitbox_lead_form_count}</p>
                {status.pitbox_lead_form_count === 0 && (
                  <p className="text-amber-600 text-xs">Un asesor de soporte todavía tiene que vincular tus formularios de anuncios para que empiecen a llegar los leads.</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm pt-2 border-t border-gray-100">
              <div>
                <p className="text-gray-400 text-xs">Último lead recibido</p>
                <p className="font-medium text-gray-700">{fmtDateTime(status.last_lead_at)}</p>
              </div>
              {status.last_error && (
                <div>
                  <p className="text-gray-400 text-xs">Último error</p>
                  <p className="font-medium text-red-500">{status.last_error}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(15,15,15,0.08)] transition-shadow p-5 space-y-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-soft">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800">Usar mi propia cuenta de Meta</h2>
              <p className="text-sm text-gray-500">
                Conectá tu página de Facebook/Instagram Business — tus campañas y anuncios siguen exactamente igual, Pitbox solo lee los leads nuevos.
              </p>
              <Button variant="primary" onClick={handleConnectOwn} disabled={connecting === 'own'} className="!bg-gradient-to-br !from-accent !to-accent-soft hover:!opacity-90 !shadow-sm !shadow-accent/30">
                {connecting === 'own' ? 'Redirigiendo...' : 'Conectar con Meta'}
              </Button>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(15,15,15,0.08)] transition-shadow p-5 space-y-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <h2 className="font-semibold text-gray-800">Usar el servicio de Pitbox</h2>
              <p className="text-sm text-gray-500">
                No tenés cuenta de Meta Business todavía — usamos nuestra propia página compartida. Un asesor de soporte te ayuda a vincular tus formularios.
              </p>
              <Button variant="secondary" onClick={handleConnectPitbox} disabled={connecting === 'pitbox'}>
                {connecting === 'pitbox' ? 'Activando...' : 'Activar servicio Pitbox'}
              </Button>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/crm/pipeline')} className="text-sm text-accent hover:underline">
          ← Volver al pipeline
        </button>
      </div>
    </Layout>
  );
}
