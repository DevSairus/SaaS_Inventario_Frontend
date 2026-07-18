import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const emptyConfig = {
  facturacion_centralizada_activa: false,
  tipo_documento: 'NIT',
  numero_documento: '',
  dv: '',
  razon_social: '',
  email_facturacion: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  regimen_code: 'O-47',
  notes: '',
};

const TenantNcfConfig = () => {
  const { tenantId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [config, setConfig] = useState(emptyConfig);
  const [validacion, setValidacion] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantRes, configRes] = await Promise.all([
        api.get(`/superadmin/tenants/${tenantId}`),
        api.get(`/superadmin/tenants/${tenantId}/ncf-config`),
      ]);

      const tenantData = tenantRes.data.tenant || tenantRes.data;
      setTenant(tenantData);

      if (configRes.data.config) {
        setConfig({ ...emptyConfig, ...configRes.data.config });
      } else {
        // Precarga con lo que ya existe operativamente en el tenant, para
        // no hacer capturar dos veces el mismo dato.
        setConfig({
          ...emptyConfig,
          razon_social: tenantData.business_name || tenantData.company_name || '',
          numero_documento: (tenantData.tax_id || '').replace(/-\d$/, ''),
          email_facturacion: tenantData.email || '',
          telefono: tenantData.phone || '',
          direccion: tenantData.address || '',
        });
      }
    } catch (error) {
      toast.error('Error al cargar la configuración NCF del tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data } = await api.post(`/superadmin/tenants/${tenantId}/ncf-config`, config);
      setValidacion(data.validacion);
      if (data.validacion?.valid) {
        toast.success('Configuración guardada -- datos fiscales completos');
      } else {
        toast.success('Configuración guardada, pero faltan datos para poder facturar (ver aviso abajo)');
      }
      setConfig(data.config);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <Link to={`/superadmin/tenants/${tenantId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Volver a {tenant?.business_name || tenant?.company_name || 'tenant'}
      </Link>

      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Building2 className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación centralizada (NCF)</h1>
          <p className="text-sm text-gray-500">
            Datos fiscales para que ESC DataCore le facture a <strong>{tenant?.business_name || tenant?.company_name}</strong> su suscripción a Pitbox.
          </p>
        </div>
      </div>

      <Card>
        <label className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="checkbox"
            checked={config.facturacion_centralizada_activa}
            onChange={(e) => setConfig({ ...config, facturacion_centralizada_activa: e.target.checked })}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-medium text-gray-800">
            Facturación centralizada activa para este tenant
          </span>
        </label>

        {validacion && !validacion.valid && (
          <div className="flex items-start gap-2 p-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Faltan datos para poder facturar:</p>
              <p>{validacion.missing.join(', ')}</p>
              <p className="text-xs mt-1 opacity-80">El Núcleo rechazará las prefacturas de este tenant hasta que estos campos estén completos.</p>
            </div>
          </div>
        )}
        {validacion?.valid && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            <CheckCircle className="w-4 h-4" /> Datos fiscales completos
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
            <select
              value={config.tipo_documento}
              onChange={(e) => setConfig({ ...config, tipo_documento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="NIT">NIT</option>
              <option value="CC">Cédula</option>
              <option value="CE">Cédula de extranjería</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
              <input
                value={config.numero_documento || ''}
                onChange={(e) => setConfig({ ...config, numero_documento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DV</label>
              <input
                value={config.dv || ''}
                onChange={(e) => setConfig({ ...config, dv: e.target.value })}
                maxLength={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
            <input
              value={config.razon_social || ''}
              onChange={(e) => setConfig({ ...config, razon_social: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturación</label>
            <input
              type="email"
              value={config.email_facturacion || ''}
              onChange={(e) => setConfig({ ...config, email_facturacion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              value={config.telefono || ''}
              onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              value={config.direccion || ''}
              onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
            <input
              value={config.ciudad || ''}
              onChange={(e) => setConfig({ ...config, ciudad: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Régimen fiscal (código DIAN)</label>
            <input
              value={config.regimen_code || ''}
              onChange={(e) => setConfig({ ...config, regimen_code: e.target.value })}
              placeholder="O-47"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota interna (opcional)</label>
            <input
              value={config.notes || ''}
              onChange={(e) => setConfig({ ...config, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="pt-6">
          <Button onClick={handleSave} disabled={saving} icon={Save}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TenantNcfConfig;
