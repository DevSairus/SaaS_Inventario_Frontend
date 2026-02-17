// frontend/src/pages/reports/ReportsPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../../components/layout/Layout';
import { reportsAPI } from '../../api/reports';
import { accountsReceivableAPI } from '../../api/accountsReceivable';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

/* ─── helpers ─────────────────────────────────────────────── */
const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff', '#818cf8', '#7c3aed', '#5b21b6'];
const formatCOP = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);
const formatNum = (v) => new Intl.NumberFormat('es-CO').format(v || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('es-CO');
const normalizeQ = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const MONTH_NAMES = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };

const TABS = [
  { id: 'movements', label: 'Movimientos',  icon: '📊' },
  { id: 'valuation', label: 'Valorización', icon: '💎' },
  { id: 'profit',    label: 'Ganancia',     icon: '💰' },
  { id: 'rotation',  label: 'Rotación',     icon: '🔄' },
  { id: 'cartera',   label: 'Cartera',      icon: '🏦' },
];

/* ─── componente ──────────────────────────────────────────── */
const ReportsPage = () => {
  const [tab, setTab]             = useState('movements');
  const [loading, setLoading]     = useState(true);
  const [periodMonths, setPeriodMonths] = useState(6);

  /* estados reportes existentes */
  const [movementsData, setMovementsData] = useState([]);
  const [valuationData, setValuationData] = useState({ by_category: [], totals: {} });
  const [profitData, setProfitData]       = useState({ products: [], totals: {} });
  const [rotationData, setRotationData]   = useState({ high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
  const [profitDateMode, setProfitDateMode]       = useState('period');
  const [profitCustomDates, setProfitCustomDates] = useState({ from_date: '', to_date: '' });

  /* estados cartera */
  const [carteraLoading, setCarteraLoading]     = useState(false);
  const [carteraSummary, setCarteraSummary]     = useState(null);
  const [carteraInvoices, setCarteraInvoices]   = useState([]);
  const [carteraByCustomer, setCarteraByCustomer] = useState([]);
  const [carteraSearch, setCarteraSearch]       = useState('');
  const [carteraFilterDoc, setCarteraFilterDoc] = useState('');
  const [carteraFilterStatus, setCarteraFilterStatus] = useState('');
  const [carteraShowFilters, setCarteraShowFilters]   = useState(false);

  /* ── carga reportes existentes ── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      let profitParams = profitDateMode === 'custom' && profitCustomDates.from_date && profitCustomDates.to_date
        ? profitCustomDates
        : { months: periodMonths };

      const [mov, val, prof, rot] = await Promise.all([
        reportsAPI.getMovementsByMonth(periodMonths),
        reportsAPI.getValuation(),
        reportsAPI.getProfitReport(profitParams),
        reportsAPI.getRotationReport(periodMonths),
      ]);
      setMovementsData(mov.data || []);
      setValuationData(val.data || { by_category: [], totals: { product_count: 0, total_stock: 0, total_value: 0 } });
      setProfitData(prof.data || { products: [], totals: { total_revenue: 0, total_cost: 0, total_profit: 0, margin_percentage: 0 } });
      setRotationData(rot.data || { high_rotation: [], low_rotation: [], total_products: 0, products_with_sales: 0, products_without_sales: 0 });
    } catch (e) {
      console.error('Error cargando reportes:', e);
    } finally {
      setLoading(false);
    }
  };

  /* ── carga cartera ── */
  const fetchCartera = async () => {
    setCarteraLoading(true);
    try {
      const res = await accountsReceivableAPI.getSummary({});
      setCarteraSummary(res.data.summary);
      setCarteraInvoices(res.data.all_invoices);
      setCarteraByCustomer(res.data.by_customer);
    } catch (e) {
      console.error('Error cargando cartera:', e);
    } finally {
      setCarteraLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [periodMonths, profitDateMode]);

  useEffect(() => {
    if (tab === 'cartera' && !carteraSummary) fetchCartera();
  }, [tab]);

  const handleApplyCustomDates = () => {
    if (profitCustomDates.from_date && profitCustomDates.to_date) fetchAll();
  };

  const exportMovimientosToExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['REPORTE DE MOVIMIENTOS DE INVENTARIO'],
      [`Período: Últimos ${periodMonths} meses | Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['RESUMEN'],
      ['Concepto', 'Valor'],
      ['Total Entradas (und)', movementsData.reduce((s, d) => s + (parseFloat(d?.entradas) || 0), 0)],
      ['Total Salidas (und)', movementsData.reduce((s, d) => s + (parseFloat(d?.salidas) || 0), 0)],
      ['Valor Entradas (COP)', movementsData.reduce((s, d) => s + (parseFloat(d?.entradas_valor) || 0), 0)],
      ['Valor Salidas (COP)', movementsData.reduce((s, d) => s + (parseFloat(d?.salidas_valor) || 0), 0)],
      [],
      ['DETALLE POR MES'],
      ['Mes', 'Entradas (und)', 'Salidas (und)', 'Valor Entradas (COP)', 'Valor Salidas (COP)'],
      ...movementsData.map(d => [
        MONTH_NAMES[d.month?.split('-')[1]] ? `${MONTH_NAMES[d.month?.split('-')[1]]} ${d.month?.split('-')[0]}` : d.month,
        parseFloat(d?.entradas) || 0,
        parseFloat(d?.salidas) || 0,
        Math.round(parseFloat(d?.entradas_valor) || 0),
        Math.round(parseFloat(d?.salidas_valor) || 0),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }];
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = 11; row <= range.e.r; row++) {
      [3, 4].forEach(col => {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number') cell.z = '#,##0';
      });
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, `movimientos_${periodMonths}m_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportValuacionToExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['REPORTE DE VALORIZACIÓN DE INVENTARIO'],
      [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['RESUMEN'],
      ['Productos Activos', valuationData.totals.product_count || 0],
      ['Stock Total (unidades)', valuationData.totals.total_stock || 0],
      ['Valor Total Inventario (COP)', valuationData.totals.total_value || 0],
      [],
      ['DETALLE POR CATEGORÍA'],
      ['Categoría', 'Productos', 'Stock Total', 'Valor (COP)', '% del Total'],
      ...valuationData.by_category.map(cat => [
        cat.category_name || 'Sin categoría',
        cat.product_count,
        cat.total_stock,
        cat.total_value,
        valuationData.totals.total_value > 0
          ? parseFloat(((cat.total_value / valuationData.totals.total_value) * 100).toFixed(1))
          : 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 14 }];
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = 9; row <= range.e.r; row++) {
      const cellVal = ws[XLSX.utils.encode_cell({ r: row, c: 3 })];
      if (cellVal && typeof cellVal.v === 'number') cellVal.z = '#,##0';
      const cellPct = ws[XLSX.utils.encode_cell({ r: row, c: 4 })];
      if (cellPct && typeof cellPct.v === 'number') cellPct.z = '0.0"%"';
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Valorización');
    XLSX.writeFile(wb, `valorizacion_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportRotacionToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Alta Rotación
    const highRows = [
      ['PRODUCTOS DE ALTA ROTACIÓN'],
      [`Período: Últimos ${periodMonths} meses | Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['#', 'Producto', 'SKU', 'Unidades Vendidas', 'Ingresos (COP)', 'Stock Actual'],
      ...rotationData.high_rotation.map((p, i) => [
        i + 1, p.product_name, p.product_sku || '', p.qty_sold, p.revenue, p.current_stock,
      ]),
    ];
    const wsHigh = XLSX.utils.aoa_to_sheet(highRows);
    wsHigh['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
    const rangeH = XLSX.utils.decode_range(wsHigh['!ref']);
    for (let row = 3; row <= rangeH.e.r; row++) {
      const cell = wsHigh[XLSX.utils.encode_cell({ r: row, c: 4 })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0';
    }
    XLSX.utils.book_append_sheet(wb, wsHigh, 'Alta Rotación');

    // Hoja 2: Baja Rotación
    const lowRows = [
      ['PRODUCTOS DE BAJA ROTACIÓN'],
      [`Período: Últimos ${periodMonths} meses | Generado: ${new Date().toLocaleDateString('es-CO')}`],
      [],
      ['#', 'Producto', 'SKU', 'Stock Actual', 'Observación'],
      ...rotationData.low_rotation.map((p, i) => [
        i + 1, p.product_name, p.product_sku || '', p.current_stock, 'Sin ventas en el período',
      ]),
    ];
    const wsLow = XLSX.utils.aoa_to_sheet(lowRows);
    wsLow['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsLow, 'Baja Rotación');

    XLSX.writeFile(wb, `rotacion_${periodMonths}m_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportProfitToExcel = () => {
    const wb = XLSX.utils.book_new();

    // === Hoja 1: Resumen ===
    const summaryData = [
      ['REPORTE DE GANANCIAS'],
      [`Período: ${profitDateMode === 'custom' ? `${profitCustomDates.from_date} al ${profitCustomDates.to_date}` : `Últimos ${periodMonths} meses`}`],
      [`Generado: ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`],
      [],
      ['RESUMEN GENERAL'],
      ['Concepto', 'Valor (COP)'],
      ['Total Ingresos', profitData.totals.total_revenue],
      ['Costo de Ventas', profitData.totals.total_cost],
      ['Ganancia Bruta', profitData.totals.total_profit],
      ['Margen Promedio', `${(profitData.totals.margin_percentage || 0).toFixed(1)}%`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // === Hoja 2: Detalle por Producto ===
    const headers = [['Producto', 'SKU', 'Cantidad Vendida', 'Ingresos (COP)', 'Costo (COP)', 'Ganancia (COP)', 'Margen %']];
    const rows = profitData.products.map(p => [
      p.product_name,
      p.product_sku,
      p.total_quantity,
      p.total_revenue,
      p.total_cost,
      p.profit,
      parseFloat(p.margin_percentage.toFixed(1)),
    ]);
    const totalsRow = [
      'TOTAL GENERAL',
      '',
      profitData.products.reduce((s, p) => s + p.total_quantity, 0),
      profitData.totals.total_revenue,
      profitData.totals.total_cost,
      profitData.totals.total_profit,
      parseFloat((profitData.totals.margin_percentage || 0).toFixed(1)),
    ];
    const wsDetail = XLSX.utils.aoa_to_sheet([...headers, ...rows, [], totalsRow]);
    wsDetail['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    // Formato de moneda para columnas D, E, F (índice 3,4,5) y porcentaje para G (6)
    const range = XLSX.utils.decode_range(wsDetail['!ref']);
    for (let row = 1; row <= range.e.r; row++) {
      [3, 4, 5].forEach(col => {
        const cell = wsDetail[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number') cell.z = '#,##0';
      });
      const margenCell = wsDetail[XLSX.utils.encode_cell({ r: row, c: 6 })];
      if (margenCell && typeof margenCell.v === 'number') margenCell.z = '0.0"%"';
    }
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle por Producto');

    const fileName = `ganancias_${profitDateMode === 'custom' ? `${profitCustomDates.from_date}_${profitCustomDates.to_date}` : `ultimos_${periodMonths}m`}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportCarteraToExcel = () => {
    const wb = XLSX.utils.book_new();
    const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    // === Hoja 1: Resumen General ===
    const summaryRows = [
      ['REPORTE DE CARTERA'],
      [`Generado: ${fecha}`],
      [],
      ['RESUMEN'],
      ['Concepto', 'Valor'],
      ['Total por Cobrar (COP)', carteraSummary?.total_receivable || 0],
      ['Vencido +30 días (COP)', carteraSummary?.total_overdue || 0],
      ['Documentos Pendientes', carteraSummary?.total_invoices || 0],
      ['Clientes con Saldo', carteraSummary?.total_customers || 0],
      [],
      ['POR CLIENTE'],
      ['Cliente', 'NIT/CC', 'Docs.', 'Total (COP)', 'Pagado (COP)', 'Saldo (COP)', 'Vencido (COP)'],
      ...filteredByCustomer.map(c => [
        c.customer_name,
        c.customer?.tax_id || '',
        c.invoices.length,
        c.total_amount,
        c.paid_amount,
        c.balance,
        c.overdue_amount || 0,
      ]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    // Formato moneda en columnas de clientes (D,E,F,G → índices 3,4,5,6) desde fila 12 en adelante
    const rangeS = XLSX.utils.decode_range(wsSummary['!ref']);
    for (let row = 11; row <= rangeS.e.r; row++) {
      [3, 4, 5, 6].forEach(col => {
        const cell = wsSummary[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number') cell.z = '#,##0';
      });
    }
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Cartera');

    // === Hoja 2: Detalle de Documentos ===
    const docHeaders = [['N° Documento', 'Tipo', 'Cliente', 'NIT/CC', 'Fecha', 'Total (COP)', 'Pagado (COP)', 'Saldo (COP)', 'Estado', 'Días Vencido']];
    const docRows = filteredCartera.map(i => [
      i.sale_number,
      i.document_type === 'remision' ? 'Remisión' : 'Factura',
      i.customer_name,
      i.customer?.tax_id || '',
      formatDate(i.sale_date),
      i.total_amount,
      i.paid_amount,
      i.balance,
      i.payment_status === 'partial' ? 'Pago Parcial' : 'A Crédito',
      i.is_overdue ? (i.days_overdue || 0) : 0,
    ]);
    const totalesRow = [
      'TOTAL',
      '', '', '',
      `${filteredCartera.length} docs.`,
      filteredCartera.reduce((s, i) => s + i.total_amount, 0),
      filteredCartera.reduce((s, i) => s + i.paid_amount, 0),
      filteredCartera.reduce((s, i) => s + i.balance, 0),
      '', '',
    ];
    const wsDetail = XLSX.utils.aoa_to_sheet([...docHeaders, ...docRows, [], totalesRow]);
    wsDetail['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
    const rangeD = XLSX.utils.decode_range(wsDetail['!ref']);
    for (let row = 1; row <= rangeD.e.r; row++) {
      [5, 6, 7].forEach(col => {
        const cell = wsDetail[XLSX.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number') cell.z = '#,##0';
      });
    }
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Documentos');

    XLSX.writeFile(wb, `cartera_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── filtrado cartera ── */
  const filteredCartera = useMemo(() => {
    const q = normalizeQ(carteraSearch);
    return carteraInvoices.filter((inv) => {
      if (q) {
        const hay = [inv.customer_name, inv.customer?.tax_id, inv.vehicle_plate, inv.sale_number].map(normalizeQ).join(' ');
        if (!hay.includes(q)) return false;
      }
      if (carteraFilterDoc && inv.document_type !== carteraFilterDoc) return false;
      if (carteraFilterStatus && inv.payment_status !== carteraFilterStatus) return false;
      return true;
    });
  }, [carteraInvoices, carteraSearch, carteraFilterDoc, carteraFilterStatus]);

  const filteredByCustomer = useMemo(() => {
    const q = normalizeQ(carteraSearch);
    return carteraByCustomer
      .map(c => ({
        ...c,
        invoices: c.invoices.filter(inv => {
          if (q) {
            const hay = [c.customer_name, c.customer?.tax_id].map(normalizeQ).join(' ');
            if (!hay.includes(q)) return false;
          }
          if (carteraFilterDoc && inv.document_type !== carteraFilterDoc) return false;
          if (carteraFilterStatus && inv.payment_status !== carteraFilterStatus) return false;
          return true;
        }),
      }))
      .filter(c => c.invoices.length > 0);
  }, [carteraByCustomer, carteraSearch, carteraFilterDoc, carteraFilterStatus]);

  const movChartData  = movementsData.map(d => ({ name: MONTH_NAMES[d.month?.split('-')[1]] || d.month, Entradas: parseFloat(d?.entradas) || 0, Salidas: parseFloat(d?.salidas) || 0 }));
  const movValueData  = movementsData.map(d => ({ name: MONTH_NAMES[d.month?.split('-')[1]] || d.month, Entradas: Math.round(parseFloat(d?.entradas_valor) || 0), Salidas: Math.round(parseFloat(d?.salidas_valor) || 0) }));

  /* ─── render ──────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-xl p-7 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                📊 Reportes
              </h1>
              <p className="text-teal-100 mt-1">Análisis de inventario, ventas, rentabilidad y cartera</p>
            </div>
            {tab !== 'cartera' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-teal-100">Período:</label>
                <select
                  value={periodMonths}
                  onChange={(e) => setPeriodMonths(parseInt(e.target.value))}
                  className="border border-white/30 bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/50 backdrop-blur"
                >
                  <option value={3} className="text-gray-900">Últimos 3 meses</option>
                  <option value={6} className="text-gray-900">Últimos 6 meses</option>
                  <option value={12} className="text-gray-900">Último año</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 flex-wrap bg-white rounded-xl shadow p-1.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                tab === t.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════ REPORTES EXISTENTES */}
        {tab !== 'cartera' && (
          loading ? (
            <div className="bg-white rounded-xl shadow p-16 text-center">
              <ArrowPathIcon className="h-10 w-10 animate-spin text-teal-600 mx-auto" />
              <p className="text-gray-500 mt-3">Cargando reportes...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── MOVIMIENTOS ── */}
              {tab === 'movements' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button onClick={exportMovimientosToExcel} disabled={!movementsData.length} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 text-sm font-medium shadow-sm">
                      <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Excel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Entradas', value: formatNum(movementsData.reduce((s, d) => s + (parseFloat(d?.entradas) || 0), 0)), sub: 'unidades', color: 'from-green-500 to-emerald-600', icon: '📥' },
                      { label: 'Total Salidas',  value: formatNum(movementsData.reduce((s, d) => s + (parseFloat(d?.salidas) || 0), 0)),  sub: 'unidades', color: 'from-red-500 to-rose-600',    icon: '📤' },
                      { label: 'Valor Entradas', value: formatCOP(movementsData.reduce((s, d) => s + (parseFloat(d?.entradas_valor) || 0), 0)), sub: 'COP', color: 'from-blue-500 to-indigo-600', icon: '💰' },
                      { label: 'Valor Salidas',  value: formatCOP(movementsData.reduce((s, d) => s + (parseFloat(d?.salidas_valor) || 0), 0)),  sub: 'COP', color: 'from-orange-500 to-amber-600', icon: '💸' },
                    ].map((k, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className={`bg-gradient-to-r ${k.color} p-4`}>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{k.icon}</span>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide text-right">{k.label}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Cantidad de movimientos por mes</h3>
                        <p className="text-sm text-gray-400">Entradas vs Salidas</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">Últimos {periodMonths} meses</span>
                    </div>
                    <div className="p-6">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={movChartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="Entradas" fill="#10b981" radius={[4,4,0,0]} /><Bar dataKey="Salidas" fill="#ef4444" radius={[4,4,0,0]} /></BarChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Valor de movimientos por mes</h3>
                        <p className="text-sm text-gray-400">En pesos colombianos (COP)</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">Últimos {periodMonths} meses</span>
                    </div>
                    <div className="p-6">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={movValueData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} /><Tooltip formatter={(v) => formatCOP(v)} /><Legend /><Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} /><Line type="monotone" dataKey="Salidas" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VALORIZACIÓN ── */}
              {tab === 'valuation' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button onClick={exportValuacionToExcel} disabled={!valuationData.by_category.length} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 text-sm font-medium shadow-sm">
                      <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Excel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Productos Activos', value: formatNum(valuationData.totals.product_count),  sub: 'en inventario',  color: 'from-indigo-500 to-violet-600', icon: '📦' },
                      { label: 'Stock Total',        value: formatNum(valuationData.totals.total_stock),   sub: 'unidades',       color: 'from-purple-500 to-fuchsia-600', icon: '🏪' },
                      { label: 'Valor Inventario',   value: formatCOP(valuationData.totals.total_value),   sub: 'COP (costo)',    color: 'from-teal-500 to-cyan-600',     icon: '💎' },
                    ].map((k, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className={`bg-gradient-to-r ${k.color} p-4`}>
                          <div className="flex items-center justify-between">
                            <span className="text-3xl">{k.icon}</span>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide text-right">{k.label}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Distribución por categoría</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={valuationData.by_category} dataKey="total_value" nameKey="category_name" cx="50%" cy="50%" outerRadius={100} label={({ category_name, percent }) => `${category_name || 'Sin cat.'} ${(percent * 100).toFixed(0)}%`}>
                            {valuationData.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatCOP(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                      <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">Valor por categoría</h3></div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50"><tr><th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Productos</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {valuationData.by_category.map((cat, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-sm font-medium">{cat.category_name || 'Sin categoría'}</span></td>
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
              )}

              {/* ── GANANCIA ── */}
              {tab === 'profit' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Modo de filtrado</label>
                        <div className="flex gap-2">
                          {['period', 'custom'].map(m => (
                            <button key={m} onClick={() => setProfitDateMode(m)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${profitDateMode === m ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {m === 'period' ? 'Por período' : 'Rango personalizado'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {profitDateMode === 'custom' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
                            <input type="date" value={profitCustomDates.from_date} onChange={(e) => setProfitCustomDates(p => ({ ...p, from_date: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha hasta</label>
                            <input type="date" value={profitCustomDates.to_date} onChange={(e) => setProfitCustomDates(p => ({ ...p, to_date: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                          </div>
                          <button onClick={handleApplyCustomDates} disabled={!profitCustomDates.from_date || !profitCustomDates.to_date} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium">Aplicar</button>
                        </>
                      )}
                      <button onClick={exportProfitToExcel} disabled={!profitData.products.length} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 flex items-center gap-2 text-sm font-medium">
                        <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Excel
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Ingresos Total',  value: formatCOP(profitData.totals.total_revenue),    color: 'from-green-500 to-emerald-600',  icon: '💵' },
                      { label: 'Costo de Ventas', value: formatCOP(profitData.totals.total_cost),       color: 'from-red-500 to-rose-600',       icon: '🏷️' },
                      { label: 'Ganancia Bruta',  value: formatCOP(profitData.totals.total_profit),     color: 'from-emerald-500 to-teal-600',   icon: '📈' },
                      { label: 'Margen Promedio', value: `${(profitData.totals.margin_percentage || 0).toFixed(1)}%`, color: 'from-blue-500 to-indigo-600', icon: '🎯' },
                    ].map((k, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className={`bg-gradient-to-r ${k.color} p-4`}>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{k.icon}</span>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide text-right">{k.label}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-xl font-bold text-gray-900">{k.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {profitData.products.length > 0 && (
                    <div className="bg-white rounded-xl shadow p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">Top productos por ganancia</h3>
                      <p className="text-sm text-gray-500 mb-4">Ingresos vs Costo</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={profitData.products.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="product_name" width={100} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => formatCOP(v)} /><Legend />
                          <Bar dataKey="total_revenue" name="Ingresos" fill="#10b981" radius={[0,4,4,0]} />
                          <Bar dataKey="total_cost"    name="Costo"    fill="#f59e0b" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">Detalle por producto</h3></div>
                    {!profitData.products.length ? (
                      <p className="p-10 text-center text-gray-500">No hay ventas en el período</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50"><tr><th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Cantidad</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Ingresos</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Costo</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Ganancia</th><th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Margen</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {profitData.products.map((p, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5"><p className="font-semibold text-gray-800">{p.product_name}</p><p className="text-xs text-gray-400">SKU: {p.product_sku}</p></td>
                                <td className="px-4 py-2.5 text-right text-gray-600">{formatNum(p.total_quantity)}</td>
                                <td className="px-4 py-2.5 text-right text-gray-700">{formatCOP(p.total_revenue)}</td>
                                <td className="px-4 py-2.5 text-right text-gray-700">{formatCOP(p.total_cost)}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{formatCOP(p.profit)}</td>
                                <td className="px-4 py-2.5 text-right"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.margin_percentage >= 30 ? 'bg-green-100 text-green-700' : p.margin_percentage >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.margin_percentage.toFixed(1)}%</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ROTACIÓN ── */}
              {tab === 'rotation' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button onClick={exportRotacionToExcel} disabled={!rotationData.high_rotation.length && !rotationData.low_rotation.length} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 text-sm font-medium shadow-sm">
                      <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Excel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Productos Totales', value: formatNum(rotationData.total_products),          sub: 'activos en catálogo', color: 'from-indigo-500 to-violet-600', icon: '📦' },
                      { label: 'Con Ventas',         value: formatNum(rotationData.products_with_sales),    sub: `de ${rotationData.total_products} productos`, color: 'from-green-500 to-emerald-600', icon: '✅' },
                      { label: 'Sin Ventas',         value: formatNum(rotationData.products_without_sales), sub: 'requieren atención', color: 'from-orange-500 to-amber-600', icon: '⚠️' },
                    ].map((k, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className={`bg-gradient-to-r ${k.color} p-4`}>
                          <div className="flex items-center justify-between">
                            <span className="text-3xl">{k.icon}</span>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide text-right">{k.label}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[
                      { title: '🚀 Alta Rotación', data: rotationData.high_rotation, empty: 'No hay datos de ventas', itemColor: (i) => i < 3 ? 'bg-emerald-500' : 'bg-gray-400', valueColor: 'text-emerald-700', valueKey: 'revenue', unitKey: 'qty_sold', unitLabel: 'Vendidos' },
                      { title: '⚠️ Baja Rotación', data: rotationData.low_rotation, empty: 'Todos los productos tienen movimiento', itemColor: () => 'bg-orange-400', valueColor: 'text-orange-600', valueKey: 'current_stock', unitLabel: 'Sin ventas en el período' },
                    ].map(({ title, data, empty, itemColor, valueColor, valueKey, unitKey, unitLabel }) => (
                      <div key={title} className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-5 border-b"><h3 className="text-lg font-bold text-gray-800">{title}</h3></div>
                        {!data.length ? <p className="p-8 text-center text-gray-500 text-sm">{empty}</p> : (
                          <div className="divide-y divide-gray-100">
                            {data.map((p, i) => (
                              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${itemColor(i)}`}>{i + 1}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{p.product_name}</p>
                                    <p className="text-xs text-gray-400">{unitKey ? `${unitLabel}: ${formatNum(p[unitKey])} und.` : unitLabel}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${valueColor}`}>{formatCOP(p[valueKey])}</p>
                                  <p className="text-xs text-gray-400">Stock: {formatNum(p.current_stock)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        )}

        {/* ══════════════════════════════════════════════ TAB CARTERA */}
        {tab === 'cartera' && (
          <div className="space-y-5">

            {carteraLoading ? (
              <div className="bg-white rounded-xl shadow p-16 text-center">
                <ArrowPathIcon className="h-10 w-10 animate-spin text-teal-600 mx-auto" />
                <p className="text-gray-500 mt-3">Cargando cartera...</p>
              </div>
            ) : (
              <>
                {/* Tarjetas resumen */}
                {carteraSummary && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { icon: '💳', color: 'from-blue-500 to-indigo-600',    label: 'Total por Cobrar',     value: formatCOP(carteraSummary.total_receivable) },
                      { icon: '⚠️', color: 'from-red-500 to-rose-600',        label: 'Vencido (+30 días)',   value: formatCOP(carteraSummary.total_overdue) },
                      { icon: '📄', color: 'from-violet-500 to-purple-600',   label: 'Docs. Pendientes',     value: carteraSummary.total_invoices || 0 },
                      { icon: '👥', color: 'from-emerald-500 to-teal-600',    label: 'Clientes con Saldo',   value: carteraSummary.total_customers || 0 },
                    ].map(({ icon, color, label, value }) => (
                      <div key={label} className="bg-white shadow-md rounded-xl overflow-hidden">
                        <div className={`bg-gradient-to-r ${color} p-4`}>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">{icon}</span>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide text-right">{label}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-xl font-bold text-gray-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Búsqueda + filtros */}
                <div className="bg-white shadow rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={carteraSearch}
                        onChange={(e) => setCarteraSearch(e.target.value)}
                        placeholder="Buscar por cliente, NIT / CC, placa o N° documento..."
                        className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      {carteraSearch && <button onClick={() => setCarteraSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-4 w-4" /></button>}
                    </div>

                    <button onClick={() => setCarteraShowFilters(!carteraShowFilters)} className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium flex-shrink-0 ${(carteraFilterDoc || carteraFilterStatus) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                      <FunnelIcon className="h-4 w-4" /> Filtros
                    </button>
                    <button onClick={fetchCartera} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex-shrink-0">
                      <ArrowPathIcon className="h-4 w-4" /><span className="hidden sm:inline">Actualizar</span>
                    </button>
                    <button onClick={exportCarteraToExcel} disabled={!filteredCartera.length} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex-shrink-0 disabled:opacity-40">
                      <ArrowDownTrayIcon className="h-4 w-4" /><span className="hidden sm:inline">Exportar Excel</span>
                    </button>
                    {(carteraSearch || carteraFilterDoc || carteraFilterStatus) && (
                      <button onClick={() => { setCarteraSearch(''); setCarteraFilterDoc(''); setCarteraFilterStatus(''); }} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 flex-shrink-0">
                        <XMarkIcon className="h-4 w-4" /> Limpiar
                      </button>
                    )}
                  </div>

                  {carteraShowFilters && (
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de documento</label>
                        <select value={carteraFilterDoc} onChange={(e) => setCarteraFilterDoc(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          <option value="">Todos</option><option value="factura">Factura</option><option value="remision">Remisión</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Estado de pago</label>
                        <select value={carteraFilterStatus} onChange={(e) => setCarteraFilterStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          <option value="">Todos</option><option value="pending">A Crédito</option><option value="partial">Pago Parcial</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumen por cliente */}
                {filteredByCustomer.length > 0 && (
                  <div className="bg-white shadow rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-800">Resumen por cliente</h3>
                      <span className="text-xs text-gray-400">{filteredByCustomer.length} clientes</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                          <th className="px-4 py-3 text-left">Cliente</th>
                          <th className="px-4 py-3 text-right">Docs.</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Pagado</th>
                          <th className="px-4 py-3 text-right">Saldo</th>
                          <th className="px-4 py-3 text-right">Vencido</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredByCustomer.map((c) => (
                            <tr key={c.customer_id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{c.customer_name?.[0]?.toUpperCase() || '?'}</div>
                                  <div>
                                    <p className="font-semibold text-gray-900 max-w-[160px] truncate">{c.customer_name}</p>
                                    {c.customer?.tax_id && <p className="text-xs text-gray-400">{c.customer.tax_id}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">{c.invoices.length}</td>
                              <td className="px-4 py-3 text-right font-medium text-gray-700">{formatCOP(c.total_amount)}</td>
                              <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatCOP(c.paid_amount)}</td>
                              <td className="px-4 py-3 text-right font-bold text-red-600">{formatCOP(c.balance)}</td>
                              <td className="px-4 py-3 text-right">
                                {c.overdue_amount > 0 ? <span className="text-red-500 font-semibold">{formatCOP(c.overdue_amount)}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-sm">
                            <td className="px-4 py-3 text-gray-500 font-normal">{filteredByCustomer.length} clientes</td>
                            <td className="px-4 py-3 text-right text-gray-600">{filteredByCustomer.reduce((s, c) => s + c.invoices.length, 0)}</td>
                            <td className="px-4 py-3 text-right text-gray-800">{formatCOP(filteredByCustomer.reduce((s, c) => s + c.total_amount, 0))}</td>
                            <td className="px-4 py-3 text-right text-emerald-700">{formatCOP(filteredByCustomer.reduce((s, c) => s + c.paid_amount, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-700">{formatCOP(filteredByCustomer.reduce((s, c) => s + c.balance, 0))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tabla detalle documentos */}
                <div className="bg-white shadow rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Detalle de documentos</h3>
                    <span className="text-xs text-gray-400">{filteredCartera.length} documentos</span>
                  </div>
                  {!filteredCartera.length ? (
                    <div className="py-16 text-center text-gray-400">
                      <DocumentTextIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No se encontraron documentos</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                          <th className="px-4 py-3 text-left whitespace-nowrap">N° Documento</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Tipo</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Cliente</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Pagado</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Saldo</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredCartera.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-teal-700">{inv.sale_number}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inv.document_type === 'remision' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                  {inv.document_type === 'remision' ? 'Remisión' : 'Factura'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900 max-w-[160px] truncate">{inv.customer_name}</p>
                                {inv.customer?.tax_id && <p className="text-xs text-gray-400">{inv.customer.tax_id}</p>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                {formatDate(inv.sale_date)}
                                {inv.is_overdue && <p className="text-xs font-semibold text-red-500">{inv.days_overdue}d vencido</p>}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700 font-medium">{formatCOP(inv.total_amount)}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                {inv.paid_amount > 0 ? <span className="text-emerald-600 font-semibold">{formatCOP(inv.paid_amount)}</span> : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-red-600">{formatCOP(inv.balance)}</td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {inv.payment_status === 'partial'
                                  ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pago Parcial</span>
                                  : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">A Crédito</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-sm">
                            <td colSpan={4} className="px-4 py-3 text-gray-500 font-normal">{filteredCartera.length} docs.</td>
                            <td className="px-4 py-3 text-right text-gray-800">{formatCOP(filteredCartera.reduce((s, i) => s + i.total_amount, 0))}</td>
                            <td className="px-4 py-3 text-right text-emerald-700">{formatCOP(filteredCartera.reduce((s, i) => s + i.paid_amount, 0))}</td>
                            <td className="px-4 py-3 text-right text-red-700">{formatCOP(filteredCartera.reduce((s, i) => s + i.balance, 0))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
};

export default ReportsPage;