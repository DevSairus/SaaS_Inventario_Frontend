import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Layout from '../../components/layout/Layout';
import useAuthStore from '../../store/authStore';
import useDashboardStore from '../../store/dashboardStore';
import axios from '../../api/axios';

/* ── Formateadores ──────────────────────────────────────── */
const fmtFull = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

const fmtCompact = (v) => {
  const n = Math.abs(parseFloat(v) || 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}K`;
  return fmtFull(v);
};

const fmtNum = (v) => new Intl.NumberFormat('es-CO').format(v || 0);

/* ── KPI Card ────────────────────────────────────────────── */
function KpiCard({ icon, from, to, labelCls, label, value, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${from} ${to} rounded-xl p-4 sm:p-5 text-white shadow-md flex flex-col gap-2 min-w-0 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`${labelCls} text-xs font-medium truncate`}>{label}</p>
        <p className="font-bold mt-0.5 text-xl sm:text-2xl leading-tight truncate">{value}</p>
      </div>
      <p className={`${labelCls} text-xs truncate`}>{sub}</p>
    </div>
  );
}

const OT_STATUS = {
  recibido:   { label: 'Recibido',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  en_proceso: { label: 'En Proceso', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  en_espera:  { label: 'En Espera',  bg: 'bg-orange-100', text: 'text-orange-700' },
  listo:      { label: 'Listo',      bg: 'bg-green-100',  text: 'text-green-700' },
};

/* ── Página ──────────────────────────────────────────────── */
function DashboardPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [now, setNow] = useState(new Date());

  const { loading, period, kpis, charts, alerts, setPeriod, fetchAll } = useDashboardStore();

  const [workshopStats, setWorkshopStats] = useState(null);
  const [workshopLoading, setWorkshopLoading] = useState(false);
  const [receivableStats, setReceivableStats] = useState(null);

  useEffect(() => {
    fetchAll(period);
    loadWorkshopStats();
    loadReceivableStats();
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadWorkshopStats = async () => {
    setWorkshopLoading(true);
    try {
      const res = await axios.get('/workshop/work-orders?limit=200');
      const orders = res.data.data || [];
      const active = orders.filter(o => !['entregado', 'cancelado'].includes(o.status));
      const byStatus = {};
      active.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
      const pendingBilling = orders.filter(o => o.status === 'listo' && !o.sale_id);
      const now = new Date();
      const deliveredThisMonth = orders.filter(o => {
        if (o.status !== 'entregado') return false;
        const d = new Date(o.delivered_at || o.updated_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      setWorkshopStats({
        active: active.length,
        byStatus,
        pendingBilling: pendingBilling.length,
        pendingBillingAmount: pendingBilling.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0),
        deliveredThisMonth: deliveredThisMonth.length,
        recentOrders: orders.slice(0, 5),
      });
    } catch {
      setWorkshopStats(null);
    } finally {
      setWorkshopLoading(false);
    }
  };

  const loadReceivableStats = async () => {
    try {
      const res = await axios.get('/accounts-receivable/summary');
      setReceivableStats(res.data.data || res.data || null);
    } catch {
      setReceivableStats(null);
    }
  };

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

  const chartData = salesByDay.map(d => ({
    ...d,
    revenue: parseFloat(d.revenue) || 0,
    profit:  parseFloat(d.profit)  || 0,
    count:   parseInt(d.count)     || 0,
  }));

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
              {now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}
              {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 self-start sm:self-auto">
            {[7, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
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
              <div key={i} className={`p-3 rounded-lg border-l-4 flex items-start gap-3 ${
                alert.type === 'error' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
              }`}>
                <span className="text-lg flex-shrink-0">{alert.type === 'error' ? '🚨' : '⚠️'}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 break-words">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon="💰" from="from-blue-500" to="to-blue-600" labelCls="text-blue-100"
            label={`Ventas (${period}d)`} value={fmtCompact(salesKPI.revenue)}
            sub={`${fmtNum(salesKPI.count)} transacciones`}
            onClick={() => navigate('/sales')}
          />
          <KpiCard
            icon="📈" from="from-green-500" to="to-green-600" labelCls="text-green-100"
            label="Ganancia" value={fmtCompact(salesKPI.profit)}
            sub={`Margen: ${salesKPI.margin ?? 0}%`}
          />
          <KpiCard
            icon="🎯" from="from-purple-500" to="to-purple-600" labelCls="text-purple-100"
            label="Ventas de hoy" value={fmtCompact(todayKPI.revenue)}
            sub={`${fmtNum(todayKPI.count)} ventas`}
            onClick={() => navigate('/sales')}
          />
          <KpiCard
            icon="📦" from="from-orange-500" to="to-orange-600" labelCls="text-orange-100"
            label="Valor inventario" value={fmtCompact(inventoryKPI.total_value)}
            sub={`${fmtNum(inventoryKPI.total_products)} productos`}
            onClick={() => navigate('/products')}
          />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">📊 Ingresos vs Ganancia</h3>
              <span className="text-xs text-gray-400">Últimos {period}d</span>
            </div>
            {chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)}/>
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={44}/>
                  <Tooltip
                    formatter={(v, name) => [fmtFull(v), name]}
                    labelFormatter={l => `Fecha: ${l}`}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}/>
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gRev)" name="Ingresos"/>
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#gProfit)" name="Ganancia"/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">🏆 Top 5 Productos</h3>
              <button onClick={() => navigate('/reports')} className="text-xs text-indigo-600 hover:underline">Reportes →</button>
            </div>
            {topProducts.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin ventas</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" tick={{ fontSize: 10 }}/>
                  <YAxis type="category" dataKey="product.name" tick={{ fontSize: 10 }} width={85}
                    tickFormatter={v => v?.length > 12 ? v.slice(0, 12) + '…' : v}/>
                  <Tooltip formatter={v => [fmtNum(v), 'Cantidad']} labelFormatter={l => `Producto: ${l}`}/>
                  <Bar dataKey="quantity" fill="#6366f1" radius={[0, 4, 4, 0]} name="Cantidad"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Taller ── */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">🔧 Taller — Estado actual</h3>
            <button onClick={() => navigate('/workshop/work-orders')} className="text-xs text-indigo-600 hover:underline">
              Ver todas →
            </button>
          </div>

          {workshopLoading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"/>
            </div>
          ) : workshopStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  onClick={() => navigate('/workshop/work-orders')}
                  className="bg-blue-50 border border-blue-100 rounded-xl p-3 cursor-pointer hover:shadow-sm transition"
                >
                  <p className="text-2xl font-bold text-blue-700">{workshopStats.active}</p>
                  <p className="text-xs text-blue-500 mt-0.5">OT activas</p>
                </div>
                <div
                  onClick={() => navigate('/workshop/work-orders?status=listo')}
                  className={`rounded-xl p-3 border cursor-pointer hover:shadow-sm transition ${
                    workshopStats.pendingBilling > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <p className={`text-2xl font-bold ${workshopStats.pendingBilling > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                    {workshopStats.pendingBilling}
                  </p>
                  <p className={`text-xs mt-0.5 ${workshopStats.pendingBilling > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                    Listas sin facturar
                  </p>
                  {workshopStats.pendingBilling > 0 && (
                    <p className="text-xs font-semibold text-amber-600 mt-0.5">{fmtCompact(workshopStats.pendingBillingAmount)}</p>
                  )}
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-700">{workshopStats.deliveredThisMonth}</p>
                  <p className="text-xs text-green-500 mt-0.5">Entregadas este mes</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">Por estado</p>
                  <div className="space-y-1">
                    {Object.entries(OT_STATUS).map(([key, cfg]) => {
                      const count = workshopStats.byStatus[key] || 0;
                      if (!count) return null;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-xs font-bold text-gray-700">{count}</span>
                        </div>
                      );
                    })}
                    {workshopStats.active === 0 && <p className="text-xs text-gray-400">Sin OT activas</p>}
                  </div>
                </div>
              </div>

              {workshopStats.recentOrders?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Últimas órdenes</p>
                  <div className="divide-y divide-gray-50">
                    {workshopStats.recentOrders.slice(0, 4).map(order => {
                      const sc = OT_STATUS[order.status];
                      return (
                        <div
                          key={order.id}
                          onClick={() => navigate(`/workshop/work-orders/${order.id}`)}
                          className="flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                              {order.vehicle?.plate || '—'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{order.order_number}</p>
                              <p className="text-xs text-gray-400 truncate">
                                {order.customer ? (order.customer.business_name || `${order.customer.first_name} ${order.customer.last_name}`) : 'Sin cliente'}
                                {order.technician && ` · ${order.technician.first_name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {sc && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>}
                            <span className="text-xs font-semibold text-gray-700">{fmtCompact(order.total_amount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Sin datos del taller</p>
              <button onClick={() => navigate('/workshop/work-orders/new')} className="mt-2 text-xs text-blue-600 hover:underline">
                Crear primera OT →
              </button>
            </div>
          )}
        </div>

        {/* ── Cartera ── */}
        {receivableStats && (
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">💳 Cartera por cobrar</h3>
              <button onClick={() => navigate('/accounts-receivable')} className="text-xs text-indigo-600 hover:underline">
                Ver cartera →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total pendiente', value: fmtCompact(receivableStats.total_pending || receivableStats.totalPending || 0), color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                { label: 'Facturas abiertas', value: fmtNum(receivableStats.pending_count || receivableStats.pendingCount || 0), color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                { label: 'Pagado este mes', value: fmtCompact(receivableStats.paid_this_month || receivableStats.paidThisMonth || 0), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                { label: 'Vencido', value: fmtCompact(receivableStats.overdue || receivableStats.totalOverdue || 0), color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl p-3 border ${bg}`}>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">⚡ Accesos Rápidos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: '🛒', label: 'Nueva Venta',   path: '/sales/new',               bg: 'bg-blue-50   hover:bg-blue-100',   text: 'text-blue-900'   },
              { icon: '🔧', label: 'Nueva OT',       path: '/workshop/work-orders/new', bg: 'bg-sky-50    hover:bg-sky-100',    text: 'text-sky-900'    },
              { icon: '📦', label: 'Productos',      path: '/products',                bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-900' },
              { icon: '📊', label: 'Reportes',       path: '/reports',                 bg: 'bg-green-50  hover:bg-green-100',  text: 'text-green-900'  },
              { icon: '🚚', label: 'Nueva Compra',   path: '/purchases/new',           bg: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-900' },
              { icon: '🚗', label: 'Vehículos',      path: '/workshop/vehicles',       bg: 'bg-teal-50   hover:bg-teal-100',   text: 'text-teal-900'   },
            ].map(({ icon, label, path, bg, text }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`p-3 sm:p-4 ${bg} border border-gray-100 rounded-xl hover:shadow-md transition-all text-center group`}
              >
                <div className="text-2xl sm:text-3xl mb-1.5 group-hover:scale-110 transition-transform">{icon}</div>
                <div className={`text-xs sm:text-sm font-semibold ${text}`}>{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Stock bajo */}
        {inventoryKPI.low_stock_count > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">⚠️ Productos con Stock Bajo</h3>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                {inventoryKPI.low_stock_count} productos
              </span>
            </div>
            <button onClick={() => navigate('/products?filter=low_stock')} className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              Ver productos →
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default DashboardPage;