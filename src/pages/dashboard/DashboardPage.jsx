import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../../components/layout/Layout';
import useAuthStore from '../../store/authStore';
import useDashboardStore from '../../store/dashboardStore';

/* ── Formateadores ──────────────────────────────────────── */
const fmtFull = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

// Versión compacta para que no desborde los cards
const fmtCompact = (v) => {
  const n = Math.abs(parseFloat(v) || 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return fmtFull(v);
};

const fmtNum = (v) => new Intl.NumberFormat('es-CO').format(v || 0);

/* ── KPI Card ───────────────────────────────────────────── */
function KpiCard({ icon, from, to, labelCls, label, value, sub }) {
  return (
    <div className={`bg-gradient-to-br ${from} ${to} rounded-xl p-4 sm:p-5 text-white shadow-md flex flex-col gap-2 min-w-0`}>
      <div className={`w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`${labelCls} text-xs font-medium truncate`}>{label}</p>
        {/* text-xl en móvil (2 cols) → text-2xl en desktop (4 cols) */}
        <p className="font-bold mt-0.5 text-xl sm:text-2xl leading-tight truncate">
          {value}
        </p>
      </div>
      <p className={`${labelCls} text-xs truncate`}>{sub}</p>
    </div>
  );
}

/* ── Página ─────────────────────────────────────────────── */
function DashboardPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [now, setNow] = useState(new Date());

  const { loading, period, kpis, charts, alerts, setPeriod, fetchAll } =
    useDashboardStore();

  useEffect(() => {
    fetchAll(period);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const changePeriod = (p) => { setPeriod(p); fetchAll(p); };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  const salesKPI     = kpis?.sales     || {};
  const todayKPI     = kpis?.today     || {};
  const inventoryKPI = kpis?.inventory || {};
  const salesByDay   = charts?.salesByDay  || [];
  const topProducts  = charts?.topProducts || [];

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              ¡Bienvenido, {user?.first_name || user?.name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {now.toLocaleDateString('es-CO', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
              {' · '}
              {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Selector período */}
          <div className="flex gap-1.5 flex-shrink-0 self-start sm:self-auto">
            {[7, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* Alertas */}
        {alerts?.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border-l-4 flex items-start gap-3 ${
                  alert.type === 'error'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <span className="text-lg flex-shrink-0">
                  {alert.type === 'error' ? '🚨' : '⚠️'}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 break-words">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards — 2 cols en móvil, 4 en desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon="💰" from="from-blue-500" to="to-blue-600" labelCls="text-blue-100"
            label={`Ventas (${period}d)`}
            value={fmtCompact(salesKPI.revenue)}
            sub={`${fmtNum(salesKPI.count)} transacciones`}
          />
          <KpiCard
            icon="📈" from="from-green-500" to="to-green-600" labelCls="text-green-100"
            label="Ganancia"
            value={fmtCompact(salesKPI.profit)}
            sub={`Margen: ${salesKPI.margin ?? 0}%`}
          />
          <KpiCard
            icon="🎯" from="from-purple-500" to="to-purple-600" labelCls="text-purple-100"
            label="Ventas de hoy"
            value={fmtCompact(todayKPI.revenue)}
            sub={`${fmtNum(todayKPI.count)} ventas`}
          />
          <KpiCard
            icon="📦" from="from-orange-500" to="to-orange-600" labelCls="text-orange-100"
            label="Valor inventario"
            value={fmtCompact(inventoryKPI.total_value)}
            sub={`${fmtNum(inventoryKPI.total_products)} productos`}
          />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Ventas por día */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">
              📊 Ventas por Día
            </h3>
            {salesByDay.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Sin datos en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => d?.slice(5)}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    width={44}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    width={28}
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === 'Ingresos' ? [fmtFull(v), name] : [fmtNum(v), name]
                    }
                    labelFormatter={(l) => `Fecha: ${l}`}
                  />
                  <Line yAxisId="left"  type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} name="Ingresos" />
                  <Line yAxisId="right" type="monotone" dataKey="count"   stroke="#8b5cf6" strokeWidth={2} dot={false} name="Cantidad" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top productos */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">
              🏆 Top 5 Productos
            </h3>
            {topProducts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Sin ventas en este período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="product.name"
                    tick={{ fontSize: 10 }}
                    width={85}
                    tickFormatter={(v) => (v?.length > 12 ? v.slice(0, 12) + '…' : v)}
                  />
                  <Tooltip
                    formatter={(v) => [fmtNum(v), 'Cantidad']}
                    labelFormatter={(l) => `Producto: ${l}`}
                  />
                  <Bar dataKey="quantity" fill="#6366f1" radius={[0, 4, 4, 0]} name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">⚡ Accesos Rápidos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🛒', label: 'Nueva Venta',  path: '/sales/new',     clr: 'blue'   },
              { icon: '📦', label: 'Productos',     path: '/products',      clr: 'purple' },
              { icon: '📊', label: 'Reportes',      path: '/reports',       clr: 'green'  },
              { icon: '🚚', label: 'Nueva Compra',  path: '/purchases/new', clr: 'orange' },
            ].map(({ icon, label, path, clr }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`p-3 sm:p-4 bg-gradient-to-br from-${clr}-50 to-${clr}-100 rounded-xl hover:shadow-md transition-all text-center group`}
              >
                <div className="text-2xl sm:text-3xl mb-1.5 group-hover:scale-110 transition-transform">
                  {icon}
                </div>
                <div className={`text-xs sm:text-sm font-semibold text-${clr}-900`}>
                  {label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stock bajo */}
        {inventoryKPI.low_stock_count > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                ⚠️ Productos con Stock Bajo
              </h3>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                {inventoryKPI.low_stock_count} productos
              </span>
            </div>
            <button
              onClick={() => navigate('/products?filter=low_stock')}
              className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
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