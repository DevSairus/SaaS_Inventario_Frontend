import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../../components/layout/Layout';
import { reportsAPI } from '../../api/reports';
import { accountsReceivableAPI } from '../../api/accountsReceivable';
import { exportReceivablesToExcel } from '../../utils/excelExport';
import useCustomersStore from '../../store/customersStore';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#818cf8', '#7c3aed', '#5b21b6'];

const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);
const formatNum = (val) => new Intl.NumberFormat('es-CO').format(val || 0);

const MONTH_NAMES = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };

// ─── Date Filter Bar (reusable) ───────────────────────────────────────────────
const DateFilterBar = ({ dateMode, setDateMode, periodMonths, setPeriodMonths, customDates, setCustomDates, onApply, extraActions }) => {
  const canApply = dateMode === 'period' || (customDates.from_date && customDates.to_date);
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3 flex-wrap">
        {/* Toggle */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Modo de filtrado</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => { setDateMode('period'); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateMode === 'period' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Por período
            </button>
            <button
              onClick={() => setDateMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dateMode === 'custom' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Rango personalizado
            </button>
          </div>
        </div>

        {/* Period selector */}
        {dateMode === 'period' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Período</label>
            <select
              value={periodMonths}
              onChange={(e) => setPeriodMonths(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value={1}>Último mes</option>
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Último año</option>
            </select>
          </div>
        )}

        {/* Custom date range */}
        {dateMode === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Desde</label>
              <input
                type="date"
                value={customDates.from_date}
                onChange={(e) => setCustomDates(prev => ({ ...prev, from_date: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
              <input
                type="date"
                value={customDates.to_date}
                onChange={(e) => setCustomDates(prev => ({ ...prev, to_date: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={onApply}
              disabled={!canApply}
              className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              Aplicar
            </button>
          </>
        )}

        {/* Extra actions slot (e.g. export button) */}
        {extraActions && <div className="md:ml-auto flex items-end">{extraActions}</div>}
      </div>

      {/* Active filter badge */}
      {dateMode === 'custom' && customDates.from_date && customDates.to_date && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-700">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Mostrando del <strong className="ml-1">{customDates.from_date}</strong>&nbsp;al&nbsp;<strong>{customDates.to_date}</strong>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReportsPage = () => {
  const { customers, fetchCustomers } = useCustomersStore();
  const [tab, setTab] = useState('movements');
  const [loading, setLoading] = useState(true);

  // Data states
  const [movementsData, setMovementsData] = useState([]);
  const [valuationData, setValuationData] = useState({ by_category: [], totals: {} });
  const [profitData, setProfitData] = useState({ products: [], totals: {} });
  const [rotationData, setRotationData] = useState({ high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
  const [receivablesData, setReceivablesData] = useState({ summary: {}, by_customer: [], all_invoices: [] });

  // Shared date filter state
  const [dateMode, setDateMode] = useState('period');
  const [periodMonths, setPeriodMonths] = useState(6);
  const [customDates, setCustomDates] = useState({ from_date: '', to_date: '' });

  // Receivables-specific filters
  const [receivablesFilters, setReceivablesFilters] = useState({ customer_id: '', from_date: '', to_date: '', status: '' });
  const [showReceivablesFilters, setShowReceivablesFilters] = useState(false);

  // Build params for APIs from shared date state
  const getDateParams = () => {
    if (dateMode === 'custom' && customDates.from_date && customDates.to_date) {
      return { from_date: customDates.from_date, to_date: customDates.to_date };
    }
    return { months: periodMonths };
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const dateParams = getDateParams();

      const cleanReceivablesFilters = Object.fromEntries(
        Object.entries(receivablesFilters).filter(([_, v]) => v !== '')
      );

      const results = await Promise.allSettled([
        reportsAPI.getMovementsByMonth(dateParams),
        reportsAPI.getValuation(),
        reportsAPI.getProfitReport(dateParams),
        reportsAPI.getRotationReport(dateParams),
        accountsReceivableAPI.getSummary(cleanReceivablesFilters)
      ]);

      const [movResult, valResult, profResult, rotResult, recvResult] = results;

      if (movResult.status === 'fulfilled') {
        const movData = movResult.value.data || [];
        console.log('Datos de movimientos:', movData);
        console.log('Primer elemento:', movData[0]);
        setMovementsData(movData);
      } else {
        console.error('Error en movimientos:', movResult.reason);
        setMovementsData([]);
      }

      if (valResult.status === 'fulfilled') {
        setValuationData(valResult.value.data || { by_category: [], totals: { product_count: 0, total_stock: 0, total_value: 0 } });
      } else {
        console.error('Error en valorización:', valResult.reason);
        setValuationData({ by_category: [], totals: { product_count: 0, total_stock: 0, total_value: 0 } });
      }

      if (profResult.status === 'fulfilled') {
        setProfitData(profResult.value.data || { products: [], totals: { total_revenue: 0, total_cost: 0, total_profit: 0, margin_percentage: 0 } });
      } else {
        console.error('Error en ganancia:', profResult.reason);
        setProfitData({ products: [], totals: { total_revenue: 0, total_cost: 0, total_profit: 0, margin_percentage: 0 } });
      }

      if (rotResult.status === 'fulfilled') {
        setRotationData(rotResult.value.data || { high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
      } else {
        console.error('Error en rotación:', rotResult.reason);
        setRotationData({ high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
      }

      if (recvResult.status === 'fulfilled') {
        const receivablesResult = recvResult.value.data || { summary: {}, by_customer: [], all_invoices: [] };
        console.log('Datos de cartera cargados:', receivablesResult);
        setReceivablesData(receivablesResult);
      } else {
        const error = recvResult.reason;
        console.error('Error en cartera:', error);
        if (error.response?.status === 403) {
          setReceivablesData({ summary: {}, by_customer: [], all_invoices: [], error: { type: 'permission', message: 'No tienes permisos para ver la cartera' } });
        } else {
          setReceivablesData({ summary: {}, by_customer: [], all_invoices: [], error: { type: 'general', message: error.message || 'Error al cargar cartera' } });
        }
      }
    } catch (e) {
      console.error('Error cargando reportes:', e);
      console.error('Detalles del error:', { message: e.message, response: e.response?.data, status: e.response?.status });
      setMovementsData([]);
      setValuationData({ by_category: [], totals: { product_count: 0, total_stock: 0, total_value: 0 } });
      setProfitData({ products: [], totals: { total_revenue: 0, total_cost: 0, total_profit: 0, margin_percentage: 0 } });
      setRotationData({ high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
      setReceivablesData({ summary: {}, by_customer: [], all_invoices: [] });
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when period/mode changes (except custom — user must click Apply)
  useEffect(() => {
    if (dateMode === 'period') fetchAll();
  }, [periodMonths, dateMode]);

  useEffect(() => { fetchCustomers(); }, []);

  // Debug: Ver cuando cambian los datos de cartera
  useEffect(() => {
    console.log('receivablesData actualizado:', {
      summary: receivablesData.summary,
      customers: receivablesData.by_customer?.length,
      invoices: receivablesData.all_invoices?.length
    });
  }, [receivablesData]);

  // Debug: Ver totales de movimientos
  useEffect(() => {
    if (movementsData.length > 0) {
      const totalEntradas = movementsData.reduce((s, d) => s + (parseFloat(d?.entradas) || 0), 0);
      const totalSalidas = movementsData.reduce((s, d) => s + (parseFloat(d?.salidas) || 0), 0);
      console.log('Movimientos - Totales:', { registros: movementsData.length, totalEntradas, totalSalidas, ejemplo: movementsData[0] });
    }
  }, [movementsData]);

  const handleApplyCustomDates = () => {
    if (customDates.from_date && customDates.to_date) fetchAll();
  };

  const handleApplyReceivablesFilters = async () => {
    const cleanFilters = Object.fromEntries(
      Object.entries(receivablesFilters).filter(([_, v]) => v !== '')
    );
    console.log('Aplicando filtros de cartera:', cleanFilters);
    setLoading(true);
    try {
      const recv = await accountsReceivableAPI.getSummary(cleanFilters);
      console.log('Respuesta de cartera:', recv);
      setReceivablesData(recv.data || { summary: {}, by_customer: [], all_invoices: [] });
    } catch (e) {
      console.error('Error cargando cartera:', e);
      console.error('Detalles:', { filtros: cleanFilters, error: e.message, response: e.response?.data, status: e.response?.status });
      setReceivablesData({ summary: {}, by_customer: [], all_invoices: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleClearReceivablesFilters = async () => {
    const emptyFilters = { customer_id: '', from_date: '', to_date: '', status: '' };
    setReceivablesFilters(emptyFilters);
    setLoading(true);
    try {
      const recv = await accountsReceivableAPI.getSummary({});
      setReceivablesData(recv.data || { summary: {}, by_customer: [], all_invoices: [] });
    } catch (e) {
      console.error('Error cargando cartera:', e);
      setReceivablesData({ summary: {}, by_customer: [], all_invoices: [] });
    } finally {
      setLoading(false);
    }
  };

  const exportProfitToExcel = () => {
    const headers = ['Producto', 'SKU', 'Cantidad', 'Ingresos', 'Costo', 'Ganancia', 'Margen %'];
    const rows = profitData.products.map(p => [p.product_name, p.product_sku, p.total_quantity, p.total_revenue, p.total_cost, p.profit, p.margin_percentage.toFixed(1)]);
    rows.push(['TOTAL', '', '', profitData.totals.total_revenue, profitData.totals.total_cost, profitData.totals.total_profit, profitData.totals.margin_percentage.toFixed(1)]);
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => { csvContent += row.join(',') + '\n'; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = dateMode === 'custom' ? `${customDates.from_date}_${customDates.to_date}` : `ultimos_${periodMonths}_meses`;
    link.setAttribute('download', `informe_ganancias_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'movements', label: 'Movimientos', icon: '📊' },
    { id: 'valuation', label: 'Valorización', icon: '💎' },
    { id: 'profit', label: 'Ganancia', icon: '💰' },
    { id: 'rotation', label: 'Rotación', icon: '🔄' },
    { id: 'receivables', label: 'Cartera', icon: '💳' }
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

  // Shared date filter props passed to DateFilterBar
  const dateFilterProps = {
    dateMode, setDateMode,
    periodMonths, setPeriodMonths,
    customDates, setCustomDates,
    onApply: handleApplyCustomDates
  };

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reportes Gerenciales</h1>
            <p className="text-sm text-gray-500 mt-0.5">Análisis de inventario, ventas y rentabilidad</p>
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
              <DateFilterBar {...dateFilterProps} />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Entradas', value: formatNum(movementsData.reduce((s, d) => s + (parseFloat(d?.entradas) || 0), 0)), color: 'border-green-500', bg: 'bg-green-50', textColor: 'text-green-700' },
                  { label: 'Total Salidas', value: formatNum(movementsData.reduce((s, d) => s + (parseFloat(d?.salidas) || 0), 0)), color: 'border-red-500', bg: 'bg-red-50', textColor: 'text-red-700' },
                  { label: 'Valor Entradas', value: formatCOP(movementsData.reduce((s, d) => s + (parseFloat(d?.entradas_valor) || 0), 0)), color: 'border-blue-500', bg: 'bg-blue-50', textColor: 'text-blue-700' },
                  { label: 'Valor Salidas', value: formatCOP(movementsData.reduce((s, d) => s + (parseFloat(d?.salidas_valor) || 0), 0)), color: 'border-orange-500', bg: 'bg-orange-50', textColor: 'text-orange-700' }
                ].map((kpi, i) => (
                  <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 ${kpi.color}`}>
                    <p className="text-xs font-medium text-gray-500 uppercase">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
                  </div>
                ))}
              </div>

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
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                La valorización refleja el inventario actual. No aplica filtro de fechas.
              </div>

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
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Distribución por categoría</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={valuationData.by_category} dataKey="total_value" nameKey="category_name" cx="50%" cy="50%" outerRadius={100}
                        label={({ category_name, percent }) => `${category_name || 'Sin cat.'} ${(percent * 100).toFixed(0)}%`}>
                        {valuationData.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCOP(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">Valor por categoría</h3></div>
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
              <DateFilterBar {...dateFilterProps}
                extraActions={
                  <button onClick={exportProfitToExcel} disabled={profitData.products.length === 0}
                    className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium shadow-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar CSV
                  </button>
                }
              />

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

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">Detalle por producto</h3></div>
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
              <DateFilterBar {...dateFilterProps} />

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
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="p-5 border-b flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <h3 className="text-lg font-bold text-gray-800">Alta Rotación</h3>
                  </div>
                  {rotationData.high_rotation.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No hay ventas en el período seleccionado</div>
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
                            <p className="text-xs text-orange-500 font-medium">{p.qty_sold > 0 ? `${formatNum(p.qty_sold)} uds vendidas` : 'Sin ventas en el período'}</p>
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

          /* ===== CARTERA ===== */
          || tab === 'receivables' && (
            <div className="space-y-6">
              {receivablesData.error && (
                <div className={`rounded-lg p-4 ${receivablesData.error.type === 'permission' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {receivablesData.error.type === 'permission' ? (
                        <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className={`text-sm font-medium ${receivablesData.error.type === 'permission' ? 'text-yellow-800' : 'text-red-800'}`}>
                        {receivablesData.error.type === 'permission' ? 'Sin permisos' : 'Error al cargar'}
                      </h3>
                      <p className={`mt-1 text-sm ${receivablesData.error.type === 'permission' ? 'text-yellow-700' : 'text-red-700'}`}>
                        {receivablesData.error.message}
                      </p>
                      {receivablesData.error.type === 'permission' && (
                        <p className="mt-2 text-xs text-yellow-600">Contacta a tu administrador para solicitar acceso al módulo de Cartera (Cuentas por Cobrar).</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Filtros propios de cartera */}
              <div className="bg-white rounded-xl shadow">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Filtros de Cartera</h3>
                  <button
                    onClick={() => setShowReceivablesFilters(!showReceivablesFilters)}
                    disabled={receivablesData.error?.type === 'permission'}
                    className={`flex items-center gap-2 text-sm font-medium ${receivablesData.error?.type === 'permission' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    {showReceivablesFilters ? 'Ocultar' : 'Mostrar'} filtros
                  </button>
                </div>

                {showReceivablesFilters && !receivablesData.error && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                        <CustomerSearchInput
                          customers={customers.filter(c => c.is_active)}
                          value={receivablesFilters.customer_id}
                          onChange={(value) => setReceivablesFilters({ ...receivablesFilters, customer_id: value })}
                          placeholder="Buscar cliente por nombre, NIT..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                        <select
                          value={receivablesFilters.status}
                          onChange={(e) => setReceivablesFilters({ ...receivablesFilters, status: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todas</option>
                          <option value="overdue">Solo Vencidas</option>
                          <option value="current">Solo Al Día</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                        <input type="date" value={receivablesFilters.from_date}
                          onChange={(e) => setReceivablesFilters({ ...receivablesFilters, from_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                        <input type="date" value={receivablesFilters.to_date}
                          onChange={(e) => setReceivablesFilters({ ...receivablesFilters, to_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button onClick={handleClearReceivablesFilters} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Limpiar</button>
                      <button onClick={handleApplyReceivablesFilters} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Aplicar Filtros</button>
                    </div>
                  </div>
                )}
              </div>

              {!receivablesData.error && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Por Cobrar', value: formatCOP(receivablesData.summary?.total_receivable), color: 'border-blue-500', textColor: 'text-blue-700', icon: '💵' },
                      { label: 'Vencido (+30 días)', value: formatCOP(receivablesData.summary?.total_overdue), color: 'border-red-500', textColor: 'text-red-700', icon: '⚠️' },
                      { label: 'A Vencer (0-30 días)', value: formatCOP(receivablesData.summary?.total_current), color: 'border-yellow-500', textColor: 'text-yellow-700', icon: '📅' },
                      { label: 'Clientes con Deuda', value: formatNum(receivablesData.summary?.total_customers), sub: `${receivablesData.summary?.total_invoices || 0} facturas`, color: 'border-purple-500', textColor: 'text-purple-700', icon: '👥' }
                    ].map((kpi, i) => (
                      <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 ${kpi.color}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 uppercase">{kpi.label}</p>
                            <p className={`text-2xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
                            {kpi.sub && <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>}
                          </div>
                          <span className="text-3xl">{kpi.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    {(receivablesFilters.customer_id || receivablesFilters.from_date || receivablesFilters.to_date || receivablesFilters.status) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="font-medium">Filtros aplicados</span>
                      </div>
                    )}
                    <div className={receivablesFilters.customer_id || receivablesFilters.from_date || receivablesFilters.to_date || receivablesFilters.status ? '' : 'ml-auto'}>
                      <button
                        onClick={() => {
                          const filename = receivablesFilters.customer_id
                            ? `cartera_cliente_${customers.find(c => c.id === parseInt(receivablesFilters.customer_id))?.full_name || 'filtrado'}`
                            : receivablesFilters.from_date && receivablesFilters.to_date
                            ? `cartera_${receivablesFilters.from_date}_${receivablesFilters.to_date}`
                            : 'cartera';
                          exportReceivablesToExcel(receivablesData, filename);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exportar a Excel
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👥</span>
                        <h3 className="text-lg font-bold text-gray-800">Cartera por Cliente</h3>
                      </div>
                      <p className="text-sm text-gray-500">{receivablesData.by_customer?.length || 0} clientes</p>
                    </div>
                    {(!receivablesData.by_customer || receivablesData.by_customer.length === 0) ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No hay deudas pendientes</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIT/CC</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pendiente</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Facturas</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Días Promedio</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencido</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {receivablesData.by_customer.slice(0, 10).map((item, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.customer_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{item.customer_tax_id || '-'}</td>
                                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatCOP(item.total_pending)}</td>
                                <td className="px-6 py-4 text-sm text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{item.pending_invoices}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-right text-gray-600">{Math.round(item.avg_days_pending || 0)} días</td>
                                <td className="px-6 py-4 text-sm text-right">
                                  <span className={`font-semibold ${parseFloat(item.overdue_amount) > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCOP(item.overdue_amount)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📄</span>
                        <h3 className="text-lg font-bold text-gray-800">Facturas Pendientes Recientes</h3>
                      </div>
                      <p className="text-sm text-gray-500">{receivablesData.all_invoices?.length || 0} facturas</p>
                    </div>
                    {(!receivablesData.all_invoices || receivablesData.all_invoices.length === 0) ? (
                      <div className="p-8 text-center text-gray-500 text-sm">No hay facturas pendientes</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {receivablesData.all_invoices.slice(0, 15).map((inv, i) => {
                              const daysOverdue = parseInt(inv.days_overdue) || 0;
                              const isOverdue = daysOverdue > 30;
                              return (
                                <tr key={i} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.sale_number}</td>
                                  <td className="px-6 py-4 text-sm text-gray-600">{inv.customer_name}</td>
                                  <td className="px-6 py-4 text-sm text-gray-500">{inv.sale_date ? new Date(inv.sale_date).toLocaleDateString('es-CO') : '-'}</td>
                                  <td className="px-6 py-4 text-sm text-right text-gray-900">{formatCOP(inv.total_amount)}</td>
                                  <td className="px-6 py-4 text-sm text-right text-green-600">{formatCOP(inv.paid_amount)}</td>
                                  <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">{formatCOP(inv.balance)}</td>
                                  <td className="px-6 py-4 text-center">
                                    {isOverdue ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Vencida ({daysOverdue}d)</span>
                                    ) : daysOverdue > 0 ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{daysOverdue} días</span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Al día</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage;