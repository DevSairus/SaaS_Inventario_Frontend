import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';

const AddTenantUserModal = ({ isOpen, onClose, onSubmit, isSubmitting, error }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'user',
    identification_type: 'CC',
    identification_number: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }

    if (!formData.role) {
      newErrors.role = 'El rol es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const success = await onSubmit(formData);
    if (success) {
      // Resetear formulario
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'user',
        identification_type: 'CC',
        identification_number: '',
        phone: '',
        address: '',
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Agregar Nuevo Usuario</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error global */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Información básica */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Juan"
                  error={errors.first_name}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <Input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Pérez"
                  error={errors.last_name}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.last_name}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="usuario@ejemplo.com"
                  error={errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  error={errors.password}
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="seller">Vendedor</option>
                  <option value="warehouse_keeper">Bodeguero</option>
                  <option value="user">Usuario</option>
                  <option value="viewer">Visualizador</option>
                </select>
                {errors.role && (
                  <p className="text-sm text-red-600 mt-1">{errors.role}</p>
                )}
              </div>

              <div>
                <label className="label">Teléfono</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="3001234567"
                />
              </div>
            </div>
          </div>

          {/* Información de identificación */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Información de Identificación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo de Identificación</label>
                <select
                  name="identification_type"
                  value={formData.identification_type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="NIT">NIT</option>
                  <option value="PP">Pasaporte</option>
                </select>
              </div>

              <div>
                <label className="label">Número de Identificación</label>
                <Input
                  name="identification_number"
                  value={formData.identification_number}
                  onChange={handleChange}
                  placeholder="1234567890"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dirección</h3>
            <div>
              <label className="label">Dirección</label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Calle 123 #45-67"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isSubmitting}
            >
              Crear Usuario
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTenantUserModal;