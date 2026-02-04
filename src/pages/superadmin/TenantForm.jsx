import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Loading from '@components/common/Loading';
import toast from 'react-hot-toast';

const TenantForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [formData, setFormData] = useState({
    company_name: '',
    slug: '',
    business_name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    plan: 'free',
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
  });

  useEffect(() => {
    fetchPlans();
    if (isEdit) {
      fetchTenant();
    }
  }, [id]);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/superadmin/subscription-plans');
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error al cargar planes');
    }
  };

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/superadmin/tenants/${id}`);

      console.log('✅ Tenant data received:', data);

      // IMPORTANTE: El backend devuelve { tenant: {...}, stats: {...} }
      if (data && data.tenant) {
        setFormData({
          company_name: data.tenant.company_name || '',
          slug: data.tenant.slug || '',
          business_name: data.tenant.business_name || '',
          tax_id: data.tenant.tax_id || '',
          email: data.tenant.email || '',
          phone: data.tenant.phone || '',
          address: data.tenant.address || '',
          plan: data.tenant.plan || 'free',
          // No cargar datos de admin en edición
          admin_email: '',
          admin_password: '',
          admin_first_name: '',
          admin_last_name: '',
        });
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Error al cargar información del tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generar slug si es creación
    if (name === 'company_name' && !isEdit) {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (isEdit) {
        // Actualizar tenant
        await api.put(`/superadmin/tenants/${id}`, {
          company_name: formData.company_name,
          business_name: formData.business_name,
          tax_id: formData.tax_id,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          plan: formData.plan,
        });

        toast.success('Tenant actualizado correctamente');
      } else {
        // Crear nuevo tenant
        await api.post('/superadmin/tenants', formData);
        toast.success('Tenant creado correctamente');
      }

      navigate('/superadmin/tenants');
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error(error.response?.data?.error || 'Error al guardar tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="Cargando información..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/superadmin/tenants')}
          className="mb-4"
        >
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar Empresa' : 'Nueva Empresa'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEdit
            ? 'Actualiza la información de la empresa'
            : 'Crea una nueva empresa en el sistema'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Información Básica */}
          <Card title="Información Básica">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nombre de la Empresa *</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="input"
                  disabled={isEdit}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {isEdit
                    ? 'El slug no puede ser modificado después de la creación'
                    : 'Se genera automáticamente desde el nombre'}
                </p>
              </div>

              <div>
                <label className="label">Razón Social</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">NIT</label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Dirección</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input"
                  rows="2"
                />
              </div>
            </div>
          </Card>

          {/* Plan */}
          <Card title="Plan de Suscripción">
            <div>
              <label className="label">Plan *</label>
              <select
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Seleccionar plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.slug}>
                    {plan.name} - ${plan.monthly_price.toLocaleString('es-CO')}{' '}
                    COP/mes
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Usuario Admin - Solo en creación */}
          {!isEdit && (
            <Card title="Usuario Administrador">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Crea el usuario administrador para esta empresa
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nombre *</label>
                    <input
                      type="text"
                      name="admin_first_name"
                      value={formData.admin_first_name}
                      onChange={handleChange}
                      className="input"
                      required={!isEdit}
                    />
                  </div>

                  <div>
                    <label className="label">Apellido *</label>
                    <input
                      type="text"
                      name="admin_last_name"
                      value={formData.admin_last_name}
                      onChange={handleChange}
                      className="input"
                      required={!isEdit}
                    />
                  </div>

                  <div>
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      name="admin_email"
                      value={formData.admin_email}
                      onChange={handleChange}
                      className="input"
                      required={!isEdit}
                    />
                  </div>

                  <div>
                    <label className="label">Contraseña *</label>
                    <input
                      type="password"
                      name="admin_password"
                      value={formData.admin_password}
                      onChange={handleChange}
                      className="input"
                      required={!isEdit}
                      minLength="8"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/superadmin/tenants')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              loading={saving}
            >
              {isEdit ? 'Actualizar Empresa' : 'Crear Empresa'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TenantForm;