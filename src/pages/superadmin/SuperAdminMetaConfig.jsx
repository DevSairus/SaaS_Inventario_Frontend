import React, { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Facebook,
} from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const SuperAdminMetaConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showSharedToken, setShowSharedToken] = useState(false);
  const [config, setConfig] = useState({
    app_id: '',
    app_secret: '',
    webhook_verify_token: '',
    shared_page_id: '',
    shared_waba_id: '',
    shared_system_user_token: '',
    is_active: false,
  });
  const [meta, setMeta] = useState({ has_app_secret: false, has_webhook_verify_token: false, has_shared_system_user_token: false, webhookUrl: '' });
  const [lastTest, setLastTest] = useState(null);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    fetchConfig();
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/superadmin/meta-config/tenants');
      setTenants(data.configs || []);
    } catch {
      toast.error('Error al cargar las conexiones de Meta por tenant');
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/meta-config');

      if (data.config) {
        setConfig({
          app_id: data.config.app_id || '',
          app_secret: '', // no se recarga -- solo se sobreescribe si se escribe algo nuevo
          webhook_verify_token: '',
          shared_page_id: data.config.shared_page_id || '',
          shared_waba_id: data.config.shared_waba_id || '',
          shared_system_user_token: '',
          is_active: data.config.is_active,
        });
        setMeta({
          has_app_secret: data.config.has_app_secret,
          has_webhook_verify_token: data.config.has_webhook_verify_token,
          has_shared_system_user_token: data.config.has_shared_system_user_token,
          webhookUrl: data.config.webhook_url_a_configurar_en_meta,
        });
        if (data.config.last_test_at) {
          setLastTest({ at: data.config.last_test_at, ok: data.config.last_test_ok, message: data.config.last_test_message });
        }
      }
    } catch {
      toast.error('Error al cargar la configuración de Meta');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.app_id) {
      toast.error('El App ID es requerido');
      return;
    }
    try {
      setSaving(true);
      await api.post('/superadmin/meta-config', config);
      toast.success('Configuración de Meta guardada correctamente');
      await fetchConfig();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const { data } = await api.post('/superadmin/meta-config/probar-conexion');
      setLastTest({ at: new Date().toISOString(), ok: data.ok, message: data.message });
      if (data.ok) toast.success(data.message);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al probar la conexión');
    } finally {
      setTesting(false);
    }
  };

  const handleFormIdsChange = async (tenantId, value) => {
    const form_ids = value.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await api.put(`/superadmin/meta-config/tenants/${tenantId}/lead-forms`, { form_ids });
      toast.success('Formularios asignados');
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al asignar los formularios');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Facebook className="w-6 h-6 text-[#1877F2]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integración con Meta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            App de Meta for Developers registrada por Pitbox -- se usa para el OAuth de "cuenta propia" de cualquier
            tenant y como página/WABA compartida para los tenants en modo "servicio Pitbox". El módulo se activa por
            tenant en <code>crm_meta_leads</code>, con costo aparte del CRM base.
          </p>
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6 dark:bg-blue-900/30 dark:border-blue-800/40">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Esta App es del sistema completo, no de un tenant</p>
            <p>
              El App ID/Secret son los de la App de Meta for Developers de Pitbox. Cada tenant conecta SU PROPIA
              página vía OAuth (modo "cuenta propia") usando esta misma App, o usa la página compartida configurada
              acá abajo (modo "servicio Pitbox").
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">App ID</label>
            <input
              type="text"
              value={config.app_id}
              onChange={(e) => setConfig({ ...config, app_id: e.target.value })}
              placeholder="1234567890123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              App Secret {meta.has_app_secret && <span className="text-blue-600 text-xs dark:text-blue-400">(configurado -- deja en blanco para no cambiarlo)</span>}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.app_secret}
                onChange={(e) => setConfig({ ...config, app_secret: e.target.value })}
                placeholder={meta.has_app_secret ? '••••••••••••••••••••' : 'App Secret de Meta for Developers'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
              />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Se usa tanto para el intercambio OAuth como para verificar la firma HMAC de los webhooks entrantes.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              Webhook verify token {meta.has_webhook_verify_token && <span className="text-blue-600 text-xs dark:text-blue-400">(configurado)</span>}
            </label>
            <input
              type="text"
              value={config.webhook_verify_token}
              onChange={(e) => setConfig({ ...config, webhook_verify_token: e.target.value })}
              placeholder={meta.has_webhook_verify_token ? '••••••••••••••••••••' : 'Un texto cualquiera, se pega igual en el dashboard de Meta'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
            />
          </div>

          {meta.webhookUrl && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm dark:bg-graphite-2 dark:border-white/10">
              <p className="font-medium text-gray-700 mb-1 dark:text-gray-300">Webhook URL a registrar en el dashboard de Meta:</p>
              <code className="text-xs text-gray-600 break-all dark:text-gray-400">{meta.webhookUrl}</code>
            </div>
          )}

          <hr className="border-gray-100 dark:border-white/10" />

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo "servicio Pitbox" (página/WABA compartida)</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Page ID compartida</label>
              <input
                type="text"
                value={config.shared_page_id}
                onChange={(e) => setConfig({ ...config, shared_page_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">WABA ID compartido</label>
              <input
                type="text"
                value={config.shared_waba_id}
                onChange={(e) => setConfig({ ...config, shared_waba_id: e.target.value })}
                placeholder="Fase WhatsApp Cloud API -- todavía no operativo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              Token de usuario de sistema {meta.has_shared_system_user_token && <span className="text-blue-600 text-xs dark:text-blue-400">(configurado -- deja en blanco para no cambiarlo)</span>}
            </label>
            <div className="relative">
              <input
                type={showSharedToken ? 'text' : 'password'}
                value={config.shared_system_user_token}
                onChange={(e) => setConfig({ ...config, shared_system_user_token: e.target.value })}
                placeholder={meta.has_shared_system_user_token ? '••••••••••••••••••••' : 'Token de larga duración con permisos sobre la página/WABA compartida'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
              />
              <button type="button" onClick={() => setShowSharedToken(!showSharedToken)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                {showSharedToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/10"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Conexión activa (si está apagado, se rechaza cualquier conexión nueva aunque haya credenciales guardadas)
            </span>
          </label>

          {lastTest && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${lastTest.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800/40 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800/40 dark:text-red-300'}`}>
              {lastTest.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <div>
                <p>{lastTest.message}</p>
                <p className="text-xs opacity-70 mt-0.5">{new Date(lastTest.at).toLocaleString('es-CO')}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} icon={Save}>
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
            <Button onClick={handleTest} disabled={testing || !meta.has_app_secret} variant="secondary" icon={Zap}>
              {testing ? 'Probando...' : 'Probar conexión'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tenants conectados</h3>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            En modo "servicio Pitbox" hay que asignar a mano los IDs de formulario de Lead Ads que le pertenecen a
            cada tenant (separados por coma) -- así el webhook sabe a quién asignar cada lead nuevo.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 dark:text-gray-500 dark:border-white/10">
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">Modo</th>
                <th className="py-2 pr-4">Página propia</th>
                <th className="py-2 pr-4">Formularios (modo Pitbox)</th>
                <th className="py-2 pr-4">Último lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">{t.tenant?.business_name || t.tenant?.company_name}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${t.provider_mode === 'own' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                      {t.provider_mode === 'own' ? 'Cuenta propia' : 'Servicio Pitbox'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-500">{t.own_page_name || t.own_page_id || '--'}</td>
                  <td className="py-2 pr-4">
                    {t.provider_mode === 'pitbox' ? (
                      <input
                        type="text"
                        defaultValue={(t.pitbox_lead_form_ids || []).join(', ')}
                        onBlur={(e) => handleFormIdsChange(t.tenant_id, e.target.value)}
                        placeholder="123456, 789012"
                        className="w-48 px-2 py-1 text-xs border border-gray-300 rounded dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
                      />
                    ) : '--'}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 text-xs dark:text-gray-500">
                    {t.last_lead_at ? new Date(t.last_lead_at).toLocaleString('es-CO') : 'Nunca'}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400 dark:text-gray-500">
                    Ningún tenant conectó Meta todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SuperAdminMetaConfig;
