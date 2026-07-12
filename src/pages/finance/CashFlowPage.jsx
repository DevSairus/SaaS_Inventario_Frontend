// frontend/src/pages/finance/CashFlowPage.jsx
import React, { useState, useEffect } from 'react';
import { cashflowAPI } from '../../api/cashflow';
import Layout from '../../components/layout/Layout';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const CashFlowPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);

  // Conciliación con Contabilidad (hallazgo 3.5): esta vista de Tesorería
  // (payment_history) y la Contabilidad (asientos posteados en Caja/Bancos)
  // son dos fuentes independientes — se cargan y muestran juntas para que
  // cualquier diferencia sea visible acá mismo, no algo que haya que
  // descubrir auditando manualmente.
  const [reconciliation, setReconciliation] = useState(null);
  const [reconLoading, setReconLoading] = useState(true);
  const [reconError, setReconError] = useState(null);

  // Fecha LOCAL (no UTC): toISOString() convierte a UTC antes de cortar la
  // fecha, y en Bogotá (UTC-5) eso corre la fecha un día hacia adelante
  // después de las 7pm, dejando movimientos de ese día fuera del filtro.
  const toLocalDateString = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filters, setFilters] = useState({
    from_date: toLocalDateString(new Date(new Date().setDate(1))), // 1ro del mes actual
    to_date: toLocalDateString(new Date())
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await cashflowAPI.getCashFlow(filters);
      setData(response.data);
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Error cargando el flujo de caja');
    } finally {
      setLoading(false);
    }
    loadReconciliation();
  };

  const loadReconciliation = async () => {
    try {
      setReconLoading(true);
      setReconError(null);
      const response = await cashflowAPI.getReconciliation(filters);
      setReconciliation(response.data);
    } catch (error) {
      setReconError(error.response?.data?.message || 'Error cargando la conciliación con contabilidad');
    } finally {
      setReconLoading(false);
    }
  };

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const handleDownloadPDF = async () => {
    const newWindow = window.open('', '_blank');
    try {
      setDownloadingPDF(true);
      const response = await cashflowAPI.getCashFlowPDF(filters);
      const url = URL.createObjectURL(response.data);
      if (newWindow) {
        newWindow.location.href = url;
      }
    } catch (error) {
      if (newWindow) newWindow.close();
      setLoadError('Error generando el PDF del cuadre de caja');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const response = await cashflowAPI.getCashFlowExcel(filters);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cuadre-de-Caja-${filters.from_date}_${filters.to_date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLoadError('Error generando el Excel del cuadre de caja');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(`${date}T12:00:00`);
    return isNaN(d.getTime()) ? date : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const sourceLabel = { sale: 'Venta', purchase: 'Compra', expense: 'Gasto' };

  const maxDayAbs = data?.by_day?.length
    ? Math.max(...data.by_day.map(d => Math.max(d.in, d.out)))
    : 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Flujo de Caja</h1>
            <p className="text-sm text-gray-500 mt-1">Dinero que entra (cobros) vs. dinero que sale (pagos a proveedores y gastos)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
            >
              <TableCellsIcon className="w-4 h-4" /> {downloadingExcel ? 'Generando...' : 'Exportar Excel'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-800 rounded-lg hover:bg-red-900 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="w-4 h-4" /> {downloadingPDF ? 'Generando...' : 'Exportar PDF'}
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowPathIcon className="w-4 h-4" /> Actualizar
            </button>
          </div>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {loadError}
          </div>
        )}

        {/* Filtros de fecha */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Periodo:</span>
          <input
            type="date"
            value={filters.from_date}
            onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400 text-sm">a</span>
          <input
            type="date"
            value={filters.to_date}
            onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Conciliación con Contabilidad */}
        {reconError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3">
            {reconError}
          </div>
        )}
        {!reconLoading && reconciliation && (
          <div className={`rounded-xl border p-4 ${reconciliation.matches ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              {reconciliation.matches ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold ${reconciliation.matches ? 'text-green-800' : 'text-amber-800'}`}>
                  {reconciliation.matches
                    ? 'Tesorería y Contabilidad coinciden'
                    : 'Diferencia entre Tesorería y Contabilidad'}
                </h3>
                <p className={`text-xs mt-1 ${reconciliation.matches ? 'text-green-700' : 'text-amber-700'}`}>
                  Tesorería (cobros/pagos registrados): {formatCurrency(reconciliation.treasury.net)} neto ·{' '}
                  Contabilidad (asientos ya contabilizados en Caja/Bancos): {formatCurrency(reconciliation.accounting.net)} neto
                  {!reconciliation.matches && (
                    <> · diferencia neta: {formatCurrency(reconciliation.difference.net)}</>
                  )}
                </p>

                {reconciliation.pending_draft?.entries > 0 && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-600">
                    <ClockIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Hay {reconciliation.pending_draft.entries} asiento(s) en borrador sin contabilizar que tocan
                      Caja/Bancos por {formatCurrency(Math.abs(reconciliation.pending_draft.net))} netos — esto explica
                      parte (o toda) la diferencia mientras no se posteen.
                    </span>
                  </div>
                )}

                {reconciliation.accounts_used === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    El tenant no tiene mapeo de cuentas de Caja/Bancos configurado en Contabilidad, así que no hay nada
                    con qué comparar todavía.
                  </p>
                )}

                {reconciliation.days_with_difference?.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                      Ver días con diferencia ({reconciliation.days_with_difference.length})
                    </summary>
                    <div className="overflow-x-auto mt-2">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1 pr-4">Fecha</th>
                            <th className="text-right py-1 pr-4">Tesorería +/-</th>
                            <th className="text-right py-1 pr-4">Contabilidad +/-</th>
                            <th className="text-right py-1">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconciliation.days_with_difference.map((d) => (
                            <tr key={d.date} className="border-t border-gray-100">
                              <td className="py-1 pr-4">{formatDate(d.date)}</td>
                              <td className="py-1 pr-4 text-right">
                                +{formatCurrency(d.treasury_in)} / -{formatCurrency(d.treasury_out)}
                              </td>
                              <td className="py-1 pr-4 text-right">
                                +{formatCurrency(d.accounting_in)} / -{formatCurrency(d.accounting_out)}
                              </td>
                              <td className="py-1 text-right font-medium text-amber-700">
                                {formatCurrency(d.diff_in)} / {formatCurrency(d.diff_out)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
              <ArrowTrendingUpIcon className="w-4 h-4" /> Entradas
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data?.summary?.total_in)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <ArrowTrendingDownIcon className="w-4 h-4" /> Salidas
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data?.summary?.total_out)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <ScaleIcon className="w-4 h-4" /> Neto del Periodo
            </div>
            <div className={`text-2xl font-bold ${(data?.summary?.net || 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(data?.summary?.net)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : (
          <>
            {/* Mini gráfico de barras por día (sin librerías, solo CSS) */}
            {data?.by_day?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Entradas vs. Salidas por día</h3>
                <div className="flex items-end gap-1 h-40 overflow-x-auto">
                  {data.by_day.map(d => (
                    <div key={d.date} className="flex flex-col items-center gap-1 min-w-[28px]" title={`${formatDate(d.date)}: +${formatCurrency(d.in)} / -${formatCurrency(d.out)}`}>
                      <div className="flex items-end gap-0.5 h-32">
                        <div
                          className="w-2.5 bg-green-500 rounded-t"
                          style={{ height: maxDayAbs ? `${(d.in / maxDayAbs) * 100}%` : 0 }}
                        />
                        <div
                          className="w-2.5 bg-red-400 rounded-t"
                          style={{ height: maxDayAbs ? `${(d.out / maxDayAbs) * 100}%` : 0 }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 rotate-0">{d.date.slice(8, 10)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-500 rounded-sm inline-block" /> Entradas</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-400 rounded-sm inline-block" /> Salidas</span>
                </div>
              </div>
            )}

            {/* Tabla de movimientos recientes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Movimientos ({data?.summary?.total_transactions ?? 0})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Fecha', 'Tipo', 'Origen', 'Referencia', 'Detalle', 'Monto'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(!data?.transactions || data.transactions.length === 0) && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin movimientos en el periodo</td></tr>
                    )}
                    {data?.transactions?.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(t.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {t.direction === 'in' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sourceLabel[t.source] || t.source}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.reference}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.detail}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${t.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.direction === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default CashFlowPage;