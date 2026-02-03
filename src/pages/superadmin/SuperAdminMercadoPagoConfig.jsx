import React, { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const SuperAdminMercadoPagoConfig = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState({
    access_token: '',
    public_key: '',
    test_mode: true,
  });
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/mercadopago-config');

      if (data.config) {
        setHasConfig(data.config.has_access_token);
        setConfig({
          access_token: '', // Por seguridad, no lo cargamos
          public_key: data.config.public_key || '',
          test_mode: data.config.test_mode,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.access_token || !config.public_key) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      setSaving(true);

      await api.post('/superadmin/mercadopago-config', config);

      toast.success('Configuración guardada correctamente');
      setHasConfig(true);
      fetchConfig();
    } catch (error) {
      console.error('Error:', error);
      toast.error(
        error.response?.data?.error || 'Error al guardar configuración'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        '¿Estás seguro de eliminar la configuración de MercadoPago? Los tenants no podrán pagar sus suscripciones.'
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete('/superadmin/mercadopago-config');

      setConfig({
        access_token: '',
        public_key: '',
        test_mode: true,
      });
      setHasConfig(false);

      toast.success('Configuración eliminada correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error(
        error.response?.data?.error || 'Error al eliminar configuración'
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loading text="Cargando configuración..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Configuración de MercadoPago - SuperAdmin
        </h1>
        <p className="text-gray-600 mt-1">
          Configura MercadoPago para cobrar las suscripciones de los tenants
        </p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Info Alert */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Configuración del Sistema</p>
                <p className="mb-2">
                  Esta configuración es <strong>independiente</strong> de las
                  configuraciones de MercadoPago de cada tenant.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Esta configuración</strong>: Para cobrar
                    suscripciones a los tenants (sistema SaaS)
                  </li>
                  <li>
                    <strong>Config de tenants</strong>: Para que los tenants
                    cobren a sus clientes (agua/servicios)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How to get credentials */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-800">
                <p className="font-semibold mb-1">
                  ¿Cómo obtener las credenciales?
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Crea una cuenta de MercadoPago para tu empresa</li>
                  <li>
                    Ve a:{' '}
                    <a
                      href="https://www.mercadopago.com.co/developers/panel/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      Panel de Desarrolladores
                    </a>
                  </li>
                  <li>Crea una aplicación o usa una existente</li>
                  <li>
                    Copia el <strong>Access Token</strong> y{' '}
                    <strong>Public Key</strong>
                  </li>
                  <li>Para pruebas, usa las credenciales de TEST</li>
                  <li>Para producción, usa las credenciales de PRODUCCIÓN</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Status */}
          {hasConfig && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">
                    MercadoPago Configurado
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    El sistema está listo para procesar pagos de suscripciones
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-900">
                  Modo de Prueba
                </label>
                <p className="text-sm text-gray-600">
                  Usar credenciales de TEST (recomendado para desarrollo)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.test_mode}
                  onChange={(e) =>
                    setConfig({ ...config, test_mode: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="label">Access Token *</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.access_token}
                  onChange={(e) =>
                    setConfig({ ...config, access_token: e.target.value })
                  }
                  className="input pr-10"
                  placeholder={
                    hasConfig
                      ? '••••••••••••••••'
                      : 'APP_USR-XXXXXXXXXXXXXXXXXXXXXXXX'
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Token privado para procesar pagos de suscripciones
              </p>
            </div>

            <div>
              <label className="label">Public Key *</label>
              <input
                type="text"
                value={config.public_key}
                onChange={(e) =>
                  setConfig({ ...config, public_key: e.target.value })
                }
                className="input"
                placeholder="APP_USR-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              />
              <p className="text-sm text-gray-500 mt-1">
                Clave pública (menos sensible)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSave}
              loading={saving}
              disabled={!config.access_token || !config.public_key}
            >
              Guardar Configuración
            </Button>

            {hasConfig && (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={handleDelete}
                loading={deleting}
              >
                Eliminar Configuración
              </Button>
            )}
          </div>

          {/* Warning */}
          {!hasConfig && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold">Sin Configuración</p>
                  <p className="mt-1">
                    Los tenants no podrán pagar sus suscripciones hasta que
                    configures MercadoPago.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SuperAdminMercadoPagoConfig;
