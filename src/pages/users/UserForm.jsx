import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import useUsersStore from '../../store/usersStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { selectedUser, isLoading, isSubmitting, fetchUserById, createUser, updateUser } =
    useUsersStore();

  useEffect(() => {
    if (isEdit) {
      fetchUserById(id);
    }
  }, [id]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'operario',
    phone: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && selectedUser?.data?.user) {
      const user = selectedUser.data.user;
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'operario',
        phone: user.phone || '',
      });
    }
  }, [isEdit, selectedUser]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.first_name) newErrors.first_name = 'Nombre requerido';
    if (!formData.last_name) newErrors.last_name = 'Apellido requerido';
    if (!formData.email) newErrors.email = 'Email requerido';
    if (!isEdit && !formData.password)
      newErrors.password = 'Contraseña requerida';
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let result;
    if (isEdit) {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;
      result = await updateUser(id, updateData);
    } else {
      result = await createUser(formData);
    }

    if (result.success) {
      navigate('/users');
    }
  };

  if (isLoading && isEdit) {
    return <Loading text="Cargando usuario..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/users')}
          className="mb-4"
        >
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h1>
        <p className="text-gray-600">
          {isEdit
            ? 'Actualiza la información del usuario'
            : 'Crea un nuevo usuario del sistema (Admin u Operario)'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <Card title="Información Personal" icon={UserIcon}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              error={errors.first_name}
              placeholder="Juan"
            />

            <Input
              label="Apellido *"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              error={errors.last_name}
              placeholder="Pérez"
            />

            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="usuario@empresa.com"
              disabled={isEdit}
            />

            <Input
              label={isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              placeholder="Mínimo 6 caracteres"
              helperText={
                isEdit ? 'Deja en blanco para mantener la actual' : ''
              }
            />

            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+57 300 123 4567"
            />

            <div>
              <label className="label">Rol *</label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="input"
              >
                <option value="operario">Operario</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Admin tiene acceso completo. Operario puede gestionar lecturas y
                PQRS.
              </p>
            </div>
          </div>
        </Card>

        {/* Botones */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/users')}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="flex-1"
          >
            {isEdit ? 'Actualizar Usuario' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;