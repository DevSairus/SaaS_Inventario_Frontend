import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import useUsersStore from '../../store/usersStore';
import { usersAPI } from '../../api/users';
import Layout from '../../components/layout/Layout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

const PASSWORD_RULE_CHECKS = {
  minLength: (pw) => pw.length >= 8,
  uppercase: (pw) => /[A-Z]/.test(pw),
  number:    (pw) => /[0-9]/.test(pw),
};

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { selectedUser, isLoading, isSubmitting, fetchUserById, createUser, updateUser } =
    useUsersStore();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [passwordRules, setPasswordRules] = useState([]);
  const [planLimitModal, setPlanLimitModal] = useState(null);

  useEffect(() => {
    if (isEdit) {
      fetchUserById(id);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) return;
    usersAPI.getPasswordRequirements()
      .then(setPasswordRules)
      .catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (isEdit && selectedUser?.data?.user) {
      const user = selectedUser.data.user;
      setFormData({
        first_name: user.first_name || '',
        last_name:  user.last_name  || '',
        email:      user.email      || '',
        password:   '',
        role:       user.role       || 'user',
        phone:      user.phone      || '',
      });
    }
  }, [isEdit, selectedUser]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const cumple = (rule) => {
    const check = PASSWORD_RULE_CHECKS[rule.rule];
    return check ? check(formData.password) : false;
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'Nombre requerido';
    if (!formData.last_name.trim())  newErrors.last_name  = 'Apellido requerido';
    if (!formData.email.trim())      newErrors.email      = 'Email requerido';
    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'Contraseña requerida';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Mínimo 8 caracteres';
      }
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    try {
      if (isEdit) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        const result = await updateUser(id, updateData);
        if (result?.success !== false) {
          toast.success('Usuario actualizado');
          navigate('/users');
        }
      } else {
        await createUser(formData);
        toast.success('Usuario creado');
        navigate('/users');
      }
    } catch (err) {
      if (err?.type === 'PLAN_LIMIT') {
        setPlanLimitModal({ message: err.message, limit: err.limit });
        return;
      }
      if (err?.type === 'FORBIDDEN') {
        toast.error(err.message || 'Tu rol no tiene permiso para crear usuarios');
        return;
      }
      if (err?.type === 'VALIDATION') {
        if (Object.keys(err.fieldErrors ?? {}).length > 0) {
          setErrors(err.fieldErrors);
        }
        if (err.passwordRequirements?.length) {
          setPasswordRules(err.passwordRequirements);
        }
        return;
      }
      toast.error(err?.message || 'Error del servidor. Intenta nuevamente.');
    }
  };

  if (isLoading && isEdit) {
    return <Layout><Loading text="Cargando usuario..." /></Layout>;
  }

  return (
    <Layout>
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
              : 'Crea un nuevo usuario y asigna sus permisos'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Contraseña + hints */}
              <div>
                <Input
                  label={isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  error={errors.password}
                  placeholder="Mínimo 8 caracteres"
                  helperText={isEdit ? 'Deja en blanco para mantener la actual' : ''}
                />
                {!isEdit && passwordRules.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 pl-0.5">
                    {passwordRules.map((r) => {
                      const ok = !!formData.password && cumple(r);
                      return (
                        <li
                          key={r.rule}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${
                            ok ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          <span className="text-[10px] w-3 text-center">
                            {ok ? '✓' : '○'}
                          </span>
                          {r.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Input
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+57 300 123 4567"
              />

              {/* Rol */}
              <div className="md:col-span-2">
                <label className="label">Rol *</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className={`input ${errors.role ? 'border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gerente</option>
                  <option value="seller">Vendedor</option>
                  <option value="warehouse_keeper">Bodeguero</option>
                  <option value="technician">Técnico</option>
                  <option value="user">Usuario</option>
                  <option value="viewer">Visualizador</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-xs text-red-500">{errors.role}</p>
                )}

                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    {formData.role === 'admin'           && 'Administrador - Acceso Total'}
                    {formData.role === 'manager'         && 'Gerente - Gestión y Reportes'}
                    {formData.role === 'seller'          && 'Vendedor - Ventas y Clientes'}
                    {formData.role === 'warehouse_keeper'&& 'Bodeguero - Inventario'}
                    {formData.role === 'technician'      && 'Técnico - Órdenes de Trabajo'}
                    {formData.role === 'user'            && 'Usuario - Acceso Estándar'}
                    {formData.role === 'viewer'          && 'Visualizador - Solo Lectura'}
                  </p>

                  <div className="text-xs text-blue-800 space-y-1">
                    {formData.role === 'admin' && (
                      <>
                        <p className="font-medium">Puede hacer TODO:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Gestionar usuarios y permisos</li>
                          <li>Configurar el sistema completo</li>
                          <li>Ver todos los reportes (incluida Cartera)</li>
                          <li>Crear, editar y eliminar cualquier registro</li>
                          <li>Gestionar productos, ventas, compras, inventario</li>
                          <li>Acceso a configuración del tenant</li>
                        </ul>
                      </>
                    )}
                    {formData.role === 'manager' && (
                      <>
                        <p className="font-medium">Puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Ver todos los reportes y análisis</li>
                          <li>Gestionar productos, categorías, proveedores</li>
                          <li>Aprobar compras y ventas</li>
                          <li>Ver cartera (cuentas por cobrar)</li>
                          <li>Gestionar clientes y precios</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-2">No puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Crear o eliminar usuarios</li>
                          <li>Cambiar configuración del sistema</li>
                        </ul>
                      </>
                    )}
                    {formData.role === 'seller' && (
                      <>
                        <p className="font-medium">Puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Crear y gestionar ventas</li>
                          <li>Administrar clientes</li>
                          <li>Ver inventario disponible</li>
                          <li>Procesar devoluciones de clientes</li>
                          <li>Ver sus propias estadísticas de venta</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-2">No puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Ver reportes financieros completos</li>
                          <li>Modificar precios de productos</li>
                          <li>Gestionar compras o proveedores</li>
                          <li>Ver cartera de otros vendedores</li>
                        </ul>
                      </>
                    )}
                    {formData.role === 'warehouse_keeper' && (
                      <>
                        <p className="font-medium">Puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Gestionar inventario y stock</li>
                          <li>Registrar entradas y salidas</li>
                          <li>Hacer transferencias entre bodegas</li>
                          <li>Ajustar inventario</li>
                          <li>Ver alertas de stock</li>
                          <li>Procesar devoluciones a proveedores</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-2">No puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Ver precios o costos</li>
                          <li>Crear ventas o compras</li>
                          <li>Ver reportes financieros</li>
                          <li>Gestionar clientes o proveedores</li>
                        </ul>
                      </>
                    )}
                    {formData.role === 'user' && (
                      <>
                        <p className="font-medium">Puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Ver productos y consultar inventario</li>
                          <li>Registrar ventas básicas</li>
                          <li>Consultar sus propios movimientos</li>
                          <li>Ver clientes (sin editar)</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-2">No puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Modificar productos o precios</li>
                          <li>Ver reportes financieros</li>
                          <li>Gestionar compras</li>
                          <li>Modificar configuraciones</li>
                        </ul>
                      </>
                    )}
                    {formData.role === 'technician' && (
                      <>
                        <p className="font-medium">Puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Ver y gestionar órdenes de trabajo asignadas</li>
                          <li>Registrar trabajo realizado y repuestos usados</li>
                          <li>Subir fotos de ingreso y salida</li>
                          <li>Cambiar estado de las OT</li>
                          <li>Consultar historial de vehículos</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-2">No puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Ver reportes financieros o cartera</li>
                          <li>Gestionar usuarios o configuraciones</li>
                          <li>Crear ventas o compras</li>
                        </ul>
                        <p className="italic mt-2 text-blue-600">
                          Ideal para mecánicos y personal de taller
                        </p>
                      </>
                    )}
                    {formData.role === 'viewer' && (
                      <>
                        <p className="font-medium">Puede SOLO VER:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Productos e inventario (solo consulta)</li>
                          <li>Reportes básicos sin detalles financieros</li>
                          <li>Listados de ventas y movimientos</li>
                        </ul>
                        <p className="font-medium text-red-700 mt-2">No puede:</p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5">
                          <li>Crear, editar o eliminar NADA</li>
                          <li>Ver información financiera sensible</li>
                          <li>Acceder a configuraciones</li>
                        </ul>
                        <p className="italic mt-2 text-blue-600">
                          Ideal para consultores externos o personal temporal
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

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

      {/* Modal: límite de plan alcanzado */}
      <Modal
        isOpen={!!planLimitModal}
        onClose={() => setPlanLimitModal(null)}
        title="Límite de usuarios alcanzado"
        size="sm"
      >
        <p className="text-gray-700 mb-6">
          {planLimitModal?.message || 'Has alcanzado el límite de usuarios de tu plan actual.'}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setPlanLimitModal(null)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={() => navigate('/subscription')}>
            Actualizar plan
          </Button>
        </div>
      </Modal>
    </Layout>
  );
};

export default UserForm;
