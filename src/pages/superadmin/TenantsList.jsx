import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Power,
  Trash2,
  Users,
} from 'lucide-react';
import useSuperAdminStore from '../../store/superAdminStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Dropdown from '../../components/common/Dropdown';

const TenantsList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    plan: '',
    subscription_status: '',
    is_active: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    tenant: null,
    action: null,
  });

  const { tenants, tenantsPagination, isLoading, isSubmitting, fetchTenants, toggleTenantStatus, deleteTenant } =
    useSuperAdminStore();

  const doFetch = useCallback(() => {
    fetchTenants({ page, limit: 10, search, ...filters });
  }, [page, search, filters]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
    setPage(1);
  };

  const handleToggleStatus = (tenant) => {
    setConfirmDialog({
      open: true,
      tenant,
      action: 'toggle',
      title: `${tenant.is_active ? 'Desactivar' : 'Activar'} Empresa`,
      message: `¿Estás seguro de ${tenant.is_active ? 'desactivar' : 'activar'} la empresa "${tenant.company_name}"?`,
    });
  };

  const handleDelete = (tenant) => {
    setConfirmDialog({
      open: true,
      tenant,
      action: 'delete',
      title: 'Eliminar Empresa',
      message: `¿Estás seguro de eliminar la empresa "${tenant.company_name}"? Esta acción desactivará la empresa y cancelará su suscripción.`,
    });
  };

  const confirmAction = async () => {
    let success = false;
    if (confirmDialog.action === 'toggle') {
      success = await toggleTenantStatus(confirmDialog.tenant.id);
    } else if (confirmDialog.action === 'delete') {
      success = await deleteTenant(confirmDialog.tenant.id);
    }
    if (success) {
      setConfirmDialog({ open: false, tenant: null, action: null });
      doFetch();
    }
  };

  const planColors = {
    free: 'gray',
    basic: 'blue',
    premium: 'purple',
    enterprise: 'green',
  };

  const statusColors = {
    trial: 'orange',
    active: 'green',
    suspended: 'red',
    cancelled: 'gray',
  };

  if (isLoading) {
    return <Loading text="Cargando empresas..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600">Gestión de tenants de la plataforma</p>
        </div>
        <Link to="/superadmin/tenants/new">
          <Button variant="primary" icon={Plus}>
            Nueva Empresa
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, email..."
                value={search}
                onChange={handleSearch}
                className="input pl-10"
              />
            </div>
            <Button
              variant="outline"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="label">Plan</label>
                <select
                  value={filters.plan}
                  onChange={(e) => handleFilterChange('plan', e.target.value)}
                  className="input"
                >
                  <option value="">Todos</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="label">Estado Suscripción</label>
                <select
                  value={filters.subscription_status}
                  onChange={(e) =>
                    handleFilterChange('subscription_status', e.target.value)
                  }
                  className="input"
                >
                  <option value="">Todos</option>
                  <option value="trial">Trial</option>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="label">Estado</label>
                <select
                  value={filters.is_active || ''}
                  onChange={(e) =>
                    handleFilterChange('is_active', e.target.value)
                  }
                  className="input"
                >
                  <option value="">Todos</option>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de Tenants */}
      <Card>
        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron empresas</p>
            <p className="text-sm text-gray-500 mt-2">
              Total en base de datos: {tenantsPagination.totalItems}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suscripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuarios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {tenant.company_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tenant.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={planColors[tenant.plan]}>
                          {tenant.plan.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={statusColors[tenant.subscription_status]}>
                          {tenant.subscription_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Users className="w-4 h-4 mr-1" />
                          {tenant.userCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={tenant.is_active ? 'green' : 'red'}>
                          {tenant.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Dropdown
                          trigger={
                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>
                          }
                          items={[
                            {
                              label: 'Ver Detalles',
                              icon: Eye,
                              to: `/superadmin/tenants/${tenant.id}`,
                            },
                            {
                              label: 'Editar',
                              icon: Edit,
                              to: `/superadmin/tenants/${tenant.id}/edit`,
                            },
                            {
                              label: tenant.is_active ? 'Desactivar' : 'Activar',
                              icon: Power,
                              onClick: () => handleToggleStatus(tenant),
                            },
                            {
                              label: 'Eliminar',
                              icon: Trash2,
                              onClick: () => handleDelete(tenant),
                              className: 'text-red-600',
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination
                currentPage={tenantsPagination.currentPage}
                totalPages={tenantsPagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmAction}
        onCancel={() =>
          setConfirmDialog({ open: false, tenant: null, action: null })
        }
        confirmText={
          confirmDialog.action === 'delete' ? 'Eliminar' : 'Confirmar'
        }
        confirmVariant={
          confirmDialog.action === 'delete' ? 'danger' : 'primary'
        }
        loading={isSubmitting}
      />
    </div>
  );
};

export default TenantsList;