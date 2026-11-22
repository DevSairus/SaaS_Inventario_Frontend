// frontend/src/pages/accounting/NiifMeasurementsPage.jsx
//
// Ajustes NIIF de cierre: deterioro de cartera, valor neto realizable de
// inventarios y diferencia en cambio. Cada uno calcula en vista previa
// (nada se escribe) y "Contabilizar" crea el asiento del ajuste. El backend
// recalcula al contabilizar; de la pantalla solo toma parámetros y excepciones.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import ThirdPartyPicker from '../../components/accounting/ThirdPartyPicker';
import { niifMeasurementsAPI, chartOfAccountsAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';

const TABS = [
  { id: 'receivable_impairment', label: 'Deterioro de cartera' },
  { id: 'inventory_nrv', label: 'Valor neto realizable' },
  { id: 'fx_remeasurement', label: 'Diferencia en cambio' },
  { id: 'deferred_tax', label: 'Impuesto diferido' },
];
const KIND_LABEL = Object.fromEntries(TABS.map((t) => [t.id, t.label]));

const pad = (n) => String(n).padStart(2, '0');
const lastMonthEnd = () => {
  const d = new Date();
  const e = new Date(d.getFullYear(), d.getMonth(), 0);
  return `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`;
};
const fmtDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const money = (v) => (v === null || v === undefined ? '—' : formatCurrency(Number(v)));

const input = 'px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg text-sm';
const th = 'px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap';
const td = 'px-3 py-2 text-sm whitespace-nowrap';

function Card({ label, value, tone }) {
  const color = tone === 'up' ? 'text-red-700' : tone === 'down' ? 'text-green-700' : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function AllowanceSummary({ summary, firstLabel, firstValue }) {
  const adj = summary.adjustment;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card label={firstLabel} value={money(firstValue)} />
      <Card label="Provisión requerida al corte" value={money(summary.required)} />
      <Card label="Provisión en libros" value={money(summary.previous)} />
      <Card
        label={adj > 0 ? 'Ajuste: gasto por deterioro' : adj < 0 ? 'Ajuste: recuperación' : 'Ajuste'}
        value={money(Math.abs(adj))}
        tone={adj > 0 ? 'up' : adj < 0 ? 'down' : null}
      />
    </div>
  );
}

/* ─────────────────────────── Deterioro de cartera ─────────────────────────── */

function ReceivableTab({ result, params, setParams }) {
  const matrix = params.matrix || [];
  const overrides = params.overrides || {};
  const setRow = (i, k, v) => setParams((p) => ({ ...p, matrix: p.matrix.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const setOverride = (id, v) => setParams((p) => ({ ...p, overrides: { ...(p.overrides || {}), [id]: v } }));
  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Política de deterioro (días desde la factura → % del saldo)</p>
        <p className="text-xs text-gray-500 mb-3">
          Sección 11 de NIIF para Pymes: deterioro cuando hay evidencia objetiva de que no se va a cobrar. La matriz es la política de la
          empresa; Pitbox recuerda la última que se contabilizó.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          {matrix.map((r, i) => (
            <div key={i} className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
              <span className="text-xs text-gray-500">desde</span>
              <input type="number" min="0" value={r.from_days} disabled={i === 0} onChange={(e) => setRow(i, 'from_days', e.target.value)} className={`${input} w-20`} />
              <span className="text-xs text-gray-500">días</span>
              <input type="number" min="0" max="100" value={r.pct} onChange={(e) => setRow(i, 'pct', e.target.value)} className={`${input} w-16`} />
              <span className="text-xs text-gray-500">%</span>
              {i > 0 && (
                <button type="button" onClick={() => setParams((p) => ({ ...p, matrix: p.matrix.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-600">
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setParams((p) => ({ ...p, matrix: [...(p.matrix || []), { from_days: Number(p.matrix?.at(-1)?.from_days || 0) + 90, pct: 100 }] }))}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            <PlusIcon className="w-4 h-4" /> Tramo
          </button>
        </div>
      </div>

      {result && (
        <>
          <AllowanceSummary summary={result.summary} firstLabel="Cartera abierta al corte" firstValue={result.summary.receivables} />
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className={`${th} text-left`}>Cliente</th>
                  <th className={`${th} text-right`}>Saldo</th>
                  <th className={`${th} text-right`}>Factura más antigua</th>
                  <th className={`${th} text-right`}>% fijo para el cliente</th>
                  <th className={`${th} text-right`}>Deterioro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.detail.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-gray-400">No hay cartera abierta al corte.</td></tr>}
                {result.detail.map((d) => (
                  <tr key={d.third_party_id}>
                    <td className={td}>{d.name}<span className="ml-2 text-xs text-gray-400">{d.tax_id}</span></td>
                    <td className={`${td} text-right tabular-nums`}>{money(d.balance)}</td>
                    <td className={`${td} text-right text-gray-500`}>{d.oldest_days} días</td>
                    <td className={`${td} text-right`}>
                      <input
                        type="number" min="0" max="100" placeholder="matriz"
                        value={overrides[d.third_party_id] ?? ''}
                        onChange={(e) => setOverride(d.third_party_id, e.target.value)}
                        className={`${input} w-24 text-right`}
                      />
                    </td>
                    <td className={`${td} text-right tabular-nums font-medium`}>{money(d.required)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ─────────────────────────── Valor neto realizable ─────────────────────────── */

function NrvTab({ result, params, setParams }) {
  const overrides = params.overrides || {};
  const setOverride = (id, v) => setParams((p) => ({ ...p, overrides: { ...(p.overrides || {}), [id]: v } }));
  const [showNoPrice, setShowNoPrice] = useState(false);
  const ovInput = (id) => (
    <input
      type="number" min="0" placeholder="auto" value={overrides[id] ?? ''}
      onChange={(e) => setOverride(id, e.target.value)} className={`${input} w-28 text-right`}
    />
  );
  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Gastos estimados de venta (% del precio)</label>
          <input
            type="number" min="0" max="99" value={params.selling_cost_pct ?? 0}
            onChange={(e) => setParams((p) => ({ ...p, selling_cost_pct: e.target.value }))} className={`${input} w-28`}
          />
        </div>
        <p className="text-xs text-gray-500 flex-1 min-w-[16rem]">
          VNR = precio de venta sin IVA − gastos de venta. Si el costo promedio es mayor, la diferencia es deterioro (secciones 13 y 27).
          Las existencias y el costo promedio salen del kardex a la fecha de corte; el precio de venta es el actual. Para un producto obsoleto o dañado, fija su VNR unitario a mano.
        </p>
      </div>

      {result && (
        <>
          <AllowanceSummary summary={result.summary} firstLabel="Inventario al costo" firstValue={result.summary.inventory_cost} />
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className={`${th} text-left`}>Producto</th>
                  <th className={`${th} text-right`}>Cantidad</th>
                  <th className={`${th} text-right`}>Costo unit.</th>
                  <th className={`${th} text-right`}>VNR unit.</th>
                  <th className={`${th} text-right`}>VNR fijado</th>
                  <th className={`${th} text-right`}>Deterioro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.detail.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-sm text-gray-400">Ningún producto tiene costo mayor a su valor neto realizable.</td></tr>}
                {result.detail.map((d) => (
                  <tr key={d.product_id}>
                    <td className={td}><span className="font-mono text-xs text-gray-400 mr-2">{d.sku}</span>{d.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{Number(d.quantity)}</td>
                    <td className={`${td} text-right tabular-nums`}>{money(d.unit_cost)}</td>
                    <td className={`${td} text-right tabular-nums`}>{money(d.nrv_unit)}</td>
                    <td className={`${td} text-right`}>{ovInput(d.product_id)}</td>
                    <td className={`${td} text-right tabular-nums font-medium`}>{money(d.required)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.summary.products_without_price > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
              <button type="button" className="underline" onClick={() => setShowNoPrice((v) => !v)}>
                {result.summary.products_without_price} producto(s) con existencias no tienen precio de venta
              </button>{' '}
              y no se pudo medir su VNR. Si alguno no se va a poder vender a su costo, fija su VNR unitario
              {result.summary.products_without_price > 200 ? ' (se listan los 200 de mayor costo).' : '.'}
              {showNoPrice && (
                <table className="min-w-full mt-2 bg-white rounded-lg">
                  <tbody className="divide-y divide-gray-100">
                    {result.products_without_price.map((p) => (
                      <tr key={p.id}>
                        <td className={td}><span className="font-mono text-xs text-gray-400 mr-2">{p.sku}</span>{p.name}</td>
                        <td className={`${td} text-right text-gray-500`}>{Number(p.quantity)} × {money(p.cost)}</td>
                        <td className={`${td} text-right`}>{ovInput(p.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ─────────────────────────── Diferencia en cambio ─────────────────────────── */

function FxTab({ result, params, setParams, cutoff }) {
  const [accounts, setAccounts] = useState([]);
  const [newItem, setNewItem] = useState({ account_id: '', third_party: null, currency: 'USD', foreign_amount: '' });
  const [loadingTrm, setLoadingTrm] = useState(false);
  useEffect(() => {
    chartOfAccountsAPI.getAll().then((r) => setAccounts((r.data || []).filter((a) => a.accepts_entries && a.is_active && ['activo', 'pasivo'].includes(a.account_type)))).catch(() => {});
  }, []);

  const items = params.items || [];
  const key = (i) => `${i.account_id}|${i.third_party_id || ''}`;
  const itemFor = (d) => items.find((i) => key(i) === key(d));
  const setItem = (d, field, value) => setParams((p) => {
    const list = [...(p.items || [])];
    const idx = list.findIndex((i) => key(i) === key(d));
    const base = idx >= 0 ? list[idx] : { account_id: d.account_id, third_party_id: d.third_party_id, currency: d.currency, label: d.label };
    const next = { ...base, [field]: value };
    if (idx >= 0) list[idx] = next; else list.push(next);
    return { ...p, items: list };
  });
  const removeItem = (d) => setParams((p) => ({ ...p, items: (p.items || []).filter((i) => key(i) !== key(d)) }));

  const fetchTrm = async () => {
    try {
      setLoadingTrm(true);
      const r = await niifMeasurementsAPI.trm(cutoff);
      if (r.success) { setParams((p) => ({ ...p, rate: r.data.rate })); toast.success(`TRM oficial del ${fmtDate(cutoff)}: ${r.data.rate}`); }
      else toast.error(r.message);
    } catch { toast.error('No se pudo consultar la TRM'); } finally { setLoadingTrm(false); }
  };

  const addItem = () => {
    if (!newItem.account_id || newItem.foreign_amount === '') return toast.error('Elige la cuenta y el saldo en moneda extranjera');
    const acc = accounts.find((a) => a.id === newItem.account_id);
    setParams((p) => ({
      ...p,
      items: [...(p.items || []), {
        account_id: newItem.account_id, third_party_id: newItem.third_party?.id || null, currency: newItem.currency,
        foreign_amount: newItem.foreign_amount, label: newItem.third_party ? `${acc?.name} — ${newItem.third_party.name}` : acc?.name,
      }],
    }));
    setNewItem({ account_id: '', third_party: null, currency: 'USD', foreign_amount: '' });
  };

  // Filas: las del resultado (bancos + partidas ya calculadas) y las recién agregadas aún sin calcular.
  const rows = useMemo(() => {
    const out = [...(result?.detail || [])];
    for (const i of items) if (!out.some((d) => key(d) === key(i))) out.push({ ...i, source: 'manual', pending: true });
    return out;
  }, [result, items]);

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tasa de cierre (TRM) para todas las partidas</label>
          <input type="number" min="0" step="0.01" value={params.rate ?? ''} onChange={(e) => setParams((p) => ({ ...p, rate: e.target.value }))} className={`${input} w-36`} />
        </div>
        <button type="button" onClick={fetchTrm} disabled={loadingTrm} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          {loadingTrm ? 'Consultando...' : 'Consultar TRM oficial (USD)'}
        </button>
        <p className="text-xs text-gray-500 flex-1 min-w-[16rem]">
          Sección 30: las partidas monetarias en moneda extranjera (bancos, cuentas por cobrar o pagar) se llevan a la tasa de cierre.
          Escribe el saldo de cada partida en su moneda; el ajuste es la diferencia contra el saldo en pesos de los libros.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className={`${th} text-left`}>Partida</th>
              <th className={`${th} text-right`}>Saldo en moneda</th>
              <th className={`${th} text-right`}>Tasa propia</th>
              <th className={`${th} text-right`}>Libros (COP)</th>
              <th className={`${th} text-right`}>Reexpresado</th>
              <th className={`${th} text-right`}>Diferencia</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-gray-400">No hay cuentas bancarias en moneda extranjera. Agrega abajo las partidas a reexpresar.</td></tr>}
            {rows.map((d) => {
              const it = itemFor(d) || {};
              return (
                <tr key={key(d)}>
                  <td className={td}>
                    <span className="font-mono text-xs text-gray-400 mr-2">{d.code}</span>{d.label}
                    {d.source === 'bank' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">banco</span>}
                  </td>
                  <td className={`${td} text-right`}>
                    <input type="number" min="0" step="0.01" value={it.foreign_amount ?? ''} onChange={(e) => setItem(d, 'foreign_amount', e.target.value)} className={`${input} w-28 text-right`} />
                    <span className="ml-1 text-xs text-gray-500">{d.currency}</span>
                  </td>
                  <td className={`${td} text-right`}>
                    <input type="number" min="0" step="0.01" placeholder="general" value={it.rate ?? ''} onChange={(e) => setItem(d, 'rate', e.target.value)} className={`${input} w-24 text-right`} />
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{d.pending ? '—' : money(d.book_balance)}</td>
                  <td className={`${td} text-right tabular-nums`}>{d.pending ? '—' : money(d.remeasured)}</td>
                  <td className={`${td} text-right tabular-nums font-medium ${d.difference > 0 ? 'text-green-700' : d.difference < 0 ? 'text-red-700' : ''}`}>
                    {d.pending || d.difference === null ? '—' : money(d.difference)}
                  </td>
                  <td className={`${td} text-right`}>
                    {d.source !== 'bank' && <button type="button" onClick={() => removeItem(d)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex flex-wrap items-end gap-2">
          <select value={newItem.account_id} onChange={(e) => setNewItem((n) => ({ ...n, account_id: e.target.value }))} className={`${input} w-64`}>
            <option value="">Cuenta (activo o pasivo)...</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          <div className="w-64"><ThirdPartyPicker value={newItem.third_party} onChange={(tp) => setNewItem((n) => ({ ...n, third_party: tp }))} /></div>
          <input value={newItem.currency} maxLength={3} onChange={(e) => setNewItem((n) => ({ ...n, currency: e.target.value.toUpperCase() }))} className={`${input} w-16`} />
          <input type="number" min="0" step="0.01" placeholder="Saldo en moneda" value={newItem.foreign_amount} onChange={(e) => setNewItem((n) => ({ ...n, foreign_amount: e.target.value }))} className={`${input} w-36`} />
          <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
            <PlusIcon className="w-4 h-4" /> Agregar partida
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card label="Ganancia en cambio" value={money(result.summary.gains)} tone="down" />
          <Card label="Pérdida en cambio" value={money(result.summary.losses)} tone="up" />
          <Card label="Efecto neto" value={money(result.summary.adjustment)} />
          <Card label="Partidas sin saldo o tasa" value={result.summary.items_pending} />
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────── Impuesto diferido ─────────────────────────────── */

function DeferredTaxTab({ result }) {
  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-500">
        Sección 29: cada diferencia temporaria entre el valor contable y el fiscal × la tarifa de renta. Las diferencias salen de la{' '}
        <Link to="/accounting/fiscal-reconciliation" className="text-indigo-600 hover:underline">Conciliación fiscal</Link> (donde se configuran la
        tarifa, las pérdidas fiscales por compensar y si se reconoce el activo diferido). El ajuste va contra el gasto por impuesto diferido.
      </div>
      {result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card label={`Activo diferido requerido (${result.params.tax_rate}%)`} value={money(result.summary.dta_required)} />
            <Card label="Pasivo diferido requerido" value={money(result.summary.dtl_required)} />
            <Card label="En libros (activo − pasivo)" value={money(result.summary.previous)} />
            <Card
              label={result.summary.expense > 0 ? 'Ajuste: gasto por impuesto diferido' : result.summary.expense < 0 ? 'Ajuste: ingreso por impuesto diferido' : 'Ajuste'}
              value={money(Math.abs(result.summary.expense))}
              tone={result.summary.expense > 0 ? 'up' : result.summary.expense < 0 ? 'down' : null}
            />
          </div>
          {result.summary.dta_gross > result.summary.dta_required && (
            <p className="text-xs text-amber-700">
              Activo diferido bruto {money(result.summary.dta_gross)}: solo se reconoce hasta el pasivo diferido porque en la conciliación se indicó que no hay renta futura probable.
            </p>
          )}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className={`${th} text-left`}>Diferencia temporaria</th>
                  <th className={`${th} text-right`}>Fiscal − contable</th>
                  <th className={`${th} text-right`}>Deducible (+) / imponible (−)</th>
                  <th className={`${th} text-right`}>Impuesto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.detail.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-sm text-gray-400">No hay diferencias temporarias al corte.</td></tr>}
                {result.detail.map((d) => (
                  <tr key={d.key}>
                    <td className={`${td} whitespace-normal`}>{d.label}</td>
                    <td className={`${td} text-right tabular-nums`}>{money(d.difference)}</td>
                    <td className={`${td} text-right tabular-nums`}>{money(d.deductible)}</td>
                    <td className={`${td} text-right tabular-nums font-medium`}>{money(d.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────── Página ─────────────────────────────── */

const NiifMeasurementsPage = () => {
  const [tab, setTab] = useState('receivable_impairment');
  const [cutoff, setCutoff] = useState(lastMonthEnd());
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = () => niifMeasurementsAPI.history(tab).then((r) => setHistory(r.data || [])).catch(() => {});

  // Al cambiar de pestaña: vista previa con los últimos parámetros usados.
  useEffect(() => {
    setResult(null);
    setParams({});
    calculate({});
    loadHistory();
  }, [tab]);

  const calculate = async (p = params) => {
    try {
      setLoading(true);
      const r = await niifMeasurementsAPI.preview(tab, { cutoff_date: cutoff, params: p });
      setResult(r.data);
      setParams(r.data.params || {});
    } catch (error) {
      setResult(null);
      toast.error(error.response?.data?.message || 'Error calculando');
    } finally {
      setLoading(false);
    }
  };

  const canApply = result && (tab === 'fx_remeasurement'
    ? (result.summary.gains > 0 || result.summary.losses > 0)
    : tab === 'deferred_tax'
      ? (Math.abs(result.summary.dta_required - result.summary.dta_book) >= 0.01 || Math.abs(result.summary.dtl_required - result.summary.dtl_book) >= 0.01)
      : Math.abs(result.summary.adjustment) >= 0.01);

  const applyIt = async () => {
    const adj = result.summary.adjustment;
    let what;
    if (tab === 'fx_remeasurement') what = `ganancia ${money(result.summary.gains)} y pérdida ${money(result.summary.losses)}`;
    else if (tab === 'deferred_tax') what = `impuesto diferido: activo ${money(result.summary.dta_required)}, pasivo ${money(result.summary.dtl_required)} (${result.summary.expense >= 0 ? 'gasto' : 'ingreso'} de ${money(Math.abs(result.summary.expense))})`;
    else what = `${adj > 0 ? 'un gasto por deterioro' : 'una recuperación'} de ${money(Math.abs(adj))}`;
    if (!window.confirm(`Se contabilizará al ${fmtDate(cutoff)} ${what}. ¿Continuar?`)) return;
    try {
      setApplying(true);
      const r = await niifMeasurementsAPI.apply(tab, { cutoff_date: cutoff, params });
      toast.success(r.message || 'Ajuste contabilizado');
      await calculate(params);
      loadHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error contabilizando');
    } finally {
      setApplying(false);
    }
  };

  const reverseIt = async (h) => {
    const reason = window.prompt(`Reversar ${KIND_LABEL[h.kind].toLowerCase()} al ${fmtDate(h.cutoff_date)} (${h.entry_number}). Motivo:`);
    if (reason === null) return;
    try {
      await niifMeasurementsAPI.reverse(h.id, reason);
      toast.success('Medición reversada');
      loadHistory();
      calculate(params);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error reversando');
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Ajustes NIIF de cierre</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mediciones de NIIF para Pymes al cierre de mes o de año. Calcula, revisa y contabiliza el ajuste; volver a calcular al mismo corte
            da cero porque se ajusta contra lo que ya está en libros. Las cuentas se configuran en{' '}
            <Link to="/accounting/account-mappings" className="text-indigo-600 hover:underline">Mapeo de Cuentas</Link>.
          </p>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav className="flex gap-6 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={`pb-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha de corte</label>
            <input type="date" value={cutoff} onChange={(e) => setCutoff(e.target.value)} className={`${input} py-2`} />
          </div>
          <button onClick={() => calculate()} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <ArrowPathIcon className="w-4 h-4" /> {loading ? 'Calculando...' : 'Calcular'}
          </button>
          <button onClick={applyIt} disabled={!canApply || applying || loading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40">
            {applying ? 'Contabilizando...' : 'Contabilizar ajuste'}
          </button>
          {result && !canApply && !loading && <span className="text-sm text-gray-500">Sin ajuste pendiente al corte.</span>}
        </div>

        {tab === 'receivable_impairment' && <ReceivableTab result={result} params={params} setParams={setParams} />}
        {tab === 'inventory_nrv' && <NrvTab result={result} params={params} setParams={setParams} />}
        {tab === 'fx_remeasurement' && <FxTab result={result} params={params} setParams={setParams} cutoff={cutoff} />}
        {tab === 'deferred_tax' && <DeferredTaxTab result={result} />}

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
          <p className="px-4 pt-3 text-sm font-medium text-gray-800 dark:text-gray-200">Historial</p>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={`${th} text-left`}>Corte</th>
                <th className={`${th} text-right`}>{tab === 'fx_remeasurement' ? 'Ganancia' : tab === 'deferred_tax' ? 'Neto requerido' : 'Requerida'}</th>
                <th className={`${th} text-right`}>{tab === 'fx_remeasurement' ? 'Pérdida' : tab === 'deferred_tax' ? 'Neto en libros' : 'En libros'}</th>
                <th className={`${th} text-right`}>Ajuste</th>
                <th className={`${th} text-left`}>Asiento</th>
                <th className={`${th} text-left`}>Por</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-sm text-gray-400">Sin mediciones contabilizadas.</td></tr>}
              {history.map((h) => (
                <tr key={h.id} className={h.status === 'reversed' ? 'opacity-50' : ''}>
                  <td className={td}>{fmtDate(h.cutoff_date)}</td>
                  <td className={`${td} text-right tabular-nums`}>{money(h.required_amount)}</td>
                  <td className={`${td} text-right tabular-nums`}>{money(h.previous_amount)}</td>
                  <td className={`${td} text-right tabular-nums font-medium`}>{money(h.adjustment)}</td>
                  <td className={`${td} font-mono text-xs`}>{h.entry_number}</td>
                  <td className={`${td} text-gray-500`}>{h.created_by_name}</td>
                  <td className={`${td} text-right`}>
                    {h.status === 'posted'
                      ? <button onClick={() => reverseIt(h)} className="text-xs text-red-600 hover:underline">Reversar</button>
                      : <span className="text-xs text-gray-500">Reversada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default NiifMeasurementsPage;
