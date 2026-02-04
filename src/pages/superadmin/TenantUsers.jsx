import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  Trash2,
  Key,
  UserCog,
  UserPlus,
} from 'lucide-react';
import useSuperAdminStore from '../../store/superAdminStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AddTenantUserModal from '../../components/superadmin/AddTenantUserModal';

const TenantUsers = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    is_active: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [roleDialog, setRoleDialog] = useState({ open: false, user: null });
  const [passwordDialog, setPasswordDialog] = useState({
    open: false,
    user: null,
  });
  const [newPassword, setNewPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const {
    tenantUsers,
    tenantDetail,
    tenantUsersPagination,
    isLoading,
    isSubmitting,
    error,
    fetchTenantUsers,
    deleteTenantUser,
    changeTenantUserRole,
    resetTenantUserPassword,
    createTenantUser,
    clearError,
  } = useSuperAdminStore();

  const doFetch = useCallback(() => {
    fetchTenantUsers(id, { page, limit: 10, search, ...filters });
  }, [id, page, search, filters]);

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

  const handleDeleteClick = (user) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de eliminar a ${user.first_name} ${user.last_name}?`,
      user,
    });
  };

  const confirmDelete = async () => {
    const success = await deleteTenantUser(id, confirmDialog.user.id);
    if (success) {
      setConfirmDialog({ open: false });
      doFetch();
    }
  };

  const handleRoleClick = (user) => {
    setSelectedRole(user.role);
    setRoleDialog({ open: true, user });
  };

  const confirmRoleChange = async () => {
    const success = await changeTenantUserRole(id, roleDialog.user.id, selectedRole);
    if (success) {
      setRoleDialog({ open: false, user: null });
      setSelectedRole('');
      doFetch();
    }
  };

  const handleResetPasswordClick = (user) => {
    setNewPassword('');
    setPasswordDialog({ open: true, user });
  };

  const confirmResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    const success = await resetTenantUserPassword(id, passwordDialog.user.id, newPassword);
    if (success) {
      setPasswordDialog({ open: false, user: null });
      setNewPassword('');
    }
  };

  const handleCreateUser = async (userData) => {
    const success = await createTenantUser(id, userData);
    if (success) {
      doFetch(); // Recargar lista de usuarios
      return true;
    }
    return false;
  };

  const handleCloseAddUserModal = () => {
    setShowAddUserModal(false);
    clearError(); // Limpiar errores al cerrar el modal
  };

  if (isLoading) {
    return <Loading text="Cargando usuarios..." />;
  }

  const roleColors = {
    super_admin: 'red',
    admin: 'purple',
    manager: 'indigo',
    seller: 'blue',
    warehouse_keeper: 'cyan',
    user: 'green',
    viewer: 'gray',
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    warehouse_keeper: 'Bodeguero',
    user: 'Usuario',
    viewer: 'Visualizador',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate(`/superadmin/tenants/${id}`)}
          className="mb-4"
        >
          Volver
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Usuarios de {tenantDetail?.company_name}
            </h1>
            <p className="text-gray-600">
              Gestión completa de usuarios del sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge color="blue">{tenantDetail?.plan?.toUpperCase()}</Badge>
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => setShowAddUserModal(true)}
            >
              Agregar Usuario
            </Button>
          </div>
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="label">Rol</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="input"
                >
                  <option value="">Todos</option>
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="seller">Vendedor</option>
                  <option value="warehouse_keeper">Bodeguero</option>
                  <option value="user">Usuario</option>
                  <option value="viewer">Visualizador</option>
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

      {/* Lista */}
      <Card>
        {tenantUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron usuarios</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenantUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-sm">
                              {user.first_name?.charAt(0)}
                              {user.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge color={user.is_active ? 'green' : 'red'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRoleClick(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Cambiar rol"
                          >
                            <UserCog className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleResetPasswordClick(user)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Resetear contraseña"
                          >
                            <Key className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination
                currentPage={tenantUsersPagination.currentPage}
                totalPages={tenantUsersPagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ open: false })}
        loading={isSubmitting}
      />

      {/* Role Change Dialog */}
      {roleDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cambiar Rol de Usuario
            </h3>

            <p className="text-gray-600 mb-4">
              Usuario:{' '}
              <strong>
                {roleDialog.user?.first_name} {roleDialog.user?.last_name}
              </strong>
            </p>

            <div className="mb-4">
              <label className="label">Nuevo Rol</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input"
              >
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="seller">Vendedor</option>
                <option value="warehouse_keeper">Bodeguero</option>
                <option value="user">Usuario</option>
                <option value="viewer">Visualizador</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRoleDialog({ open: false, user: null });
                  setSelectedRole('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={confirmRoleChange}
                loading={isSubmitting}
                className="flex-1"
              >
                Cambiar Rol
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {passwordDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resetear Contraseña
            </h3>

            <p className="text-gray-600 mb-4">
              Usuario:{' '}
              <strong>
                {passwordDialog.user?.first_name}{' '}
                {passwordDialog.user?.last_name}
              </strong>
            </p>

            <div className="mb-4">
              <label className="label">Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialog({ open: false, user: null });
                  setNewPassword('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={confirmResetPassword}
                loading={isSubmitting}
                className="flex-1"
              >
                Resetear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddTenantUserModal
        isOpen={showAddUserModal}
        onClose={handleCloseAddUserModal}
        onSubmit={handleCreateUser}
        isSubmitting={isSubmitting}
        error={error}
      />
    </div>
  );
};

export default TenantUsers;