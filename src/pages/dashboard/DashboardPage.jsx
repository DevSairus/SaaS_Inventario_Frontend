// frontend/src/pages/dashboard/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import Layout from '../../components/layout/Layout';
import useAuthStore from '../../store/authStore';
import useDashboardStore from '../../store/dashboardStore';

function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { 
    loading, 
    period, 
    kpis, 
    charts, 
    alerts, 
    setPeriod, 
    fetchAll 
  } = useDashboardStore();

  useEffect(() => {
    fetchAll(period);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('es-CO').format(value || 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  // Datos desde el store
  const salesKPI = kpis?.sales || {};
  const todayKPI = kpis?.today || {};
  const inventoryKPI = kpis?.inventory || {};
  const salesByDay = charts?.salesByDay || [];
  const topProducts = charts?.topProducts || [];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ¡Bienvenido, {user?.name}! 👋
            </h1>
            <p className="text-gray-600 mt-1">
              {currentTime.toLocaleDateString('es-CO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} - {currentTime.toLocaleTimeString('es-CO')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePeriodChange(7)}
              className={`px-4 py-2 rounded-lg ${
                period === 7
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => handlePeriodChange(30)}
              className={`px-4 py-2 rounded-lg ${
                period === 30
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => handlePeriodChange(90)}
              className={`px-4 py-2 rounded-lg ${
                period === 90
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              90 días
            </button>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'error'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {alert.type === 'error' ? '🚨' : '⚠️'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ventas del Período */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <h3 className="text-blue-100 text-sm font-medium">Ventas ({period} días)</h3>
            <p className="text-3xl font-bold mt-2">{formatCurrency(salesKPI.revenue)}</p>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-100">{salesKPI.count || 0} transacciones</span>
            </div>
          </div>

          {/* Ganancia */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <h3 className="text-green-100 text-sm font-medium">Ganancia</h3>
            <p className="text-3xl font-bold mt-2">{formatCurrency(salesKPI.profit)}</p>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-100">Margen: {salesKPI.margin}%</span>
            </div>
          </div>

          {/* Ventas de Hoy */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <h3 className="text-purple-100 text-sm font-medium">Ventas de Hoy</h3>
            <p className="text-3xl font-bold mt-2">{formatCurrency(todayKPI.revenue)}</p>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-100">{todayKPI.count || 0} ventas</span>
            </div>
          </div>

          {/* Inventario */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
            </div>
            <h3 className="text-orange-100 text-sm font-medium">Valor Inventario</h3>
            <p className="text-3xl font-bold mt-2">{formatCurrency(inventoryKPI.total_value)}</p>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-100">{inventoryKPI.total_products || 0} productos</span>
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventas por Día */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📊 Ventas por Día
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Ingresos"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Cantidad"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Productos */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🏆 Top 5 Productos Vendidos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product.name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatNumber(value)}
                  labelFormatter={(label) => `Producto: ${label}`}
                />
                <Bar dataKey="quantity" fill="#6366f1" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accesos Rápidos */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Accesos Rápidos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/sales/new')}
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">🛒</div>
              <div className="text-sm font-semibold text-blue-900">Nueva Venta</div>
            </button>
            <button
              onClick={() => navigate('/products')}
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">📦</div>
              <div className="text-sm font-semibold text-purple-900">Productos</div>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm font-semibold text-green-900">Reportes</div>
            </button>
            <button
              onClick={() => navigate('/purchases/new')}
              className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">🚚</div>
              <div className="text-sm font-semibold text-orange-900">Nueva Compra</div>
            </button>
          </div>
        </div>

        {/* Stock Bajo */}
        {inventoryKPI.low_stock_count > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ⚠️ Productos con Stock Bajo
              </h3>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                {inventoryKPI.low_stock_count} productos
              </span>
            </div>
            <button
              onClick={() => navigate('/products?filter=low_stock')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Ver productos →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default DashboardPage;