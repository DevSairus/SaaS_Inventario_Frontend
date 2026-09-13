// frontend/src/pages/payroll/PayrollCostsDashboardPage.jsx
//
// Dashboard de costos de nómina (Mejoras-Nomina-Sin-PILA-Nexora.md, punto
// #8): costo total por sede/mes, comparativo devengado vs. deducciones,
// tendencia de novedades por categoría. Toda la data sale de un único
// endpoint de solo lectura (GET /api/payroll/dashboard) — sin store
// propio, mismo criterio que PayrollCertificatesPage.jsx.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { payrollDashboardAPI } from '../../api/payroll';
import useBranchStore from '../../store/branchStore';
import Layout from '../../components/layout/Layout';
import {
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const fmtFull = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fmtCompact = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmtFull(v);
};
const fmtMes = (isoMes) => {
  if (!isoMes) return '—';
  const d = new Date(`${String(isoMes).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoMes).slice(0, 7);
  return d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
};

// Paleta fija para que la misma sede/categoría siempre tenga el mismo
// color entre renders (evita que el usuario tenga que releer la leyenda
// cada vez que cambia el rango de fechas).
const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16'];
const colorFor = (key, index) => PALETTE[index % PALETTE.length];

function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 flex items-center gap-3">
      <div className="rounded-lg p-2.5 flex-shrink-0 text-blue-600 bg-blue-50 dark:bg-blue-900/20">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-600 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// Pivotea porSedeMes (filas {mes, branch_name, neto}) a filas por mes con
// una columna por sede — lo que espera un BarChart apilado de recharts.
function pivotPorSede(porSedeMes) {
  const sedes = [...new Set(porSedeMes.map((r) => r.branch_name))];
  const porMes = new Map();
  for (const row of porSedeMes) {
    const mesKey = String(row.mes).slice(0, 10);
    if (!porMes.has(mesKey)) porMes.set(mesKey, { mes: mesKey });
    porMes.get(mesKey)[row.branch_name] = row.neto;
  }
  const data = [...porMes.values()].sort((a, b) => (a.mes < b.mes ? -1 : 1));
  return { sedes, data };
}

// Pivotea tendenciaNovedades ({mes, categorias:[{label,valor}]}) a filas
// por mes con una columna por categoría, quedándose solo con el top N
// categorías por valor total (para no saturar la leyenda con conceptos
// marginales).
function pivotNovedades(tendencia, topN = 6) {
  const totalPorLabel = new Map();
  for (const fila of tendencia) {
    for (const cat of fila.categorias) {
      totalPorLabel.set(cat.label, (totalPorLabel.get(cat.label) || 0) + cat.valor);
    }
  }
  const topLabels = [...totalPorLabel.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([label]) => label);

  const data = tendencia.map((fila) => {
    const row = { mes: `${fila.mes}-01` };
    for (const cat of fila.categorias) {
      if (topLabels.includes(cat.label)) row[cat.label] = cat.valor;
    }
    return row;
  });
  return { labels: topLabels, data };
}

const PayrollCostsDashboardPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [branchId, setBranchId] = useState('');

  // Mismo store que alimenta el selector de sede operativo del layout —
  // ya filtra sedes inactivas. Si la página se abre directo (sin haber
  // pasado antes por una pantalla que ya las cargó), las pide acá.
  const branches = useBranchStore((s) => s.branches);
  const branchesLoaded = useBranchStore((s) => s.loaded);
  const fetchBranches = useBranchStore((s) => s.fetchBranches);
  useEffect(() => {
    if (!branchesLoaded) fetchBranches();
  }, [branchesLoaded, fetchBranches]);

  const fetchDashboard = useCallback(async (windowMonths, sedeId) => {
    setIsLoading(true);
    try {
      const hoy = new Date();
      const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (windowMonths - 1), 1)).toISOString().slice(0, 10);
      const response = await payrollDashboardAPI.get({ desde, ...(sedeId ? { branch_id: sedeId } : {}) });
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cargar el dashboard de costos de nómina');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(months, branchId);
  }, [months, branchId, fetchDashboard]);

  const { sedes, data: dataPorSede } = useMemo(
    () => pivotPorSede(data?.porSedeMes || []),
    [data],
  );
  const { labels: categoriasNovedades, data: dataNovedades } = useMemo(
    () => pivotNovedades(data?.tendenciaNovedades || []),
    [data],
  );
  const comparativoData = useMemo(
    () => (data?.comparativo || []).map((r) => ({ ...r, mes: String(r.mes).slice(0, 10) })),
    [data],
  );

  const total = data?.totalPeriodo;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard de costos de nómina</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
              Costo por sede, devengado vs. deducciones y tendencia de novedades — solo documentos ya aceptados por la DIAN
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-sm text-gray-500 dark:text-gray-500">Sede:</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las sedes</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <label className="text-sm text-gray-500 dark:text-gray-500">Ventana:</label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
              <option value={24}>24 meses</option>
            </select>
            <button
              onClick={() => fetchDashboard(months, branchId)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading && !data ? (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400 bg-white dark:bg-graphite shadow rounded-xl">
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
            <span className="text-sm">Calculando costos de nómina...</span>
          </div>
        ) : !total || total.documentos === 0 ? (
          <div className="py-20 text-center text-gray-400 bg-white dark:bg-graphite shadow rounded-xl">
            <BanknotesIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay documentos de nómina aceptados por la DIAN en este rango</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<ArrowTrendingUpIcon className="h-5 w-5" />} label="Total devengado" value={fmtCompact(total.devengados)} sub={fmtFull(total.devengados)} />
              <KpiCard icon={<BanknotesIcon className="h-5 w-5" />} label="Total deducciones" value={fmtCompact(total.deducciones)} sub={fmtFull(total.deducciones)} />
              <KpiCard icon={<BanknotesIcon className="h-5 w-5" />} label="Neto pagado" value={fmtCompact(total.neto)} sub={fmtFull(total.neto)} />
              <KpiCard icon={<ChartBarIcon className="h-5 w-5" />} label="Documentos emitidos" value={total.documentos} sub={`${sedes.length} sede${sedes.length !== 1 ? 's' : ''}`} />
            </div>

            {/* Comparativo devengado vs. deducciones */}
            <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-white/10">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-4 h-4 text-gray-500" /> Devengado vs. deducciones por mes
              </h3>
              {comparativoData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={comparativoData}>
                    <defs>
                      <linearGradient id="gDev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={fmtMes} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCompact} width={54} />
                    <Tooltip formatter={(v, name) => [fmtFull(v), name]} labelFormatter={fmtMes} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="devengados" name="Devengado" stroke="#6366f1" strokeWidth={2} fill="url(#gDev)" />
                    <Area type="monotone" dataKey="deducciones" name="Deducciones" stroke="#ef4444" strokeWidth={2} fill="url(#gDed)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Costo neto por sede/mes */}
              <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-white/10">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                  <BuildingOffice2Icon className="w-4 h-4 text-gray-500" /> Neto pagado por sede
                </h3>
                {dataPorSede.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dataPorSede}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={fmtMes} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCompact} width={54} />
                      <Tooltip formatter={(v, name) => [fmtFull(v), name]} labelFormatter={fmtMes} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      {sedes.map((sede, i) => (
                        <Bar key={sede} dataKey={sede} stackId="sede" fill={colorFor(sede, i)} name={sede} radius={i === sedes.length - 1 ? [4, 4, 0, 0] : undefined} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Tendencia de novedades por categoría */}
              <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-white/10">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-gray-500" /> Novedades por categoría (top {categoriasNovedades.length})
                </h3>
                {dataNovedades.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin novedades en este rango</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dataNovedades}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={fmtMes} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtCompact} width={54} />
                      <Tooltip formatter={(v, name) => [fmtFull(v), name]} labelFormatter={fmtMes} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      {categoriasNovedades.map((label, i) => (
                        <Bar key={label} dataKey={label} stackId="cat" fill={colorFor(label, i)} name={label} radius={i === categoriasNovedades.length - 1 ? [4, 4, 0, 0] : undefined} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default PayrollCostsDashboardPage;
