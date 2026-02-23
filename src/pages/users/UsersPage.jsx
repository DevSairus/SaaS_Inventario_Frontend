import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Power,
  Trash2,
} from 'lucide-react';
import useUsersStore from '../../store/usersStore';
import useAuthStore from '../../store/authStore';
import Layout from '../../components/layout/Layout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Dropdown from '../../components/common/Dropdown';

const UsersPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  // Verificar permisos: solo admin puede ver usuarios
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      // Redirigir a perfil si no es admin
      navigate('/profile', { replace: true });
    }
  }, [currentUser, navigate]);

  // Si no es admin, no renderizar nada (mientras redirige)
  if (currentUser && currentUser.role !== 'admin') {
    return null;
  }

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    is_active: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    user: null,
    action: null,
  });

  const { users, pagination, isLoading, isSubmitting, fetchUsers, toggleUserStatus, deleteUser } =
    useUsersStore();

  const doFetch = useCallback(() => {
    fetchUsers({ page, limit: 10, search, ...filters });
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

  const handleToggleStatus = (user) => {
    setConfirmDialog({
      open: true,
      user,
      action: 'toggle',
      title: `${user.is_active ? 'Desactivar' : 'Activar'} Usuario`,
      message: `¿Estás seguro de ${user.is_active ? 'desactivar' : 'activar'} al usuario "${user.first_name} ${user.last_name}"?`,
    });
  };

  const handleDelete = (user) => {
    setConfirmDialog({
      open: true,
      user,
      action: 'delete',
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de eliminar al usuario "${user.first_name} ${user.last_name}"? Esta acción lo desactivará.`,
    });
  };

  const confirmAction = async () => {
    let success = false;
    if (confirmDialog.action === 'toggle') {
      success = await toggleUserStatus(confirmDialog.user.id);
    } else if (confirmDialog.action === 'delete') {
      success = await deleteUser(confirmDialog.user.id);
    }
    if (success) {
      setConfirmDialog({ open: false, user: null, action: null });
    }
  };

  const roleColors = {
    super_admin: 'red',
    admin: 'purple',
    manager: 'blue',
    seller: 'green',
    warehouse_keeper: 'yellow',
    technician: 'orange',
    user: 'gray',
    viewer: 'indigo',
  };

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    warehouse_keeper: 'Bodeguero',
    technician: 'Técnico',
    user: 'Usuario',
    viewer: 'Visualizador',
  };

  if (isLoading) {
    return <Layout><Loading text="Cargando usuarios..." /></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">
            Administra los usuarios de tu organización y sus roles
          </p>
        </div>
        <Link to="/users/new">
          <Button variant="primary" icon={Plus}>
            Nuevo Usuario
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
                  <option value="technician">Técnico</option>
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

      {/* Lista de Usuarios */}
      <Card>
        {users.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron usuarios</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
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
                  {users.map((user) => (
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
                        <div className="text-sm text-gray-900">
                          {user.phone || 'No registrado'}
                        </div>
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
                        <Dropdown
                          trigger={
                            <button className="p-2 hover:bg-gray-100 rounded-lg">
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>
                          }
                          items={[
                            {
                              label: 'Editar',
                              icon: Edit,
                              to: `/users/${user.id}/edit`,
                            },
                            {
                              label: user.is_active ? 'Desactivar' : 'Activar',
                              icon: Power,
                              onClick: () => handleToggleStatus(user),
                            },
                            {
                              label: 'Eliminar',
                              icon: Trash2,
                              onClick: () => handleDelete(user),
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
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
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
          setConfirmDialog({ open: false, user: null, action: null })
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
    </Layout>
  );
};

export default UsersPage;