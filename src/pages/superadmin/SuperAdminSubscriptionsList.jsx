import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCw } from 'lucide-react';
import api from '@api/axios';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Badge from '@components/common/Badge';
import Loading from '@components/common/Loading';

const SuperAdminSubscriptionsList = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/superadmin/all-subscriptions');
      setSubscriptions(data.subscriptions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err.response?.data?.error || 'Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      trial: 'orange',
      active: 'green',
      past_due: 'red',
      suspended: 'red',
      cancelled: 'gray',
      expired: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      trial: 'Prueba',
      active: 'Activa',
      past_due: 'Vencida',
      suspended: 'Suspendida',
      cancelled: 'Cancelada',
      expired: 'Expirada',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <Loading text="Cargando suscripciones..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Suscripciones Activas
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona las suscripciones de todos los tenants
          </p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={fetchSubscriptions}>
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-3xl font-bold text-gray-900">
              {subscriptions.length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Activas</p>
            <p className="text-3xl font-bold text-green-600">
              {subscriptions.filter((s) => s.status === 'active').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">En Trial</p>
            <p className="text-3xl font-bold text-orange-600">
              {subscriptions.filter((s) => s.status === 'trial').length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Vencidas</p>
            <p className="text-3xl font-bold text-red-600">
              {subscriptions.filter((s) => s.status === 'past_due').length}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Tenant
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Ciclo
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Próxima Renovación
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay suscripciones registradas
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {sub.tenant?.company_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sub.tenant?.email || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {sub.plan?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={getStatusColor(sub.status)}>
                        {getStatusLabel(sub.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sub.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      ${sub.amount?.toLocaleString('es-CO')} COP
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sub.next_billing_date
                        ? new Date(sub.next_billing_date).toLocaleDateString(
                            'es-ES'
                          )
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() =>
                          navigate(
                            `/superadmin/tenants/${sub.tenant_id}/subscription`
                          )
                        }
                      >
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SuperAdminSubscriptionsList;
