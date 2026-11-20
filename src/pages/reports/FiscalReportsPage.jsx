// pages/reports/FiscalReportsPage.jsx
//
// Informes fiscales para declarar renta sin contabilidad: resumen del año
// (ingresos, costos, gastos, retenciones, patrimonio al corte) y libro
// fiscal de operaciones diarias. Salen de los documentos (ventas, compras,
// gastos, kardex, cartera), no de asientos. Caja/bancos y otros valores que
// el sistema no puede saber se digitan aquí y entran al patrimonio y al Excel.
import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import Layout from '../../components/layout/Layout';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';

const thisYear = new Date().getFullYear();
const fmt = (n) => formatCurrency(Number(n) || 0);
const toNum = (v) => { const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };

function Row({ label, value, strong, minus, hint }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'border-t border-gray-200 font-semibold text-gray-900' : 'text-gray-700'}`}>
      <span className="text-sm">{label}{hint && <span className="block text-xs font-normal text-gray-400">{hint}</span>}</span>
      <span className={`text-sm tabular-nums ${minus ? 'text-red-600' : ''}`}>{minus ? '−' : ''}{fmt(value)}</span>
    </div>
  );
}

function Section({ title, children, note }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 break-inside-avoid">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h2>
      {children}
      {note && <p className="mt-2 text-xs text-gray-400">{note}</p>}
    </section>
  );
}

export default function FiscalReportsPage() {
  const [mode, setMode] = useState('year');
  const [year, setYear] = useState(thisYear - 1);
  const [range, setRange] = useState({ from: `${thisYear}-01-01`, to: new Date().toISOString().slice(0, 10) });
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  // Valores que el sistema no conoce sin contabilidad (se digitan).
  const [manual, setManual] = useState({ cash_banks: '', other_assets: '', other_liabilities: '' });

  const params = useMemo(() => (mode === 'year' ? { year } : range), [mode, year, range]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    Promise.all([
      api.get('/fiscal-reports/summary', { params }),
      api.get('/fiscal-reports/daily-book', { params }),
    ])
      .then(([s, b]) => { if (!stale) { setSummary(s.data.data); setBook(b.data.data); } })
      .catch((e) => { if (!stale) toast.error(e.response?.data?.message || 'No se pudo generar el informe'); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [params]);

  const equity = summary?.equity;
  const grossAssets = equity ? equity.known_assets + toNum(manual.cash_banks) + toNum(manual.other_assets) : 0;
  const liabilities = equity ? equity.known_liabilities + toNum(manual.other_liabilities) : 0;

  const exportExcel = async () => {
    if (!summary || !book) return;
    const wb = new ExcelJS.Workbook();
    const money = '"$"#,##0';
    const s = summary;
    const r = wb.addWorksheet('Resumen renta');
    r.columns = [{ header: 'Concepto', key: 'k', width: 52 }, { header: 'Valor', key: 'v', width: 20, style: { numFmt: money } }];
    const add = (k, v) => r.addRow({ k, v });
    const head = (k) => { const row = r.addRow({ k }); row.font = { bold: true }; };
    head(`Periodo ${s.period.from} a ${s.period.to}`);
    head('INGRESOS');
    add('Ingresos brutos (ventas sin IVA + notas débito)', s.income.gross_income);
    add('  de ellos facturados electrónicamente', s.income.invoiced_income);
    add('Devoluciones en ventas', -s.income.returns);
    add('Notas crédito (descuentos/ajustes)', -s.income.credit_notes);
    add('Ingresos netos', s.income.net_income);
    head('COSTOS Y GASTOS');
    add('Costo de ventas (kardex)', s.cost.cost_of_sales);
    add('Inventario inicial', s.cost.inventory_game.opening_inventory);
    add('Compras netas', s.cost.inventory_game.net_purchases);
    add('Inventario final', s.cost.inventory_game.closing_inventory);
    add('Costo por juego de inventarios', s.cost.inventory_game.cost);
    s.expenses.by_category.forEach((c) => add(`Gasto: ${c.label}`, c.net));
    add('Total gastos', s.expenses.total);
    add('Utilidad bruta', s.result.gross_profit);
    add('Utilidad antes de impuestos', s.result.operating_profit);
    head('IMPUESTOS Y RETENCIONES');
    add('IVA generado (ventas)', s.income.iva_generated);
    add('IVA pagado en compras', s.cost.purchases.iva);
    add('IVA pagado en gastos', s.expenses.iva);
    add('Retención en la fuente que le practicaron', s.income.retentions_suffered.retefuente);
    add('ReteIVA que le practicaron', s.income.retentions_suffered.reteiva);
    add('ReteICA que le practicaron', s.income.retentions_suffered.reteica);
    add('Retención en la fuente practicada a proveedores', s.retentions_practiced.retefuente);
    add('ReteIVA practicada', s.retentions_practiced.reteiva);
    add('ReteICA practicada', s.retentions_practiced.reteica);
    head(`PATRIMONIO AL ${s.equity.cut_date}`);
    add('Efectivo y bancos (digitado)', toNum(manual.cash_banks));
    add('Inventarios', s.equity.inventory);
    add('Cuentas por cobrar a clientes', s.equity.receivables);
    add('Activos fijos (costo)', s.equity.fixed_assets_cost);
    add('Otros activos (digitado)', toNum(manual.other_assets));
    add('Patrimonio bruto', grossAssets);
    add('Cuentas por pagar a proveedores', s.equity.payables_suppliers);
    add('Gastos por pagar', s.equity.payables_expenses);
    add('Otras deudas (digitado)', toNum(manual.other_liabilities));
    add('Total deudas', liabilities);
    add('Patrimonio líquido', grossAssets - liabilities);

    const d = wb.addWorksheet('Libro fiscal diario');
    d.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Ventas sin IVA', key: 'sales_net', width: 16, style: { numFmt: money } },
      { header: 'IVA generado', key: 'sales_iva', width: 14, style: { numFmt: money } },
      { header: 'Devoluciones', key: 'returns_net', width: 14, style: { numFmt: money } },
      { header: 'Ingreso neto', key: 'income_net', width: 16, style: { numFmt: money } },
      { header: 'Compras sin IVA', key: 'purchases_net', width: 16, style: { numFmt: money } },
      { header: 'IVA compras', key: 'purchases_iva', width: 14, style: { numFmt: money } },
      { header: 'Gastos sin IVA', key: 'expenses_net', width: 16, style: { numFmt: money } },
    ];
    book.days.forEach((x) => d.addRow(x));
    const tr = d.addRow({ date: 'TOTAL', ...book.totals });
    tr.font = { bold: true };
    [r, d].forEach((ws) => { ws.getRow(1).font = { bold: true }; });

    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_fiscal_${s.period.from}_${s.period.to}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls = 'border border-gray-300 rounded-md px-2 py-1.5 text-sm';
  const s = summary;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Informes fiscales</h1>
            <p className="text-sm text-gray-500 max-w-2xl">
              Para declarar renta sin llevar contabilidad (persona natural no obligada, régimen simple). Salen de ventas,
              compras, gastos, kardex y cartera; revísalos con tu contador antes de presentar la declaración.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={exportExcel} disabled={!summary} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="year">Año gravable</option>
            <option value="range">Rango de fechas</option>
          </select>
          {mode === 'year' ? (
            <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          ) : (
            <>
              <input type="date" className={inputCls} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
              <input type="date" className={inputCls} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </>
          )}
          <div className="ml-auto inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
            {[['summary', 'Resumen para renta'], ['book', 'Libro fiscal diario']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 ${tab === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        </div>

        {loading && !s && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}

        {s && tab === 'summary' && (
          <div className={`grid gap-4 md:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
            <p className="md:col-span-2 text-sm text-gray-500">Periodo {s.period.from} a {s.period.to}</p>
            <Section title="Ingresos" note="Remisiones y facturas confirmadas, sin IVA. La factura que consolida remisiones no se suma otra vez.">
              <Row label="Ingresos brutos" value={s.income.gross_income} hint={`${s.income.sales_docs} documentos · facturados electrónicamente ${fmt(s.income.invoiced_income)}`} />
              {s.income.debit_notes > 0 && <Row label="Incluye notas débito" value={s.income.debit_notes} />}
              <Row label="Devoluciones en ventas" value={s.income.returns} minus />
              <Row label="Notas crédito (descuentos/ajustes)" value={s.income.credit_notes} minus />
              <Row label="Ingresos netos" value={s.income.net_income} strong />
            </Section>

            <Section title="Resultado">
              <Row label="Ingresos netos" value={s.result.net_income} />
              <Row label="Costo de ventas" value={s.result.cost_of_sales} minus />
              <Row label="Utilidad bruta" value={s.result.gross_profit} strong />
              <Row label="Gastos" value={s.result.expenses} minus />
              <Row label="Utilidad antes de impuestos" value={s.result.operating_profit} strong />
            </Section>

            <Section title="Costo de ventas" note="El costo según kardex es el de cada producto al venderlo; el juego de inventarios sirve de control. Si difieren mucho, revisa ajustes de inventario o compras sin recibir.">
              <Row label="Costo según kardex" value={s.cost.cost_of_sales} />
              <Row label="Inventario inicial" value={s.cost.inventory_game.opening_inventory} />
              <Row label="+ Compras netas" value={s.cost.inventory_game.net_purchases} hint={`${s.cost.purchases.docs} compras recibidas, con flete; devoluciones ${fmt(s.cost.purchases.supplier_returns)}`} />
              <Row label="− Inventario final" value={s.cost.inventory_game.closing_inventory} />
              <Row label="Costo por juego de inventarios" value={s.cost.inventory_game.cost} strong />
            </Section>

            <Section title="Gastos por concepto" note="Sin IVA. Los fletes de compras están en el costo, no aquí.">
              {s.expenses.by_category.length === 0 && <p className="text-sm text-gray-400">Sin gastos en el periodo</p>}
              {s.expenses.by_category.map((c) => <Row key={c.category} label={c.label} value={c.net} hint={`${c.docs} gasto(s)`} />)}
              <Row label="Total gastos" value={s.expenses.total} strong />
            </Section>

            <Section title="IVA y retenciones">
              <Row label="IVA generado en ventas" value={s.income.iva_generated} />
              <Row label="IVA pagado en compras" value={s.cost.purchases.iva} hint={s.cost.purchases.iva_to_cost ? `${fmt(s.cost.purchases.iva_to_cost)} llevado al costo` : null} />
              <Row label="IVA pagado en gastos" value={s.expenses.iva} />
              <Row label="Retención en la fuente que le practicaron" value={s.income.retentions_suffered.retefuente} hint="Se descuenta del impuesto de renta" />
              <Row label="ReteIVA / ReteICA que le practicaron" value={s.income.retentions_suffered.reteiva + s.income.retentions_suffered.reteica} />
              <Row label="Retenciones practicadas a proveedores" value={s.retentions_practiced.retefuente + s.retentions_practiced.reteiva + s.retentions_practiced.reteica} />
            </Section>

            <Section title={`Patrimonio al ${s.equity.cut_date}`} note="El sistema no puede saber el saldo de caja y bancos sin contabilidad: digítalo según extractos y arqueo. Los activos fijos van a su costo; la depreciación fiscal la calcula tu contador o el módulo de activos.">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <label className="text-sm text-gray-700">Efectivo y bancos</label>
                <input className={`${inputCls} w-40 text-right`} inputMode="numeric" value={manual.cash_banks} placeholder="Digitar" onChange={(e) => setManual((m) => ({ ...m, cash_banks: e.target.value }))} />
              </div>
              <Row label="Inventarios" value={s.equity.inventory} />
              <Row label="Cuentas por cobrar a clientes" value={s.equity.receivables} hint={`${s.equity.receivables_docs} documentos con saldo`} />
              <Row label="Activos fijos (costo)" value={s.equity.fixed_assets_cost} />
              <div className="flex items-center justify-between gap-3 py-1.5">
                <label className="text-sm text-gray-700">Otros activos</label>
                <input className={`${inputCls} w-40 text-right`} inputMode="numeric" value={manual.other_assets} placeholder="Digitar" onChange={(e) => setManual((m) => ({ ...m, other_assets: e.target.value }))} />
              </div>
              <Row label="Patrimonio bruto" value={grossAssets} strong />
              <Row label="Cuentas por pagar a proveedores" value={s.equity.payables_suppliers} />
              <Row label="Gastos por pagar" value={s.equity.payables_expenses} />
              <div className="flex items-center justify-between gap-3 py-1.5">
                <label className="text-sm text-gray-700">Otras deudas (bancos, impuestos)</label>
                <input className={`${inputCls} w-40 text-right`} inputMode="numeric" value={manual.other_liabilities} placeholder="Digitar" onChange={(e) => setManual((m) => ({ ...m, other_liabilities: e.target.value }))} />
              </div>
              <Row label="Total deudas" value={liabilities} strong />
              <Row label="Patrimonio líquido" value={grossAssets - liabilities} strong />
            </Section>
          </div>
        )}

        {book && tab === 'book' && (
          <div className={`bg-white rounded-xl border border-gray-200 overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {['Fecha', 'Ventas sin IVA', 'IVA generado', 'Devoluciones', 'Ingreso neto', 'Compras sin IVA', 'IVA compras', 'Gastos sin IVA'].map((h, i) => (
                    <th key={h} className={`px-3 py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {book.days.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Sin operaciones en el periodo</td></tr>}
                {book.days.map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-1.5 whitespace-nowrap">{d.date}</td>
                    {['sales_net', 'sales_iva', 'returns_net', 'income_net', 'purchases_net', 'purchases_iva', 'expenses_net'].map((k) => (
                      <td key={k} className="px-3 py-1.5 text-right tabular-nums">{d[k] ? fmt(d[k]) : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  {['sales_net', 'sales_iva', 'returns_net', 'income_net', 'purchases_net', 'purchases_iva', 'expenses_net'].map((k) => (
                    <td key={k} className="px-3 py-2 text-right tabular-nums">{fmt(book.totals[k])}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
