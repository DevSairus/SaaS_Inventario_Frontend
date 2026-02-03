import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
} from 'lucide-react';
import useSuperAdminStore from '../../store/superAdminStore';
import Card from '../../components/common/Card';
import Loading from '../../components/common/Loading';
import { formatCurrency } from '../../utils/formatters';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 6))
      .toISOString()
      .split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const {
    dashboard,
    analyticsOverview,
    tenantsAnalytics,
    isLoading,
    fetchDashboard,
    fetchAnalyticsOverview,
    fetchTenantsAnalytics,
  } = useSuperAdminStore();

  useEffect(() => {
    fetchDashboard();
    fetchTenantsAnalytics();
  }, []);

  useEffect(() => {
    fetchAnalyticsOverview(dateRange);
  }, [dateRange]);

  if (isLoading) {
    return <Loading text="Cargando analytics..." />;
  }

  const dashboardOverview = dashboard?.data?.overview || {};
  const overview = analyticsOverview?.data || {};
  const tenants = tenantsAnalytics?.data || {};

  // Preparar datos para gráficos
  const tenantsByMonth = (overview.tenantsByMonth || []).map((item) => ({
    month: new Date(item.month).toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric',
    }),
    count: parseInt(item.count),
  }));

  const revenueByMonth = (overview.revenueByMonth || []).map((item) => ({
    month: new Date(item.month).toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric',
    }),
    revenue: parseFloat(item.total),
  }));

  const planDistribution = (tenants.planDistribution || []).map((item) => ({
    name: item.plan.toUpperCase(),
    value: parseInt(item.count),
  }));

  const topTenants = tenants.topTenants || [];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">
            Métricas y análisis del rendimiento del SaaS
          </p>
        </div>

        {/* Filtro de Fechas */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-gray-600">Desde</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              className="input text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Hasta</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end_date: e.target.value }))
              }
              max={new Date().toISOString().split('T')[0]}
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                MRR (Ingresos Mensuales)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardOverview.mrr || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ARR: {formatCurrency(dashboardOverview.arr || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Empresas</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardOverview.totalTenants || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                +{dashboardOverview.newTenantsThisMonth || 0} este mes
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Crecimiento</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardOverview.growth || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">vs mes anterior</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Churn Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardOverview.churnRate || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">cancelaciones</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nuevas Empresas por Mes */}
        <Card title="Nuevas Empresas por Mes">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tenantsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Empresas"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Ingresos por Mes */}
        <Card title="Ingresos por Mes">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribución de Planes */}
        <Card title="Distribución de Planes">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {planDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Tasa de Conversión */}
        <Card title="Métricas de Conversión">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Tasa de Conversión</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tenants.conversionRate || 0}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Trial → Active</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-600">Trial</p>
                <p className="text-xl font-bold text-orange-600">
                  {dashboardOverview.trialTenants || 0}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">Activos</p>
                <p className="text-xl font-bold text-green-600">
                  {dashboardOverview.activeTenants || 0}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-600">Suspendidos</p>
                <p className="text-xl font-bold text-red-600">
                  {dashboardOverview.suspendedTenants || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Tenants */}
      <Card title="Top 10 Empresas por Facturación">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ingresos Totales
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topTenants.map((tenant, index) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {tenant.company_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {tenant.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(tenant.total_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;