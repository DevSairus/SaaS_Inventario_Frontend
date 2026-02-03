import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  ToggleLeft,
  ToggleRight,
  Edit,
  Settings,
} from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import Loading from '@components/common/Loading';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener tenant
      const tenantResponse = await api.get(`/superadmin/tenants/${id}`);
      console.log('✅ Tenant Response:', tenantResponse.data);

      // IMPORTANTE: El backend devuelve { tenant: {...}, stats: {...} }
      if (tenantResponse.data && tenantResponse.data.tenant) {
        setTenant(tenantResponse.data.tenant);
        setStats(tenantResponse.data.stats);
      } else {
        throw new Error('Respuesta del servidor mal formateada');
      }

      // Obtener usuarios
      const usersResponse = await api.get(
        `/superadmin/tenants/${id}/users?limit=5`
      );
      console.log('✅ Users Response:', usersResponse.data);
      setUsers(usersResponse.data.users || []);
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.error || 'Error al cargar información');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setToggling(true);
      await api.post(`/superadmin/tenants/${id}/toggle-status`);
      await fetchData();
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <Loading text="Cargando información del tenant..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Button
            onClick={() => navigate('/superadmin/tenants')}
            variant="outline"
          >
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            Empresa no encontrada
          </h3>
          <p className="text-orange-700 mb-4">ID: {id}</p>
          <Button
            onClick={() => navigate('/superadmin/tenants')}
            variant="outline"
          >
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      trial: 'blue',
      suspended: 'red',
      cancelled: 'gray',
      past_due: 'orange',
    };
    return colors[status] || 'gray';
  };

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

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tenant.company_name}
            </h1>
            <p className="text-gray-600 mt-1">{tenant.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={tenant.is_active ? 'green' : 'red'}>
              {tenant.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            <Badge color={getStatusColor(tenant.subscription_status)}>
              {tenant.subscription_status?.toUpperCase() || 'N/A'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          icon={Edit}
          onClick={() => navigate(`/superadmin/tenants/${id}/edit`)}
        >
          Editar Empresa
        </Button>
        <Button
          variant="outline"
          icon={Settings}
          onClick={() => navigate(`/superadmin/tenants/${id}/subscription`)}
        >
          Gestionar Suscripción
        </Button>
        <Button
          variant={tenant.is_active ? 'danger' : 'success'}
          icon={tenant.is_active ? ToggleRight : ToggleLeft}
          onClick={handleToggleStatus}
          loading={toggling}
        >
          {tenant.is_active ? 'Desactivar' : 'Activar'}
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información General */}
        <Card title="Información General">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Razón Social</p>
                <p className="font-medium text-gray-900">
                  {tenant.business_name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">NIT</p>
                <p className="font-medium text-gray-900">
                  {tenant.tax_id || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{tenant.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-medium text-gray-900">
                  {tenant.phone || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-medium text-gray-900">
                  {tenant.address || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Creado</p>
                <p className="font-medium text-gray-900">
                  {new Date(tenant.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Plan y Suscripción */}
        <Card title="Plan y Suscripción">
          <div className="space-y-4">
            {/* Información del Plan */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Plan Actual</span>
                <Badge 
                  color={
                    tenant.plan === 'enterprise' ? 'green' :
                    tenant.plan === 'premium' ? 'purple' :
                    tenant.plan === 'basic' ? 'blue' : 'gray'
                  }
                  size="lg"
                >
                  {tenant.plan?.toUpperCase() || 'FREE'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Estado Suscripción</span>
                <Badge color={getStatusColor(tenant.subscription_status)}>
                  {tenant.subscription_status?.toUpperCase() || 'TRIAL'}
                </Badge>
              </div>

              {/* Mostrar información de la suscripción si existe */}
              {tenant.subscription && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Ciclo de Facturación</p>
                      <p className="font-medium text-gray-900">
                        {tenant.subscription.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Monto</p>
                      <p className="font-medium text-gray-900">
                        ${Number(tenant.subscription.amount).toLocaleString('es-CO')} COP
                      </p>
                    </div>
                    {tenant.subscription.next_billing_date && (
                      <>
                        <div>
                          <p className="text-gray-600">Próximo Cobro</p>
                          <p className="font-medium text-gray-900">
                            {new Date(tenant.subscription.next_billing_date).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Trial Info */}
            {tenant.trial_ends_at && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    <strong>Trial termina:</strong>{' '}
                    {new Date(tenant.trial_ends_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Límites del Plan */}
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">Límites del Plan</p>
              
              <div className="space-y-2">
                {/* Usuarios */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Usuarios</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, ((stats?.totalUsers || 0) / (tenant.max_users || 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="font-medium text-gray-900 text-sm w-20 text-right">
                      {stats?.totalUsers || 0} / {tenant.max_users || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Facturas */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Facturas/Mes</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, ((stats?.totalInvoices || 0) / (tenant.max_invoices_per_month || 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="font-medium text-gray-900 text-sm w-20 text-right">
                      {stats?.totalInvoices || 0} / {tenant.max_invoices_per_month || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Usuarios */}
      <Card title="Usuarios Recientes">
        {users.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No hay usuarios</p>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color="blue">{user.role}</Badge>
                    <Badge color={user.is_active ? 'green' : 'red'}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to={`/superadmin/tenants/${id}/users`}
              className="block mt-4 text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todos los usuarios →
            </Link>
          </>
        )}
      </Card>
    </div>
  );
};

export default TenantDetail;
