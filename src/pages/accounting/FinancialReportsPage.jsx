// frontend/src/pages/accounting/FinancialReportsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { financialReportsAPI, SOURCE_TYPE_LABELS } from '../../api/accounting';
import useBranchStore from '../../store/branchStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { DocumentArrowDownIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const toLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const TABS = [
  { id: 'trial-balance', label: 'Balance de Comprobación' },
  { id: 'balance-general', label: 'Balance General' },
  { id: 'income-statement', label: 'Estado de Resultados (P&G)' },
  { id: 'libro-diario', label: 'Libro Diario' },
  { id: 'libro-iva', label: 'Libro de IVA' },
];

const FinancialReportsPage = () => {
  const [tab, setTab] = useState('trial-balance');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const { branches, fetchBranches } = useBranchStore();
  const [branchId, setBranchId] = useState('');
  const [range, setRange] = useState({
    from: toLocalDateString(new Date(new Date().setDate(1))),
    to: toLocalDateString(new Date()),
    as_of: toLocalDateString(new Date()),
  });

  const requestIdRef = useRef(0);
  const [downloading, setDownloading] = useState(null); // 'excel' | 'pdf' | null

  useEffect(() => { fetchBranches(); }, []);
  useEffect(() => { load(); }, [tab]);

  // Cada tab exporta con su propio endpoint y sus propios filtros —
  // trial-balance/income-statement usan from/to, balance-general usa as_of.
  const EXPORTERS = {
    'trial-balance': { fn: financialReportsAPI.exportTrialBalance, filename: (fmt) => `Balance-Comprobacion-${range.from}_${range.to}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}` },
    'balance-general': { fn: financialReportsAPI.exportBalanceGeneral, filename: (fmt) => `Balance-General-${range.as_of}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}` },
    'income-statement': { fn: financialReportsAPI.exportIncomeStatement, filename: (fmt) => `Estado-Resultados-${range.from}_${range.to}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}` },
    'libro-diario': { fn: financialReportsAPI.exportLibroDiario, filename: (fmt) => `Libro-Diario-${range.from}_${range.to}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}` },
    'libro-iva': { fn: financialReportsAPI.exportLibroIva, filename: (fmt) => `Libro-IVA-${range.from}_${range.to}.${fmt === 'pdf' ? 'pdf' : 'xlsx'}` },
  };

  const handleExport = async (format) => {
    const exporter = EXPORTERS[tab];
    const branch_id = branchId || undefined;
    const params = tab === 'balance-general' ? { as_of: range.as_of, branch_id } : { from: range.from, to: range.to, branch_id };

    try {
      setDownloading(format);
      const response = await exporter.fn(params, format);
      const url = URL.createObjectURL(response.data);

      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = exporter.filename(format);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(`Error generando el ${format === 'pdf' ? 'PDF' : 'Excel'} del reporte`);
    } finally {
      setDownloading(null);
    }
  };

  const load = async () => {
    const currentTab = tab;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setData(null);
      let res;
      const branch_id = branchId || undefined;
      if (currentTab === 'trial-balance') res = await financialReportsAPI.trialBalance({ from: range.from, to: range.to, branch_id });
      else if (currentTab === 'balance-general') res = await financialReportsAPI.balanceGeneral({ as_of: range.as_of, branch_id });
      else if (currentTab === 'libro-diario') res = await financialReportsAPI.libroDiario({ from: range.from, to: range.to, branch_id });
      else if (currentTab === 'libro-iva') res = await financialReportsAPI.libroIva({ from: range.from, to: range.to, branch_id });
      else res = await financialReportsAPI.incomeStatement({ from: range.from, to: range.to, branch_id });
      if (requestIdRef.current === requestId) setData(res.data);
    } catch (error) {
      if (requestIdRef.current === requestId) toast.error(error.response?.data?.message || 'Error generando el reporte');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reportes Financieros</h1>
          <p className="text-sm text-gray-500 mt-1">Basados solo en asientos contabilizados (posted)</p>
        </div>

        <div className="border-b border-gray-200 flex gap-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setData(null); setTab(t.id); }}
              className={`pb-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          {tab === 'balance-general' ? (
            <>
              <span className="text-sm text-gray-500">Corte al:</span>
              <input type="date" value={range.as_of} onChange={(e) => setRange((r) => ({ ...r, as_of: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500">Periodo:</span>
              <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              <span className="text-gray-400 text-sm">a</span>
              <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
            </>
          )}
          <button onClick={load} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Generar</button>
          {branches.length > 1 && (
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Todas las sedes</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <div className="flex-1" />

          <button
            onClick={() => handleExport('excel')}
            disabled={downloading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
          >
            <TableCellsIcon className="w-4 h-4" />
            {downloading === 'excel' ? 'Generando...' : 'Descargar Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={downloading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            {downloading === 'pdf' ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400">Generando...</div>}

        {!loading && data && tab === 'trial-balance' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>{['Código', 'Cuenta', 'Tipo', 'Débito', 'Crédito'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.accounts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin movimientos contabilizados en el periodo</td></tr>}
                {data.accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-500">{a.code}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{a.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 capitalize">{a.account_type}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(a.total_debit)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(a.total_credit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-2 text-sm">Total</td>
                  <td className="px-4 py-2 text-sm text-right">{formatCurrency(data.totals.debit)}</td>
                  <td className="px-4 py-2 text-sm text-right">{formatCurrency(data.totals.credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {!loading && data && tab === 'balance-general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Activo</h3>
              {data.activo.map((a) => (
                <div key={a.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{a.code} - {a.name}</span>
                  <span className="text-gray-900">{formatCurrency(a.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 mt-2 pt-2">
                <span>Total Activo</span><span>{formatCurrency(data.totales.total_activo)}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Pasivo</h3>
              {data.pasivo.map((a) => (
                <div key={a.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{a.code} - {a.name}</span>
                  <span className="text-gray-900">{formatCurrency(a.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 mt-2 pt-2">
                <span>Total Pasivo</span><span>{formatCurrency(data.totales.total_pasivo)}</span>
              </div>

              <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-5">Patrimonio</h3>
              {data.patrimonio.map((a) => (
                <div key={a.id} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{a.code} - {a.name}</span>
                  <span className="text-gray-900">{formatCurrency(a.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm py-1 text-gray-500 italic">
                <span>Resultado del ejercicio (no cerrado)</span><span>{formatCurrency(data.resultado_no_cerrado)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 mt-2 pt-2">
                <span>Total Patrimonio</span><span>{formatCurrency(data.totales.total_patrimonio)}</span>
              </div>
            </div>
            <div className={`md:col-span-2 rounded-xl border p-4 text-sm font-medium ${data.totales.cuadra ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {data.totales.cuadra ? '✓ El balance cuadra (Activo = Pasivo + Patrimonio)' : '✗ El balance no cuadra — revisa los asientos'}
            </div>
          </div>
        )}

        {!loading && data && tab === 'income-statement' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Ingresos</h3>
            {data.ingresos.map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1"><span className="text-gray-600">{a.code} - {a.name}</span><span>{formatCurrency(a.total)}</span></div>
            ))}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 mt-2 pt-2 mb-4"><span>Total Ingresos</span><span>{formatCurrency(data.totales.total_ingresos)}</span></div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Costo de Ventas</h3>
            {data.costos.map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1"><span className="text-gray-600">{a.code} - {a.name}</span><span>{formatCurrency(a.total)}</span></div>
            ))}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 mt-2 pt-2 mb-2"><span>Total Costos</span><span>{formatCurrency(data.totales.total_costos)}</span></div>
            <div className="flex justify-between text-sm font-bold text-indigo-700 mb-4"><span>Utilidad Bruta</span><span>{formatCurrency(data.totales.utilidad_bruta)}</span></div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Gastos Operativos</h3>
            {data.gastos.map((a) => (
              <div key={a.id} className="flex justify-between text-sm py-1"><span className="text-gray-600">{a.code} - {a.name}</span><span>{formatCurrency(a.total)}</span></div>
            ))}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 mt-2 pt-2 mb-4"><span>Total Gastos</span><span>{formatCurrency(data.totales.total_gastos)}</span></div>

            <div className={`flex justify-between text-base font-bold border-t-2 border-gray-300 pt-3 ${data.totales.utilidad_neta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              <span>Utilidad Neta</span><span>{formatCurrency(data.totales.utilidad_neta)}</span>
            </div>
          </div>
        )}
        {!loading && data && tab === 'libro-diario' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              {data.entry_count} {data.entry_count === 1 ? 'asiento' : 'asientos'} · {data.line_count} {data.line_count === 1 ? 'línea' : 'líneas'}
            </div>

            {data.entries.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                Sin asientos contabilizados en el periodo seleccionado
              </div>
            )}

            {data.entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-mono font-semibold text-gray-700">{entry.entry_number}</span>
                  <span className="text-gray-500">{entry.entry_date}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{SOURCE_TYPE_LABELS[entry.source_type] || entry.source_type}</span>
                  <span className="text-gray-600 flex-1">{entry.description || '—'}</span>
                </div>
                <table className="min-w-full divide-y divide-gray-100">
                  <tbody className="divide-y divide-gray-50">
                    {entry.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-1.5 text-xs font-mono text-gray-400 w-16">{l.account_code}</td>
                        <td className="px-2 py-1.5 text-sm text-gray-800">{l.account_name}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400">{l.description || ''}</td>
                        <td className="px-4 py-1.5 text-sm text-right w-32">{l.debit ? formatCurrency(l.debit) : ''}</td>
                        <td className="px-4 py-1.5 text-sm text-right w-32">{l.credit ? formatCurrency(l.credit) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50/60">
                      <td colSpan={3} className="px-4 py-1.5 text-xs text-gray-400 text-right">Subtotal</td>
                      <td className="px-4 py-1.5 text-sm text-right font-medium">{formatCurrency(entry.total_debit)}</td>
                      <td className="px-4 py-1.5 text-sm text-right font-medium">{formatCurrency(entry.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

            {data.entries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-end gap-8 text-sm font-semibold">
                <span>Total Débito: {formatCurrency(data.totals.debit)}</span>
                <span>Total Crédito: {formatCurrency(data.totals.credit)}</span>
              </div>
            )}
          </div>
        )}

        {!loading && data && tab === 'libro-iva' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">IVA Generado (Ventas)</div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>{['Fecha', 'N° Asiento', 'Origen', 'Detalle', 'Valor'].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.generado.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin movimientos en el periodo</td></tr>}
                  {data.generado.map((r) => (
                    <tr key={r.entry_id}>
                      <td className="px-4 py-2 text-sm text-gray-500">{r.entry_date}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-500">{r.entry_number}</td>
                      <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{SOURCE_TYPE_LABELS[r.source_type] || r.source_type}</span></td>
                      <td className="px-4 py-2 text-sm text-gray-800">{r.description || '—'}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-sm">Total IVA Generado</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(data.totals.generado)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">IVA Descontable (Compras)</div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>{['Fecha', 'N° Asiento', 'Origen', 'Detalle', 'Valor'].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.descontable.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin movimientos en el periodo</td></tr>}
                  {data.descontable.map((r) => (
                    <tr key={r.entry_id}>
                      <td className="px-4 py-2 text-sm text-gray-500">{r.entry_date}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-500">{r.entry_number}</td>
                      <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{SOURCE_TYPE_LABELS[r.source_type] || r.source_type}</span></td>
                      <td className="px-4 py-2 text-sm text-gray-800">{r.description || '—'}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-sm">Total IVA Descontable</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(data.totals.descontable)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`rounded-xl border p-4 flex justify-between items-center text-base font-bold ${data.totals.iva_a_pagar >= 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <span>{data.totals.iva_a_pagar >= 0 ? 'IVA a pagar' : 'Saldo a favor'}</span>
              <span>{formatCurrency(data.totals.iva_a_pagar)}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FinancialReportsPage;
