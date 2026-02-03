import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, RefreshCw } from 'lucide-react';
import { subscriptionsAPI } from '@api/subscriptions';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import Loading from '@components/common/Loading';

const SubscriptionPlansManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    monthly_price: 0,
    yearly_price: 0,
    max_users: 1,
    max_clients: 100,
    max_invoices_per_month: 100,
    features: {},
    is_active: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await subscriptionsAPI.getPlans();
      setPlans(data.plans || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await subscriptionsAPI.updatePlan(editingPlan.id, formData);
      } else {
        await subscriptionsAPI.createPlan(formData);
      }
      setShowModal(false);
      setEditingPlan(null);
      resetForm();
      fetchPlans();
    } catch (err) {
      setError('Error al guardar plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      monthly_price: plan.monthly_price,
      yearly_price: plan.yearly_price,
      max_users: plan.max_users,
      max_clients: plan.max_clients,
      max_invoices_per_month: plan.max_invoices_per_month,
      features: plan.features || {},
      is_active: plan.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este plan?')) return;
    try {
      await subscriptionsAPI.deletePlan(id);
      fetchPlans();
    } catch (err) {
      setError('Error al eliminar plan');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await subscriptionsAPI.togglePlanStatus(id);
      fetchPlans();
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      monthly_price: 0,
      yearly_price: 0,
      max_users: 1,
      max_clients: 100,
      max_invoices_per_month: 100,
      features: {},
      is_active: true,
    });
  };

  if (loading) return <Loading text="Cargando planes..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Planes
          </h1>
          <p className="text-gray-600 mt-1">
            Administra los planes de suscripción
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={fetchPlans}>
            Actualizar
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setEditingPlan(null);
              resetForm();
              setShowModal(true);
            }}
          >
            Nuevo Plan
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500">{plan.slug}</p>
                </div>
                <Badge color={plan.is_active ? 'green' : 'gray'}>
                  {plan.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              <div>
                <p className="text-2xl font-bold text-gray-900">
                  ${plan.monthly_price?.toLocaleString('es-CO')}
                </p>
                <p className="text-sm text-gray-600">COP/mes</p>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>👥 {plan.max_users} usuarios</p>
                <p>👨‍👩‍👧‍👦 {plan.max_clients} clientes</p>
                <p>📄 {plan.max_invoices_per_month} facturas/mes</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit}
                  onClick={() => handleEdit(plan)}
                  className="flex-1"
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Power}
                  onClick={() => handleToggleActive(plan.id)}
                  className="flex-1"
                >
                  {plan.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Slug</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Descripción</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Precio Mensual (COP)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.monthly_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthly_price: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Precio Anual (COP)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.yearly_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yearly_price: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Max Usuarios</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.max_users}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_users: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Max Clientes</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.max_clients}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_clients: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Max Facturas/Mes</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.max_invoices_per_month}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_invoices_per_month: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Plan activo
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPlan(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    {editingPlan ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansManagement;
