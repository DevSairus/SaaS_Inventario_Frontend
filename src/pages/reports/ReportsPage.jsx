import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../../components/layout/Layout';
import { reportsAPI } from '../../api/reports';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#818cf8', '#7c3aed', '#5b21b6'];

const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);
const formatNum = (val) => new Intl.NumberFormat('es-CO').format(val || 0);

const MONTH_NAMES = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };

const ReportsPage = () => {
  const [tab, setTab] = useState('movements');
  const [loading, setLoading] = useState(true);
  const [movementsData, setMovementsData] = useState([]);
  const [valuationData, setValuationData] = useState({ by_category: [], totals: {} });
  const [profitData, setProfitData] = useState({ products: [], totals: {} });
  const [rotationData, setRotationData] = useState({ high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
  const [periodMonths, setPeriodMonths] = useState(6);

  const fetchAll = async () => {
    setLoading(true);
    try {
        const [mov, val, prof, rot] = await Promise.all([
        reportsAPI.getMovementsByMonth(periodMonths),
        reportsAPI.getValuation(),
        reportsAPI.getProfitReport(periodMonths),
        reportsAPI.getRotationReport(periodMonths)
        ]);
        
        // Movimientos
        setMovementsData(mov.data || []);
        
        // Valorización con valores por defecto completos
        setValuationData(val.data || { 
        by_category: [], 
        totals: { 
            product_count: 0, 
            total_stock: 0, 
            total_value: 0 
        } 
        });
        
        // Ganancia con valores por defecto completos
        setProfitData(prof.data || { 
        products: [], 
        totals: { 
            total_revenue: 0, 
            total_cost: 0, 
            total_profit: 0, 
            margin_percentage: 0 
        } 
        });
        
        // Rotación con valores por defecto completos
        setRotationData(rot.data || { 
        high_rotation: [], 
        low_rotation: [], 
        total_products: 0, 
        products_with_sales: 0, 
        products_without_sales: 0 
        });
    } catch (e) {
        console.error('Error cargando reportes:', e);
        // Establecer valores por defecto en caso de error
        setMovementsData([]);
        setValuationData({ 
        by_category: [], 
        totals: { product_count: 0, total_stock: 0, total_value: 0 } 
        });
        setProfitData({ 
        products: [], 
        totals: { total_revenue: 0, total_cost: 0, total_profit: 0, margin_percentage: 0 } 
        });
        setRotationData({ 
        high_rotation: [], 
        low_rotation: [], 
        total_products: 0, 
        products_with_sales: 0, 
        products_without_sales: 0 
        });
    } finally {
        setLoading(false);
    }
    };

  useEffect(() => { fetchAll(); }, [periodMonths]);

  const tabs = [
    { id: 'movements', label: 'Movimientos', icon: '📊' },
    { id: 'valuation', label: 'Valorización', icon: '💎' },
    { id: 'profit', label: 'Ganancia', icon: '💰' },
    { id: 'rotation', label: 'Rotación', icon: '🔄' }
  ];

  const movChartData = movementsData.map(d => ({
    name: MONTH_NAMES[d.month?.split('-')[1]] || d.month,
    Entradas: parseFloat(d?.entradas) || 0,
    Salidas: parseFloat(d?.salidas) || 0
  }));

  const movValueData = movementsData.map(d => ({
    name: MONTH_NAMES[d.month?.split('-')[1]] || d.month,
    Entradas: Math.round(parseFloat(d?.entradas_valor) || 0),
    Salidas: Math.round(parseFloat(d?.salidas_valor) || 0)
  }));

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h1 className="text-3xl font-bold">Reportes Gerenciales</h1>
              </div>
              <p className="text-teal-100">Análisis de inventario, ventas y rentabilidad</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-teal-100 text-sm">Período:</label>
              <select
                value={periodMonths}
                onChange={(e) => setPeriodMonths(parseInt(e.target.value))}
                className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value={3} className="text-gray-800">Últimos 3 meses</option>
                <option value={6} className="text-gray-800">Últimos 6 meses</option>
                <option value={12} className="text-gray-800">Último año</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                tab === t.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-16 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
            <p className="text-gray-500 mt-3">Cargando reportes...</p>
          </div>
        ) : (

          /* ===== MOVIMIENTOS ===== */
          tab === 'movements' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Entradas', value: movementsData.reduce((s, d) => s + (parseFloat(d?.entradas) || 0), 0), color: 'border-green-500', bg: 'bg-green-50', textColor: 'text-green-700' },
                  { label: 'Total Salidas', value: movementsData.reduce((s, d) => s + (parseFloat(d?.salidas) || 0), 0), color: 'border-red-500', bg: 'bg-red-50', textColor: 'text-red-700' },
                  { label: 'Valor Entradas', value: formatCOP(movementsData.reduce((s, d) => s + (parseFloat(d?.entradas_valor) || 0), 0)), color: 'border-blue-500', bg: 'bg-blue-50', textColor: 'text-blue-700', isValue: true },
                  { label: 'Valor Salidas', value: formatCOP(movementsData.reduce((s, d) => s + (parseFloat(d?.salidas_valor) || 0), 0)), color: 'border-orange-500', bg: 'bg-orange-50', textColor: 'text-orange-700', isValue: true }
                ].map((kpi, i) => (
                  <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 ${kpi.color}`}>
                    <p className="text-xs font-medium text-gray-500 uppercase">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico cantidad */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Cantidad de movimientos por mes</h3>
                <p className="text-sm text-gray-500 mb-4">Entradas vs Salidas</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={movChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Salidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico valor */}
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Valor de movimientos por mes</h3>
                <p className="text-sm text-gray-500 mb-4">En COP</p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={movValueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCOP(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Salidas" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )

          /* ===== VALORIZACIÓN ===== */
          || tab === 'valuation' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Productos Activos', value: formatNum(valuationData.totals.product_count), sub: 'unidades', color: 'border-indigo-500', textColor: 'text-indigo-700' },
                  { label: 'Stock Total', value: formatNum(valuationData.totals.total_stock), sub: 'unidades', color: 'border-purple-500', textColor: 'text-purple-700' },
                  { label: 'Valor Total Inventario', value: formatCOP(valuationData.totals.total_value), sub: 'COP', color: 'border-teal-500', textColor: 'text-teal-700' }
                ].map((kpi, i) => (
                  <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 ${kpi.color}`}>
                    <p className="text-xs font-medium text-gray-500 uppercase">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie chart */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Distribución por categoría</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={valuationData.by_category}
                        dataKey="total_value"
                        nameKey="category_name"
                        cx="50%" cy="50%" outerRadius={100}
                        label={({ category_name, percent }) => `${category_name || 'Sin cat.'} ${(percent * 100).toFixed(0)}%`}
                      >
                        {valuationData.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCOP(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla por categoría */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-5 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Valor por categoría</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Productos</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {valuationData.by_category.map((cat, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                <span className="text-sm font-medium text-gray-800">{cat.category_name || 'Sin categoría'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-600">{cat.product_count}</td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-600">{formatNum(cat.total_stock)}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-semibold text-teal-700">{formatCOP(cat.total_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )

          /* ===== GANANCIA ===== */
          || tab === 'profit' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Ingresos Total', value: formatCOP(profitData.totals.total_revenue), color: 'border-green-500', textColor: 'text-green-700' },
                  { label: 'Costo de Ventas', value: formatCOP(profitData.totals.total_cost), color: 'border-red-500', textColor: 'text-red-700' },
                  { label: 'Ganancia Bruta', value: formatCOP(profitData.totals.total_profit), color: 'border-emerald-500', textColor: 'text-emerald-700' },
                  { label: 'Margen Promedio', value: `${(profitData.totals.margin_percentage || 0).toFixed(1)}%`, color: 'border-blue-500', textColor: 'text-blue-700' }
                ].map((kpi, i) => (
                  <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 ${kpi.color}`}>
                    <p className="text-xs font-medium text-gray-500 uppercase">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico top productos */}
              {profitData.products.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Top productos por ganancia</h3>
                  <p className="text-sm text-gray-500 mb-4">Ingresos vs Costo</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitData.products.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="product_name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCOP(v)} />
                      <Legend />
                      <Bar dataKey="total_revenue" name="Ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="total_cost" name="Costo" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabla detalle */}
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-5 border-b">
                  <h3 className="text-lg font-bold text-gray-800">Detalle por producto</h3>
                </div>
                {profitData.products.length === 0 ? (
                  <div className="p-10 text-center text-gray-500">No hay ventas en el período seleccionado</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Ingresos</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Costo</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Ganancia</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {profitData.products.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <p className="text-sm font-semibold text-gray-800">{p.product_name}</p>
                              <p className="text-xs text-gray-400">SKU: {p.product_sku}</p>
                            </td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-600">{formatNum(p.total_quantity)}</td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-700">{formatCOP(p.total_revenue)}</td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-700">{formatCOP(p.total_cost)}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-semibold text-emerald-700">{formatCOP(p.profit)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.margin_percentage >= 30 ? 'bg-green-100 text-green-700' : p.margin_percentage >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {p.margin_percentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )

          /* ===== ROTACIÓN ===== */
          || tab === 'rotation' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Productos Totales', value: formatNum(rotationData.total_products), sub: 'activos', color: 'border-indigo-500', textColor: 'text-indigo-700' },
                  { label: 'Con Ventas', value: formatNum(rotationData.products_with_sales), sub: `de ${rotationData.total_products}`, color: 'border-green-500', textColor: 'text-green-700' },
                  { label: 'Sin Ventas', value: formatNum(rotationData.products_without_sales), sub: 'requieren atención', color: 'border-orange-500', textColor: 'text-orange-700' }
                ].map((kpi, i) => (
                  <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 ${kpi.color}`}>
                    <p className="text-xs font-medium text-gray-500 uppercase">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alta rotación */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-5 border-b flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <h3 className="text-lg font-bold text-gray-800">Alta Rotación</h3>
                  </div>
                  {rotationData.high_rotation.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No hay datos de ventas</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {rotationData.high_rotation.map((p, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i < 3 ? 'bg-emerald-500' : 'bg-gray-400'}`}>{i + 1}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{p.product_name}</p>
                              <p className="text-xs text-gray-400">Vendidos: {formatNum(p.qty_sold)} unidades</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-700">{formatCOP(p.revenue)}</p>
                            <p className="text-xs text-gray-400">Stock: {formatNum(p.current_stock)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Baja rotación */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-5 border-b flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <h3 className="text-lg font-bold text-gray-800">Baja Rotación</h3>
                  </div>
                  {rotationData.low_rotation.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Todos los productos tienen movimiento</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {rotationData.low_rotation.map((p, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{p.product_name}</p>
                            <p className="text-xs text-orange-500 font-medium">Sin ventas en el período</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-orange-600">Stock: {formatNum(p.current_stock)}</p>
                            <p className="text-xs text-gray-400">Valor inmovilizado: {formatCOP(p.current_stock * (p.revenue || 0))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage;