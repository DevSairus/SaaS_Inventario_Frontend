import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Save, AlertCircle } from 'lucide-react';
import usePermissionsStore from '../../store/permissionsStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';

const RolePermissionsPage = () => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [modifiedPermissions, setModifiedPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const { roleData, isLoading, isSubmitting, fetchRolePermissions, updateRolePermissions } =
    usePermissionsStore();

  useEffect(() => {
    fetchRolePermissions(selectedRole);
  }, [selectedRole]);

  const roles = [
    { value: 'admin', label: 'Administrador', color: 'purple' },
    { value: 'operario', label: 'Operario', color: 'blue' },
    {
      value: 'asesor_facturacion',
      label: 'Facturación',
      color: 'orange',
    },
    {
      value: 'asesor_servicio_cliente',
      label: 'Servicio Cliente',
      color: 'teal',
    },
    { value: 'cliente', label: 'Cliente', color: 'green' },
  ];

  const permissions = roleData?.data?.permissions || [];
  const groupedPermissions = roleData?.data?.grouped || {};

  // Inicializar permisos modificados cuando cambia el rol
  useEffect(() => {
    if (permissions.length > 0) {
      const initial = {};
      permissions.forEach((perm) => {
        initial[perm.id] = perm.has_permission;
      });
      setModifiedPermissions(initial);
      setHasChanges(false);
    }
  }, [permissions]);

  const handleTogglePermission = (permissionId) => {
    setModifiedPermissions((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const permissionIds = Object.entries(modifiedPermissions)
      .filter(([_, hasPermission]) => hasPermission)
      .map(([id]) => id);

    const success = await updateRolePermissions(selectedRole, permissionIds);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleCancel = () => {
    const initial = {};
    permissions.forEach((perm) => {
      initial[perm.id] = perm.has_permission;
    });
    setModifiedPermissions(initial);
    setHasChanges(false);
  };

  const getModuleIcon = (moduleName) => {
    const icons = {
      dashboard: '📊',
      clients: '👥',
      invoices: '🧾',
      payments: '💰',
      readings: '📏',
      consumptions: '💧',
      pqrs: '📝',
      reports: '📈',
      users: '👤',
      settings: '⚙️',
    };
    return icons[moduleName] || '📁';
  };

  if (isLoading) {
    return <Loading text="Cargando permisos..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Permisos
          </h1>
          <p className="text-gray-600">
            Configura los permisos de cada rol del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">
            {permissions.filter((p) => modifiedPermissions[p.id]).length} de{' '}
            {permissions.length} permisos activos
          </span>
        </div>
      </div>

      {/* Selector de Rol */}
      <Card>
        <div className="flex gap-4">
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => {
                if (
                  !hasChanges ||
                  window.confirm('¿Descartar cambios sin guardar?')
                ) {
                  setSelectedRole(role.value);
                }
              }}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                selectedRole === role.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {role.label}
                </div>
                <Badge color={role.color} className="mt-1">
                  {role.value}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Aviso de Super Admin */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los permisos de{' '}
              <strong>Super Admin</strong> no se pueden modificar. Super Admin
              siempre tiene acceso completo al sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Permisos por Módulo */}
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(groupedPermissions).map(
          ([module, modulePermissions]) => (
            <Card key={module}>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                <span className="text-2xl">{getModuleIcon(module)}</span>
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {module === 'pqrs' ? 'PQRS' : module}
                </h3>
                <Badge color="gray">
                  {
                    modulePermissions.filter((p) => modifiedPermissions[p.id])
                      .length
                  }{' '}
                  / {modulePermissions.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modulePermissions.map((permission) => {
                  const isActive = modifiedPermissions[permission.id];
                  const hasChanged = isActive !== permission.has_permission;

                  return (
                    <div
                      key={permission.id}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isActive
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${hasChanged ? 'ring-2 ring-orange-400' : ''}`}
                      onClick={() => handleTogglePermission(permission.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isActive
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isActive && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="font-medium text-gray-900 text-sm">
                              {permission.display_name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-7">
                            {permission.description}
                          </p>
                          <code className="text-xs text-gray-400 ml-7 block mt-1">
                            {permission.name}
                          </code>
                        </div>
                        {hasChanged && (
                          <div className="ml-2">
                            <Badge color="orange" size="sm">
                              Modificado
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )
        )}
      </div>

      {/* Botones de acción */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 flex gap-3 bg-white p-4 rounded-lg shadow-xl border border-gray-200">
          <Button variant="outline" onClick={handleCancel} icon={X}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            icon={Save}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RolePermissionsPage;