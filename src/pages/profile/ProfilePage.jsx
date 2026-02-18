import React, { useState } from 'react';
import { User as UserIcon, Lock, Mail, Phone } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/auth';
import Layout from '../../components/layout/Layout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState({});

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validaciones
    const newErrors = {};
    if (!passwordData.current_password) {
      newErrors.current_password = 'Contraseña actual requerida';
    }
    if (!passwordData.new_password) {
      newErrors.new_password = 'Nueva contraseña requerida';
    } else if (passwordData.new_password.length < 6) {
      newErrors.new_password = 'Mínimo 6 caracteres';
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });

      toast.success('Contraseña actualizada exitosamente');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setErrors({});
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al cambiar contraseña';
      toast.error(errorMsg);
      if (errorMsg.includes('actual') || errorMsg.includes('incorrecta')) {
        setErrors({ current_password: 'Contraseña actual incorrecta' });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleName = (role) => {
    const roles = {
      admin: '👑 Administrador',
      manager: '📊 Gerente',
      seller: '🛒 Vendedor',
      warehouse_keeper: '📦 Bodeguero',
      user: '👤 Usuario',
      viewer: '👁️ Visualizador'
    };
    return roles[role] || role;
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona tu información personal y seguridad
          </p>
        </div>

        {/* Información Personal */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-sm text-gray-600">{getRoleName(user?.role)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                </div>
              </div>

              {user?.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-sm font-medium text-gray-900">{user?.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <UserIcon className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Rol</p>
                  <p className="text-sm font-medium text-gray-900">{getRoleName(user?.role)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Cambiar Contraseña */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-gray-700" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Cambiar Contraseña</h2>
                <p className="text-sm text-gray-500">Actualiza tu contraseña de acceso</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <Input
                label="Contraseña Actual *"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, current_password: e.target.value });
                  setErrors({ ...errors, current_password: '' });
                }}
                error={errors.current_password}
                placeholder="••••••••"
              />

              <Input
                label="Nueva Contraseña *"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, new_password: e.target.value });
                  setErrors({ ...errors, new_password: '' });
                }}
                error={errors.new_password}
                placeholder="••••••••"
                helperText="Mínimo 6 caracteres"
              />

              <Input
                label="Confirmar Nueva Contraseña *"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirm_password: e.target.value });
                  setErrors({ ...errors, confirm_password: '' });
                }}
                error={errors.confirm_password}
                placeholder="••••••••"
              />

              <Button
                type="submit"
                loading={isChangingPassword}
                className="w-full"
              >
                {isChangingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </div>
        </Card>

        {/* Información de Sesión */}
        <Card>
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información de Seguridad</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Cambia tu contraseña regularmente para mantener tu cuenta segura</p>
              <p>• Nunca compartas tu contraseña con nadie</p>
              <p>• Si sospechas que tu cuenta fue comprometida, cambia tu contraseña inmediatamente</p>
              {user?.role !== 'admin' && (
                <p className="text-yellow-700 bg-yellow-50 p-3 rounded-lg mt-3">
                  ⚠️ Para cambios en tu información personal (nombre, email, teléfono), contacta al administrador del sistema.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfilePage;