import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import Loading from '@components/common/Loading';
import { formatDate } from '@utils/formatters';

const SubscriptionManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customDate, setCustomDate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Obtener tenant
      const tenantRes = await api.get(`/superadmin/tenants/${id}`);
      setTenant(tenantRes.data.tenant);

      // Obtener suscripción
      const subRes = await api.get(
        `/superadmin/tenants/${id}/subscription-detail`
      );
      setSubscription(subRes.data.subscription);

      // Obtener planes
      const plansRes = await api.get('/superadmin/subscription-plans');
      setPlans(plansRes.data.plans || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    try {
      await api.put(`/superadmin/tenants/${id}/change-plan`, {
        plan_id: selectedPlan,
      });
      fetchData();
      setSelectedPlan('');
    } catch (error) {
      console.error('Error changing plan:', error);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedStatus) return;

    try {
      await api.put(`/superadmin/tenants/${id}/change-subscription-status`, {
        status: selectedStatus,
      });
      fetchData();
      setShowStatusModal(false);
      setSelectedStatus('');
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleExtendTrial = async (days) => {
    try {
      await api.post(`/superadmin/tenants/${id}/extend-trial`, { days });
      fetchData();
    } catch (error) {
      console.error('Error extending trial:', error);
    }
  };

  const handleSetTrialDate = async () => {
    if (!customDate) return;

    try {
      await api.put(`/superadmin/tenants/${id}/set-trial-date`, {
        trial_ends_at: customDate,
      });
      fetchData();
      setCustomDate('');
    } catch (error) {
      console.error('Error setting trial date:', error);
    }
  };

  if (loading) {
    return <Loading text="Cargando información..." />;
  }

  if (!tenant || !subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se encontró la información</p>
      </div>
    );
  }

  const daysRemaining = subscription.trial_ends_at
    ? Math.ceil(
        (new Date(subscription.trial_ends_at) - new Date()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const statusColors = {
    trial: 'orange',
    active: 'green',
    past_due: 'red',
    suspended: 'red',
    cancelled: 'gray',
  };

  const statusIcons = {
    trial: Clock,
    active: CheckCircle,
    past_due: AlertCircle,
    suspended: AlertCircle,
    cancelled: XCircle,
  };

  const StatusIcon = statusIcons[subscription.status];

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Suscripción
            </h1>
            <p className="text-gray-600 mt-1">{tenant.company_name}</p>
          </div>
          <Badge color={statusColors[subscription.status]} size="lg">
            <StatusIcon className="w-4 h-4 mr-2" />
            {subscription.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado Actual */}
          <Card title="Estado Actual">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Plan Actual</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription.plan?.name || 'N/A'}
                  </p>
                </div>
                <Badge color="blue" size="lg">
                  {subscription.plan?.slug || 'N/A'}
                </Badge>
              </div>

              {subscription.status === 'trial' && daysRemaining !== null && (
                <div
                  className={`p-4 rounded-lg border-2 ${
                    daysRemaining <= 3
                      ? 'bg-red-50 border-red-200'
                      : daysRemaining <= 7
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                        daysRemaining <= 3
                          ? 'text-red-600'
                          : daysRemaining <= 7
                            ? 'text-orange-600'
                            : 'text-blue-600'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        Período de Prueba
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Vence: {formatDate(subscription.trial_ends_at)}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {daysRemaining > 0
                          ? `${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'} restantes`
                          : 'Trial vencido'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Cambiar Plan */}
          <Card title="Cambiar Plan">
            <div className="space-y-4">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="input w-full"
              >
                <option value="">Seleccionar plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.monthly_price?.toLocaleString('es-CO')}{' '}
                    COP/mes
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleChangePlan}
                disabled={!selectedPlan}
                className="w-full"
              >
                Cambiar Plan
              </Button>
            </div>
          </Card>

          {/* Gestión de Trial */}
          {subscription.status === 'trial' && (
            <Card title="Gestión de Trial">
              <div className="space-y-6">
                <div>
                  <label className="label">Extender Trial</label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleExtendTrial(7)}
                      className="w-full"
                    >
                      +7 días
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExtendTrial(15)}
                      className="w-full"
                    >
                      +15 días
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleExtendTrial(30)}
                      className="w-full"
                    >
                      +30 días
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="label">Fecha Personalizada</label>
                  <div className="flex gap-3">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="input flex-1"
                    />
                    <Button
                      variant="primary"
                      onClick={handleSetTrialDate}
                      disabled={!customDate}
                    >
                      Actualizar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Cambiar Estado */}
          <Card title="Cambiar Estado">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={
                  subscription.status === 'active' ? 'success' : 'outline'
                }
                icon={CheckCircle}
                onClick={() => {
                  setSelectedStatus('active');
                  setShowStatusModal(true);
                }}
                disabled={subscription.status === 'active'}
                className="w-full"
              >
                Activar
              </Button>
              <Button
                variant={
                  subscription.status === 'suspended' ? 'danger' : 'outline'
                }
                icon={AlertCircle}
                onClick={() => {
                  setSelectedStatus('suspended');
                  setShowStatusModal(true);
                }}
                disabled={subscription.status === 'suspended'}
                className="w-full"
              >
                Suspender
              </Button>
              <Button
                variant={
                  subscription.status === 'trial' ? 'warning' : 'outline'
                }
                icon={Clock}
                onClick={() => {
                  setSelectedStatus('trial');
                  setShowStatusModal(true);
                }}
                disabled={subscription.status === 'trial'}
                className="w-full"
              >
                Trial
              </Button>
              <Button
                variant={
                  subscription.status === 'cancelled' ? 'secondary' : 'outline'
                }
                icon={XCircle}
                onClick={() => {
                  setSelectedStatus('cancelled');
                  setShowStatusModal(true);
                }}
                disabled={subscription.status === 'cancelled'}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </div>

        {/* Info Adicional */}
        <div className="space-y-6">
          <Card title="Detalles">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Ciclo de Facturación</p>
                <p className="font-medium text-gray-900">
                  {subscription.billing_cycle === 'monthly'
                    ? 'Mensual'
                    : 'Anual'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto</p>
                <p className="font-medium text-gray-900">
                  ${subscription.amount?.toLocaleString('es-CO')} COP
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Próxima Renovación</p>
                <p className="font-medium text-gray-900">
                  {subscription.next_billing_date
                    ? formatDate(subscription.next_billing_date)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Auto-renovación</p>
                <Badge color={subscription.auto_renew ? 'green' : 'gray'}>
                  {subscription.auto_renew ? 'Activa' : 'Desactivada'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Confirmar Cambio */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Cambio de Estado
            </h3>
            <p className="text-gray-600 mb-4">
              ¿Cambiar el estado a <strong>{selectedStatus}</strong>?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedStatus('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleChangeStatus}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
