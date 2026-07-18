import React, { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Link2,
  RefreshCw,
} from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const NCF_STATUS_LABEL = {
  payment_link_generated: 'Link de pago generado',
  paid: 'Pagada',
  invoiced: 'Facturada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  error: 'Error',
  sent: 'Enviada',
};

const SuperAdminNcfConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [forzarSync, setForzarSync] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState({
    ncf_base_url: '',
    ncf_api_key: '',
    ncf_webhook_secret: '',
    is_active: false,
  });
  const [meta, setMeta] = useState({ has_api_key: false, has_webhook_secret: false, webhookUrl: '' });
  const [lastTest, setLastTest] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [syncResults, setSyncResults] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/superadmin/ncf-config/tenants');
      setTenants(data.tenants || []);
    } catch (error) {
      toast.error('Error al cargar el estado de los tenants');
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/ncf-config');

      if (data.config) {
        setConfig({
          ncf_base_url: data.config.ncf_base_url || '',
          ncf_api_key: '', // Por seguridad, no se recarga -- solo se sobreescribe si se escribe algo nuevo
          ncf_webhook_secret: '',
          is_active: data.config.is_active,
        });
        setMeta({
          has_api_key: data.config.has_api_key,
          has_webhook_secret: data.config.has_webhook_secret,
          webhookUrl: data.config.webhook_url_a_configurar_en_el_nucleo,
        });
        if (data.config.last_test_at) {
          setLastTest({
            at: data.config.last_test_at,
            ok: data.config.last_test_ok,
            message: data.config.last_test_message,
          });
        }
      }
    } catch (error) {
      toast.error('Error al cargar la configuración NCF');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.ncf_base_url) {
      toast.error('La URL del Núcleo es requerida');
      return;
    }
    try {
      setSaving(true);
      await api.post('/superadmin/ncf-config', config);
      toast.success('Configuración NCF guardada correctamente');
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
      const { data } = await api.post('/superadmin/ncf-config/probar-conexion');
      setLastTest({ at: new Date().toISOString(), ok: data.ok, message: data.message });
      if (data.ok) toast.success(data.message);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al probar la conexión');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar las credenciales NCF? Pitbox dejará de poder enviar prefacturas al Núcleo hasta que se reconfigure.')) {
      return;
    }
    try {
      setDeleting(true);
      await api.delete('/superadmin/ncf-config');
      toast.success('Credenciales NCF eliminadas');
      setConfig({ ncf_base_url: config.ncf_base_url, ncf_api_key: '', ncf_webhook_secret: '', is_active: false });
      await fetchConfig();
    } catch (error) {
      toast.error('Error al eliminar la configuración');
    } finally {
      setDeleting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResults(null);
      const { data } = await api.post('/superadmin/ncf-config/sincronizar-tenants', { forzar: forzarSync });
      setSyncResults(data.resultados);
      toast.success(data.message);
      await fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al sincronizar con el Núcleo');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Link2 className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación Núcleo (NCF)</h1>
          <p className="text-sm text-gray-500">
            Conexión de Pitbox con el Núcleo Central de Facturación de ESC DataCore -- así es como se factura la
            suscripción de cada tenant.
          </p>
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Esta credencial es del sistema completo, no de un tenant</p>
            <p>
              Pitbox se conecta al Núcleo como un solo "sistema origen". Los datos fiscales de cada tenant (para
              facturarle su suscripción) se configuran aparte, desde el detalle de cada tenant.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL base del Núcleo</label>
            <input
              type="text"
              value={config.ncf_base_url}
              onChange={(e) => setConfig({ ...config, ncf_base_url: e.target.value })}
              placeholder="https://ncf-nucleo-central.up.railway.app/api/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key {meta.has_api_key && <span className="text-emerald-600 text-xs">(configurada -- deja en blanco para no cambiarla)</span>}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.ncf_api_key}
                onChange={(e) => setConfig({ ...config, ncf_api_key: e.target.value })}
                placeholder={meta.has_api_key ? '••••••••••••••••••••' : 'ncf_...'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              La entrega el Núcleo al crear el SistemaOrigen "PITBOX" (Panel del Núcleo → Sistemas origen → Conectar sistema).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook secret {meta.has_webhook_secret && <span className="text-emerald-600 text-xs">(configurado -- deja en blanco para no cambiarlo)</span>}
            </label>
            <input
              type="password"
              value={config.ncf_webhook_secret}
              onChange={(e) => setConfig({ ...config, ncf_webhook_secret: e.target.value })}
              placeholder={meta.has_webhook_secret ? '••••••••••••••••••••' : 'Secreto HMAC entregado junto a la API key'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Verifica que los webhooks entrantes en <code>/api/webhooks/ncf</code> de verdad vienen del Núcleo.
            </p>
          </div>

          {meta.webhookUrl && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <p className="font-medium text-gray-700 mb-1">Webhook URL a registrar en el Núcleo:</p>
              <code className="text-xs text-gray-600 break-all">{meta.webhookUrl}</code>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Conexión activa (si está apagado, no se envía nada al Núcleo aunque haya tenants configurados)</span>
          </label>

          {lastTest && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${lastTest.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
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
            <Button onClick={handleTest} disabled={testing || !meta.has_api_key} variant="secondary" icon={Zap}>
              {testing ? 'Probando...' : 'Probar conexión'}
            </Button>
            {(meta.has_api_key || meta.has_webhook_secret) && (
              <Button onClick={handleDelete} disabled={deleting} variant="danger" icon={Trash2}>
                {deleting ? 'Eliminando...' : 'Eliminar credenciales'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sincronización por sistema</h3>
            <p className="text-sm text-gray-500">
              Corre sola todos los días (7am) y genera la prefactura de cada tenant 7 días antes de su fecha de
              corte -- para que le alcance el tiempo de pagar. Este botón dispara lo mismo manualmente.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={handleSync} disabled={syncing || !config.is_active} icon={RefreshCw}>
              {syncing ? 'Sincronizando...' : 'Sincronizar tenants ahora'}
            </Button>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={forzarSync}
                onChange={(e) => setForzarSync(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Forzar (ignora la ventana de 7 días y reenvía aunque ya se haya sincronizado este ciclo)
            </label>
          </div>
        </div>

        {!config.is_active && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertCircle className="w-4 h-4" /> Activa la conexión arriba antes de poder sincronizar.
          </div>
        )}

        {syncResults && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Resultado de la última sincronización:</p>
            <div className="space-y-1 text-sm">
              {syncResults.map((r) => (
                <div key={r.tenant_id} className="flex items-center gap-2">
                  {r.ok === true && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {r.ok === false && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  {r.ok === null && <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <span className="text-gray-800">{r.tenant}</span>
                  <span className="text-gray-400">--</span>
                  <span className="text-gray-500">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">NIT</th>
                <th className="py-2 pr-4">Última sincronización</th>
                <th className="py-2 pr-4">Estado NCF</th>
                <th className="py-2 pr-4">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 text-gray-800">{t.business_name || t.company_name}</td>
                  <td className="py-2 pr-4 text-gray-500">{t.tax_id || '--'}</td>
                  <td className="py-2 pr-4 text-gray-500">
                    {t.ncf_last_sync_at ? new Date(t.ncf_last_sync_at).toLocaleString('es-CO') : 'Nunca'}
                  </td>
                  <td className="py-2 pr-4">
                    {t.ncf_last_status ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ['paid', 'invoiced'].includes(t.ncf_last_status) ? 'bg-emerald-100 text-emerald-700' :
                        ['rejected', 'expired', 'error'].includes(t.ncf_last_status) ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {NCF_STATUS_LABEL[t.ncf_last_status] || t.ncf_last_status}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin sincronizar</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">
                    {t.ncf_last_error || (t.ncf_payment_link_url && (
                      <a href={t.ncf_payment_link_url} target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                        Ver link de pago
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No hay tenants activos todavía
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

export default SuperAdminNcfConfig;
