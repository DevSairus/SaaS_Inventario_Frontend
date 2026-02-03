import React, { useEffect } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react';
import useSuperAdminStore from '../../store/superAdminStore';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { dashboard, expiringTrials, isLoading, fetchDashboard, fetchExpiringTrials } = useSuperAdminStore();

  useEffect(() => {
    fetchDashboard();
    fetchExpiringTrials(7);
  }, []);

  if (isLoading) {
    return <Loading text="Cargando dashboard..." />;
  }

  const { overview, revenue, tenantsByPlan, recentTenants, trialEndingSoon } =
    dashboard?.data || {};

  const stats = [
    {
      name: 'Total Empresas',
      value: overview?.totalTenants || 0,
      icon: Building2,
      color: 'bg-blue-500',
      change: `+${overview?.newTenantsThisMonth || 0} este mes`,
      trend:
        overview?.growth > 0 ? `+${overview?.growth}%` : `${overview?.growth}%`,
      trendUp: overview?.growth >= 0,
    },
    {
      name: 'Empresas Activas',
      value: overview?.activeTenants || 0,
      icon: Activity,
      color: 'bg-green-500',
      change: `${overview?.trialTenants || 0} en trial`,
    },
    {
      name: 'MRR',
      value: formatCurrency(overview?.mrr || 0),
      icon: DollarSign,
      color: 'bg-purple-500',
      change: `ARR: ${formatCurrency(overview?.arr || 0)}`,
    },
    {
      name: 'Usuarios Totales',
      value: overview?.totalUsers || 0,
      icon: Users,
      color: 'bg-orange-500',
      change: 'En todas las empresas',
    },
  ];

  const planColors = {
    free: 'bg-gray-100 text-gray-800',
    basic: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-green-100 text-green-800',
  };

  const statusColors = {
    trial: 'bg-orange-100 text-orange-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard SaaS</h1>
        <p className="text-gray-600">Gestión de la plataforma multi-tenant</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                  {stat.trend && (
                    <p
                      className={`text-xs font-medium mt-1 ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {stat.trend} vs mes anterior
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alertas */}
      {trialEndingSoon && trialEndingSoon.length > 0 && (
        <Card title="⚠️ Trials Próximos a Vencer (7 días)">
          {expiringTrials?.data?.tenants?.length > 0 ? (
            <div className="space-y-3">
              {expiringTrials.data.tenants.map((tenant) => {
                const daysRemaining = Math.ceil(
                  (new Date(tenant.trial_ends_at) - new Date()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <Link
                    key={tenant.id}
                    to={`/superadmin/tenants/${tenant.id}/subscription`}
                    className="block p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {tenant.company_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Vence: {formatDate(tenant.trial_ends_at)}
                        </p>
                      </div>
                      <Badge color={daysRemaining <= 3 ? 'red' : 'orange'}>
                        {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No hay trials próximos a vencer
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Plan */}
        <Card title="Distribución por Plan">
          <div className="space-y-4">
            {tenantsByPlan?.map((plan) => {
              const percentage =
                overview?.totalTenants > 0
                  ? ((plan.count / overview.totalTenants) * 100).toFixed(0)
                  : 0;

              return (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        color={planColors[plan.plan]
                          ?.split(' ')[0]
                          ?.replace('bg-', '')
                          .replace('-100', '')}
                      >
                        {plan.plan.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {percentage}%
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {plan.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${planColors[plan.plan]?.split(' ')[0]?.replace('text', 'bg')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {revenue?.byPlan && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Ingresos por Plan
              </h4>
              <div className="space-y-2">
                {Object.entries(revenue.byPlan).map(([plan, data]) => (
                  <div key={plan} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{plan}:</span>
                    <span className="font-medium">
                      {formatCurrency(data.revenue)}/mes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Últimas Empresas */}
        <Card title="Últimas Empresas Registradas">
          <div className="space-y-3">
            {recentTenants?.map((tenant) => (
              <Link
                key={tenant.id}
                to={`/superadmin/tenants/${tenant.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tenant.company_name}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge
                        color={planColors[tenant.plan]
                          ?.split(' ')[0]
                          ?.replace('bg-', '')
                          .replace('-100', '')}
                        size="sm"
                      >
                        {tenant.plan}
                      </Badge>
                      <Badge
                        color={statusColors[tenant.subscription_status]
                          ?.split(' ')[0]
                          ?.replace('bg-', '')
                          .replace('-100', '')}
                        size="sm"
                      >
                        {tenant.subscription_status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
          <Link
            to="/superadmin/tenants"
            className="block mt-4 text-center text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver todas las empresas →
          </Link>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Acciones Rápidas">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/superadmin/tenants/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
          >
            <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium text-gray-900">Nueva Empresa</p>
            <p className="text-sm text-gray-500">Registrar nuevo cliente</p>
          </Link>

          <Link
            to="/superadmin/tenants"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
          >
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium text-gray-900">Ver Empresas</p>
            <p className="text-sm text-gray-500">Gestionar clientes</p>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;